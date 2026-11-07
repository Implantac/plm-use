// Motor MRP I (Material Requirements Planning) Têxtil:
// Cruza a carteira de pedidos (Fila Private Label + OPs) com o BOM das Fichas Técnicas
// e os saldos livres de Almoxarifado para apurar Necessidade Bruta, Ruptura Líquida
// e emitir Requisição Automática de Compras (CSV + Guia A4).

import {
  pedidosOperacionais,
  sumNominalGrade,
  type PrivateLabelOrder,
} from "@/lib/sales/private-label-queue";
import type { TechSheetData } from "@/lib/techsheet/store";

export interface MrpNetRequirementRow {
  materialKey: string;
  materialName: string;
  tipo: string;
  supplier: string;
  unit: string;
  unitCostBrl: number;
  grossRequirement: number;
  availableStock: number;
  netPurchaseQty: number;
  purchaseBudgetBrl: number;
  status: "RUPTURA_COMPRA" | "COBERTO_ESTOQUE";
  sourceRefs: string[];
  /**
   * De onde veio o saldo desta linha. `almoxarifado` = veio de
   * `stock_balance` (saldo real, já líquido de reservas ativas).
   * `bom_referencia` = não há material correspondente no almoxarifado; o número
   * é a referência do BOM/ficha e NÃO é saldo físico. A tela precisa dizer isso.
   */
  stockSource: "almoxarifado" | "bom_referencia";
}

export interface MrpSummary {
  rows: MrpNetRequirementRow[];
  totalGrossItems: number;
  shortageCount: number;
  totalPurchaseBudgetBrl: number;
  /** Quantas linhas têm saldo real de almoxarifado, e quantas são referência. */
  provenance: {
    realStockLines: number;
    referenceLines: number;
    /** true quando ao menos uma linha usou saldo real do almoxarifado. */
    hasRealStock: boolean;
  };
  /**
   * Pedidos que ficaram FORA da explosão porque a referência não tem ficha
   * salva. Sem isso, o BOM de demonstração entrava na conta e o comprador
   * recebia uma requisição de compra de material de um produto inexistente.
   */
  pedidosSemFicha: string[];
}

/**
 * Chave de casamento entre o nome do material na ficha e o nome do item no
 * almoxarifado. Minúsculas, sem acento, espaços colapsados — o suficiente para
 * "Malha Piquet Pima" casar com "malha piquet pima".
 */
export function normalizeMaterialName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function parseNumericConsumption(raw: string | number): number {
  if (typeof raw === "number") return Math.max(0, raw);
  const cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : 0.25;
}

