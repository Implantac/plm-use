// PCP por OP / Rota — leitura e passagens (regras no banco: register_passages).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RouteStep {
  id: string;
  route_id: string;
  sequence: number;
  sector: string;
  operation: string;
  mandatory: boolean;
  outsourced: boolean;
}
export interface ProdRoute {
  id: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  steps: RouteStep[];
}
export interface OpItem {
  id: string;
  production_order_id: string;
  reference_code: string;
  reference_name: string | null;
  color: string | null;
  route_id: string;
  quantity_planned: number;
  quantity_produced: number;
  quantity_lost: number;
  status: string;
  balances: { step_id: string; quantity: number }[];
}
export interface ProductionOrder {
  id: string;
  number: string;
  erp_op_id: string | null;
  status: string;
  priority: string;
  planned_start: string | null;
  planned_end: string | null;
  items: OpItem[];
}
export interface Passage {
  id: string;
  batch_id: string;
  production_order_item_id: string;
  origin_step_id: string | null;
  destination_step_id: string | null;
  quantity: number;
  type: string;
  responsible_name: string | null;
  observation: string | null;
  created_at: string;
}

export const routesKey = ["pcp-op", "routes"] as const;
export const ordersKey = ["pcp-op", "orders"] as const;

export function useProductionRoutes() {
  return useQuery({
    queryKey: routesKey,
    queryFn: async (): Promise<ProdRoute[]> => {
      const { data, error } = await supabase
        .from("production_routes")
        .select("id, code, name, description, active, production_route_steps(id, route_id, sequence, sector, operation, mandatory, outsourced)")
        .order("code");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        steps: [...(r.production_route_steps ?? [])].sort((a, b) => a.sequence - b.sequence),
      }));
    },
  });
}

export function useProductionOrders() {
  return useQuery({
    queryKey: ordersKey,
    queryFn: async (): Promise<ProductionOrder[]> => {
      const { data, error } = await supabase
        .from("production_orders")
        .select(
          "id, number, erp_op_id, status, priority, planned_start, planned_end, production_order_items(id, production_order_id, reference_code, reference_name, color, route_id, quantity_planned, quantity_produced, quantity_lost, status, production_item_step_balance(step_id, quantity))",
        )
        .order("number");
      if (error) throw error;
      return (data ?? []).map(({ production_order_items, ...o }) => ({
        ...o,
        items: (production_order_items ?? []).map(({ production_item_step_balance, ...i }) => ({
          ...i,
          balances: (production_item_step_balance ?? []).filter((b) => b.quantity > 0),
        })),
      }));
    },
  });
}

export function usePassages(orderId: string | null) {
  return useQuery({
    queryKey: ["pcp-op", "passages", orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<Passage[]> => {
      const { data, error } = await supabase
        .from("production_passages")
        .select("id, batch_id, production_order_item_id, origin_step_id, destination_step_id, quantity, type, responsible_name, observation, created_at")
        .eq("production_order_id", orderId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface PassageMove {
  item_id: string;
  origin_step_id: string;
  quantity: number;
  type: "total" | "parcial" | "retorno" | "perda";
  destination_step_id?: string;
}

export function useRegisterPassages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ moves, observation }: { moves: PassageMove[]; observation?: string }) => {
      const { data, error } = await supabase.rpc("register_passages", {
        _moves: moves as unknown as never,
        _observation: observation || undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["pcp-op"] }),
  });
}

export function useChangeItemRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { itemId: string; routeId: string; reason: string }) => {
      const { error } = await supabase.rpc("change_item_route", { _item_id: a.itemId, _route_id: a.routeId, _reason: a.reason });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["pcp-op"] }),
  });
}

export function nextStep(route: ProdRoute | undefined, stepId: string): RouteStep | null {
  if (!route) return null;
  const cur = route.steps.find((s) => s.id === stepId);
  if (!cur) return null;
  return route.steps.find((s) => s.sequence > cur.sequence) ?? null;
}
