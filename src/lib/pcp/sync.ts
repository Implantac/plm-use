// PCP <-> Lovable Cloud sync layer.
// Strategy: store full Lote payload em pcp_lots.metadata (jsonb), keyed por code (= Lote.numero).
// Não destrói o store local — hidrata se existir dado remoto e empurra mutações como upsert.
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { avisoUnico, descreverErroSupabase } from "@/lib/supabase/erro-humano";
import { lotesOperacionais, usePCPStore } from "./store";
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
  // Onda 83: só lote operacional sobe para a nuvem — vitrine (`demo: true`)
  // nunca vira linha em `pcp_lots` (contrato das Ondas 51/59/72).
  const lotes = lotesOperacionais(usePCPStore.getState().lotes);
  const rows = lotes.map((l) => ({ ...loteAggregate(l), created_by: uid }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("pcp_lots").upsert(rows, { onConflict: "code" });
  if (error) {
    // Onda 83: lote salvo localmente mas não sincronizado não pode falhar em
    // silêncio — o usuário precisa saber o porquê (permissão, sessão, tabela).
    // Aviso único por minuto, porque o push é debounced a cada alteração.
    const msg = descreverErroSupabase(error, "sincronizar os lotes de produção na nuvem");
    console.error("[pcp-sync]", error.message);
    if (avisoUnico(msg)) toast.error(msg);
  }
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
      .channel(`pcp-live-${Math.random().toString(36).slice(2, 10)}`)
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
