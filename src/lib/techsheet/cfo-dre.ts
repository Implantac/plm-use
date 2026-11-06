// Motor de Cronoanálise GSD / Yamazumi (Takt Time, Pool de Máquinas, Custo Minuto)
// e Apuração DRE Gerencial Têxtil + OTB (Open-To-Buy) + Ponto de Equilíbrio (CFO).

import { computeFullTechSheetPricing, resolveDivisorParams } from "./pricing";
import { type BopStep, type TechSheetData } from "./store";
import { operationalCodes } from "./provenance";
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
  /** Sempre `true`: a DRE só apura SKUs com ficha salva (Onda 30). */
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
   * Onda 36. `false` quando não há **nenhuma ficha com engenharia custeada**.
   * Uma ficha salva mas sem BOM custeada, preço calculado ou tiragem declarada
   * não é apurável: apurá-la produzia EBITDA = -overhead fixo e 50 peças
   * inventadas a partir do vazio.
   */
  apuravel: boolean;
  /**
   * A Onda 25 rotulava a origem; a Onda 30 tira o modelo da conta. `salvas`
   * são os SKUs que entraram, `referencias` os SKUs de demonstração que
   * **ficaram de fora** — declarados, nunca somados.
   */
  origem: {
    /** Fichas salvas **e** com engenharia custeada: as únicas somadas. */
    salvas: string[];
    referencias: string[];
    /** Fichas salvas, mas sem BOM custeada / preço / tiragem. Declaradas, não somadas. */
    semEngenharia: string[];
    /** Nenhuma ficha apurável: não há número operacional, apenas `—`. */
    apenasReferencia: boolean;
  };
  /**
   * Mantido por compatibilidade com a Onda 25: desde que o modelo saiu da soma,
   * este espelho é igual aos próprios totais da DRE.
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

/**
 * DRE Gerencial da coleção.
 *
 * Até a Onda 29 esta função plantava quatro referências de demonstração na
 * lista, caía em `seedFor(ref)` para cada uma e somava receita, CMV, OTB e
 * EBITDA do modelo junto das fichas reais. A Onda 25 passou a *rotular* essa
 * mistura (`origem`, `somenteSalvas`), mas o número principal continuava misto
 * — inclusive no A4 impresso. A regra das Ondas 27/28/29 é outra: só ficha
 * salva entra em número operacional. Então o modelo sai da soma; a ausência
 * fica declarada em `origem.referencias` e vira `—` na tela.
 */
/** O que falta numa ficha para ela entrar na apuração da DRE. */
export type DrePendencia = "sem-bom-custeada" | "sem-preco" | "sem-tiragem";

export const DRE_PENDENCIA_LABEL: Record<DrePendencia, string> = {
  "sem-bom-custeada": "BOM custeada",
  "sem-preco": "preço calculado",
  "sem-tiragem": "tiragem declarada",
};

/**
 * Onda 36. `blankFor()` (Onda 35) cria fichas salvas sem nenhuma engenharia.
 * A Onda 30 só checava `keys.length > 0`, então uma ficha vazia virava SKU:
 * `Math.max(50, tiragem ?? 600)` inventava 50 peças e o overhead fixo de
 * R$ 85.000 virava EBITDA negativo impresso no A4 **sem aviso**. Era o
 * "prejuízo a partir do vazio" que a própria Onda 30 quisera eliminar.
 */
export function pendenciasEngenhariaDre(doc: TechSheetData): DrePendencia[] {
  const pricing = computeFullTechSheetPricing(doc);
  const pendencias: DrePendencia[] = [];
  // Aplicações/aviamentos isolados não configuram engenharia: sem BOM
  // custeada o preço é derivado de papel. Antes somávamos `aplicacoesPeca`
  // aqui e uma ficha com bom: [] passava no gate.
  if (!(pricing.bom > 0)) pendencias.push("sem-bom-custeada");
  if (!((pricing.precoReferenciaMargem || pricing.precoSugerido || 0) > 0)) {
    pendencias.push("sem-preco");
  }
  if (!(Number(doc.preCost.tiragemPlanejada ?? 0) > 0)) pendencias.push("sem-tiragem");
  return pendencias;
}

