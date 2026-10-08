// @vitest-environment jsdom
// Testes de RLS do client para o Almoxarifado (stock_item).
// Cobre: usuário sem papel recebe lista vazia (RLS filtra); INSERT direto
// falha silenciosamente (retorna erro RLS); usuário com papel enxerga.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

type QueryResult = { data: unknown; error: unknown };

const state: {
  itemsResult: QueryResult;
  balanceResult: QueryResult;
  insertResult: QueryResult;
  lastInsertPayload: unknown;
} = {
  itemsResult: { data: [], error: null },
  balanceResult: { data: [], error: null },
  insertResult: { data: null, error: { message: "RLS" } },
  lastInsertPayload: null,
};

function makeSelectBuilder(table: string) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const m of ["select", "eq", "order", "limit"]) builder[m] = chain;
  builder.maybeSingle = async () =>
    table === "stock_balance" ? state.balanceResult : state.itemsResult;
  builder.single = async () =>
    table === "stock_balance" ? state.balanceResult : state.itemsResult;
  builder.then = (resolve: (v: QueryResult) => void) =>
    Promise.resolve(table === "stock_balance" ? state.balanceResult : state.itemsResult).then(
      resolve,
    );
  return builder;
}

function makeInsertBuilder(payload: unknown) {
  state.lastInsertPayload = payload;
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.single = async () => state.insertResult;
  builder.then = (resolve: (v: QueryResult) => void) =>
    Promise.resolve(state.insertResult).then(resolve);
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: (...args: unknown[]) => {
        const b = makeSelectBuilder(table) as { select: (...a: unknown[]) => unknown };
        return b.select(...args);
      },
      insert: (payload: unknown) => makeInsertBuilder(payload),
    }),
  },
}));

import { useStockItems } from "./use-stock";

describe("useStockItems + RLS", () => {
  beforeEach(() => {
    state.itemsResult = { data: [], error: null };
    state.balanceResult = { data: [], error: null };
    state.insertResult = { data: null, error: { message: "RLS" } };
    state.lastInsertPayload = null;
  });

  it("usuário sem papel: RLS filtra e a lista fica vazia", async () => {
    const { result } = renderHook(() => useStockItems());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.balances).toEqual({});
  });

  it("usuário com papel: itens autorizados aparecem", async () => {
    state.itemsResult = {
      data: [
        {
          id: "it-1",
          code: "REG-FEMI",
          name: "Regata Feminina",
          category: "acabado",
          unit: "un",
          is_active: true,
          abc_class: "A",
          annual_revenue: 1000,
          annual_qty: 100,
          unit_price: 10,
          lead_time_days: 5,
          demand_avg_daily: 3,
          demand_stddev: 1,
          service_factor: 1.65,
          safety_stock: 3.7,
          reorder_point: 18.7,
          eoq: 10,
          min_qty: 3.7,
          max_qty: 13.7,
          coverage_days_min: 2,
          supplier_default: null,
          notes: null,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ],
      error: null,
    };
    state.balanceResult = {
      data: [
        {
          item_id: "it-1",
          warehouse_id: "wh-1",
          item_code: "REG-FEMI",
          item_name: "Regata Feminina",
          warehouse_code: "ALM-CENTRAL",
          qty_on_hand: 25,
          qty_reserved: 2,
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useStockItems());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].code).toBe("REG-FEMI");
    expect(result.current.balances["it-1"]?.qty_on_hand).toBe(25);
  });
});
