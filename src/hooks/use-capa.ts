// CAPA workflow — Supabase-backed com timeline de eventos e realtime.
// Estados: Aberta → Investigação → Ação → Verificação → Concluída (ou Reprovada).
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

type CapaUpdate = Database["public"]["Tables"]["quality_capa"]["Update"];

export const CAPA_STATUSES = [
  "Aberta",
  "Investigação",
  "Ação",
  "Verificação",
  "Concluída",
  "Reprovada",
] as const;
export type CapaStatus = (typeof CAPA_STATUSES)[number];

export const CAPA_SEVERIDADES = ["Baixa", "Média", "Alta", "Crítica"] as const;
export type CapaSeveridade = (typeof CAPA_SEVERIDADES)[number];

export type CapaTipo = "Corretiva" | "Preventiva";
export type CapaEficacia = "Eficaz" | "Não eficaz" | "Pendente" | null;

export type Capa = {
  id: string;
  ref: string | null;
  lote: string | null;
  defeito: string;
  setor: string;
  fornecedor: string | null;
  tipo: CapaTipo;
  responsavel: string;
  prazo: string | null;
  status: CapaStatus;
  severidade: CapaSeveridade;
  causa_raiz: string | null;
  cinco_porques: string[];
  evidencias: { url: string; label: string }[];
  acao_imediata: string | null;
  acao_corretiva: string | null;
  acao_preventiva: string | null;
  verificado_em: string | null;
  verificado_por: string | null;
  eficacia: CapaEficacia;
  reincidencia_de: string | null;
  criada: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CapaEvent = {
  id: string;
  capa_id: string;
  event: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor: string | null;
  actor_name: string | null;
  created_at: string;
};

export type NewCapaInput = {
  defeito: string;
  setor: string;
  tipo: CapaTipo;
  responsavel: string;
  prazo?: string | null;
  severidade?: CapaSeveridade;
  ref?: string | null;
  lote?: string | null;
  fornecedor?: string | null;
  reincidencia_de?: string | null;
};

// Legal transitions
const TRANSITIONS: Record<CapaStatus, CapaStatus[]> = {
  Aberta: ["Investigação", "Reprovada"],
  Investigação: ["Ação", "Reprovada"],
  Ação: ["Verificação", "Reprovada"],
  Verificação: ["Concluída", "Ação", "Reprovada"],
  Concluída: [],
  Reprovada: ["Aberta"],
};

export function canTransition(from: CapaStatus, to: CapaStatus) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: CapaStatus) {
  return TRANSITIONS[from] ?? [];
}

