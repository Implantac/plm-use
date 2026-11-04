// Doc 06.2 · Almoxarifado — hooks de leitura (RLS aplicada como usuário).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
  abc_class: "A" | "B" | "C" | null;
  annual_revenue: number;
  annual_qty: number;
  unit_price: number;
  lead_time_days: number;
  demand_avg_daily: number;
  demand_stddev: number;
  service_factor: number;
  safety_stock: number;
  reorder_point: number;
  eoq: number;
  min_qty: number;
  max_qty: number;
  coverage_days_min: number;
  supplier_default: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockBalance {
  item_id: string;
  warehouse_id: string;
  item_code: string;
  item_name: string;
  warehouse_code: string;
  qty_on_hand: number;
  qty_reserved: number;
}

/**
 * Saldo disponível por nome de item, para consumo de motores que casam material
 * por nome (MRP). Chave = nome normalizado; valor = on_hand − reservado.
 *
 * `stock_balance` já expõe `qty_on_hand` e `qty_reserved` por item/armazém.
 * Somamos entre armazéns porque o MRP pergunta "quanto existe na empresa", não
 * "quanto existe no depósito X".
 */
export function useStockBalancesByName() {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.from("stock_balance" as never).select("*");
    if (err) {
      setError(err.message);
      setBalances({});
      setLoading(false);
      return;
    }
    const map: Record<string, number> = {};
    for (const raw of (data ?? []) as unknown as StockBalance[]) {
      const key = raw.item_name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      const disponivel = Math.max(0, (raw.qty_on_hand ?? 0) - (raw.qty_reserved ?? 0));
      map[key] = (map[key] ?? 0) + disponivel;
    }
    setError(null);
    setBalances(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { balances, loading, error, refetch };
}

export function useStockItems() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [balances, setBalances] = useState<Record<string, StockBalance>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const [itemsRes, balRes] = await Promise.all([
      supabase
        .from("stock_item" as never)
        .select("*")
        .order("annual_revenue", { ascending: false }),
      supabase.from("stock_balance" as never).select("*"),
    ]);

    setItems((itemsRes.data ?? []) as unknown as StockItem[]);

    const map: Record<string, StockBalance> = {};
    ((balRes.data ?? []) as unknown as StockBalance[]).forEach((b) => {
      map[b.item_id] = b;
    });
    setBalances(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { items, balances, loading, refetch };
}

export interface AbcSummary {
  A: { count: number; revenue: number };
  B: { count: number; revenue: number };
  C: { count: number; revenue: number };
  unclassified: { count: number; revenue: number };
  total_revenue: number;
}

export function summarizeAbc(items: StockItem[]): AbcSummary {
  const s: AbcSummary = {
    A: { count: 0, revenue: 0 },
    B: { count: 0, revenue: 0 },
    C: { count: 0, revenue: 0 },
    unclassified: { count: 0, revenue: 0 },
    total_revenue: 0,
  };
  for (const it of items) {
    const bucket = it.abc_class ?? "unclassified";
    s[bucket].count += 1;
    s[bucket].revenue += Number(it.annual_revenue ?? 0);
    s.total_revenue += Number(it.annual_revenue ?? 0);
  }
  return s;
}
