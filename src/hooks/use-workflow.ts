// V8 · Motor de workflow genérico — consulta workflow_definitions polimórfico.
// Serve para qualquer entidade (reference, lote, capa, tech_sheet, piloto, ...).
// Aditivo: não substitui use-references, apenas complementa para outras entidades.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WorkflowEntityType =
  "reference" | "lote" | "tech_sheet" | "piloto" | "capa" | "engenharia" | "facao_order";

export interface WorkflowDefinition {
  id: string;
  entity_type: string;
  from_status: string;
  to_status: string;
  requires_role: string | null;
  requires_checklist: unknown;
  sla_hours: number | null;
  is_active: boolean;
}

export function useWorkflow(entityType: WorkflowEntityType) {
  const [defs, setDefs] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("workflow_definitions" as never)
      .select("*")
      .eq("entity_type", entityType)
      .eq("is_active", true)
      .then(({ data }) => {
        if (cancelled) return;
        setDefs((data as WorkflowDefinition[] | null) ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType]);

  const nextStatuses = useCallback(
    (from: string): string[] => defs.filter((d) => d.from_status === from).map((d) => d.to_status),
    [defs],
  );

  const canTransition = useCallback(
    (from: string, to: string): boolean =>
      defs.some((d) => d.from_status === from && d.to_status === to),
    [defs],
  );

  const validateRemote = useCallback(
    async (from: string, to: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc(
        "can_transition" as never,
        {
          _entity_type: entityType,
          _from: from,
          _to: to,
        } as never,
      );
      if (error) return false;
      return Boolean(data);
    },
    [entityType],
  );

  const graph = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of defs) {
      const arr = map.get(d.from_status) ?? [];
      arr.push(d.to_status);
      map.set(d.from_status, arr);
    }
    return map;
  }, [defs]);

  return { defs, loading, nextStatuses, canTransition, validateRemote, graph };
}
