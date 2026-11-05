// Motor de Prontidão Go/No-Go pré-Lançamento (Omnichannel Readiness Gate)
// e Exportador Estruturado de Catálogo B2B / VTEX / Shopify (CSV + Checklist A4).

import type { TechSheetData } from "@/lib/techsheet/store";
import { operationalCodes, type SheetProvenance } from "@/lib/techsheet/provenance";

export interface OmnichannelInputs {
  /** Só fichas salvas (templates materializados ficam fora). */
  docs: Record<string, TechSheetData>;
  /** `false` → não há o que avaliar, exportar ou imprimir. */
  apuravel: boolean;
  provenance: SheetProvenance;
  /** Refs que existem no store mas são apenas modelo materializado. */
  excluidas: string[];
}

/**
 * Onda 30. O painel montava `{ V24-001: seedFor(...), DEV000006: seedFor(...) }`
 * quando o store estava vazio e, com isso, **exportava um feed CSV de catálogo
 * (GTIN/EAN-13 + NCM) e imprimia um Checklist Go/No-Go A4 inteiros de
 * demonstração**. Havia um selo de procedência na tela, mas os dois botões
 * continuavam ativos. Sem ficha salva não existe catálogo: `docs` fica vazio e
 * a tela desabilita as duas saídas.
 */
export function resolveOmnichannelInputs(
  sheets: Record<string, TechSheetData> | undefined,
  materializadas?: Record<string, true>,
): OmnichannelInputs {
  const todos = sheets ?? {};
  const codes = operationalCodes(todos, [], materializadas);
  const docs: Record<string, TechSheetData> = {};
  for (const code of codes) {
    const doc = todos[code];
    if (doc) docs[code] = doc;
  }
  return {
    docs,
    apuravel: codes.length > 0,
    provenance: codes.length > 0 ? "salva" : "referencia",
    excluidas: Object.keys(todos).filter((c) => !codes.includes(c)),
  };
}

export interface LaunchReadinessItem {
  ref: string;
  productName: string;
  collection: string;
  category: string;
  hasPrimaryFabric: boolean;
  hasMeasurements: boolean;
  hasCareLabelAbnt: boolean;
  hasOperationsBop: boolean;
  hasTargetPrice: boolean;
  readinessScorePct: number;
  goNoGoStatus: "APTO_GO_LIVE" | "PENDENCIA_ENGENHARIA";
  suggestedRetailPriceBrl: number;
  abntComposition: string;
  ncmFiscal: string;
  ean13: string;
}

