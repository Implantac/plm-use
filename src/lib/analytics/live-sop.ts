// Torre S&OP (Sales & Operations Planning) Derivada 100% em Tempo Real:
// Elimina dependência exclusiva de KPIs manuais no BI Executivo (/analytics),
// cruzando Carteira B2B, Margem Ponderada, ROAS GTM, Capacidade CRP e Facções.

import { evaluateFiniteSectorCapacity } from "@/lib/pcp/finite-capacity-planner";
import {
  evaluateOrderCosting,
  sumNominalGrade,
  type PrivateLabelOrder,
  pedidosOperacionais,
} from "@/lib/sales/private-label-queue";
import type { ExternalServiceOrder } from "@/lib/techsheet/outsourcing-os";
import { computeGtmPortfolioSummary, type GtmDropCampaign } from "@/lib/techsheet/research-gtm";

export interface LiveSopSnapshot {
  b2bOrderRevenueBrl: number;
  b2bWeightedMarginPct: number;
  gtmAttributedSalesBrl: number;
  gtmBlendedRoas: number;
  sewingUtilizationPct: number;
  outsourcedPiecesInFlight: number;
  totalActivePiecesB2b: number;
  /** Onda 39: sem pedido próprio, carteira/margem/volume são `—`, não zero. */
  apuravelB2b: boolean;
  /** Onda 38: sem Drop próprio, receita/ROAS GTM são `—`, não zero. */
  apuravelGtm: boolean;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function computeLiveSopSnapshot(params: {
  orders: PrivateLabelOrder[];
  campaigns: GtmDropCampaign[];
  serviceOrders: ExternalServiceOrder[];
}): LiveSopSnapshot {
  // Onda 39: os 2 pedidos de fábrica têm CNPJ e preço de papel e geravam
  // R$ 9.867,20 de "carteira B2B" + 112 peças no Book Executivo. Filtrar AQUI
  // protege de uma vez o painel, o A4 e o cálculo de capacidade finita.
  const pedidos = pedidosOperacionais(params.orders);
  let b2bOrderRevenueBrl = 0;
  let b2bIndustrialCostBrl = 0;
  let totalActivePiecesB2b = 0;

  for (const o of pedidos) {
    const ev = evaluateOrderCosting(o);
    b2bOrderRevenueBrl += ev.grossRevenueBrl;
    b2bIndustrialCostBrl += ev.totals.industrialCost;
    totalActivePiecesB2b += ev.totalPieces;
  }

  const b2bWeightedMarginPct =
    b2bOrderRevenueBrl > 0
      ? round2(((b2bOrderRevenueBrl - b2bIndustrialCostBrl) / b2bOrderRevenueBrl) * 100)
      : 0;

  const gtm = computeGtmPortfolioSummary(params.campaigns);

  const crpLoads = evaluateFiniteSectorCapacity(
    pedidos.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      refCode: o.refCode,
      productName: o.productName,
      pieces: Math.max(1, sumNominalGrade(o.grade)),
      dueDate: o.dueDate,
      priority: "media",
      hasCustomApplication: true,
    })),
  );
  const sewing = crpLoads.find((l) => l.sector.sectorId === "costura");

  const outsourcedPiecesInFlight = params.serviceOrders.reduce(
    (acc, os) =>
      acc + Math.max(0, os.qtySent - os.qtyReturnedFirst - os.qtyReturnedSecond - os.qtyLost),
    0,
  );

  return {
    b2bOrderRevenueBrl: round2(b2bOrderRevenueBrl),
    b2bWeightedMarginPct,
    gtmAttributedSalesBrl: gtm.totalSalesBrl,
    gtmBlendedRoas: gtm.blendedRoas,
    sewingUtilizationPct: sewing?.utilizationPct ?? 0,
    outsourcedPiecesInFlight,
    totalActivePiecesB2b,
    apuravelB2b: pedidos.length > 0,
    apuravelGtm: gtm.totalCampaigns > 0,
  };
}

export function buildExecutiveSopReportHtml(snap: LiveSopSnapshot): string {
  const carteira = snap.apuravelB2b
    ? `R$ ${snap.b2bOrderRevenueBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "—";
  const margem = snap.apuravelB2b ? `${snap.b2bWeightedMarginPct.toFixed(1)}%` : "—";
  const volume = snap.apuravelB2b ? `${snap.totalActivePiecesB2b} peças` : "—";
  const receitaGtm = snap.apuravelGtm
    ? `R$ ${snap.gtmAttributedSalesBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "—";
  const roasGtm = snap.apuravelGtm ? `${snap.gtmBlendedRoas.toFixed(2)}x` : "—";
  const aviso =
    !snap.apuravelB2b || !snap.apuravelGtm
      ? `<div style="border:1px solid #b45309;background:#fffbeb;color:#92400e;padding:8px 10px;margin-bottom:10px;font-size:11px">
    <strong>Book S&OP parcialmente não apurável.</strong>
    ${!snap.apuravelB2b ? "Sem pedido B2B salvo: carteira, margem e volume não são apurados. " : ""}
    ${!snap.apuravelGtm ? "Sem Drop GTM salvo: receita atribuída e ROAS não são apurados. " : ""}
    Pedidos e campanhas de demonstração não entram na consolidação.
  </div>`
      : "";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Book Executivo S&OP · USE MODA PLM</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
  h1 { font-size: 16px; margin: 4px 0; text-transform: uppercase; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
  .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; }
  .lbl { font-size: 9px; text-transform: uppercase; color: #475569; font-weight: 700; }
  .val { font-size: 16px; font-weight: 800; margin-top: 4px; }
</style>
</head>
<body>
  <div style="border-bottom:2px solid #0f172a;padding-bottom:8px">
    <div style="font-size:9px;font-weight:700">DIRETORIA S&OP · CONSOLIDAÇÃO AUTOMÁTICA EM TEMPO REAL</div>
    <h1>Painel Integrado Comercial × Industrial × GTM</h1>
  </div>
  ${aviso}
  <div class="grid">
    <div class="kpi"><div class="lbl">Carteira B2B Ativa</div><div class="val">${carteira}</div></div>
    <div class="kpi"><div class="lbl">Margem Industrial Ponderada</div><div class="val">${margem}</div></div>
    <div class="kpi"><div class="lbl">Volume B2B</div><div class="val">${volume}</div></div>
    <div class="kpi"><div class="lbl">Receita GTM Atribuída</div><div class="val">${receitaGtm}</div></div>
    <div class="kpi"><div class="lbl">ROAS Blended Real</div><div class="val">${roasGtm}</div></div>
    <div class="kpi"><div class="lbl">Costura Interna / Em Facção</div><div class="val">${snap.sewingUtilizationPct}% · ${snap.outsourcedPiecesInFlight} pçs</div></div>
  </div>
</body>
</html>`;
}
