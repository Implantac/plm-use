// Motor puro de Planejamento de Corte & Explosão MRP Líquida (PLM 2.0):
// 1. Distribui o lote total de peças pela matriz Cor (mixPct) × Tamanho (pesos da grade)
//    com reconciliação exata de inteiros (soma das células === totalPieces).
// 2. Explode a necessidade bruta de cada insumo (consumo × (1 + perda%)) por variante
//    de cor, confronta com o Saldo de Almoxarifado e apura a Compra Líquida sugerida.
// 3. Calcula Rastreabilidade "Onde Usado" (Where-Used) entre Biblioteca de Materiais
//    e Fichas Técnicas, simulando o impacto exato no Custo Industrial e Margem Líquida.
// 4. Gera CSV PT-BR (`;` + BOM UTF-8) e Ordem de Corte A4 pronta para impressão.

import { computeFullTechSheetPricing } from "./pricing";
import {
  defaultColorwaysFor,
  defaultEncaixeCadFor,
  defaultMedidasFor,
  seedFor,
  type BomItem,
  type TechSheetData,
} from "./store";
import { bomItemCustoEfetivo, parseDecimalPtBr, round2, round4 } from "./textile";

export interface CutMatrixColorRow {
  colorwayId: string;
  colorCode: string;
  colorName: string;
  hex: string;
  secondaryHex?: string;
  mixPct: number;
  bySize: Record<string, number>;
  totalColor: number;
}

export interface MrpVariantNeed {
  colorCode: string;
  corInsumo: string;
  pecas: number;
  qtdBruta: number;
}

export interface MrpMaterialLine {
  bomId: string;
  tipo: BomItem["tipo"];
  material: string;
  fornecedor: string;
  unidade: string;
  consumoUnitario: number;
  perdaPct: number;
  custoUnitario: number;
  necessidadeBruta: number;
  saldoAlmoxarifado: number;
  faltaComprar: number;
  sobraProjetada: number;
  custoCompraSugerida: number;
  statusEstoque: "coberto" | "parcial" | "comprar";
  porVariante: MrpVariantNeed[];
}

export interface MrpCutPlanResult {
  ref: string;
  totalPieces: number;
  sizes: string[];
  sizeWeights: Record<string, number>;
  totalsBySize: Record<string, number>;
  matrix: CutMatrixColorRow[];
  materials: MrpMaterialLine[];
  custoCompraTotal: number;
  itensComFalta: number;
  enfestoFolhasEstimadas: number;
}

export interface ComputeMrpOptions {
  totalPieces: number;
  sizeWeights?: Record<string, number>;
  /** Override opcional de saldo por bomId vindo do ERP/Supabase. */
  stockOverrideByBomId?: Record<string, number>;
  /** Peças encaixadas em 1 folha de risco CAD (default 5 = 1 por tamanho). */
  pecasPorFolhaRisco?: number;
}

export const DEFAULT_SIZE_WEIGHTS: Record<string, number> = {
  PP: 1,
  P: 2,
  M: 3,
  G: 2,
  GG: 1,
  XG: 1,
};