function buildDeterministicEan13(ref: string): string {
  let acc = 0;
  for (let i = 0; i < ref.length; i++) acc = (acc * 31 + ref.charCodeAt(i)) % 1_000_000_000;
  const body12 = `789${String(acc).padStart(9, "0")}`.slice(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(body12[i] ?? 0);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${body12}${check}`;
}

export function evaluateOmnichannelReadiness(
  sheets: Record<string, TechSheetData>,
): LaunchReadinessItem[] {
  return Object.values(sheets).map((sheet) => {
    const hasPrimaryFabric = sheet.bom.some((b) => b.tipo === "Tecido");
    const hasMeasurements = Boolean(sheet.medidas && sheet.medidas.pontos.length > 0);
    const hasCareLabelAbnt = Boolean(
      sheet.etiquetagem && sheet.etiquetagem.composicao && sheet.etiquetagem.composicao.length > 0,
    );
    const hasOperationsBop = sheet.bop.length > 0;
    const suggestedRetailPriceBrl =
      sheet.preCost.targetPreco && sheet.preCost.targetPreco > 0
        ? sheet.preCost.targetPreco
        : Math.round(sheet.preCost.targetCusto * (1 + sheet.preCost.markupPct / 100) * 100) / 100;
    const hasTargetPrice = suggestedRetailPriceBrl > 0;
    // NCM é obrigatório num feed de marketplace e num catálogo que vai à SEFAZ.
    // Antes, ficha sem NCM recebia "6109.10.00" e passava como pronta.
    const ncmFiscal = sheet.etiquetagem?.ncm?.replace(/[^0-9.]/g, "") ?? "";
    const hasNcm = ncmFiscal.replace(/\D/g, "").length === 8;

    const checks = [
      hasPrimaryFabric,
      hasMeasurements,
      hasCareLabelAbnt,
      hasOperationsBop,
      hasTargetPrice,
      hasNcm,
    ];
    const passed = checks.filter(Boolean).length;
    const readinessScorePct = Math.round((passed / checks.length) * 100);
    // NCM é veto, não ponto: com 5 de 6 checks o escore dá 83% e a ficha
    // "passaria" — mas sem classificação fiscal não existe catálogo publicável.
    const goNoGoStatus: LaunchReadinessItem["goNoGoStatus"] =
      readinessScorePct >= 80 && hasNcm ? "APTO_GO_LIVE" : "PENDENCIA_ENGENHARIA";

    const abntComposition = sheet.etiquetagem?.composicao?.length
      ? sheet.etiquetagem.composicao.map((c) => `${c.pct}% ${c.fibra}`).join(" / ")
      : "Composição não informada";

    return {
      ref: sheet.ref,
      productName: sheet.meta?.name ?? `Produto ${sheet.ref}`,
      collection: sheet.meta?.collection ?? "Alto Verão 2027",
      category: sheet.meta?.category ?? "Vestuário",
      hasPrimaryFabric,
      hasMeasurements,
      hasCareLabelAbnt,
      hasOperationsBop,
      hasTargetPrice,
      readinessScorePct,
      goNoGoStatus,
      suggestedRetailPriceBrl,
      abntComposition,
      ncmFiscal,
      ean13: buildDeterministicEan13(sheet.ref),
    };
  });
}

export function buildOmnichannelCatalogCsv(items: LaunchReadinessItem[]): string {
  const header =
    "sku_ref;ean13_gtin;nome_comercial;colecao;categoria;ncm_sefaz;composicao_abnt;preco_sugerido_brl;prontidao_pct;status_go_live;url_dpp";
  const rows = items.map((it) =>
    [
      it.ref,
      it.ean13,
      it.productName.replace(/;/g, ","),
      it.collection.replace(/;/g, ","),
      it.category.replace(/;/g, ","),
      it.ncmFiscal,
      it.abntComposition.replace(/;/g, ","),
      it.suggestedRetailPriceBrl.toFixed(2),
      `${it.readinessScorePct}%`,
      it.goNoGoStatus,
      `https://dpp.usemoda.ind.br/${encodeURIComponent(it.ref)}`,
    ].join(";"),
  );
  return [header, ...rows].join("\n");
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLaunchGoNoGoHtml(items: LaunchReadinessItem[]): string {
  const trs = items
    .map(
      (i) => `<tr>
      <td><strong>${escapeHtml(i.ref)}</strong><br/><span style="font-size:9px;color:#475569">EAN ${i.ean13}</span></td>
      <td>${escapeHtml(i.productName)}</td>
      <td>${escapeHtml(i.abntComposition)}</td>
      <td style="text-align:right">R$ ${i.suggestedRetailPriceBrl.toFixed(2)}</td>
      <td style="text-align:center"><strong>${i.readinessScorePct}%</strong></td>
      <td><strong>${i.goNoGoStatus === "APTO_GO_LIVE" ? "APROVADO GO-LIVE" : "PENDENTE"}</strong></td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Checklist Go/No-Go Omnichannel · USE MODA PLM</title>
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
    <div style="font-size:9px;font-weight:700">COMITÊ GO-TO-MARKET · GATE DE PRONTIDÃO OMNICHANNEL</div>
    <h1>Checklist Técnico-Comercial de Lançamento (E-commerce / B2B / ERP)</h1>
  </div>
  <table>
    <thead><tr><th>Ref / GTIN</th><th>Produto</th><th>Composição ABNT</th><th style="text-align:right">Preço Alvo</th><th style="text-align:center">Score</th><th>Decisão</th></tr></thead>
    <tbody>${trs}</tbody>
  </table>
</body>
</html>`;
}