function rowToCapa(row: Record<string, unknown>): Capa {
  return {
    id: row.id as string,
    ref: (row.ref as string) ?? null,
    lote: (row.lote as string) ?? null,
    defeito: row.defeito as string,
    setor: row.setor as string,
    fornecedor: (row.fornecedor as string) ?? null,
    tipo: row.tipo as CapaTipo,
    responsavel: row.responsavel as string,
    prazo: (row.prazo as string) ?? null,
    status: row.status as CapaStatus,
    severidade: (row.severidade as CapaSeveridade) ?? "Média",
    causa_raiz: (row.causa_raiz as string) ?? null,
    cinco_porques: Array.isArray(row.cinco_porques)
      ? (row.cinco_porques as string[])
      : [],
    evidencias: Array.isArray(row.evidencias)
      ? (row.evidencias as { url: string; label: string }[])
      : [],
    acao_imediata: (row.acao_imediata as string) ?? null,
    acao_corretiva: (row.acao_corretiva as string) ?? null,
    acao_preventiva: (row.acao_preventiva as string) ?? null,
    verificado_em: (row.verificado_em as string) ?? null,
    verificado_por: (row.verificado_por as string) ?? null,
    eficacia: (row.eficacia as CapaEficacia) ?? null,
    reincidencia_de: (row.reincidencia_de as string) ?? null,
    criada: row.criada as string,
    created_by: (row.created_by as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function useCapa() {
  const { user } = useAuth();
  const [items, setItems] = useState<Capa[]>([]);
  const [events, setEvents] = useState<CapaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const actorName = useMemo(
    () =>
      (user?.user_metadata?.full_name as string) ||
      (user?.user_metadata?.name as string) ||
      user?.email ||
      "Usuário",
    [user],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase
        .from("quality_capa")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("capa_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]).then(([capaRes, evRes]) => {
      if (cancelled) return;
      if (capaRes.data) setItems(capaRes.data.map(rowToCapa));
      if (evRes.data) setEvents(evRes.data as CapaEvent[]);
      setLoading(false);
    });

    const ch = supabase
      .channel("capa-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quality_capa" },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const c = rowToCapa(payload.new as Record<string, unknown>);
              if (prev.some((p) => p.id === c.id)) return prev;
              return [c, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const c = rowToCapa(payload.new as Record<string, unknown>);
              return prev.map((p) => (p.id === c.id ? c : p));
            }
            if (payload.eventType === "DELETE") {
              const o = payload.old as { id: string };
              return prev.filter((p) => p.id !== o.id);
            }
            return prev;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "capa_events" },
        (payload) => {
          const e = payload.new as CapaEvent;
          setEvents((prev) =>
            prev.some((p) => p.id === e.id) ? prev : [e, ...prev],
          );
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, []);

  const logEvent = useCallback(
    async (
      capa_id: string,
      event: string,
      from_status: CapaStatus | null,
      to_status: CapaStatus | null,
      note?: string | null,
    ) => {
      if (!user) return;
      await supabase.from("capa_events").insert({
        capa_id,
        event,
        from_status,
        to_status,
        note: note ?? null,
        actor: user.id,
        actor_name: actorName,
      });
    },
    [user, actorName],
  );

  const create = useCallback(
    async (input: NewCapaInput) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("quality_capa")
        .insert({
          defeito: input.defeito,
          setor: input.setor,
          tipo: input.tipo,
          responsavel: input.responsavel,
          prazo: input.prazo ?? null,
          severidade: input.severidade ?? "Média",
          ref: input.ref ?? null,
          lote: input.lote ?? null,
          fornecedor: input.fornecedor ?? null,
          reincidencia_de: input.reincidencia_de ?? null,
          status: "Aberta",
          criada: new Date().toISOString().slice(0, 10),
          created_by: user.id,
        })
        .select()
        .single();
      if (error || !data) return null;
      const capa = rowToCapa(data as Record<string, unknown>);
      await logEvent(
        capa.id,
        "Abertura",
        null,
        "Aberta",
        `CAPA ${capa.tipo} — ${capa.defeito} (${capa.setor})`,
      );
      return capa;
    },
    [user, logEvent],
  );

  const transition = useCallback(
    async (capa: Capa, to: CapaStatus, note?: string) => {
      if (!canTransition(capa.status, to)) return false;
      const patch: Record<string, unknown> = { status: to };
      if (to === "Concluída") {
        patch.verificado_em = new Date().toISOString();
        patch.verificado_por = user?.id ?? null;
        if (!capa.eficacia) patch.eficacia = "Eficaz";
      }
      const { error } = await supabase
        .from("quality_capa")
        .update(patch)
        .eq("id", capa.id);
      if (error) return false;
      await logEvent(capa.id, `Transição → ${to}`, capa.status, to, note);
      return true;
    },
    [logEvent, user],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Capa>, note?: string) => {
      const remap: Record<string, unknown> = {};
      const keys = [
        "responsavel",
        "prazo",
        "severidade",
        "fornecedor",
        "causa_raiz",
        "cinco_porques",
        "evidencias",
        "acao_imediata",
        "acao_corretiva",
        "acao_preventiva",
        "eficacia",
        "tipo",
        "setor",
        "defeito",
      ] as const;
      for (const k of keys) if (k in patch) remap[k] = patch[k as keyof Capa];
      if (Object.keys(remap).length === 0) return true;
      const { error } = await supabase
        .from("quality_capa")
        .update(remap)
        .eq("id", id);
      if (error) return false;
      await logEvent(id, "Edição", null, null, note ?? Object.keys(remap).join(", "));
      return true;
    },
    [logEvent],
  );

  const remove = useCallback(async (id: string) => {
    await supabase.from("quality_capa").delete().eq("id", id);
  }, []);

  const eventsOf = useCallback(
    (capa_id: string) =>
      events
        .filter((e) => e.capa_id === capa_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [events],
  );

  return {
    items,
    events,
    loading,
    create,
    transition,
    update,
    remove,
    eventsOf,
  };
}

export function isOverdue(c: Capa) {
  if (!c.prazo) return false;
  if (c.status === "Concluída" || c.status === "Reprovada") return false;
  return c.prazo < new Date().toISOString().slice(0, 10);
}