export function computeMrpCutPlan(
  ref: string,
  doc: TechSheetData,
  opts: ComputeMrpOptions,
): MrpCutPlanResult {
  const totalPieces = Math.max(1, Math.round(Number(opts.totalPieces) || 1));
  const medidas = doc.medidas ?? defaultMedidasFor();
  const sizes = medidas.tamanhos.length > 0 ? medidas.tamanhos : ["PP", "P", "M", "G", "GG"];
  const rawCws = doc.colorways?.length ? doc.colorways : defaultColorwaysFor();
  const activeCws = rawCws.filter((c) => c.status !== "Cancelada");
  const cws = activeCws.length > 0 ? activeCws : rawCws;

  const sizeWeights: Record<string, number> = {};
  let totalWeight = 0;
  for (const s of sizes) {
    const w = Math.max(0, Number(opts.sizeWeights?.[s] ?? DEFAULT_SIZE_WEIGHTS[s] ?? 1));
    sizeWeights[s] = w;
    totalWeight += w;
  }
  if (totalWeight <= 0) {
    for (const s of sizes) sizeWeights[s] = 1;
    totalWeight = sizes.length;
  }

  const totalMix = cws.reduce((acc, c) => acc + Math.max(0, Number(c.mixPct) || 0), 0);

  // Calcula cotas fracionárias p/ cada célula (Cor × Tamanho) e aplica método do maior resto
  type CellSlot = {
    cwIdx: number;
    size: string;
    exact: number;
    floored: number;
    rem: number;
  };
  const slots: CellSlot[] = [];
  cws.forEach((cw, cwIdx) => {
    const colorShare =
      totalMix > 0 ? Math.max(0, Number(cw.mixPct) || 0) / totalMix : 1 / cws.length;
    for (const s of sizes) {
      const sizeShare = sizeWeights[s] / totalWeight;
      const exact = totalPieces * colorShare * sizeShare;
      const floored = Math.floor(exact);
      slots.push({ cwIdx, size: s, exact, floored, rem: exact - floored });
    }
  });

  let remainder = totalPieces - slots.reduce((acc, sl) => acc + sl.floored, 0);
  const byRem = [...slots].sort((a, b) => b.rem - a.rem || b.exact - a.exact);
  for (let i = 0; i < byRem.length && remainder > 0; i += 1) {
    byRem[i].floored += 1;
    remainder -= 1;
  }

  const totalsBySize: Record<string, number> = {};
  for (const s of sizes) totalsBySize[s] = 0;

  const matrix: CutMatrixColorRow[] = cws.map((cw, cwIdx) => {
    const bySize: Record<string, number> = {};
    let totalColor = 0;
    for (const s of sizes) {
      const found = slots.find((sl) => sl.cwIdx === cwIdx && sl.size === s);
      const qty = found?.floored ?? 0;
      bySize[s] = qty;
      totalColor += qty;
      totalsBySize[s] = (totalsBySize[s] ?? 0) + qty;
    }
    return {
      colorwayId: cw.id,
      colorCode: cw.code,
      colorName: cw.name,
      hex: cw.hex,
      secondaryHex: cw.secondaryHex,
      mixPct: cw.mixPct ?? Math.round(100 / cws.length),
      bySize,
      totalColor,
    };
  });

  // Explosão MRP Líquida por insumo do BOM
  const materials: MrpMaterialLine[] = doc.bom.map((b) => {
    const consumoUnit = Math.max(0, parseDecimalPtBr(b.consumo));
    const perdaPct = Math.max(0, Number(b.perdaPct) || 0);
    const fatorPerda = 1 + perdaPct / 100;
    const unitCost =
      b.custoUnitario != null && Number.isFinite(b.custoUnitario) && b.custoUnitario > 0
        ? b.custoUnitario
        : consumoUnit > 0
          ? round4(bomItemCustoEfetivo(b) / (consumoUnit * fatorPerda))
          : 0;

    const porVariante: MrpVariantNeed[] = matrix.map((row) => ({
      colorCode: row.colorCode,
      corInsumo: b.variantesCor?.[row.colorwayId] || row.colorName,
      pecas: row.totalColor,
      qtdBruta: round2(row.totalColor * consumoUnit * fatorPerda),
    }));

    const necessidadeBruta = round2(totalPieces * consumoUnit * fatorPerda);
    const saldoRaw =
      opts.stockOverrideByBomId?.[b.id] != null
        ? opts.stockOverrideByBomId[b.id]
        : (b.estoqueDisponivel ?? 0);
    const saldoAlmoxarifado = round2(Math.max(0, Number(saldoRaw) || 0));
    const faltaComprar = round2(Math.max(0, necessidadeBruta - saldoAlmoxarifado));
    const sobraProjetada = round2(Math.max(0, saldoAlmoxarifado - necessidadeBruta));
    const custoCompraSugerida = round2(faltaComprar * unitCost);

    const statusEstoque: MrpMaterialLine["statusEstoque"] =
      faltaComprar <= 0 ? "coberto" : saldoAlmoxarifado > 0 ? "parcial" : "comprar";

    return {
      bomId: b.id,
      tipo: b.tipo,
      material: b.material,
      fornecedor: b.fornecedor || "—",
      unidade: b.unidade || "un",
      consumoUnitario: consumoUnit,
      perdaPct,
      custoUnitario: round4(unitCost),
      necessidadeBruta,
      saldoAlmoxarifado,
      faltaComprar,
      sobraProjetada,
      custoCompraSugerida,
      statusEstoque,
      porVariante,
    };
  });

  const custoCompraTotal = round2(materials.reduce((acc, m) => acc + m.custoCompraSugerida, 0));
  const itensComFalta = materials.filter((m) => m.faltaComprar > 0).length;
  const pecasPorFolha = Math.max(1, opts.pecasPorFolhaRisco ?? sizes.length);
  const enfestoFolhasEstimadas = Math.ceil(totalPieces / pecasPorFolha);

  return {
    ref,
    totalPieces,
    sizes,
    sizeWeights,
    totalsBySize,
    matrix,
    materials,
    custoCompraTotal,
    itensComFalta,
    enfestoFolhasEstimadas,
  };
}

export interface MaterialWhereUsedHit {
  ref: string;
  productName: string;
  bomId: string;
  bomMaterialName: string;
  consumo: number;
  perdaPct: number;
  custoUnitarioFicha: number;
  custoUnitarioCatalogo: number;
  custoIndustrialAtual: number;
  custoIndustrialNovo: number;
  deltaCustoPeca: number;
  margemAtualPct: number;
  margemNovaPct: number;
}

