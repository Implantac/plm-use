// Motor de Passaporte Digital do Produto (DPP / Sustentabilidade ESG Têxtil + QR Vetorial)
// e Expedição Comercial B2B (Packing List por Caixa Master + Pré-XML NFe 4.00 SEFAZ).

import { computeFullTechSheetPricing, resolveDivisorParams } from "./pricing";
import { defaultEncaixeCadFor, defaultEtiquetagemFor, seedFor, type TechSheetData } from "./store";
import { converterMetroParaKg, round2 } from "./textile";

export function resolveReferenceTechSheet(
  refCode: string,
  sheetsMap: Record<string, TechSheetData>,
): TechSheetData {
  if (sheetsMap[refCode]) return sheetsMap[refCode]!;
  const base = seedFor(refCode);
  if (refCode === "V24-001") {
    return {
      ...base,
      meta: { ...base.meta!, name: "Camisa Polo Piquet Pima" },
      etiquetagem: {
        ...defaultEtiquetagemFor(),
        ncm: "6105.10.00",
        composicao: [{ fibra: "Algodão Pima", pct: 100 }],
      },
      encaixeCad: { ...defaultEncaixeCadFor(), eficienciaPct: 86.4 },
      bom: base.bom.map((b, i) =>
        i === 0 ? { ...b, consumo: "0.21", custoUnitario: 54.0, custo: 12.1 } : b,
      ),
    };
  }
  if (refCode === "U25-014") {
    return {
      ...base,
      meta: { ...base.meta!, name: "Moletom Raglan Tech Fleece" },
      etiquetagem: {
        ...defaultEtiquetagemFor(),
        ncm: "6110.20.00",
        composicao: [
          { fibra: "Algodão Orgânico", pct: 68 },
          { fibra: "Poliéster Reciclado", pct: 32 },
        ],
      },
      encaixeCad: { ...defaultEncaixeCadFor(), eficienciaPct: 81.5 },
      bom: base.bom.map((b, i) =>
        i === 0 ? { ...b, consumo: "0.42", custoUnitario: 62.5, custo: 28.1 } : b,
      ),
    };
  }
  if (refCode === "I25-088") {
    return {
      ...base,
      meta: { ...base.meta!, name: "Calça Jogger Alfaiataria Tech" },
      etiquetagem: {
        ...defaultEtiquetagemFor(),
        ncm: "6203.43.00",
        composicao: [
          { fibra: "Poliamida", pct: 90 },
          { fibra: "Elastano", pct: 10 },
        ],
      },
      encaixeCad: { ...defaultEncaixeCadFor(), eficienciaPct: 79.2 },
      bom: base.bom.map((b, i) =>
        i === 0 ? { ...b, consumo: "0.31", custoUnitario: 58.0, custo: 19.2 } : b,
      ),
    };
  }
  return base;
}

export interface DigitalProductPassport {
  refCode: string;
  refName: string;
  version: string;
  ncm: string;
  origin: string;
  compositionText: string;
  pieceWeightGrams: number;
  carbonKgCo2e: number;
  waterLiters: number;
  cadEfficiencyPct: number;
  cuttingWastePct: number;
  circularityScore: number;
  esgGrade: "A" | "B" | "C" | "D";
  traceabilityUri: string;
  qrSvgDataUrl: string;
}

export interface ExpeditionLineInput {
  refCode: string;
  qtyPieces: number;
  doc: TechSheetData;
}

export interface ExpeditionLineComputed {
  refCode: string;
  refName: string;
  ncm: string;
  cfop: string;
  qtyPieces: number;
  unitPriceBrl: number;
  subtotalBrl: number;
  netWeightKg: number;
  masterBoxes: number;
}

export interface PackingAndNfeSummary {
  clientName: string;
  clientCnpj: string;
  clientUf: string;
  cfop: string;
  totalPieces: number;
  totalMasterBoxes: number;
  netWeightKg: number;
  grossWeightKg: number;
  volumeCbm: number;
  productsTotalBrl: number;
  icmsValueBrl: number;
  pisCofinsValueBrl: number;
  lines: ExpeditionLineComputed[];
}

function estimatePieceWeightKg(doc: TechSheetData): number {
  const mainFabric = doc.bom.find((b) => b.tipo === "Tecido");
  if (!mainFabric) return 0.22;
  const rawConsumo =
    Number(
      String(mainFabric.consumo)
        .replace(",", ".")
        .replace(/[^0-9.-]/g, ""),
    ) || 0.25;
  const unit = (mainFabric.unidade ?? "").toLowerCase();
  if (unit === "kg") return Math.max(0.08, Math.min(1.8, rawConsumo));
  const larg = Number(mainFabric.larguraM) || 1.8;
  const gram = Number(mainFabric.gramaturaGm2) || 160;
  return Math.max(0.08, Math.min(1.8, converterMetroParaKg(rawConsumo, larg, gram)));
}

