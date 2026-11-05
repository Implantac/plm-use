// Motor de Cronoanálise GSD / Yamazumi (Takt Time, Pool de Máquinas, Custo Minuto)
// e Apuração DRE Gerencial Têxtil + OTB (Open-To-Buy) + Ponto de Equilíbrio (CFO).

import { computeFullTechSheetPricing, resolveDivisorParams } from "./pricing";
import { seedFor, type BopStep, type TechSheetData } from "./store";
import { round2 } from "./textile";

export interface CellGsdParams {
  jornadaMinutosDia: number;
  eficienciaOperacionalPct: number;
  metaPecasDia: number;
  custoMinutoIndustrial: number;
}

export interface GsdStationRow {
  stepId: string;
  seq: number;
  etapa: string;
  setor: string;
  maquina: string;
  terceirizada: boolean;
  samMin: number;
  operadoresTeoricos: number;
  postosAlocados: number;
  tempoCicloPostoMin: number;
  ocupacaoPct: number;
  custoCalculadoPeca: number;
  isBottleneck: boolean;
}

export interface CellGsdBalancingResult {
  samInternoTotalMin: number;
  samTerceirizadoMin: number;
  minutosDisponiveisOperadorDia: number;
  taktTimeExigidoMin: number;
  totalPostosAlocados: number;
  operadoresTeoricosTotais: number;
  gargaloCicloMin: number;
  gargaloEtapa: string;
  capacidadeRealPecasDia: number;
  eficienciaBalanceamentoPct: number;
  custoMaoObraInternaSugerido: number;
  poolMaquinas: Array<{ maquina: string; postos: number }>;
  stations: GsdStationRow[];
}

export interface DreSkuBreakdown {
  refCode: string;
  refName: string;
  /** `false` quando o SKU só existe no modelo de demonstração. */
  salva: boolean;
  tiragem: number;
  unitPrice: number;
  unitMaterialCost: number;
  unitLaborCost: number;
  grossRevenue: number;
  cmvTotal: number;
  contributionMarginPct: number;
}

export interface CollectionDreSummary {
  totalPieces: number;
  grossRevenue: number;
  taxDeductions: number;
  netRevenue: number;
  cmvMaterial: number;
  cmvLabor: number;
  cmvTotal: number;
  grossProfit: number;
  commercialExpenses: number;
  contributionMarginBrl: number;
  contributionMarginPct: number;
  fixedOverheadBrl: number;
  ebitdaBrl: number;
  ebitdaPct: number;
  breakEvenPieces: number;
  breakEvenRevenueBrl: number;
  otbBudgetBrl: number;
  otbCommittedBrl: number;
  otbRemainingBrl: number;
  /**
   * De onde vieram os SKUs que entraram na conta. A home mostrava EBITDA de
   * coleção somando quatro fichas de exemplo; sem esta informação o número
   * aparecia como se fosse a operação da empresa.
   */
  origem: {
    salvas: string[];
    referencias: string[];
    /** Nenhuma ficha salva: os números são 100% modelo. */
    apenasReferencia: boolean;
  };
  /**
   * Totais das fichas salvas, sem o modelo. `contribuicaoBrl` é margem de
   * contribuição (receita − impostos − comerciais − CMV); só vira EBITDA quando
   * não há SKU de referência diluindo o overhead fixo da coleção.
   */
  somenteSalvas: { totalPieces: number; grossRevenue: number; contribuicaoBrl: number };
  skus: DreSkuBreakdown[];
}

function inferSewingMachine(step: BopStep): string {
  if (step.maquina && step.maquina.trim()) return step.maquina.trim();
  const s = `${step.etapa} ${step.setor}`.toLowerCase();
  if (/corte|enfesto|risco/.test(s)) return "Mesa de Corte / Enfesto";
  if (/fechamento|ombro|lateral|overlo/.test(s)) return "Overloque Ponto Cadeia 4F";
  if (/barra|gola|cobertura|galoneira/.test(s)) return "Galoneira Eletrônica 3A";
  if (/travete|mosca/.test(s)) return "Travete Eletrônico";
  if (/prensa|transfer|sublima/.test(s)) return "Prensa Térmica Industrial";
  if (/revis[aã]o|embalagem|acabamento|passadoria/.test(s)) return "Bancada Revisão & Vapor";
  return "Reta Eletrônica Direct-Drive";
}

