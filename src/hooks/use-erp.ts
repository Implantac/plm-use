// Hooks React para consumir o ERP com cache leve em memória.
// Toda leitura passa por aqui — o PLM nunca fala direto com o adapter.
import { useEffect, useState } from "react";
import { getErpAdapter } from "@/lib/erp";
import type {
  ErpListFilter,
  ErpProduct,
  ErpProductionOrder,
  ErpPurchaseOrder,
  ErpStockLevel,
  ErpSupplier,
} from "@/lib/erp/contract";

type State<T> = { data: T | null; loading: boolean; error: string | null };

const cache = new Map<string, unknown>();

function useErpResource<T>(key: string, loader: () => Promise<T>): State<T> {
  const [state, setState] = useState<State<T>>({
    data: (cache.get(key) as T | undefined) ?? null,
    loading: !cache.has(key),
    error: null,
  });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => {
        if (cancelled) return;
        cache.set(key, data);
        setState({ data, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ data: null, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

export function useErpProduct(id: string | null | undefined) {
  return useErpResource<ErpProduct | null>(`erp:product:${id ?? ""}`, () =>
    id ? getErpAdapter().getProduct(id) : Promise.resolve(null),
  );
}

export function useErpProducts(filter: ErpListFilter) {
  const key = `erp:products:${JSON.stringify(filter)}`;
  return useErpResource<ErpProduct[]>(key, () => getErpAdapter().searchProducts(filter));
}

export function useErpSupplier(id: string | null | undefined) {
  return useErpResource<ErpSupplier | null>(`erp:supplier:${id ?? ""}`, () =>
    id ? getErpAdapter().getSupplier(id) : Promise.resolve(null),
  );
}

export function useErpSuppliers(filter: ErpListFilter) {
  const key = `erp:suppliers:${JSON.stringify(filter)}`;
  return useErpResource<ErpSupplier[]>(key, () => getErpAdapter().searchSuppliers(filter));
}

export function useErpStock(sku: string | null | undefined) {
  return useErpResource<ErpStockLevel | null>(`erp:stock:${sku ?? ""}`, () =>
    sku ? getErpAdapter().getStock(sku) : Promise.resolve(null),
  );
}

export function useErpPurchaseOrders(filter: ErpListFilter) {
  const key = `erp:po:${JSON.stringify(filter)}`;
  return useErpResource<ErpPurchaseOrder[]>(key, () => getErpAdapter().listPurchaseOrders(filter));
}

export function useErpProductionOrders(filter: ErpListFilter) {
  const key = `erp:op:${JSON.stringify(filter)}`;
  return useErpResource<ErpProductionOrder[]>(key, () => getErpAdapter().listProductionOrders(filter));
}
