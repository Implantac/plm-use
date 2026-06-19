// PCP <-> Lovable Cloud sync layer.
// Strategy: store full Lote payload em pcp_lots.metadata (jsonb), keyed por code (= Lote.numero).
// Não destrói o store local — hidrata se existir dado remoto e empurra mutações como upsert.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePCPStore } from "./store";
import type { Lote } from "@/types/pcp";

let hydrated = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function mapPriority(p: Lote["prioridade"]): "baixa" | "media" | "alta" | "critica" {
  switch (p) {
    case "Urgente":
      return "critica";
    case "Alta":
      return "alta";
    case "Baixa":
      return "baixa";
    default:
      return "media";
  }
}

function loteAggregate(l: Lote) {
  const ref = l.referencias[0];
  const total = l.referencias.reduce((s, r) => s + r.qtd_programada, 0);
  const prod = l.referencias.reduce((s, r) => s + r.qtd_produzida, 0);
  return {
    code: l.numero,
    model: ref?.nome ?? l.grupo,
    collection: l.colecao ?? null,
    quantity: total,
    current_stage: ref?.setor_atual ?? "Compras",
    due_date: l.data_prevista || null,
    status: "em_producao" as const,
    priority: mapPriority(l.prioridade),
    progress_percent: total > 0 ? Math.round((prod / total) * 100) : 0,
    metadata: { lote: l } as unknown as never,
  };
}

export async function hydratePCPFromCloud(force = false) {
  if (hydrated && !force) return;
  hydrated = true;
  const { data, error } = await supabase
    .from("pcp_lots")
    .select("code, metadata")
    .order("created_at", { ascending: true });
  if (error || !data || data.length === 0) return;
  const remote = data
    .map((row) => (row.metadata as { lote?: Lote } | null)?.lote)
    .filter((x): x is Lote => !!x && Array.isArray(x.referencias));
  if (remote.length === 0) return;
  usePCPStore.setState({ lotes: remote });
}

export async function pushAllLotes() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  const lotes = usePCPStore.getState().lotes;
  const rows = lotes.map((l) => ({ ...loteAggregate(l), created_by: uid }));
  if (rows.length === 0) return;
  await supabase.from("pcp_lots").upsert(rows, { onConflict: "code" });
}

export function usePCPCloudSync(enabled: boolean) {
  const subRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!enabled) return;
    void hydratePCPFromCloud();
    const unsub = usePCPStore.subscribe(() => {
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => void pushAllLotes(), 800);
    });
    subRef.current = unsub;
    const channel = supabase
      .channel("pcp-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "pcp_lots" }, () => {
        void hydratePCPFromCloud(true);
      })
      .subscribe();
    return () => {
      unsub();
      if (pushTimer) clearTimeout(pushTimer);
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
