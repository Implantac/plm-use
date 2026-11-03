// Motor de Sourcing Industrial (Explosão MRP da BOM + Mapa Comparativo RFQ TCO),
// Conversor de Tabelas Corporativas de Medidas -> POM da Ficha Técnica e
// Espelho de Pré-Pedido B2B do Showroom Digital.
import type { MeasurementChart } from "@/lib/measurements/store";
import { computeFullTechSheetPricing } from "./pricing";
import {
  defaultColorwaysFor,
  defaultEtiquetagemFor,
  type BomItem,
  type TechSheetData,
} from "./store";
import { round2, type MeasurementPomRow, type TechSheetMeasurementSpec } from "./textile";

export interface BomMrpRequirement {
  itemId: string;
  tipo: BomItem["tipo"];
  material: string;
  fornecedorAtual: string;
  unidade: string;
  consumoLiquidoUnit: number;
  perdaPct: number;
  consumoBrutoUnit: number;
  tiragemPlanejada: number;
  necessidadeBrutaLote: number;
  estoqueDisponivel: number;
  compraLiquidaNecessaria: number;
  custoUnitarioAtual: number;
  custoPecaAtual: number;
  valorTotalCompraAtual: number;
}

export interface RfqSupplierQuote {
  id: string;
  fornecedor: string;
  uf: string;
  precoUnitario: number;
  moq: number;
  leadTimeDias: number;
  otifPct: number;
  condicaoPagamento: string;
}

export interface ScoredRfqQuote extends RfqSupplierQuote {
  quantidadeFaturada: number;
  excessoMoq: number;
  valorTotalPedido: number;
  savingUnitario: number;
  savingPct: number;
  savingLote: number;
  scoreTco: number;
  winner: boolean;
}

export interface ShowroomPackLine {
  refCode: string;
  refName: string;
  colorName: string;
  colorHex: string;
  packs: number;
  piecesPerPack: number;
  wholesaleUnitPrice: number;
  suggestedRetailPrice: number;
  ncm: string;
  abnt: string;
}

