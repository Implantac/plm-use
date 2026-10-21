// Motor de custo do pedido — funções PURAS (sem DOM, sem banco).
// Espelham o SQL de public.recalc_sales_order_item()
// (supabase/migrations/20261021090100_sales_orders.sql). Se a regra mudar lá,
// muda aqui — e o teste quebra primeiro.
//
// A diferença que importa em produto personalizado: o custo tem uma parcela
// FIXA por pedido (setup: chapa de sublimação, matriz de bordado, programação)
// que precisa ser amortizada na quantidade. Sem isso, pedido de 10 peças sai
// ~13% abaixo do preço correto.
import type { CostDriver, MaterialLine, OperationLine } from "./types";

export const DRIVERS: Array<{ value: CostDriver; label: string; unit: string; hint: string }> = [
  { value: "peca", label: "Por peça", unit: "peça", hint: "corte, costura, acabamento" },
  { value: "mil_pontos", label: "Por mil pontos", unit: "mil pontos", hint: "bordado" },
  { value: "m2", label: "Por m²", unit: "m²", hint: "sublimação, transfer, silk grande" },
  { value: "cor", label: "Por cor", unit: "cor", hint: "silkscreen: cada cor é uma passagem" },
  { value: "minuto", label: "Por minuto", unit: "min", hint: "tempo padrão de operação" },
  {
    value: "lote",
    label: "Por pedido (fixo)",
    unit: "lote",
    hint: "programação, molde, prova de cor",
  },
];

export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;
export const round4 = (n: number): number => Math.round((Number(n) || 0) * 10000) / 10000;

/**
 * Quantidade de driver de uma operação, do mesmo jeito que o SQL calcula na
 * explosão do catálogo:
 *   peca       -> quantidade do item x fator da opção (nº de bordados, etc.)
 *   lote       -> 1 (custo fixo do pedido)
 *   demais     -> quantidade informada na spec da opção x quantidade do item
 */
export function driverQuantity(
  driver: CostDriver,
  quantity: number,
  factor = 1,
  specQty?: number,
): number {
  const q = Number(quantity) || 0;
  const f = Number(factor) || 1;
  if (driver === "peca") return q * f;
  if (driver === "lote") return 1;
  const per = Number(specQty);
  return (Number.isFinite(per) && per > 0 ? per : f) * q;
}

/** consumo x (1 + perda%) x custo unitário */
export function materialLineTotal(
  m: Pick<MaterialLine, "consumption" | "wastePct" | "unitCost">,
): number {
  const consumption = Number(m.consumption) || 0;
  const waste = Number(m.wastePct) || 0;
  const unitCost = Number(m.unitCost) || 0;
  return round2(consumption * (1 + waste / 100) * unitCost);
}

/** custo variável (custo unitário x qtd do driver) + setup do pedido */
export function operationLineTotal(
  o: Pick<OperationLine, "driverQty" | "unitCost" | "setupCost">,
): { variable: number; setup: number; total: number } {
  const variable = round2((Number(o.driverQty) || 0) * (Number(o.unitCost) || 0));
  const setup = round2(Number(o.setupCost) || 0);
  return { variable, setup, total: round2(variable + setup) };
}

export type ItemCostTotals = {
  materialsTotal: number;
  operationsTotal: number;
  setupTotal: number;
  directTotal: number;
  overheadPct: number;
  overhead: number;
  industrialCost: number;
  quantity: number;
  unitCost: number;
};

export function computeItemCost(input: {
  quantity: number;
  overheadPct: number;
  materials: Array<Pick<MaterialLine, "consumption" | "wastePct" | "unitCost">>;
  operations: Array<Pick<OperationLine, "driverQty" | "unitCost" | "setupCost">>;
}): ItemCostTotals {
  const quantity = Number(input.quantity) || 0;
  // Material é informado em consumo POR PEÇA. O total do item multiplica pela
  // quantidade e só então arredonda (arredondar linha a linha e depois somar
  // desvia centavos do que o banco grava).
  const materialExact = input.materials.reduce(
    (acc, m) =>
      acc +
      (Number(m.consumption) || 0) *
        (1 + (Number(m.wastePct) || 0) / 100) *
        (Number(m.unitCost) || 0),
    0,
  );
  const materialsTotal = round2(materialExact * quantity);
  let operationsVariable = 0;
  let setupTotal = 0;
  for (const o of input.operations) {
    const line = operationLineTotal(o);
    operationsVariable += line.variable;
    setupTotal += line.setup;
  }
  const operationsTotal = round2(operationsVariable);
  setupTotal = round2(setupTotal);
  const directTotal = round2(materialsTotal + operationsTotal + setupTotal);
  const overheadPct = Number(input.overheadPct) || 0;
  const overhead = round2(directTotal * (overheadPct / 100));
  const industrialCost = round2(directTotal + overhead);
  const unitCost = quantity > 0 ? round2(industrialCost / quantity) : 0;
  return {
    materialsTotal,
    operationsTotal,
    setupTotal,
    directTotal,
    overheadPct,
    overhead,
    industrialCost,
    quantity,
    unitCost,
  };
}

/** margem sobre o preço de venda. null quando não há preço (evita "0%"). */
export function marginPct(unitPrice: number, unitCost: number): number | null {
  const price = Number(unitPrice) || 0;
  if (price <= 0) return null;
  return round2(((price - (Number(unitCost) || 0)) / price) * 100);
}

/** preço necessário para atingir a margem alvo (margem sobre o preço). */
export function priceForMargin(unitCost: number, targetMarginPct: number): number {
  const m = Number(targetMarginPct) || 0;
  const cost = Number(unitCost) || 0;
  if (m >= 100) return 0;
  return round2(cost / (1 - m / 100));
}

export function belowMinMargin(margin: number | null, minMarginPct: number): boolean {
  if (margin === null) return true;
  return margin < (Number(minMarginPct) || 0);
}

/** Preço sugerido com markup sobre o custo (fallback quando não há meta de margem). */
export function priceForMarkup(unitCost: number, markupPct: number): number {
  return round2((Number(unitCost) || 0) * (1 + (Number(markupPct) || 0) / 100));
}