export function computeMrpNetExplosion(params: {
  orders: PrivateLabelOrder[];
  sheets: Record<string, TechSheetData>;
  cloudBalancesByName?: Record<string, number>;
}): MrpSummary {
  const agg = new Map<
    string,
    {
      materialName: string;
      tipo: string;
      supplier: string;
      unit: string;
      unitCostBrl: number;
      grossRequirement: number;
      bomFallbackStock: number;
      refs: Set<string>;
    }
  >();

  // Só ficha salva explode BOM. `?? seedFor(...)` transformava o modelo de
  // demonstração em necessidade de compra.
  const pedidosSemFicha: string[] = [];

  // Onda 39: pedidos de demonstração não viram necessidade de compra.
  for (const order of pedidosOperacionais(params.orders)) {
    const pieces = Math.max(1, sumNominalGrade(order.grade));
    const sheet = params.sheets[order.refCode];
    if (!sheet) {
      pedidosSemFicha.push(order.refCode);
      continue;
    }

    // 1) Materiais explícitos do pedido personalizado + BOM da ficha
    for (const m of order.materials) {
      const key = `${m.material.toLowerCase()}::${m.unit.toLowerCase()}`;
      const gross = pieces * m.consumption * (1 + m.wastePct / 100);
      const cur = agg.get(key);
      if (cur) {
        cur.grossRequirement += gross;
        cur.refs.add(order.refCode);
      } else {
        agg.set(key, {
          materialName: m.material,
          tipo: "Insumo Pedido",
          supplier: "Fornecedor Homologado",
          unit: m.unit,
          unitCostBrl: m.unitCost,
          grossRequirement: gross,
          bomFallbackStock: 12, // saldo físico inicial padrão caso não cadastrado no banco
          refs: new Set([order.refCode]),
        });
      }
    }

    for (const b of sheet.bom) {
      const key = `${b.material.toLowerCase()}::${b.unidade.toLowerCase()}`;
      const cons = parseNumericConsumption(b.consumo);
      const waste = b.perdaPct ?? 3;
      const gross = pieces * cons * (1 + waste / 100);
      const unitCost = b.custoUnitario && b.custoUnitario > 0 ? b.custoUnitario : b.custo;
      const cur = agg.get(key);
      if (cur) {
        cur.grossRequirement += gross;
        cur.refs.add(order.refCode);
      } else {
        agg.set(key, {
          materialName: b.material,
          tipo: b.tipo,
          supplier: b.fornecedor || "Catálogo Têxtil",
          unit: b.unidade,
          unitCostBrl: unitCost,
          grossRequirement: gross,
          bomFallbackStock: b.estoqueDisponivel ?? 20,
          refs: new Set([order.refCode]),
        });
      }
    }
  }

  const rows: MrpNetRequirementRow[] = [...agg.entries()]
    .map(([materialKey, v]) => {
      // Match por nome do material, normalizado. O saldo real (stock_balance)
      // tem precedência; sem correspondência, usamos a referência do BOM e
      // marcamos a linha — nunca apresentar referência como saldo físico.
      const cloudStock = params.cloudBalancesByName?.[normalizeMaterialName(v.materialName)];
      const temSaldoReal = cloudStock !== undefined;
      const availableStock = round2(temSaldoReal ? Math.max(0, cloudStock) : v.bomFallbackStock);
      const grossRequirement = round2(v.grossRequirement);
      const netPurchaseQty = round2(Math.max(0, grossRequirement - availableStock));
      const purchaseBudgetBrl = round2(netPurchaseQty * v.unitCostBrl);

      return {
        materialKey,
        materialName: v.materialName,
        tipo: v.tipo,
        supplier: v.supplier,
        unit: v.unit,
        unitCostBrl: round2(v.unitCostBrl),
        grossRequirement,
        availableStock,
        netPurchaseQty,
        purchaseBudgetBrl,
        status: (netPurchaseQty > 0 ? "RUPTURA_COMPRA" : "COBERTO_ESTOQUE") as
          "RUPTURA_COMPRA" | "COBERTO_ESTOQUE",
        sourceRefs: [...v.refs],
        stockSource: (temSaldoReal ? "almoxarifado" : "bom_referencia") as
          "almoxarifado" | "bom_referencia",
      };
    })
    .sort((a, b) => b.purchaseBudgetBrl - a.purchaseBudgetBrl);

  const realStockLines = rows.filter((r) => r.stockSource === "almoxarifado").length;

  return {
    rows,
    pedidosSemFicha: [...new Set(pedidosSemFicha)],
    totalGrossItems: rows.length,
    shortageCount: rows.filter((r) => r.status === "RUPTURA_COMPRA").length,
    totalPurchaseBudgetBrl: round2(rows.reduce((a, r) => a + r.purchaseBudgetBrl, 0)),
    provenance: {
      realStockLines,
      referenceLines: rows.length - realStockLines,
      hasRealStock: realStockLines > 0,
    },
  };
}

export function buildMrpCsv(summary: MrpSummary): string {
  const header =
    "insumo;tipo;fornecedor;unidade;necessidade_bruta;saldo_almoxarifado;origem_saldo;compra_liquida;custo_unit_brl;orcamento_compra_brl;referencias_origem";
  const lines = summary.rows.map((r) =>
    [
      r.materialName.replace(/;/g, ","),
      r.tipo,
      r.supplier.replace(/;/g, ","),
      r.unit,
      r.grossRequirement.toFixed(2),
      r.availableStock.toFixed(2),
      r.stockSource,
      r.netPurchaseQty.toFixed(2),
      r.unitCostBrl.toFixed(2),
      r.purchaseBudgetBrl.toFixed(2),
      r.sourceRefs.join(","),
    ].join(";"),
  );
  return [header, ...lines].join("\n");
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMrpPurchaseRequisitionHtml(summary: MrpSummary): string {
  const trs = summary.rows
    .map(
      (r) => `<tr>
      <td><strong>${escapeHtml(r.materialName)}</strong><br/><span style="font-size:9px;color:#475569">${escapeHtml(r.supplier)} · Refs: ${escapeHtml(r.sourceRefs.join(", "))}</span></td>
      <td>${escapeHtml(r.unit)}</td>
      <td style="text-align:right">${r.grossRequirement.toFixed(2)}</td>
      <td style="text-align:right">${r.availableStock.toFixed(2)}</td>
      <td style="text-align:right"><strong>${r.netPurchaseQty.toFixed(2)}</strong></td>
      <td style="text-align:right">R$ ${r.purchaseBudgetBrl.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Requisição de Compras MRP I · USE MODA PLM</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
  h1 { font-size: 15px; margin: 4px 0; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <div style="border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px">
    <div style="font-size:9px;font-weight:700">ALMOXARIFADO & SUPRIMENTOS · EXPLOSÃO LÍQUIDA MRP I</div>
    <h1>Requisição Automática de Ressuprimento · Orçamento Total R$ ${summary.totalPurchaseBudgetBrl.toFixed(2)}</h1>
  </div>
  <table>
    <thead><tr><th>Insumo / Fornecedor</th><th>Unid.</th><th style="text-align:right">Nec. Bruta</th><th style="text-align:right">Estoque</th><th style="text-align:right">Compra Líq.</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>${trs}</tbody>
  </table>
</body>
</html>`;
}
