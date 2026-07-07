// V8 · Hook para acionar performTransition com toast + invalidação de queries.
// Renomeado para useWorkflowTransition para não conflitar com React.useTransition.
import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  performTransition,
  type TransitionResult,
} from "@/lib/workflow/transition.functions";
import type { WorkflowEntityType } from "@/hooks/use-workflow";

// Mapa entity_type → query keys que devem ser invalidadas após a transição.
const INVALIDATION_KEYS: Record<WorkflowEntityType, string[][]> = {
  reference: [["references"], ["reference"]],
  lote: [["pcp_lots"], ["lote"], ["pcp"]],
  tech_sheet: [["tech_sheets"], ["tech_sheet"]],
  capa: [["quality_capa"], ["capa"]],
  piloto: [["pilotos"], ["piloto"]],
  engenharia: [["engenharia"]],
  facao_order: [["facao_orders"], ["facao"]],
};

export function useWorkflowTransition(entityType: WorkflowEntityType) {
  const runTransition = useServerFn(performTransition);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const transition = useCallback(
    async (input: {
      entity_id: string;
      from_status: string;
      to_status: string;
      note?: string;
    }): Promise<TransitionResult | null> => {
      setPending(true);
      const label = `${input.from_status} → ${input.to_status}`;
      try {
        const res = await runTransition({
          data: { entity_type: entityType, ...input },
        });

        if (!res.ok) {
          toast.error(res.reason ?? `Transição bloqueada (${label})`);
          return res;
        }

        toast.success(`Status atualizado: ${label}`);

        // Invalida coleções e a entidade específica + timeline de eventos
        const keys = INVALIDATION_KEYS[entityType] ?? [[entityType]];
        await Promise.all([
          ...keys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key }),
          ),
          queryClient.invalidateQueries({
            queryKey: ["entity_events", entityType, input.entity_id],
          }),
          queryClient.invalidateQueries({
            queryKey: [entityType, input.entity_id],
          }),
        ]);

        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        toast.error(`Falha na transição (${label}): ${msg}`);
        return null;
      } finally {
        setPending(false);
      }
    },
    [entityType, runTransition, queryClient],
  );

  return { transition, pending };
}
