// Log de eventos local para entidades ainda não persistidas no banco.
// Mesmo formato conceitual de public.entity_events, mas armazenado em localStorage
// enquanto essas entidades vivem em stores in-memory (colors, prints, looks,
// display, collection-map, measurements).
// Quando a entidade migrar para tabela server, basta trocar o emit por
// useEventEmitter().emit — o consumidor de UI (LocalEntityTimeline) continua igual.

import { useEffect, useState } from "react";
import { mirrorEvent } from "./mirror";
import { gravarLocal, lerLocal } from "@/lib/armazenamento-local";

export type LocalEntityType =
  | "color_palette"
  | "print_design"
  | "look"
  | "display_board"
  | "collection_map"
  | "measurement_chart";

export const LOCAL_ENTITY_LABEL: Record<LocalEntityType, string> = {
  color_palette: "Cartela de Cores",
  print_design: "Estampa",
  look: "Look",
  display_board: "Painel de Displayagem",
  collection_map: "Mapa de Coleção",
  measurement_chart: "Tabela de Medidas",
};

export type LocalEvent = {
  id: string;
  entity_type: LocalEntityType;
  entity_id: string;
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  note?: string | null;
  actor_name?: string | null;
  created_at: string; // ISO
  payload?: Record<string, unknown>;
};

const STORAGE_KEY = "use-moda-local-events";
const MAX_EVENTS = 800;

type Listener = () => void;
const listeners = new Set<Listener>();
let events: LocalEvent[] = load();

function load(): LocalEvent[] {
  return lerLocal<LocalEvent[]>(STORAGE_KEY, "o histórico local de eventos", [], Array.isArray);
}

function persist() {
  gravarLocal(STORAGE_KEY, "o histórico local de eventos", events.slice(0, MAX_EVENTS));
}

export function emitLocalEvent(
  input: Omit<LocalEvent, "id" | "created_at"> & { created_at?: string },
) {
  const evt: LocalEvent = {
    id: crypto.randomUUID(),
    created_at: input.created_at ?? new Date().toISOString(),
    ...input,
  };
  events = [evt, ...events].slice(0, MAX_EVENTS);
  persist();
  listeners.forEach((l) => l());
  void mirrorEvent(evt); // melhor-esforço: timeline vira cross-device quando o banco permitir
  return evt;
}

export function listLocalEvents(entityType: LocalEntityType, entityId: string): LocalEvent[] {
  return events.filter((e) => e.entity_type === entityType && e.entity_id === entityId);
}

export function useLocalEntityTimeline(
  entityType: LocalEntityType | null,
  entityId: string | null,
) {
  const [items, setItems] = useState<LocalEvent[]>(() =>
    entityType && entityId ? listLocalEvents(entityType, entityId) : [],
  );

  useEffect(() => {
    if (!entityType || !entityId) {
      setItems([]);
      return;
    }
    const refresh = () => setItems(listLocalEvents(entityType, entityId));
    refresh();
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
    };
  }, [entityType, entityId]);

  return { items, loading: false };
}