function parseNumericConsumption(raw: string): number {
  const cleaned = String(raw ?? "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function explodeBomRequirements(doc: TechSheetData): BomMrpRequirement[] {
  const tiragem = Math.max(1, Math.round(doc.preCost.tiragemPlanejada || 300));
  return doc.bom.map((item) => {
    const consumoLiquidoUnit = parseNumericConsumption(item.consumo);
    const perdaPct = Math.max(0, Number(item.perdaPct ?? 3));
    const consumoBrutoUnit = round2(consumoLiquidoUnit * (1 + perdaPct / 100));
    const necessidadeBrutaLote = round2(consumoBrutoUnit * tiragem);
    const estoqueDisponivel = Math.max(0, Number(item.estoqueDisponivel ?? 0));
    const compraLiquidaNecessaria = round2(Math.max(0, necessidadeBrutaLote - estoqueDisponivel));
    const custoUnitarioAtual =
      item.custoUnitario != null && item.custoUnitario > 0
        ? item.custoUnitario
        : round2(item.custo / Math.max(0.0001, consumoBrutoUnit));
    const custoPecaAtual = round2(item.custo);
    const valorTotalCompraAtual = round2(compraLiquidaNecessaria * custoUnitarioAtual);

    return {
      itemId: item.id,
      tipo: item.tipo,
      material: item.material,
      fornecedorAtual: item.fornecedor || "Não homologado",
      unidade: item.unidade || "un",
      consumoLiquidoUnit,
      perdaPct,
      consumoBrutoUnit,
      tiragemPlanejada: tiragem,
      necessidadeBrutaLote,
      estoqueDisponivel,
      compraLiquidaNecessaria,
      custoUnitarioAtual: round2(custoUnitarioAtual),
      custoPecaAtual,
      valorTotalCompraAtual,
    };
  });
}

export function buildDefaultQuotesForItem(req: BomMrpRequirement): RfqSupplierQuote[] {
  const base = Math.max(0.5, req.custoUnitarioAtual);
  const minLot = Math.max(50, Math.round(req.necessidadeBrutaLote * 0.8));
  return [
    {
      id: `${req.itemId}-q1`,
      fornecedor: req.fornecedorAtual || "Têxtil Santa Catarina",
      uf: "SC",
      precoUnitario: round2(base),
      moq: minLot,
      leadTimeDias: 18,
      otifPct: 94,
      condicaoPagamento: "28/56 DDL",
    },
    {
      id: `${req.itemId}-q2`,
      fornecedor: "Malharia Vale do Itajaí S.A.",
      uf: "SC",
      precoUnitario: round2(base * 0.92),
      moq: Math.round(minLot * 1.15),
      leadTimeDias: 14,
      otifPct: 97,
      condicaoPagamento: "28/56/84 DDL",
    },
    {
      id: `${req.itemId}-q3`,
      fornecedor: "Fiação & Tecelagem Paraná",
      uf: "PR",
      precoUnitario: round2(base * 0.96),
      moq: Math.round(minLot * 0.75),
      leadTimeDias: 9,
      otifPct: 92,
      condicaoPagamento: "30/60 DDL",
    },
  ];
}

export function scoreRfqProposals(
  quotes: RfqSupplierQuote[],
  req: BomMrpRequirement,
): ScoredRfqQuote[] {
  if (quotes.length === 0) return [];
  const need = Math.max(
    1,
    req.compraLiquidaNecessaria > 0 ? req.compraLiquidaNecessaria : req.necessidadeBrutaLote,
  );
  const minPrice = Math.min(...quotes.map((q) => Math.max(0.01, q.precoUnitario)));
  const minLead = Math.min(...quotes.map((q) => Math.max(1, q.leadTimeDias)));

  const scored = quotes.map((q) => {
    const quantidadeFaturada = round2(Math.max(need, q.moq));
    const excessoMoq = round2(Math.max(0, quantidadeFaturada - need));
    const valorTotalPedido = round2(quantidadeFaturada * q.precoUnitario);
    const savingUnitario = round2(req.custoUnitarioAtual - q.precoUnitario);
    const savingPct =
      req.custoUnitarioAtual > 0 ? round2((savingUnitario / req.custoUnitarioAtual) * 100) : 0;
    const savingLote = round2(savingUnitario * need);

    // Score TCO Industrial: 60% competitividade preço efetivo (c/ penalidade leve de excesso MOQ),
    // 25% velocidade de entrega (lead time), 15% histórico OTIF.
    const effectiveUnit = valorTotalPedido / need;
    const priceScore = Math.min(100, (minPrice / Math.max(0.01, effectiveUnit)) * 100);
    const leadScore = Math.min(100, (minLead / Math.max(1, q.leadTimeDias)) * 100);
    const otifScore = Math.max(0, Math.min(100, q.otifPct));
    const scoreTco = round2(priceScore * 0.6 + leadScore * 0.25 + otifScore * 0.15);

    return {
      ...q,
      quantidadeFaturada,
      excessoMoq,
      valorTotalPedido,
      savingUnitario,
      savingPct,
      savingLote,
      scoreTco,
      winner: false,
    };
  });

  let bestIdx = 0;
  for (let i = 1; i < scored.length; i++) {
    if (scored[i]!.scoreTco > scored[bestIdx]!.scoreTco) bestIdx = i;
  }
  return scored.map((item, idx) => ({ ...item, winner: idx === bestIdx }));
}

export function measurementChartToTechSheetSpec(chart: MeasurementChart): TechSheetMeasurementSpec {
  const tamanhos = chart.grade.length > 0 ? chart.grade.map((g) => g.size) : ["P", "M", "G"];
  const baseIdx = tamanhos.includes("M") ? tamanhos.indexOf("M") : Math.floor(tamanhos.length / 2);
  const tamanhoBase = tamanhos[baseIdx] ?? tamanhos[0] ?? "M";

  const pontos: MeasurementPomRow[] = chart.points.map((pt) => {
    const baseVal = Number(chart.grade[baseIdx]?.values[pt.code] ?? 50);
    const nextVal =
      chart.grade[baseIdx + 1]?.values[pt.code] ??
      (baseIdx > 0
        ? baseVal + (baseVal - (chart.grade[baseIdx - 1]?.values[pt.code] ?? baseVal))
        : baseVal + 2);
    const step = round2(Number(nextVal) - baseVal);
    const overrides: Record<string, number> = {};
    chart.grade.forEach((g, idx) => {
      const actual = g.values[pt.code];
      if (actual != null && Number.isFinite(actual)) {
        const expected = round2(baseVal + (idx - baseIdx) * step);
        if (Math.abs(actual - expected) > 0.01) {
          overrides[g.size] = round2(actual);
        }
      }
    });

    return {
      id: `pom-${pt.code.toLowerCase()}`,
      codigo: pt.code,
      nome: pt.label,
      comoMedir: `Tabela corporativa ${chart.code} (${chart.name})`,
      valorBase: round2(baseVal),
      regraGraduacaoCm: step,
      toleranciaCm: pt.toleranceCm,
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    };
  });

  return {
    tamanhoBase,
    tamanhos,
    unidade: "cm",
    pontos,
    observacoesModelagem: `Vinculado da Tabela de Medidas ${chart.code} — ${chart.name} (${chart.segment} · fit ${chart.fit ?? "regular"}).`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPurchaseOrderPrintableHtml(
  refCode: string,
  req: BomMrpRequirement,
  winner: ScoredRfqQuote,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Ordem de Compra RFQ · ${escapeHtml(refCode)} · ${escapeHtml(winner.fornecedor)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; }
  h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
  th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
  .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Ordem de Compra Industrial · Adjudicação RFQ</h1>
      <div>USE MODA PLM · Referência: <strong>${escapeHtml(refCode)}</strong></div>
    </div>
    <div style="text-align:right">
      <div>Fornecedor Homologado: <strong>${escapeHtml(winner.fornecedor)} (${escapeHtml(winner.uf)})</strong></div>
      <div>Score TCO: <strong>${winner.scoreTco.toFixed(1)} / 100</strong></div>
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th>Insumo / Material</th>
        <th>Qtd. Faturada</th>
        <th>Preço Unitário</th>
        <th>Lead Time</th>
        <th>Condição</th>
        <th>Total OC (R$)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${escapeHtml(req.material)}</strong> (${escapeHtml(req.tipo)})</td>
        <td>${winner.quantidadeFaturada.toFixed(2)} ${escapeHtml(req.unidade)}</td>
        <td>R$ ${winner.precoUnitario.toFixed(2).replace(".", ",")}</td>
        <td>${winner.leadTimeDias} dias corridos</td>
        <td>${escapeHtml(winner.condicaoPagamento)}</td>
        <td><strong>R$ ${winner.valorTotalPedido.toFixed(2).replace(".", ",")}</strong></td>
      </tr>
    </tbody>
  </table>
  <div class="kpi">
    <div class="box"><div>Tiragem Coberta</div><strong>${req.tiragemPlanejada} peças</strong></div>
    <div class="box"><div>Economia Negociada</div><strong>R$ ${winner.savingLote.toFixed(2).replace(".", ",")} (${winner.savingPct.toFixed(1)}%)</strong></div>
    <div class="box"><div>OTIF Histórico</div><strong>${winner.otifPct}%</strong></div>
  </div>
</body>
</html>`;
}

const SHOWROOM_PRESETS: Record<
  string,
  {
    name: string;
    category: string;
    abnt: string;
    ncm: string;
    colors: Array<{ id: string; code: string; name: string; hex: string; status: "Ativa" }>;
    mult: number;
  }
> = {
  "V24-001": {
    name: "Camisa Polo Piquet Pima",
    category: "Camisa Polo Malharia",
    abnt: "97% Algodão Pima · 3% Elastano",
    ncm: "6105.10.00",
    colors: [
      { id: "v24-1", code: "CW-01", name: "Marinho Atlântico", hex: "#1E3A8A", status: "Ativa" },
      { id: "v24-2", code: "CW-02", name: "Off-White", hex: "#E2E8F0", status: "Ativa" },
    ],
    mult: 1.35,
  },
  "U25-014": {
    name: "Moletom Raglan Tech Fleece",
    category: "Moletom / Agasalho",
    abnt: "78% Algodão · 22% Poliéster Reciclado",
    ncm: "6110.20.00",
    colors: [
      { id: "u25-1", code: "CW-01", name: "Terracota Urbano", hex: "#C2410C", status: "Ativa" },
      { id: "u25-2", code: "CW-02", name: "Chumbo", hex: "#334155", status: "Ativa" },
    ],
    mult: 1.85,
  },
  "I25-088": {
    name: "Calça Jogger Alfaiataria Tech",
    category: "Calça / Bottom",
    abnt: "91% Poliamida · 9% Elastano",
    ncm: "6203.43.00",
    colors: [
      { id: "i25-1", code: "CW-01", name: "Grafite", hex: "#334155", status: "Ativa" },
      { id: "i25-2", code: "CW-02", name: "Oliva Militar", hex: "#3F6212", status: "Ativa" },
    ],
    mult: 1.65,
  },
};

export function buildShowroomCatalogItem(refCode: string, doc: TechSheetData, isCustomized = true) {
  const preset = !isCustomized ? SHOWROOM_PRESETS[refCode] : undefined;
  const pricing = computeFullTechSheetPricing(doc);
  const pvSugerido = round2(
    (pricing.precoReferenciaMargem || pricing.precoSugerido || 159.9) * (preset?.mult ?? 1),
  );
  const wholesaleUnitPrice = round2(pvSugerido * 0.46);
  const suggestedRetailPrice = round2(wholesaleUnitPrice * 2.35);
  const etq = doc.etiquetagem ?? defaultEtiquetagemFor();
  const abnt =
    preset?.abnt ||
    (etq.composicao.length
      ? etq.composicao.map((c) => `${c.pct}% ${c.fibra}`).join(" · ")
      : "100% Algodão");
  const ncm = preset?.ncm || etq.ncm || "6109.90.00";

  return {
    refCode,
    refName: preset?.name || doc.meta?.name || refCode,
    collection: doc.meta?.collection || "Verão 2027",
    category: preset?.category || doc.meta?.category || "Vestuário",
    colorways: preset?.colors || (doc.colorways?.length ? doc.colorways : defaultColorwaysFor()),
    wholesaleUnitPrice,
    suggestedRetailPrice,
    abnt,
    ncm,
  };
}

export function buildShowroomOrderPrintableHtml(
  buyerName: string,
  buyerCnpj: string,
  lines: ShowroomPackLine[],
): string {
  const totalPieces = lines.reduce((acc, l) => acc + l.packs * l.piecesPerPack, 0);
  const totalWholesale = lines.reduce(
    (acc, l) => acc + l.packs * l.piecesPerPack * l.wholesaleUnitPrice,
    0,
  );
  const rowsHtml = lines
    .map(
      (l) => `<tr>
      <td><strong>${escapeHtml(l.refCode)}</strong> — ${escapeHtml(l.refName)}</td>
      <td>${escapeHtml(l.colorName)}</td>
      <td>${escapeHtml(l.ncm)}</td>
      <td style="text-align:right">${l.packs} packs (${l.packs * l.piecesPerPack} pçs)</td>
      <td style="text-align:right">R$ ${l.wholesaleUnitPrice.toFixed(2).replace(".", ",")}</td>
      <td style="text-align:right"><strong>R$ ${(l.packs * l.piecesPerPack * l.wholesaleUnitPrice).toFixed(2).replace(".", ",")}</strong></td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Espelho de Pré-Pedido Showroom B2B · ${escapeHtml(buyerName)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; }
  h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Espelho de Pré-Pedido · Showroom Digital B2B</h1>
      <div>Lojista / Comprador: <strong>${escapeHtml(buyerName || "Multimarcas Parceira")}</strong> · CNPJ: <strong>${escapeHtml(buyerCnpj || "Sob consulta")}</strong></div>
    </div>
    <div style="text-align:right">
      <div>Total: <strong>${totalPieces} peças</strong></div>
      <div>Total Atacado B2B: <strong>R$ ${totalWholesale.toFixed(2).replace(".", ",")}</strong></div>
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th>Referência</th>
        <th>Cor</th>
        <th>NCM</th>
        <th style="text-align:right">Packs (2P·4M·4G·2GG)</th>
        <th style="text-align:right">Atacado Unit.</th>
        <th style="text-align:right">Subtotal B2B</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
}