/** Gera um QR-like 21x21 determinístico em SVG puro (sem rede externa) para etiqueta DPP. */
export function buildQrMatrixSvg(payload: string): string {
  const size = 21;
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinder = (r: number, c: number, r0: number, c0: number) => {
    const dr = r - r0;
    const dc = c - c0;
    if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return null;
    if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
    if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
    return false;
  };

  const rects: string[] = [];
  let seed = hash >>> 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const f1 = isFinder(r, c, 0, 0);
      const f2 = isFinder(r, c, 0, size - 7);
      const f3 = isFinder(r, c, size - 7, 0);
      let dark = false;
      if (f1 !== null) dark = f1;
      else if (f2 !== null) dark = f2;
      else if (f3 !== null) dark = f3;
      else if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) {
        dark = false;
      } else {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        dark = (seed & 1) === 1;
      }
      if (dark) {
        rects.push(`<rect x="${c + 2}" y="${r + 2}" width="1" height="1" fill="#0F172A"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" shape-rendering="crispEdges"><rect width="25" height="25" rx="2" fill="#FFFFFF"/>${rects.join("")}</svg>`;
}

export function computeDigitalProductPassport(
  refCode: string,
  doc: TechSheetData,
): DigitalProductPassport {
  const etq = doc.etiquetagem ?? defaultEtiquetagemFor();
  const cad = doc.encaixeCad ?? defaultEncaixeCadFor();
  const weightKg = estimatePieceWeightKg(doc);
  const pieceWeightGrams = Math.round(weightKg * 1000);

  // Fatores médios LCA têxtil (kg CO2e/kg fibra e L H2O/kg fibra)
  let co2Factor = 14.5;
  let waterFactor = 1800;
  if (etq.composicao.length > 0) {
    co2Factor = 0;
    waterFactor = 0;
    for (const f of etq.composicao) {
      const share = Math.max(0, f.pct) / 100;
      const name = f.fibra.toLowerCase();
      if (/reciclad|rpet/.test(name)) {
        co2Factor += share * 6.8;
        waterFactor += share * 420;
      } else if (/linho|c[aâ]nhamo|liocel|modal|viscose/.test(name)) {
        co2Factor += share * 9.2;
        waterFactor += share * 1100;
      } else if (/algod[aã]o/.test(name)) {
        co2Factor += share * 12.4;
        waterFactor += share * 4800;
      } else if (/poliamida|nylon/.test(name)) {
        co2Factor += share * 18.6;
        waterFactor += share * 950;
      } else if (/elastano|lycra/.test(name)) {
        co2Factor += share * 21.0;
        waterFactor += share * 1200;
      } else {
        // Poliéster padrão
        co2Factor += share * 14.2;
        waterFactor += share * 780;
      }
    }
  }

  const cadEfficiencyPct = round2(cad.eficienciaPct || 85);
  const cuttingWastePct = round2(Math.max(0, 100 - cadEfficiencyPct));
  const wasteMultiplier = 1 + cuttingWastePct / 100;

  const carbonKgCo2e = round2(weightKg * co2Factor * wasteMultiplier);
  const waterLiters = Math.round(weightKg * waterFactor * wasteMultiplier);

  // Circularidade: monomaterial e encaixe >=85% pontuam mais
  const fiberCountPenalty = Math.max(0, (etq.composicao.length - 1) * 11);
  const hasElastanePenalty = etq.composicao.some((c) => /elastano/i.test(c.fibra) && c.pct > 5)
    ? 8
    : 0;
  const cadBonus = Math.min(25, Math.max(0, (cadEfficiencyPct - 70) * 1.1));
  const circularityScore = Math.round(
    Math.min(98, Math.max(35, 78 + cadBonus - fiberCountPenalty - hasElastanePenalty)),
  );

  const esgGrade: DigitalProductPassport["esgGrade"] =
    circularityScore >= 82
      ? "A"
      : circularityScore >= 68
        ? "B"
        : circularityScore >= 52
          ? "C"
          : "D";

  const version = doc.versoes?.[0]?.versao || "v1.0";
  const ncm = etq.ncm || "6109.90.00";
  const traceabilityUri = `https://dpp.usemoda.ind.br/${encodeURIComponent(refCode)}/${encodeURIComponent(version)}?ncm=${encodeURIComponent(ncm)}`;
  const qrSvg = buildQrMatrixSvg(traceabilityUri);

  return {
    refCode,
    refName: doc.meta?.name || refCode,
    version,
    ncm,
    origin: etq.paisOrigem || "Feito no Brasil",
    compositionText: etq.composicao.length
      ? etq.composicao.map((c) => `${c.pct}% ${c.fibra}`).join(" · ")
      : "100% Algodão",
    pieceWeightGrams,
    carbonKgCo2e,
    waterLiters,
    cadEfficiencyPct,
    cuttingWastePct,
    circularityScore,
    esgGrade,
    traceabilityUri,
    qrSvgDataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`,
  };
}

export function computePackingAndNfePreview(
  inputs: ExpeditionLineInput[],
  clientName: string,
  clientCnpj: string,
  clientUf: string,
): PackingAndNfeSummary {
  const sameState = clientUf.trim().toUpperCase() === "PR";
  const cfop = sameState ? "5101" : "6101"; // Venda de produção do estabelecimento

  let totalPieces = 0;
  let totalMasterBoxes = 0;
  let netWeightKg = 0;
  let productsTotalBrl = 0;
  let icmsValueBrl = 0;
  let pisCofinsValueBrl = 0;

  const lines: ExpeditionLineComputed[] = inputs
    .filter((i) => i.qtyPieces > 0)
    .map(({ refCode, qtyPieces, doc }) => {
      const pricing = computeFullTechSheetPricing(doc);
      const div = resolveDivisorParams(doc.preCost.divisor);
      const etq = doc.etiquetagem ?? defaultEtiquetagemFor();
      const pv = pricing.precoReferenciaMargem || pricing.precoSugerido || 119.9;
      const unitPriceBrl = round2(pv * 0.52); // Preço Faturamento B2B Indústria
      const subtotalBrl = round2(unitPriceBrl * qtyPieces);
      const unitKg = estimatePieceWeightKg(doc);
      const lineNetKg = round2(unitKg * qtyPieces);
      const masterBoxes = Math.max(1, Math.ceil(qtyPieces / 24));

      totalPieces += qtyPieces;
      totalMasterBoxes += masterBoxes;
      netWeightKg += lineNetKg;
      productsTotalBrl += subtotalBrl;
      icmsValueBrl += subtotalBrl * ((sameState ? 18 : 12) / 100);
      pisCofinsValueBrl += subtotalBrl * (Math.min(9.25, div.impostosPct * 0.25) / 100);

      return {
        refCode,
        refName: doc.meta?.name || refCode,
        ncm: (etq.ncm || "6109.90.00").replace(/[^0-9.]/g, ""),
        cfop,
        qtyPieces,
        unitPriceBrl,
        subtotalBrl,
        netWeightKg: lineNetKg,
        masterBoxes,
      };
    });

  netWeightKg = round2(netWeightKg);
  const grossWeightKg = round2(netWeightKg + totalMasterBoxes * 0.65); // tara 650g caixa papelão onda dupla
  const volumeCbm = round2(totalMasterBoxes * (0.6 * 0.4 * 0.3)); // 0,072 m³/caixa

  return {
    clientName: clientName || "Cliente B2B",
    clientCnpj: clientCnpj || "00.000.000/0001-00",
    clientUf: clientUf.trim().toUpperCase() || "SP",
    cfop,
    totalPieces,
    totalMasterBoxes,
    netWeightKg,
    grossWeightKg,
    volumeCbm,
    productsTotalBrl: round2(productsTotalBrl),
    icmsValueBrl: round2(icmsValueBrl),
    pisCofinsValueBrl: round2(pisCofinsValueBrl),
    lines,
  };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildPreNfeXml400(summary: PackingAndNfeSummary): string {
  const detXml = summary.lines
    .map(
      (l, idx) => `    <det nItem="${idx + 1}">
      <prod>
        <cProd>${escapeXml(l.refCode)}</cProd>
        <xProd>${escapeXml(l.refName)}</xProd>
        <NCM>${escapeXml(l.ncm.replace(/\./g, ""))}</NCM>
        <CFOP>${l.cfop}</CFOP>
        <uCom>UN</uCom>
        <qCom>${l.qtyPieces.toFixed(4)}</qCom>
        <vUnCom>${l.unitPriceBrl.toFixed(2)}</vUnCom>
        <vProd>${l.subtotalBrl.toFixed(2)}</vProd>
      </prod>
    </det>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="NFePR2026USEMODAPLM">
    <ide>
      <natOp>VENDA DE PRODUCAO DO ESTABELECIMENTO</natOp>
      <mod>55</mod>
      <tpNF>1</tpNF>
    </ide>
    <emit>
      <xNome>USE MODA INDUSTRIA DO VESTUARIO LTDA</xNome>
      <UF>PR</UF>
    </emit>
    <dest>
      <CNPJ>${escapeXml(summary.clientCnpj.replace(/\D/g, "").padEnd(14, "0").slice(0, 14))}</CNPJ>
      <xNome>${escapeXml(summary.clientName)}</xNome>
      <UF>${escapeXml(summary.clientUf)}</UF>
    </dest>
${detXml}
    <total>
      <ICMSTot>
        <vProd>${summary.productsTotalBrl.toFixed(2)}</vProd>
        <vICMS>${summary.icmsValueBrl.toFixed(2)}</vICMS>
        <vPIS>${(summary.pisCofinsValueBrl * 0.18).toFixed(2)}</vPIS>
        <vCOFINS>${(summary.pisCofinsValueBrl * 0.82).toFixed(2)}</vCOFINS>
        <vNF>${summary.productsTotalBrl.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <vol>
        <qVol>${summary.totalMasterBoxes}</qVol>
        <esp>CAIXA MASTER</esp>
        <pesoL>${summary.netWeightKg.toFixed(3)}</pesoL>
        <pesoB>${summary.grossWeightKg.toFixed(3)}</pesoB>
      </vol>
    </transp>
  </infNFe>
</NFe>`;
}

export function buildPackingListPrintableHtml(summary: PackingAndNfeSummary): string {
  const rows = summary.lines
    .map(
      (l) => `<tr>
      <td><strong>${escapeXml(l.refCode)}</strong> — ${escapeXml(l.refName)}</td>
      <td>${escapeXml(l.ncm)}</td>
      <td>${l.cfop}</td>
      <td style="text-align:right">${l.masterBoxes} cx</td>
      <td style="text-align:right">${l.qtyPieces} UN</td>
      <td style="text-align:right">${l.netWeightKg.toFixed(2)} kg</td>
      <td style="text-align:right"><strong>R$ ${l.subtotalBrl.toFixed(2).replace(".", ",")}</strong></td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Romaneio Packing List · ${escapeXml(summary.clientName)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; }
  h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Romaneio de Expedição (Packing List) & Pré-Faturamento</h1>
      <div>Destinatário: <strong>${escapeXml(summary.clientName)} (${escapeXml(summary.clientUf)})</strong> · CNPJ: ${escapeXml(summary.clientCnpj)}</div>
    </div>
    <div style="text-align:right">
      <div>Volumes: <strong>${summary.totalMasterBoxes} Caixas Master (${summary.volumeCbm.toFixed(3)} m³)</strong></div>
      <div>Peso Líquido: <strong>${summary.netWeightKg.toFixed(2)} kg</strong> · Bruto: <strong>${summary.grossWeightKg.toFixed(2)} kg</strong></div>
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th>Referência</th>
        <th>NCM</th>
        <th>CFOP</th>
        <th style="text-align:right">Volumes</th>
        <th style="text-align:right">Qtd.</th>
        <th style="text-align:right">Peso Líq.</th>
        <th style="text-align:right">Subtotal</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

export function buildDppPrintableHtml(dpp: DigitalProductPassport): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Passaporte Digital do Produto (DPP) · ${escapeXml(dpp.refCode)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0; color: #064e3b; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
  .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc; }
  .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; display: block; }
  .val { font-size: 16px; font-weight: 700; margin-top: 4px; display: block; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">Passaporte Digital do Produto · Norma EU ESPR / ABNT</h1>
      <div>Referência: <strong>${escapeXml(dpp.refCode)} (${escapeXml(dpp.version)})</strong> — ${escapeXml(dpp.refName)}</div>
      <div>NCM: <strong>${escapeXml(dpp.ncm)}</strong> · Origem: <strong>${escapeXml(dpp.origin)}</strong> · Composição: <strong>${escapeXml(dpp.compositionText)}</strong></div>
      <div style="font-size:10px;color:#475569;margin-top:4px">URI Rastreável: ${escapeXml(dpp.traceabilityUri)}</div>
    </div>
    <img src="${dpp.qrSvgDataUrl}" alt="QR DPP" style="width:92px;height:92px;border:1px solid #cbd5e1;padding:4px;border-radius:6px" />
  </div>
  <div class="grid">
    <div class="box"><span class="lbl">Rating ESG Têxtil</span><span class="val">Classe ${dpp.esgGrade}</span></div>
    <div class="box"><span class="lbl">Pegada de Carbono (LCA)</span><span class="val">${dpp.carbonKgCo2e} kg CO₂e / pç</span></div>
    <div class="box"><span class="lbl">Pegada Hídrica</span><span class="val">${dpp.waterLiters} L H₂O / pç</span></div>
    <div class="box"><span class="lbl">Peso Líquido Estimado</span><span class="val">${dpp.pieceWeightGrams} g</span></div>
    <div class="box"><span class="lbl">Índice de Circularidade</span><span class="val">${dpp.circularityScore} / 100</span></div>
    <div class="box"><span class="lbl">Desperdício de Encaixe CAD</span><span class="val">${dpp.cuttingWastePct}%</span></div>
  </div>
</body>
</html>`;
}
