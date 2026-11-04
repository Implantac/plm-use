// Motor de Atribuição de Seeding (Cupom / UTM), ROAS por Creator
// e Romaneio Fiscal de Remessa em Bonificação / Mostruário (CFOP 5910 / 6910) A4.

import type { Influencer } from "./store";

export interface CreatorAttributionRow {
  influencer: Influencer;
  couponCode: string;
  utmLink: string;
  totalShipments: number;
  totalFeeAndCogsBrl: number;
  attributedRevenueBrl: number;
  roas: number;
  cacBrl: number;
  cfopRemessa: "5910" | "6910";
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function evaluateCreatorAttribution(
  influencers: Influencer[],
  avgTicketBrl = 199.9,
  unitCogsBrl = 42.5,
  factoryUf = "SC",
): CreatorAttributionRow[] {
  return influencers.map((inf) => {
    const cleanHandle = inf.handle.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const couponCode = `USE${cleanHandle.slice(0, 8)}10`;
    const utmLink = `https://loja.usemoda.com.br/?utm_source=instagram&utm_medium=influencer&utm_campaign=${cleanHandle.toLowerCase()}`;

    const totalShipments = Math.max(1, inf.envios.length);
    const feeTotal = inf.custoMedio * totalShipments;
    const cogsTotal = unitCogsBrl * totalShipments;
    const totalFeeAndCogsBrl = round2(feeTotal + cogsTotal);

    const attributedRevenueBrl = round2(inf.vendasGeradas * avgTicketBrl);
    const roas = totalFeeAndCogsBrl > 0 ? round2(attributedRevenueBrl / totalFeeAndCogsBrl) : 0;
    const cacBrl = inf.vendasGeradas > 0 ? round2(totalFeeAndCogsBrl / inf.vendasGeradas) : 0;
    const cfopRemessa: "5910" | "6910" = inf.uf.toUpperCase() === factoryUf ? "5910" : "6910";

    return {
      influencer: inf,
      couponCode,
      utmLink,
      totalShipments,
      totalFeeAndCogsBrl,
      attributedRevenueBrl,
      roas,
      cacBrl,
      cfopRemessa,
    };
  });
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSeedingBonusDispatchHtml(row: CreatorAttributionRow): string {
  const itemsHtml = row.influencer.envios
    .map(
      (e, idx) => `<tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(e.ref)}</strong></td>
      <td>${escapeHtml(e.nome)}</td>
      <td>${escapeHtml(e.data)}</td>
      <td>${escapeHtml(e.status)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Guia de Remessa Bonificação CFOP ${row.cfopRemessa} · ${escapeHtml(row.influencer.nome)}</title>
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
    <div style="font-size:9px;font-weight:700">EXPEDIÇÃO SEEDING & PRESS KIT · NATUREZA FISCAL: REMESSA EM BONIFICAÇÃO (CFOP ${row.cfopRemessa})</div>
    <h1>Creator: ${escapeHtml(row.influencer.nome)} (${escapeHtml(row.influencer.handle)}) — UF ${escapeHtml(row.influencer.uf)}</h1>
    <div>Cupom Rastreado: <strong>${escapeHtml(row.couponCode)}</strong> · Link UTM: ${escapeHtml(row.utmLink)}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Referência</th><th>Peça Enviada</th><th>Data</th><th>Status</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
</body>
</html>`;
}
