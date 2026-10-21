// Fonte única do Kanban do PCP: OPs reais do banco convertidas em lotes.
//
// Antes (até 21/10/2026) a tela lia o seed de `src/lib/pcp/store.ts` e o pedido
// liberado ao PCP só aparecia na aba "Por OP / Rota". Agora as duas coisas vêm do
// mesmo lugar; o seed fica apenas como demonstração quando não há OP nenhuma.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { looseDb } from "@/lib/db/loose";
import { useProductionOrders, useProductionRoutes } from "@/hooks/use-production-orders";
import { usePCPStore } from "@/lib/pcp/store";
import { ordersToLotes, type DbPassage, type DbStep } from "@/lib/pcp/from-orders";
import type { Lote } from "@/types/pcp";

/** Etapas de todas as rotas, indexadas por rota. */
export function useRouteSteps() {
  const { data: routes = [] } = useProductionRoutes();
  return useMemo(() => {
    const byRoute: Record<string, DbStep[]> = {};
    for (const r of routes) {
      byRoute[r.id] = (r.steps ?? []).map((s) => ({
        id: s.id,
        sector: s.sector,
        sequence: s.sequence,
      }));
    }
    return byRoute;
  }, [routes]);
}

/** Todas as passagens recentes (a tela de PCP trabalha no horizonte de dias). */
export function useAllPassages() {
  return useQuery({
    queryKey: ["pcp-op", "passages", "all"],
    queryFn: async (): Promise<DbPassage[]> => {
      const { data, error } = await looseDb
        .from("production_passages")
        .select(
          "id, production_order_item_id, origin_step_id, destination_step_id, quantity, type, responsible_name, observation, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as DbPassage[];
    },
  });
}

/**
 * Grade do item de produção: `sales_order_items` aponta para o item da OP
 * (`production_order_item_id`) e guarda a grade em `sales_order_item_sizes`.
 */
export function useOrderItemGrades() {
  return useQuery({
    queryKey: ["pcp-op", "grades"],
    queryFn: async (): Promise<Record<string, Record<string, number>>> => {
      const { data, error } = await looseDb
        .from("sales_order_items")
        .select("production_order_item_id, sales_order_item_sizes(size, quantity)")
        .not("production_order_item_id", "is", null);
      if (error) throw error;
      const out: Record<string, Record<string, number>> = {};
      for (const row of (data ?? []) as unknown as Array<{
        production_order_item_id: string | null;
        sales_order_item_sizes: Array<{ size: string; quantity: number }> | null;
      }>) {
        if (!row.production_order_item_id) continue;
        const grade: Record<string, number> = {};
        for (const s of row.sales_order_item_sizes ?? []) grade[s.size] = s.quantity;
        if (Object.keys(grade).length > 0) out[row.production_order_item_id] = grade;
      }
      return out;
    },
  });
}

/**
 * Lotes do Kanban.
 *
 * `isDemo` só é true quando o banco não tem NENHUMA OP — a tela mostra o seed de
 * demonstração com aviso explícito. Com OP real, o seed não aparece: uma tela com
 * dado inventado ao lado de dado real é pior do que uma tela vazia.
 */
export function usePcpLotes(): {
  lotes: Lote[];
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
} {
  const { data: orders = [], isLoading, error } = useProductionOrders();
  const stepsByRoute = useRouteSteps();
  const { data: passages = [] } = useAllPassages();
  const { data: grades = {} } = useOrderItemGrades();
  const demoLotes = usePCPStore((s) => s.lotes);

  return useMemo(() => {
    const dbOrders = orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      priority: o.priority,
      planned_start: o.planned_start,
      planned_end: o.planned_end,
      items: (o.items ?? []).map((i) => ({
        ...i,
        grade: grades[i.id],
      })),
    }));

    if (dbOrders.length === 0) {
      return {
        lotes: demoLotes,
        isDemo: true,
        isLoading,
        error: error ? String((error as Error).message ?? error) : null,
      };
    }

    return {
      lotes: ordersToLotes(dbOrders, stepsByRoute, passages),
      isDemo: false,
      isLoading,
      error: error ? String((error as Error).message ?? error) : null,
    };
  }, [orders, stepsByRoute, passages, grades, demoLotes, isLoading, error]);
}