export function computeCollectionDreSummary(
  sheetsMap: Record<string, TechSheetData>,
  fixedOverheadBrl = 85_000,
  otbBudgetBrl = 220_000,
  // `ensure()` é chamado no render de várias telas e materializa o modelo no
  // store. Sem este filtro, abrir uma tela criaria um SKU e a DRE passaria a
  // apurá-lo como se fosse engenharia da empresa (Onda 22/30).
  materializadas?: Record<string, true>,
): CollectionDreSummary {
  const keys = operationalCodes(sheetsMap, [], materializadas).sort();
  const semEngenharia: string[] = [];
  const apuraveis = keys.filter((refCode) => {
    const pendencias = pendenciasEngenhariaDre(sheetsMap[refCode]!);
    if (pendencias.length === 0) return true;
    semEngenharia.push(refCode);
    return false;
  });
  const apuravel = apuraveis.length > 0;

  // Só para declarar o que ficou de fora. Nenhum destes códigos entra num
  // acumulador abaixo, e `multByRef` (tiragem e multiplicador de preço do
  // exemplo) deixou de existir junto com o `|| 99.9` do preço de papel.
  const MODELO_REFS = ["DEV000006", "I25-088", "U25-014", "V24-001"];
  const referencias = Array.from(
    new Set([
      ...MODELO_REFS.filter((r) => !(r in sheetsMap)),
      ...Object.keys(sheetsMap).filter((r) => !keys.includes(r)),
    ]),
  ).sort();

  let totalPieces = 0;
  let grossRevenue = 0;
  let taxDeductions = 0;
  let cmvMaterial = 0;
  let cmvLabor = 0;
  let commercialExpenses = 0;

  const skus: DreSkuBreakdown[] = apuraveis.map((refCode) => {
    const doc = sheetsMap[refCode]!;
    const pricing = computeFullTechSheetPricing(doc);
    const div = resolveDivisorParams(doc.preCost.divisor);

    // Só entram aqui fichas com tiragem declarada > 0. Sem `Math.max(50, ...)`
    // e sem `?? 600`: peça de papel não vira produção planejada.
    const tiragem = Number(doc.preCost.tiragemPlanejada ?? 0);
    const unitPrice = round2(pricing.precoReferenciaMargem || pricing.precoSugerido || 0);
    const unitMaterialCost = round2(pricing.bom + pricing.aplicacoesPeca + pricing.setupPorPeca);
    const unitLaborCost = round2(pricing.bop + pricing.overhead);

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

    return {
      refCode,
      refName: doc.meta?.name || refCode,
      salva: true,
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
  // Sem ficha, não há receita a que o overhead fixo possa ser contraposto:
  // imprimir "EBITDA = -R$ 85.000" seria inventar prejuízo a partir do vazio.
  const ebitdaBrl = apuravel ? round2(contributionMarginBrl - fixed) : 0;
  const ebitdaPct = apuravel && grossRevenue > 0 ? round2((ebitdaBrl / grossRevenue) * 100) : 0;

  const avgContributionPerPiece =
    apuravel && totalPieces > 0 ? contributionMarginBrl / totalPieces : 0;
  const breakEvenPieces =
    avgContributionPerPiece > 0 ? Math.ceil(fixed / avgContributionPerPiece) : 0;
  const avgTicket = totalPieces > 0 ? grossRevenue / totalPieces : 0;
  const breakEvenRevenueBrl = round2(breakEvenPieces * avgTicket);

  const otbCommittedBrl = cmvMaterial;
  const otbRemainingBrl = round2(otbBudgetBrl - otbCommittedBrl);

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
    apuravel,
    origem: {
      salvas: apuraveis,
      referencias,
      semEngenharia,
      apenasReferencia: !apuravel,
    },
    somenteSalvas: {
      totalPieces,
      grossRevenue,
      contribuicaoBrl: contributionMarginBrl,
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
  // Sem ficha salva não há DRE: o A4 declara a ausência em vez de imprimir uma
  // tabela de zeros com cara de apuração.
  const v = (n: number) => (dre.apuravel ? fmt(n) : "—");
  const n = (x: number) => (dre.apuravel ? x.toLocaleString("pt-BR") : "—");
  const pct = (x: number) => (dre.apuravel ? x.toFixed(1) : "—");
  const neg = (x: number) => `${dre.apuravel ? "- " : ""}${v(x)}`;

  const listaSemEngenharia = dre.origem.semEngenharia.join(", ");
  const aviso = !dre.apuravel
    ? `<div style="border:1px solid #b45309;background:#fffbeb;color:#92400e;padding:8px 10px;margin-bottom:10px;font-size:11px">
    <strong>DRE não apurável: ${
      listaSemEngenharia
        ? `nenhuma ficha tem engenharia custeada (${listaSemEngenharia}).`
        : "nenhuma ficha técnica salva."
    }</strong>
    A apuração exige BOM custeada, preço calculado e tiragem declarada. Sem isso
    não há receita, peças ou EBITDA — overhead fixo não vira prejuízo inventado.
    ${
      dre.origem.referencias.length > 0
        ? `Os SKUs de demonstração (${dre.origem.referencias.join(", ")}) também ficam de fora.`
        : ""
    }
    Abra a Ficha Técnica e registre a engenharia de um produto para gerar a DRE.
  </div>`
    : dre.origem.semEngenharia.length > 0
      ? `<div style="border:1px solid #b45309;background:#fffbeb;color:#92400e;padding:8px 10px;margin-bottom:10px;font-size:11px">
    <strong>Fichas sem engenharia custeada excluídas da apuração.</strong>
    Sem BOM custeada, preço ou tiragem: ${listaSemEngenharia}.
    Apuradas: ${dre.origem.salvas.join(", ")}.
  </div>`
      : dre.origem.referencias.length > 0
        ? `<div style="border:1px solid #b45309;background:#fffbeb;color:#92400e;padding:8px 10px;margin-bottom:10px;font-size:11px">
    <strong>SKUs de demonstração excluídos da apuração.</strong>
    Sem ficha salva: ${dre.origem.referencias.join(", ")}.
    Apurados: ${dre.origem.salvas.join(", ")}.
    Esta DRE contém apenas fichas salvas pela engenharia da empresa.
  </div>`
        : "";

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
      <div>Volume Planejado: <strong>${n(dre.totalPieces)} peças</strong> · Break-Even: <strong>${n(dre.breakEvenPieces)} peças (${v(dre.breakEvenRevenueBrl)})</strong></div>
    </div>
    <div style="text-align:right">
      <div>EBITDA Projetado: <strong>${v(dre.ebitdaBrl)} (${pct(dre.ebitdaPct)}%)</strong></div>
    </div>
  </header>
  ${aviso}
  <table>
    <tbody>
      <tr class="bold"><td>(+) Receita Operacional Bruta</td><td style="text-align:right">${v(dre.grossRevenue)}</td></tr>
      <tr><td>(-) Deduções Tributárias (ICMS / PIS / COFINS)</td><td style="text-align:right">${neg(dre.taxDeductions)}</td></tr>
      <tr class="bold"><td>(=) Receita Operacional Líquida</td><td style="text-align:right">${v(dre.netRevenue)}</td></tr>
      <tr><td>(-) CMV · Matéria-Prima & Aplicações (BOM)</td><td style="text-align:right">${neg(dre.cmvMaterial)}</td></tr>
      <tr><td>(-) CMV · Mão de Obra Direta & Overhead Industrial (BOP)</td><td style="text-align:right">${neg(dre.cmvLabor)}</td></tr>
      <tr class="bold"><td>(=) Lucro Bruto Industrial</td><td style="text-align:right">${v(dre.grossProfit)}</td></tr>
      <tr><td>(-) Despesas Variáveis Comerciais (Comissão + Frete + Taxa + Inadimplência)</td><td style="text-align:right">${neg(dre.commercialExpenses)}</td></tr>
      <tr class="bold"><td>(=) Margem de Contribuição (${pct(dre.contributionMarginPct)}%)</td><td style="text-align:right">${v(dre.contributionMarginBrl)}</td></tr>
      <tr><td>(-) Custos e Despesas Fixas Estruturais</td><td style="text-align:right">${neg(dre.fixedOverheadBrl)}</td></tr>
      <tr class="bold"><td>(=) EBITDA Operacional Projetado (${pct(dre.ebitdaPct)}%)</td><td style="text-align:right">${v(dre.ebitdaBrl)}</td></tr>
    </tbody>
  </table>
</body>
</html>`;
}