export function computeCellGsdBalancing(
  doc: TechSheetData,
  params: CellGsdParams,
): CellGsdBalancingResult {
  const minutosDisponiveisOperadorDia = round2(
    Math.max(60, params.jornadaMinutosDia) *
      (Math.max(10, Math.min(100, params.eficienciaOperacionalPct)) / 100),
  );
  const meta = Math.max(1, params.metaPecasDia);
  const taktTimeExigidoMin = round2(minutosDisponiveisOperadorDia / meta);

  const internalSteps = doc.bop.filter((b) => !b.terceirizada);
  const outsourcedSteps = doc.bop.filter((b) => b.terceirizada);

  const samInternoTotalMin = round2(
    internalSteps.reduce((acc, s) => acc + Math.max(0.05, Number(s.tempoMin) || 0), 0),
  );
  const samTerceirizadoMin = round2(
    outsourcedSteps.reduce((acc, s) => acc + Math.max(0, Number(s.tempoMin) || 0), 0),
  );

  const rawStations = doc.bop.map((step) => {
    const samMin = round2(Math.max(0.05, Number(step.tempoMin) || 0.2));
    const maquina = inferSewingMachine(step);
    if (step.terceirizada) {
      return {
        stepId: step.id,
        seq: step.seq,
        etapa: step.etapa,
        setor: step.setor,
        maquina,
        terceirizada: true,
        samMin,
        operadoresTeoricos: 0,
        postosAlocados: 0,
        tempoCicloPostoMin: 0,
        ocupacaoPct: 0,
        custoCalculadoPeca: round2(step.custo),
        isBottleneck: false,
      };
    }

    const operadoresTeoricos = round2(samMin / Math.max(0.05, taktTimeExigidoMin));
    const postosAlocados = Math.max(1, Math.ceil(operadoresTeoricos - 0.04));
    const tempoCicloPostoMin = round2(samMin / postosAlocados);
    const custoCalculadoPeca = round2(samMin * Math.max(0.1, params.custoMinutoIndustrial));

    return {
      stepId: step.id,
      seq: step.seq,
      etapa: step.etapa,
      setor: step.setor,
      maquina,
      terceirizada: false,
      samMin,
      operadoresTeoricos,
      postosAlocados,
      tempoCicloPostoMin,
      ocupacaoPct: 0,
      custoCalculadoPeca,
      isBottleneck: false,
    };
  });

  const activeInternal = rawStations.filter((r) => !r.terceirizada);
  const gargaloCicloMin =
    activeInternal.length > 0
      ? Math.max(...activeInternal.map((r) => r.tempoCicloPostoMin))
      : taktTimeExigidoMin;

  let bottleneckMarked = false;
  const stations: GsdStationRow[] = rawStations.map((r) => {
    if (r.terceirizada) return r;
    const isBottleneck =
      !bottleneckMarked && Math.abs(r.tempoCicloPostoMin - gargaloCicloMin) < 0.001;
    if (isBottleneck) bottleneckMarked = true;
    const ocupacaoPct =
      gargaloCicloMin > 0 ? round2((r.tempoCicloPostoMin / gargaloCicloMin) * 100) : 100;
    return { ...r, ocupacaoPct, isBottleneck };
  });

  const totalPostosAlocados = activeInternal.reduce((acc, r) => acc + r.postosAlocados, 0);
  const operadoresTeoricosTotais = round2(
    activeInternal.reduce((acc, r) => acc + r.operadoresTeoricos, 0),
  );
  const capacidadeRealPecasDia =
    gargaloCicloMin > 0 ? Math.floor(minutosDisponiveisOperadorDia / gargaloCicloMin) : meta;
  const eficienciaBalanceamentoPct =
    totalPostosAlocados > 0 && gargaloCicloMin > 0
      ? round2(Math.min(100, (samInternoTotalMin / (totalPostosAlocados * gargaloCicloMin)) * 100))
      : 100;

  const custoMaoObraInternaSugerido = round2(
    activeInternal.reduce((acc, r) => acc + r.custoCalculadoPeca, 0),
  );

  const machineMap = new Map<string, number>();
  for (const st of stations) {
    if (!st.terceirizada) {
      machineMap.set(st.maquina, (machineMap.get(st.maquina) ?? 0) + st.postosAlocados);
    }
  }
  const poolMaquinas = Array.from(machineMap.entries()).map(([maquina, postos]) => ({
    maquina,
    postos,
  }));

  return {
    samInternoTotalMin,
    samTerceirizadoMin,
    minutosDisponiveisOperadorDia,
    taktTimeExigidoMin,
    totalPostosAlocados,
    operadoresTeoricosTotais,
    gargaloCicloMin,
    gargaloEtapa: stations.find((s) => s.isBottleneck)?.etapa ?? "—",
    capacidadeRealPecasDia,
    eficienciaBalanceamentoPct,
    custoMaoObraInternaSugerido,
    poolMaquinas,
    stations,
  };
}

