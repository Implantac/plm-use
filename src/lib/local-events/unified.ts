// Timeline unificada das entidades criativas: evento local (localStorage,
// fonte imediata) + espelho em public.entity_events (cross-device, realtime).
// O mirror marca cada linha do servidor com payload.local_id — é assim que a
// deduplicação sabe que o par local/servidor é o MESMO evento sem depender de
// relógio nem de id compartilhado.
//
// Antes do db push das migrations, o select por um valor ainda não existente no
// enum falha no PostgREST e o hook devolve lista vazia → a UI mostra só o
// local, exatamente como era. Nada aqui precisa de feature-flag.

import { useMemo } from "react";
import { useEntityTimeline } from "@/hooks/use-entity-events";
import { useLocalEntityTimeline, type LocalEvent, type LocalEntityType } from "./store";

export type { LocalEvent };

interface ServerRowLike {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  note?: string | null;
  actor_name?: string | null;
  created_at: string;
  payload?: unknown;
}

/** Linha do entity_events → formato de renderização da timeline. Pura p/ teste. */
export function serverRowToEvent(r: ServerRowLike): LocalEvent {
  const payload = (r.payload && typeof r.payload === "object" ? r.payload : {}) as Record<
    string,
    unknown
  >;
  return {
    id: r.id,
    entity_type: r.entity_type as LocalEntityType,
    entity_id: r.entity_id,
    event_type: r.event_type,
    from_status: r.from_status ?? null,
    to_status: r.to_status ?? null,
    note: r.note ?? null,
    actor_name: r.actor_name ?? null,
    created_at: r.created_at,
    payload,
  };
}

/**
 * Mescla e ordena (mais recente primeiro). Eventos locais cujo espelho do
 * servidor já chegou (payload.local_id bate) somem do resultado — a cópia do
 * servidor vence porque carrega o ator real.
 */
export function mergeTimelines(
  serverRows: ServerRowLike[],
  localEvents: LocalEvent[],
): LocalEvent[] {
  const server = serverRows.map(serverRowToEvent);
  const mirrored = new Set(
    server
      .map((s) => (typeof s.payload?.local_id === "string" ? (s.payload.local_id as string) : null))
      .filter((x): x is string => x !== null),
  );
  const local = localEvents.filter((l) => !mirrored.has(l.id));
  return [...server, ...local].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function useCreativeTimeline(entityType: LocalEntityType, entityId: string) {
  const local = useLocalEntityTimeline(entityType, entityId);
  // o cast existe até o supabase gen types rodar depois do db push — o enum do
  // banco já conhece os valores (migration 20261009210000).
  const server = useEntityTimeline(entityType as never, entityId);
  const items = useMemo(
    () => mergeTimelines(server.items as ServerRowLike[], local.items),
    [server.items, local.items],
  );
  return {
    items,
    // só mostramos loading se não HÁ nada local — com cache no dispositivo a
    // resposta é imediata e um servidor lento não apaga o que o usuário vê.
    loading: server.loading && local.items.length === 0,
  };
}