function normText(s: string | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function findMaterialWhereUsed(
  material: { name: string; sku?: string; unitCost: number },
  storedDocs: Record<string, TechSheetData>,
): MaterialWhereUsedHit[] {
  const merged: Record<string, TechSheetData> = {
    DEV000006: storedDocs.DEV000006 ?? seedFor("DEV000006"),
    ...storedDocs,
  };

  const skuNeedle = normText(material.sku);
  const nameNeedle = normText(material.name);
  const hits: MaterialWhereUsedHit[] = [];

  for (const [refKey, doc] of Object.entries(merged)) {
    const ref = refKey.toUpperCase();
    for (const b of doc.bom) {
      const bSku = normText(b.skuErp);
      const bName = normText(b.material);
      const matchSku = Boolean(skuNeedle && bSku && bSku === skuNeedle);
      const matchName = Boolean(
        nameNeedle &&
        bName &&
        (bName === nameNeedle || bName.includes(nameNeedle) || nameNeedle.includes(bName)),
      );
      if (!matchSku && !matchName) continue;

      const currentPricing = computeFullTechSheetPricing(doc);
      const consumo = Math.max(0, parseDecimalPtBr(b.consumo));
      const perdaPct = Math.max(0, Number(b.perdaPct) || 0);
      const currentUnit =
        b.custoUnitario != null && Number.isFinite(b.custoUnitario)
          ? b.custoUnitario
          : consumo > 0
            ? round4(b.custo / (consumo * (1 + perdaPct / 100)))
            : b.custo;

      const simulatedBom = doc.bom.map((row) =>
        row.id === b.id
          ? {
              ...row,
              custoUnitario: material.unitCost,
              custo: round2(consumo * (1 + perdaPct / 100) * material.unitCost),
            }
          : row,
      );
      const nextPricing = computeFullTechSheetPricing({ ...doc, bom: simulatedBom });

      hits.push({
        ref,
        productName: doc.meta?.name ?? `Produto ${ref}`,
        bomId: b.id,
        bomMaterialName: b.material,
        consumo,
        perdaPct,
        custoUnitarioFicha: round4(currentUnit),
        custoUnitarioCatalogo: round4(material.unitCost),
        custoIndustrialAtual: currentPricing.industrial,
        custoIndustrialNovo: nextPricing.industrial,
        deltaCustoPeca: round2(nextPricing.industrial - currentPricing.industrial),
        margemAtualPct: currentPricing.margemLiquidaRealPct,
        margemNovaPct: nextPricing.margemLiquidaRealPct,
      });
    }
  }

  return hits;
}

export function buildMrpCsvPtBr(plan: MrpCutPlanResult): string {
  const fmt = (n: number) => String(n).replace(".", ",");
  const header = [
    "Referencia",
    "Tipo",
    "Material",
    "Fornecedor",
    "Unidade",
    "Lote_Pecas",
    "Necessidade_Bruta",
    "Saldo_Almoxarifado",
    "Falta_Comprar",
    "Custo_Unitario_RS",
    "Custo_Compra_Sugerida_RS",
    "Status_Estoque",
  ].join(";");

  const rows = plan.materials.map((m) =>
    [
      plan.ref,
      m.tipo,
      `"${m.material.replace(/"/g, '""')}"`,
      `"${m.fornecedor.replace(/"/g, '""')}"`,
      m.unidade,
      String(plan.totalPieces),
      fmt(m.necessidadeBruta),
      fmt(m.saldoAlmoxarifado),
      fmt(m.faltaComprar),
      fmt(m.custoUnitario),
      fmt(m.custoCompraSugerida),
      m.statusEstoque.toUpperCase(),
    ].join(";"),
  );

  return `\uFEFF${[header, ...rows].join("\n")}`;
}

function esc(raw: string | number | undefined | null): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildCutOrderPrintHtml(
  identity: { ref: string; name: string; collection?: string },
  doc: TechSheetData,
  plan: MrpCutPlanResult,
  now: Date = new Date(),
): string {
  const cad = doc.encaixeCad ?? defaultEncaixeCadFor();
  const stamp = now.toLocaleString("pt-BR");

  const sizeHeaders = plan.sizes.map((s) => `<th class="num">${esc(s)}</th>`).join("");
  const matrixRows = plan.matrix
    .map((r) => {
      const cells = plan.sizes.map((s) => `<td class="num">${r.bySize[s] ?? 0}</td>`).join("");
      return `<tr>
        <td><span class="sw" style="background:${esc(r.hex)}"></span><strong>${esc(r.colorCode)}</strong> · ${esc(r.colorName)}</td>
        <td class="num">${r.mixPct}%</td>
        ${cells}
        <td class="num"><strong>${r.totalColor}</strong></td>
      </tr>`;
    })
    .join("");

  const totalCells = plan.sizes
    .map((s) => `<td class="num"><strong>${plan.totalsBySize[s] ?? 0}</strong></td>`)
    .join("");

  const matRows = plan.materials
    .map((m) => {
      const breakdown = m.porVariante
        .map((v) => `${esc(v.colorCode)}: ${v.qtdBruta} ${esc(m.unidade)}`)
        .join(" · ");
      const statusLabel =
        m.statusEstoque === "coberto"
          ? "COBERTO EM ESTOQUE"
          : m.statusEstoque === "parcial"
            ? `COMPRA PARCIAL (${m.faltaComprar} ${esc(m.unidade)})`
            : `COMPRAR (${m.faltaComprar} ${esc(m.unidade)})`;
      return `<tr>
        <td>${esc(m.tipo)}</td>
        <td><strong>${esc(m.material)}</strong><div class="sub">${breakdown}</div></td>
        <td class="num">${m.necessidadeBruta} ${esc(m.unidade)}</td>
        <td class="num">${m.saldoAlmoxarifado} ${esc(m.unidade)}</td>
        <td class="num"><strong>${m.faltaComprar} ${esc(m.unidade)}</strong></td>
        <td>${statusLabel}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
<title>Ordem de Corte ${esc(identity.ref)} — ${esc(identity.name)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font: 11px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; margin: 0; }
  header { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 12px; }
  h1 { font-size: 15px; margin: 0; text-transform: uppercase; }
  h2 { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #d1d5db; padding-bottom: 3px; margin: 14px 0 6px; color: #374151; }
  .meta { font-size: 10px; color: #4b5563; margin-top: 2px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
  .kpi { border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 8px; background: #f9fafb; }
  .kpi span { display: block; font-size: 9px; text-transform: uppercase; color: #6b7280; }
  .kpi strong { font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th, td { border: 1px solid #e5e7eb; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; font-size: 9.5px; text-transform: uppercase; color: #374151; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .sub { font-size: 9.5px; color: #6b7280; margin-top: 2px; }
  .sw { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; border: 1px solid #9ca3af; vertical-align: middle; }
  footer { margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 6px; font-size: 9.5px; color: #6b7280; display: flex; justify-content: space-between; }
</style></head><body>
<header>
  <div>
    <h1>Ordem de Corte &amp; Separação de Almoxarifado · ${esc(identity.name)}</h1>
    <div class="meta">Coleção: ${esc(identity.collection || "Verão 2027")} · Via Operacional de Corte (Sem Valores Comerciais)</div>
  </div>
  <div style="text-align:right">
    <div style="font-weight:700;font-size:13px">${esc(identity.ref)}</div>
    <div class="meta">Lote: ${plan.totalPieces} peças</div>
  </div>
</header>
<div class="kpis">
  <div class="kpi"><span>Total a Cortar</span><strong>${plan.totalPieces} peças</strong></div>
  <div class="kpi"><span>Aproveitamento CAD</span><strong>${cad.eficienciaPct}% (${esc(cad.sistemaCad)})</strong></div>
  <div class="kpi"><span>Largura / Risco</span><strong>${cad.larguraEnfestoM} m × ${cad.comprimentoRiscoM} m</strong></div>
  <div class="kpi"><span>Encolhimento (U × T)</span><strong>${cad.encolhimentoUrdumePct}% × ${cad.encolhimentoTramaPct}%</strong></div>
</div>
<h2>1. Grade Proporcional de Corte (Cor × Tamanho)</h2>
<table>
  <thead><tr><th>Variante de Cor</th><th class="num">Mix</th>${sizeHeaders}<th class="num">Total Cor</th></tr></thead>
  <tbody>
    ${matrixRows}
    <tr><td><strong>Total por Tamanho</strong></td><td class="num">100%</td>${totalCells}<td class="num"><strong>${plan.totalPieces}</strong></td></tr>
  </tbody>
</table>
<h2>2. Requisição de Insumos ao Almoxarifado (c/ Quebra Técnica)</h2>
<table>
  <thead><tr><th>Tipo</th><th>Material &amp; Explosão por Cor</th><th class="num">Qtd Bruta</th><th class="num">Saldo Atual</th><th class="num">Falta Comprar</th><th>Situação</th></tr></thead>
  <tbody>${matRows}</tbody>
</table>
<p class="meta">Arquivo de molde vinculado: <strong>${esc(cad.arquivoMolde || "Não informado")}</strong> · Folhas estimadas no enfesto: <strong>${plan.enfestoFolhasEstimadas} camadas</strong>.</p>
<footer><span>USE MODA PLM 2.0 — emitida em ${esc(stamp)}</span><span>Assinatura Sala de Corte: _______________________</span></footer>
</body></html>`;
}
