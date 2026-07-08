// Doc 06.2 · Almoxarifado — server functions.
// Todas as escritas via requireSupabaseAuth (RLS aplica como o usuário).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- listStockItems --------------------------------------------------
export const listStockItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("stock_item")
      .select("*")
      .order("annual_revenue", { ascending: false });
    if (error) return { ok: false as const, reason: error.message, items: [] };
    return { ok: true as const, items: data ?? [] };
  });

// ---------- listStockBalance ------------------------------------------------
export const listStockBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("stock_balance")
      .select("*")
      .order("item_name", { ascending: true });
    if (error) return { ok: false as const, reason: error.message, balances: [] };
    return { ok: true as const, balances: data ?? [] };
  });

// ---------- upsertStockItem -------------------------------------------------
const UpsertItemInput = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).max(60),
  name: z.string().min(1).max(240),
  category: z.enum(["tecido", "aviamento", "embalagem", "acabado", "insumo", "etiqueta"]),
  unit: z.string().min(1).max(10).default("un"),
  lead_time_days: z.number().int().min(0).default(0),
  demand_avg_daily: z.number().min(0).default(0),
  demand_stddev: z.number().min(0).default(0),
  service_factor: z.number().min(0).max(5).default(1.65),
  annual_qty: z.number().min(0).default(0),
  annual_revenue: z.number().min(0).default(0),
  unit_price: z.number().min(0).default(0),
  order_cost: z.number().min(0).default(0),
  holding_cost_unit: z.number().min(0).default(0),
  supplier_default: z.string().max(240).optional(),
  notes: z.string().max(2000).optional(),
  is_active: z.boolean().default(true),
});

export const upsertStockItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpsertItemInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { data: row, error } = await supabase
        .from("stock_item")
        .update({ ...data, updated_by: userId })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) return { ok: false as const, reason: error.message };
      return { ok: true as const, item: row };
    }
    const { data: row, error } = await supabase
      .from("stock_item")
      .insert({ ...data, created_by: userId, updated_by: userId })
      .select("*")
      .single();
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, item: row };
  });

// ---------- registerMovement -------------------------------------------------
const MovementInput = z.object({
  item_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  kind: z.enum(["in", "out", "transfer_in", "transfer_out", "adjust", "count"]),
  qty: z.number().positive(),
  ref_type: z.string().max(60).optional(),
  ref_id: z.string().uuid().optional(),
  lot_code: z.string().max(60).optional(),
  justification: z.string().max(2000).optional(),
});

export const registerMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MovementInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.kind === "adjust" && (!data.justification || data.justification.trim().length < 3)) {
      return { ok: false as const, reason: "Ajuste requer justificativa (mín. 3 caracteres)." };
    }

    // Valida saldo suficiente para saídas
    if (["out", "transfer_out"].includes(data.kind)) {
      const { data: bal } = await supabase
        .from("stock_balance")
        .select("qty_on_hand, qty_reserved")
        .eq("item_id", data.item_id)
        .eq("warehouse_id", data.warehouse_id)
        .maybeSingle();
      const onHand = Number(bal?.qty_on_hand ?? 0);
      if (onHand < data.qty) {
        return { ok: false as const, reason: `Saldo insuficiente (${onHand} disponível).` };
      }
    }

    const { data: row, error } = await supabase
      .from("stock_movement")
      .insert({ ...data, created_by: userId })
      .select("*")
      .single();
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, movement: row };
  });

// ---------- createReservation -----------------------------------------------
const ReservationInput = z.object({
  item_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  qty: z.number().positive(),
  ref_type: z.enum(["pcp_lot", "piloto", "op"]),
  ref_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export const createReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReservationInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("stock_reservation")
      .insert({ ...data, created_by: userId })
      .select("*")
      .single();
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, reservation: row };
  });

// ---------- updateReservationStatus -----------------------------------------
const UpdateResInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["ativa", "consumida", "cancelada"]),
});

export const updateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateResInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const nowIso = new Date().toISOString();
    const patch = {
      status: data.status,
      consumed_at: data.status === "consumida" ? nowIso : null,
      cancelled_at: data.status === "cancelada" ? nowIso : null,
    };

    const { data: row, error } = await supabase
      .from("stock_reservation")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, reservation: row };
  });

// ---------- runAbcClassification --------------------------------------------
// Reordena todos os itens ativos por annual_revenue e atribui A/B/C.
// classify_abc é SECURITY DEFINER e só é executável por service_role — usamos
// o admin client após validar o papel do chamador via requireSupabaseAuth +
// has_role check ('admin' | 'manager' | 'almoxarifado').
export const runAbcClassification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: allowed, error: roleError } = await supabase.rpc("has_stock_write_role", {
      _uid: userId,
    } as never);
    if (roleError) return { ok: false as const, reason: roleError.message, changes: [] };
    if (!allowed) return { ok: false as const, reason: "forbidden", changes: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("classify_abc", {
      _a_threshold: 0.8,
      _b_threshold: 0.95,
    });
    if (error) return { ok: false as const, reason: error.message, changes: [] };
    return { ok: true as const, changes: data ?? [] };
  });

// ---------- listWarehouses ---------------------------------------------------
export const listWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("warehouse")
      .select("*")
      .order("code");
    if (error) return { ok: false as const, reason: error.message, warehouses: [] };
    return { ok: true as const, warehouses: data ?? [] };
  });
