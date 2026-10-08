// Módulo de Aprovações (gates) do Fluxo do Produto.
// Cada gate guarda status + data da decisão; eventos são registrados por trigger.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";
import type { ReferenceStatus } from "@/hooks/use-references";

export type ReferenceGateRow = Database["public"]["Tables"]["reference_gate"]["Row"];
export type GateStatus = "pendente" | "aprovado" | "reprovado" | "dispensado";

export interface GateDef {
  id: string;
  label: string;
  /** Etapa da referência em que o gate é avaliado. */
  status: ReferenceStatus;
  owner: string;
  criterio: string;
}

/** Gates canônicos do ciclo de vida (portões entre fases). */
export const GATES: GateDef[] = [
  {
    id: "conceito",
    label: "Gate 1 · Conceito",
    status: "CROQUI",
    owner: "Estilo",
    criterio: "Croqui, cartela e briefing aprovados",
  },
  {
    id: "modelagem",
    label: "Gate 2 · Modelagem",
    status: "MODELAGEM",
    owner: "Modelagem",
    criterio: "Molde base e grade validados",
  },
  {
    id: "piloto",
    label: "Gate 3 · Piloto",
    status: "APROVACAO",
    owner: "Produto",
    criterio: "Peça-piloto aprovada em prova",
  },
  {
    id: "engenharia",
    label: "Gate 4 · Engenharia",
    status: "ENGENHARIA",
    owner: "Engenharia",
    criterio: "Ficha técnica, BOM e custo fechados",
  },
  {
    id: "producao",
    label: "Gate 5 · Liberação PCP",
    status: "PRODUCAO",
    owner: "PCP",
    criterio: "Insumos, capacidade e OP liberados",
  },
  {
    id: "lancamento",
    label: "Gate 6 · Lançamento",
    status: "FINALIZADA",
    owner: "Comercial",
    criterio: "Preço, canal e mostruário definidos",
  },
];

export const GATE_STATUS_LABEL: Record<GateStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  dispensado: "Dispensado",
};

export function gateById(id: string) {
  return GATES.find((g) => g.id === id);
}

export function useReferenceGates(referenceId?: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<ReferenceGateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let q = supabase.from("reference_gate").select("*").order("created_at", { ascending: true });
    if (referenceId) q = q.eq("reference_id", referenceId);
    const { data } = await q;
    setItems((data ?? []) as ReferenceGateRow[]);
    setLoading(false);
  }, [referenceId]);

  useEffect(() => {
    setLoading(true);
    void load();

    const ch = supabase
      .channel(`reference-gate-live-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reference_gate" },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  /** Abre (ou reaproveita) o gate de uma referência. */
  const openGate = useCallback(
    async (referenceIdArg: string, gate: string, dueDate?: string | null) => {
      if (!user) return false;
      const { error } = await supabase.from("reference_gate").upsert(
        {
          reference_id: referenceIdArg,
          gate,
          status: "pendente",
          due_date: dueDate ?? null,
          created_by: user.id,
          updated_by: user.id,
        },
        { onConflict: "reference_id,gate", ignoreDuplicates: true },
      );
      if (!error) await load();
      return !error;
    },
    [user, load],
  );

  /** Registra a decisão do gate — data e evento são gravados no banco. */
  const decide = useCallback(
    async (id: string, status: GateStatus, parecer?: string | null) => {
      if (!user) return false;
      const { error } = await supabase
        .from("reference_gate")
        .update({
          status,
          parecer: parecer ?? null,
          updated_by: user.id,
          decided_by: status === "pendente" ? null : user.id,
          decided_at: status === "pendente" ? null : new Date().toISOString(),
        })
        .eq("id", id);
      if (!error) await load();
      return !error;
    },
    [user, load],
  );

  return { items, loading, reload: load, openGate, decide };
}
