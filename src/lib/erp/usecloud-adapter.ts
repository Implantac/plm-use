// Adaptador HTTP e contratos bidirecionais para integração com o UseCloud ERP.
// Resolve dois gargalos históricos identificados na auditoria do UseCloud:
//  1) Explosão estruturada de SKUs de Produto Acabado (Referência × Cor × Tamanho)
//     com NCM, composição ABNT e preço calculado pelo Mark-up Divisor;
//  2) Emissão de Ordem de Produção (OP) desacoplada de cliente obrigatório
//     (suporta tanto ESTOQUE_PROPRIO de coleção quanto SOB_PEDIDO).
import type {
  ErpAdapter,
  ErpListFilter,
  ErpProduct,
  ErpProductionOrder,
  ErpPurchaseOrder,
  ErpStockLevel,
  ErpSupplier,
} from "./contract";
import {
  defaultColorwaysFor,
  defaultEtiquetagemFor,
  defaultMedidasFor,
  type TechSheetData,
} from "@/lib/techsheet/store";
import { computeFullTechSheetPricing } from "@/lib/techsheet/pricing";
import {
  bomItemCustoEfetivo,
  parseDecimalPtBr,
  round4,
  validateComposicaoAbnt,
} from "@/lib/techsheet/textile";

export interface UseCloudSkuPayload {
  sku: string;
  referenceCode: string;
  name: string;
  colorCode: string;
  colorName: string;
  size: string;
  ncm: string;
  composicaoAbnt: string;
  custoIndustrial: number;
  custoFinal: number;
  precoSugerido: number;
}

export interface UseCloudProductionOrderPayload {
  referenceCode: string;
  productName: string;
  tipoOp: "ESTOQUE_PROPRIO" | "SOB_PEDIDO";
  customerCode: string | null;
  totalQuantity: number;
  grade: Array<{ colorCode: string; size: string; quantity: number }>;
  materiaisNecessarios: Array<{
    material: string;
    unidade: string;
    consumoTotalComPerda: number;
    custoPrevistoTotal: number;
  }>;
}

export function buildUseCloudSkuExplosion(doc: TechSheetData): UseCloudSkuPayload[] {
  const pricing = computeFullTechSheetPricing(doc);
  const colorways = (doc.colorways?.length ? doc.colorways : defaultColorwaysFor()).filter(
    (c) => c.status !== "Cancelada",
  );
  const tamanhos = doc.medidas?.tamanhos?.length
    ? doc.medidas.tamanhos
    : defaultMedidasFor().tamanhos;
  const et = doc.etiquetagem ?? defaultEtiquetagemFor();
  const comp = validateComposicaoAbnt(et.composicao);
  const baseName = doc.meta?.name ?? `Produto ${doc.ref}`;
  const pv =
    doc.preCost.targetPreco && doc.preCost.targetPreco > 0
      ? doc.preCost.targetPreco
      : pricing.precoSugerido;

  const out: UseCloudSkuPayload[] = [];
  for (const cw of colorways) {
    for (const size of tamanhos) {
      out.push({
        sku: `${doc.ref}-${cw.code}-${size}`.toUpperCase(),
        referenceCode: doc.ref,
        name: `${baseName} · ${cw.name} · ${size}`,
        colorCode: cw.code,
        colorName: cw.name,
        size,
        ncm: et.ncm,
        composicaoAbnt: comp.resumo,
        custoIndustrial: pricing.industrial,
        custoFinal: pricing.custoFinal,
        precoSugerido: pv,
      });
    }
  }
  return out;
}

export function buildUseCloudProductionOrderPayload(
  doc: TechSheetData,
  input: {
    grade: Array<{ colorCode: string; size: string; quantity: number }>;
    customerCode?: string | null;
  },
): UseCloudProductionOrderPayload {
  const cleanGrade = input.grade.filter((g) => g.quantity > 0);
  const totalQuantity = cleanGrade.reduce((acc, g) => acc + g.quantity, 0);
  const customer = input.customerCode?.trim() || null;

  const materiaisNecessarios = doc.bom.map((b) => {
    const cons = Math.max(0, parseDecimalPtBr(b.consumo));
    const perda = Math.max(0, Number(b.perdaPct) || 0);
    const consumoTotalComPerda = round4(cons * (1 + perda / 100) * totalQuantity);
    const custoPrevistoTotal = Math.round(bomItemCustoEfetivo(b) * totalQuantity * 100) / 100;
    return {
      material: b.material,
      unidade: b.unidade,
      consumoTotalComPerda,
      custoPrevistoTotal,
    };
  });

  return {
    referenceCode: doc.ref,
    productName: doc.meta?.name ?? `Produto ${doc.ref}`,
    tipoOp: customer ? "SOB_PEDIDO" : "ESTOQUE_PROPRIO",
    customerCode: customer,
    totalQuantity,
    grade: cleanGrade,
    materiaisNecessarios,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`UseCloud ERP HTTP ${res.status} em ${url}`);
  }
  return (await res.json()) as T;
}

function buildQuery(filter: ErpListFilter): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.limit) params.set("limit", String(filter.limit));
  if (filter.since) params.set("since", filter.since);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function createUseCloudHttpAdapter(baseUrl: string): ErpAdapter {
  const root = baseUrl.replace(/\/+$/, "");
  return {
    name: "UseCloud ERP",
    mode: "http",
    getProduct(id) {
      return fetchJson<ErpProduct | null>(`${root}/products/${encodeURIComponent(id)}`);
    },
    searchProducts(filter) {
      return fetchJson<ErpProduct[]>(`${root}/products${buildQuery(filter)}`);
    },
    getSupplier(id) {
      return fetchJson<ErpSupplier | null>(`${root}/suppliers/${encodeURIComponent(id)}`);
    },
    searchSuppliers(filter) {
      return fetchJson<ErpSupplier[]>(`${root}/suppliers${buildQuery(filter)}`);
    },
    getStock(sku) {
      return fetchJson<ErpStockLevel | null>(`${root}/stock/${encodeURIComponent(sku)}`);
    },
    listPurchaseOrders(filter) {
      return fetchJson<ErpPurchaseOrder[]>(`${root}/purchase-orders${buildQuery(filter)}`);
    },
    listProductionOrders(filter) {
      return fetchJson<ErpProductionOrder[]>(`${root}/production-orders${buildQuery(filter)}`);
    },
  };
}
