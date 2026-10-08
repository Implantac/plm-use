// H9-10 · Lançamento — hook único (waves, itens, handoffs) com realtime.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LaunchWaveRow = Database["public"]["Tables"]["launch_wave"]["Row"];
export type LaunchItemRow = Database["public"]["Tables"]["launch_item"]["Row"];
export type LaunchHandoffRow = Database["public"]["Tables"]["launch_handoff"]["Row"];

export type LaunchWaveStatus =
  | "rascunho"
  | "em_revisao"
  | "aprovada"
  | "publicada"
  | "em_producao"
  | "lancada"
  | "encerrada"
  | "cancelada";

export type LaunchItemStatus =
  | "proposto"
  | "validado"
  | "aprovado"
  | "em_producao"
  | "disponivel"
  | "esgotado"
  | "descontinuado";

export const WAVE_STATUS_LABEL: Record<LaunchWaveStatus, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  aprovada: "Aprovada",
  publicada: "Publicada",
  em_producao: "Em produção",
  lancada: "Lançada",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export const ITEM_STATUS_LABEL: Record<LaunchItemStatus, string> = {
  proposto: "Proposto",
  validado: "Validado",
  aprovado: "Aprovado",
  em_producao: "Em produção",
  disponivel: "Disponível",
  esgotado: "Esgotado",
  descontinuado: "Descontinuado",
};

export const WAVE_NEXT: Record<LaunchWaveStatus, LaunchWaveStatus[]> = {
  rascunho: ["em_revisao", "cancelada"],
  em_revisao: ["aprovada", "rascunho", "cancelada"],
  aprovada: ["publicada", "em_revisao", "cancelada"],
  publicada: ["em_producao"],
  em_producao: ["lancada"],
  lancada: ["encerrada"],
  encerrada: [],
  cancelada: [],
};

export const ITEM_NEXT: Record<LaunchItemStatus, LaunchItemStatus[]> = {
  proposto: ["validado"],
  validado: ["aprovado", "proposto"],
  aprovado: ["em_producao", "descontinuado"],
  em_producao: ["disponivel"],
  disponivel: ["esgotado", "descontinuado"],
  esgotado: [],
  descontinuado: [],
};

export type LaunchPerformance = {
  wave_id: string;
  codigo?: string | null;
  janela_dias?: number | null;
  sell_through_pct?: number | null;
  fonte?: string | null;
  calculado_em: string;
};

export function useLaunch() {
  const [waves, setWaves] = useState<LaunchWaveRow[]>([]);
  const [items, setItems] = useState<LaunchItemRow[]>([]);
  const [handoffs, setHandoffs] = useState<LaunchHandoffRow[]>([]);
  const [performance, setPerformance] = useState<Record<string, LaunchPerformance>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase.from("launch_wave").select("*").order("created_at", { ascending: false }),
      supabase.from("launch_item").select("*").order("created_at", { ascending: false }),
      supabase.from("launch_handoff").select("*").order("created_at", { ascending: false }),
      supabase
        .from("entity_events")
        .select("entity_id, entity_type, event_type, payload, created_at")
        .eq("entity_type", "launch_wave")
        .eq("event_type", "launch.performance.updated")
        .order("created_at", { ascending: false })
        .limit(500),
    ]).then(([w, i, h, ev]) => {
      if (cancelled) return;
      if (w.data) setWaves(w.data as LaunchWaveRow[]);
      if (i.data) setItems(i.data as LaunchItemRow[]);
      if (h.data) setHandoffs(h.data as LaunchHandoffRow[]);
      if (ev.data) {
        const map: Record<string, LaunchPerformance> = {};
        for (const row of ev.data) {
          if (map[row.entity_id]) continue; // ordenado desc → mantém o mais recente
          map[row.entity_id] = toPerformance(row.entity_id, row.payload, row.created_at);
        }
        setPerformance(map);
      }
      setLoading(false);
    });

    const ch = supabase
      .channel(`launch-live-${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "launch_wave" }, (p) =>
        setWaves((prev) => mergeRow(prev, p)),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "launch_item" }, (p) =>
        setItems((prev) => mergeRow(prev, p)),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "launch_handoff" }, (p) =>
        setHandoffs((prev) => mergeRow(prev, p)),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "entity_events",
          filter: "event_type=eq.launch.performance.updated",
        },
        (p) => {
          const row = p.new as {
            entity_id: string;
            entity_type: string;
            payload: unknown;
            created_at: string;
          };
          if (row.entity_type !== "launch_wave") return;
          setPerformance((prev) => ({
            ...prev,
            [row.entity_id]: toPerformance(row.entity_id, row.payload, row.created_at),
          }));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, []);

  const itemsByWave = useMemo(() => {
    const m = new Map<string, LaunchItemRow[]>();
    for (const it of items) {
      const arr = m.get(it.wave_id) ?? [];
      arr.push(it);
      m.set(it.wave_id, arr);
    }
    return m;
  }, [items]);

  const handoffsByWave = useMemo(() => {
    const m = new Map<string, LaunchHandoffRow[]>();
    for (const h of handoffs) {
      const arr = m.get(h.wave_id) ?? [];
      arr.push(h);
      m.set(h.wave_id, arr);
    }
    return m;
  }, [handoffs]);

  return { waves, items, handoffs, itemsByWave, handoffsByWave, performance, loading };
}

function toPerformance(waveId: string, payload: unknown, createdAt: string): LaunchPerformance {
  const p = (payload ?? {}) as Record<string, unknown>;
  return {
    wave_id: waveId,
    codigo: (p.codigo as string | null) ?? null,
    janela_dias: (p.janela_dias as number | null) ?? null,
    sell_through_pct: (p.sell_through_pct as number | null) ?? null,
    fonte: (p.fonte as string | null) ?? null,
    calculado_em: (p.calculado_em as string) ?? createdAt,
  };
}

function mergeRow<T extends { id: string }>(
  prev: T[],
  payload: { eventType: string; new: unknown; old: unknown },
): T[] {
  if (payload.eventType === "INSERT") {
    const row = payload.new as T;
    return prev.some((p) => p.id === row.id) ? prev : [row, ...prev];
  }
  if (payload.eventType === "UPDATE") {
    const row = payload.new as T;
    return prev.map((p) => (p.id === row.id ? row : p));
  }
  if (payload.eventType === "DELETE") {
    const o = payload.old as { id: string };
    return prev.filter((p) => p.id !== o.id);
  }
  return prev;
}