export function computeCollectionDreSummary(
  sheetsMap: Record<string, TechSheetData>,
  fixedOverheadBrl = 85_000,
  otbBudgetBrl = 220_000,
): CollectionDreSummary {
  const keys = Array.from(
    new Set(["DEV000006", "V24-001", "U25-014", "I25-088", ...Object.keys(sheetsMap)]),
  );

  const multByRef: Record<string, { tiragem: number; priceMult: number; name?: string }> = {
    DEV000006: { tiragem: 1800, priceMult: 1 },
    "V24-001": { tiragem: 1400, priceMult: 1.35, name: "Camisa Polo Piquet Pima" },
    "U25-014": { tiragem: 950, priceMult: 1.85, name: "Moletom Raglan Tech Fleece" },
    "I25-088": { tiragem: 1200, priceMult: 1.65, name: "Calça Jogger Alfaiataria Tech" },
  };

  let totalPieces = 0;
  let grossRevenue = 0;
  // Acumuladores paralelos: o que é de ficha salva, separado do que é modelo.
  let salvasPieces = 0;
  let salvasRevenue = 0;
  let salvasEbitdaBase = 0;
  let taxDeductions = 0;
  let cmvMaterial = 0;
  let cmvLabor = 0;
  let commercialExpenses = 0;

  const skus: DreSkuBreakdown[] = keys.map((refCode) => {
    const isCustom = refCode in sheetsMap;
    const doc = sheetsMap[refCode] ?? seedFor(refCode);
    const preset = !isCustom ? multByRef[refCode] : undefined;
    const pricing = computeFullTechSheetPricing(doc);
    const div = resolveDivisorParams(doc.preCost.divisor);

    const tiragem = Math.max(
      50,
      isCustom
        ? (doc.preCost.tiragemPlanejada ?? 600)
        : (preset?.tiragem ?? doc.preCost.tiragemPlanejada ?? 600),
    );
    const mult = preset?.priceMult ?? 1;
    const unitPrice = round2(
      (pricing.precoReferenciaMargem || pricing.precoSugerido || 99.9) * mult,
    );
    const unitMaterialCost = round2(
      (pricing.bom + pricing.aplicacoesPeca + pricing.setupPorPeca) * mult,
    );
    const unitLaborCost = round2((pricing.bop + pricing.overhead) * mult);

    const taxPct = div.impostosPct / 100;
    const commPct =
      (div.comissaoPct + div.taxaFinanceiraPct + div.fretePct + div.inadimplenciaPct) / 100;

    const skuGross = round2(unitPrice * tiragem);
    const skuTax = round2(skuGross * taxPct);
    const skuComm = round2(skuGross * commPct);
    const skuMat = round2(unitMaterialCost * tiragem);
    const skuLab = round2(unitLaborCost * tiragem);
    const skuCmv = round2(skuMat + skuLab);
    const skuMcBrl = skuGross - skuTax - skuComm - skuCmv;
    const skuMcPct = skuGross > 0 ? round2((skuMcBrl / skuGross) * 100) : 0;

    totalPieces += tiragem;
    grossRevenue += skuGross;
    taxDeductions += skuTax;
    commercialExpenses += skuComm;
    cmvMaterial += skuMat;
    cmvLabor += skuLab;

    if (isCustom) {
      salvasPieces += tiragem;
      salvasRevenue += skuGross;
      salvasEbitdaBase += skuMcBrl;
    }

    return {
      refCode,
      refName: preset?.name || doc.meta?.name || refCode,
      salva: isCustom,
      tiragem,
      unitPrice,
      unitMaterialCost,
      unitLaborCost,
      grossRevenue: skuGross,
      cmvTotal: skuCmv,
      contributionMarginPct: skuMcPct,
    };
  });

  grossRevenue = round2(grossRevenue);
  taxDeductions = round2(taxDeductions);
  const netRevenue = round2(grossRevenue - taxDeductions);
  cmvMaterial = round2(cmvMaterial);
  cmvLabor = round2(cmvLabor);
  const cmvTotal = round2(cmvMaterial + cmvLabor);
  const grossProfit = round2(netRevenue - cmvTotal);
  commercialExpenses = round2(commercialExpenses);
  const contributionMarginBrl = round2(grossProfit - commercialExpenses);
  const contributionMarginPct =
    grossRevenue > 0 ? round2((contributionMarginBrl / grossRevenue) * 100) : 0;

  const fixed = Math.max(0, fixedOverheadBrl);
  const ebitdaBrl = round2(contributionMarginBrl - fixed);
  const ebitdaPct = grossRevenue > 0 ? round2((ebitdaBrl / grossRevenue) * 100) : 0;

  const avgContributionPerPiece = totalPieces > 0 ? contributionMarginBrl / totalPieces : 1;
  const breakEvenPieces =
    avgContributionPerPiece > 0 ? Math.ceil(fixed / avgContributionPerPiece) : 0;
  const avgTicket = totalPieces > 0 ? grossRevenue / totalPieces : 0;
  const breakEvenRevenueBrl = round2(breakEvenPieces * avgTicket);

  const otbCommittedBrl = cmvMaterial;
  const otbRemainingBrl = round2(otbBudgetBrl - otbCommittedBrl);

  const salvas = skus.filter((k) => k.salva).map((k) => k.refCode);
  const referencias = skus.filter((k) => !k.salva).map((k) => k.refCode);

  return {
    totalPieces,
    grossRevenue,
    taxDeductions,
    netRevenue,
    cmvMaterial,
    cmvLabor,
    cmvTotal,
    grossProfit,
    commercialExpenses,
    contributionMarginBrl,
    contributionMarginPct,
    fixedOverheadBrl: round2(fixed),
    ebitdaBrl,
    ebitdaPct,
    breakEvenPieces,
    breakEvenRevenueBrl,
    otbBudgetBrl: round2(otbBudgetBrl),
    otbCommittedBrl,
    otbRemainingBrl,
    origem: {
      salvas,
      referencias,
      apenasReferencia: salvas.length === 0,
    },
    // O overhead fixo é da operação inteira: quando só há parte das fichas
    // salvas, ratear esse custo entre elas daria um EBITDA falso para baixo.
    // Por isso o "somente salvas" é contribuição, não EBITDA, e só vira EBITDA
    // quando todas as fichas da coleção são salvas.
    somenteSalvas: {
      totalPieces: salvasPieces,
      grossRevenue: round2(salvasRevenue),
      contribuicaoBrl: round2(salvasEbitdaBase),
    },
    skus,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLineBalancingPrintableHtml(
  refCode: string,
  refName: string,
  res: CellGsdBalancingResult,
): string {
  const rows = res.stations
    .map(
      (s) => `<tr style="${s.isBottleneck ? "background:#fef2f2;font-weight:700" : ""}">
      <td>${s.seq}</td>
      <td>${escapeHtml(s.etapa)} ${s.isBottleneck ? "(GARGALO)" : ""}</td>
      <td>${escapeHtml(s.maquina)}</td>
      <td style="text-align:right">${s.samMin.toFixed(2)} min</td>
      <td style="text-align:right">${s.terceirizada ? "Facção Ext." : s.postosAlocados}</td>
      <td style="text-align:right">${s.terceirizada ? "—" : `${s.tempoCicloPostoMin.toFixed(2)} min`}</td>
      <td style="text-align:right">${s.terceirizada ? "—" : `${s.ocupacaoPct.toFixed(0)}%`}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Balanceamento de Célula · ${escapeHtml(refCode)}</title>
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
      <h1>Folha de Balanceamento de Célula Industrial (GSD / Takt Time)</h1>
      <div>Referência: <strong>${escapeHtml(refCode)} — ${escapeHtml(refName)}</strong> · SAM Interno: <strong>${res.samInternoTotalMin.toFixed(2)} min</strong></div>
    </div>
    <div style="text-align:right">
      <div>Takt Exigido: <strong>${res.taktTimeExigidoMin.toFixed(2)} min/pç</strong> · Postos: <strong>${res.totalPostosAlocados}</strong></div>
      <div>Capacidade Real: <strong>${res.capacidadeRealPecasDia} pçs/dia</strong> · Eficiência: <strong>${res.eficienciaBalanceamentoPct.toFixed(1)}%</strong></div>
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th>Seq</th>
        <th>Operação</th>
        <th>Máquina / Posto</th>
        <th style="text-align:right">SAM (min)</th>
        <th style="text-align:right">Operadores</th>
        <th style="text-align:right">Pitch Posto</th>
        <th style="text-align:right">Ocupação</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

export function buildDrePrintableHtml(dre: CollectionDreSummary): string {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>DRE Gerencial Têxtil & OTB · USE MODA PLM</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 14px; display: flex; justify-content: space-between; }
  h1 { margin: 0; font-size: 17px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
  th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
  .bold { font-weight: 700; background: #f8fafc; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>DRE Gerencial Projetada da Coleção & Ponto de Equilíbrio</h1>
      <div>Volume Planejado: <strong>${dre.totalPieces.toLocaleString("pt-BR")} peças</strong> · Break-Even: <strong>${dre.breakEvenPieces.toLocaleString("pt-BR")} peças (${fmt(dre.breakEvenRevenueBrl)})</strong></div>
    </div>
    <div style="text-align:right">
      <div>EBITDA Projetado: <strong>${fmt(dre.ebitdaBrl)} (${dre.ebitdaPct.toFixed(1)}%)</strong></div>
    </div>
  </header>
  ${
    dre.origem.referencias.length > 0
      ? `<div style="border:1px solid #b45309;background:#fffbeb;color:#92400e;padding:8px 10px;margin-bottom:10px;font-size:11px">
    <strong>Documento com dados de demonstração.</strong>
    SKU(s) sem ficha salva: ${dre.origem.referencias.join(", ")}.
    ${dre.origem.salvas.length > 0 ? `Salvos: ${dre.origem.salvas.join(", ")}.` : "Nenhuma ficha salva."}
    Os valores desses SKUs vêm do modelo, não da engenharia da empresa.
  </div>`
      : ""
  }
  ${
    dre.origem.referencias.length > 0
      ? `<div style="border:1px solid #b45309;background:#fffbeb;color:#92400e;padding:8px 10px;margin-bottom:10px;font-size:11px">
    <strong>Documento com dados de demonstração.</strong>
    SKU(s) sem ficha salva: ${dre.origem.referencias.join(", ")}.
    ${dre.origem.salvas.length > 0 ? `Salvos: ${dre.origem.salvas.join(", ")}.` : "Nenhuma ficha salva."}
    Os valores desses SKUs vêm do modelo, não da engenharia da empresa.
  </div>`
      : ""
  }
  <table>
    <tbody>
      <tr class="bold"><td>(+) Receita Operacional Bruta</td><td style="text-align:right">${fmt(dre.grossRevenue)}</td></tr>
      <tr><td>(-) Deduções Tributárias (ICMS / PIS / COFINS)</td><td style="text-align:right">- ${fmt(dre.taxDeductions)}</td></tr>
      <tr class="bold"><td>(=) Receita Operacional Líquida</td><td style="text-align:right">${fmt(dre.netRevenue)}</td></tr>
      <tr><td>(-) CMV · Matéria-Prima & Aplicações (BOM)</td><td style="text-align:right">- ${fmt(dre.cmvMaterial)}</td></tr>
      <tr><td>(-) CMV · Mão de Obra Direta & Overhead Industrial (BOP)</td><td style="text-align:right">- ${fmt(dre.cmvLabor)}</td></tr>
      <tr class="bold"><td>(=) Lucro Bruto Industrial</td><td style="text-align:right">${fmt(dre.grossProfit)}</td></tr>
      <tr><td>(-) Despesas Variáveis Comerciais (Comissão + Frete + Taxa + Inadimplência)</td><td style="text-align:right">- ${fmt(dre.commercialExpenses)}</td></tr>
      <tr class="bold"><td>(=) Margem de Contribuição (${dre.contributionMarginPct.toFixed(1)}%)</td><td style="text-align:right">${fmt(dre.contributionMarginBrl)}</td></tr>
      <tr><td>(-) Custos e Despesas Fixas Estruturais</td><td style="text-align:right">- ${fmt(dre.fixedOverheadBrl)}</td></tr>
      <tr class="bold"><td>(=) EBITDA Operacional Projetado (${dre.ebitdaPct.toFixed(1)}%)</td><td style="text-align:right">${fmt(dre.ebitdaBrl)}</td></tr>
    </tbody>
  </table>
</body>
</html>`;
}
