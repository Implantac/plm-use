// Motor Industrial do Gêmeo Digital (Digital Twin What-If) & Viabilidade Técnica de Estamparia — PLM 2.0
// Conecta Ficha Técnica (BOM, BOP, Aplicações, Precificação Reversa) + Balanceamento de Célula +
// MRP Líquido em simulações instantâneas de capacidade, prazo, margem e compatibilidade têxtil.

import type { PrintAsset } from "@/lib/prints/store";
import type { AplicacaoDraft, AplicacaoTipo } from "./aplicacoes";
import { computeLineBalancing, type LineBalancingResult } from "./line-balancing";
import { computeMrpCutPlan, type MrpCutPlanResult } from "./mrp";
import { computeFullTechSheetPricing } from "./pricing";
import { defaultMedidasFor, type TechSheetData } from "./store";
import { round2 } from "./textile";

export type FullTechSheetPricing = ReturnType<typeof computeFullTechSheetPricing>;

export interface DigitalTwinScenarioInput {
  /** Quantidade do lote simulado (peças). */
  batchQty: number;
  /** Variação simulada no preço dos tecidos (% ex.: +12 ou -8). */
  fabricCostDeltaPct: number;
  /** Percentual do lote enviado para facção externa (0 a 100%). */
  outsourceSharePct: number;
  /** Eficiência operacional da célula interna (50 a 98%). */
  cellEfficiencyPct: number;
  /** Número de costureiras dedicadas na célula interna. */
  operators: number;
  /** Cotação unitária de costura na facção externa (R$/peça). */
  outsourceRateBrl?: number;
}

export interface TwinHotspotZone {
  id: "gola" | "corpo" | "costura" | "acabamento";
  title: string;
  metric: string;
  detail: string;
  tone: "ok" | "warn" | "info";
}

export interface DigitalTwinSimulationResult {
  ref: string;
  baseBatchQty: number;
  simulatedBatchQty: number;
  basePricing: FullTechSheetPricing;
  simulatedPricing: FullTechSheetPricing;
  marginDeltaPp: number;
  unitCostDeltaBrl: number;
  projectedGrossRevenueBrl: number;
  projectedNetProfitBrl: number;
  lineBalance: LineBalancingResult;
  internalDailyCapacity: number;
  externalDailyCapacity: number;
  combinedDailyCapacity: number;
  baseLeadDays: number;
  simulatedLeadDays: number;
  leadDaysDelta: number;
  mrp: MrpCutPlanResult;
  mrpCoveragePct: number;
  hotspots: TwinHotspotZone[];
  executiveAdvisory: string;
}

export function simulateDigitalTwinScenario(
  ref: string,
  doc: TechSheetData,
  raw: DigitalTwinScenarioInput,
): DigitalTwinSimulationResult {
  const baseBatchQty = Math.max(50, Math.round(Number(doc.preCost.tiragemPlanejada) || 300));
  const simulatedBatchQty = Math.max(10, Math.round(Number(raw.batchQty) || baseBatchQty));
  const fabricDelta = Math.max(-50, Math.min(100, Number(raw.fabricCostDeltaPct) || 0));
  const outsourceShare = Math.max(0, Math.min(100, Number(raw.outsourceSharePct) || 0)) / 100;
  const cellEfficiencyPct = Math.max(40, Math.min(99, Number(raw.cellEfficiencyPct) || 80));
  const operators = Math.max(1, Math.round(Number(raw.operators) || 8));

  const basePricing = computeFullTechSheetPricing(doc);

  // Custo de facção padrão = 112% da mão de obra interna (inclui frete/revisão) se não informado
  const defaultOutsourceRate = round2(Math.max(2.5, basePricing.bop * 1.12));
  const outsourceRate =
    raw.outsourceRateBrl != null && raw.outsourceRateBrl > 0
      ? raw.outsourceRateBrl
      : defaultOutsourceRate;

  // Clona estrutura de cálculo aplicando choque de preço em Tecido e mix Interno vs Facção
  const simulatedBom = doc.bom.map((item) =>
    item.tipo === "Tecido"
      ? {
          ...item,
          custo: round2(item.custo * (1 + fabricDelta / 100)),
          ...(item.custoUnitario != null
            ? { custoUnitario: round2(item.custoUnitario * (1 + fabricDelta / 100)) }
            : {}),
        }
      : item,
  );

  const bopScaleFactor =
    basePricing.bop > 0
      ? (basePricing.bop * (1 - outsourceShare) + outsourceRate * outsourceShare) / basePricing.bop
      : 1;

  const simulatedBop = doc.bop.map((step) => ({
    ...step,
    custo: round2(step.custo * bopScaleFactor),
  }));

  const simulatedDoc: TechSheetData = {
    ...doc,
    bom: simulatedBom,
    bop: simulatedBop,
    preCost: {
      ...doc.preCost,
      tiragemPlanejada: simulatedBatchQty,
    },
  };

  const simulatedPricing = computeFullTechSheetPricing(simulatedDoc);

  const marginDeltaPp = round2(
    simulatedPricing.margemLiquidaRealPct - basePricing.margemLiquidaRealPct,
  );
  const unitCostDeltaBrl = round2(simulatedPricing.custoFinal - basePricing.custoFinal);

  const activePrice = simulatedPricing.precoReferenciaMargem || simulatedPricing.precoSugerido;
  const projectedGrossRevenueBrl = round2(activePrice * simulatedBatchQty);
  const projectedNetProfitBrl = round2(simulatedPricing.lucroLiquidoPeca * simulatedBatchQty);

  // Capacidade fabril e Lead Time (Corte 1d + Estamparia 1d se houver + Costura + Revisão/Expedição 1d)
  const baseBalance = computeLineBalancing(doc.bop, {
    costureiras: operators,
    jornadaMin: 480,
    eficienciaPct: 80,
    lotePlanejado: baseBatchQty,
    cotacaoFaccaoPeca: outsourceRate,
  });

  const internalQty = Math.max(0, Math.round(simulatedBatchQty * (1 - outsourceShare)));
  const externalQty = Math.max(0, simulatedBatchQty - internalQty);

  const lineBalance = computeLineBalancing(doc.bop, {
    costureiras: operators,
    jornadaMin: 480,
    eficienciaPct: cellEfficiencyPct,
    lotePlanejado: Math.max(1, internalQty),
    cotacaoFaccaoPeca: outsourceRate,
  });

  const internalDailyCapacity = Math.max(1, lineBalance.capacidadePecasDia);
  // Facção parceira homologada absorve paralelamente ~140% da célula base (mín. 80 pçs/dia)
  const externalDailyCapacity =
    outsourceShare > 0 ? Math.max(80, Math.round(internalDailyCapacity * 1.4)) : 0;
  const combinedDailyCapacity = internalDailyCapacity + externalDailyCapacity;

  const prepAndFinishDays = (doc.aplicacoes?.length ?? 0) > 0 ? 3 : 2;
  const baseSewingDays = Math.ceil(baseBatchQty / Math.max(1, baseBalance.capacidadePecasDia));
  const baseLeadDays = prepAndFinishDays + baseSewingDays;

  const internalSewingDays = internalQty > 0 ? Math.ceil(internalQty / internalDailyCapacity) : 0;
  // Facção exige +1 dia útil logístico de remessa/retorno NF-e industrialização
  const externalSewingDays =
    externalQty > 0 ? Math.ceil(externalQty / Math.max(1, externalDailyCapacity)) + 1 : 0;
  const simulatedLeadDays = prepAndFinishDays + Math.max(internalSewingDays, externalSewingDays);
  const leadDaysDelta = simulatedLeadDays - baseLeadDays;

  // Explosão MRP Líquida para o lote simulado
  const mrp = computeMrpCutPlan(ref, simulatedDoc, { totalPieces: simulatedBatchQty });
  const coveredCount = mrp.materials.filter((m) => m.statusEstoque === "coberto").length;
  const mrpCoveragePct =
    mrp.materials.length > 0 ? Math.round((coveredCount / mrp.materials.length) * 100) : 100;

  const mainFabric = simulatedDoc.bom.find((b) => b.tipo === "Tecido") ?? simulatedDoc.bom[0];
  const medidas = doc.medidas ?? defaultMedidasFor();
  const composicao = doc.etiquetagem?.composicao ?? [];
  const compResumo = composicao.length
    ? composicao.map((f) => `${f.pct}% ${f.fibra}`).join(" / ")
    : "Composição não declarada";

  const hotspots: TwinHotspotZone[] = [
    {
      id: "gola",
      title: "Gola & Construção Superior",
      metric: `Base ${medidas.tamanhoBase} · ${medidas.pontos.length} POMs`,
      detail: doc.meta?.callouts?.[0]?.label ?? "Acabamento de gola e ombro graduado",
      tone: "info",
    },
    {
      id: "corpo",
      title: "Tecido Principal & Cobertura MRP",
      metric: mainFabric
        ? `${mainFabric.material} (${mainFabric.gramaturaGm2 ?? 160} g/m²)`
        : "Tecido base",
      detail:
        mrp.itensComFalta > 0
          ? `${mrp.itensComFalta} insumo(s) exigem compra (${mrpCoveragePct}% coberto)`
          : `100% dos insumos cobertos em almoxarifado para ${simulatedBatchQty} pçs`,
      tone: mrp.itensComFalta > 0 ? "warn" : "ok",
    },
    {
      id: "costura",
      title: "Célula & Operação Gargalo",
      metric: `SAM ${lineBalance.samTotal.toFixed(1)} min · ${combinedDailyCapacity} pçs/dia`,
      detail: lineBalance.gargalo
        ? `Gargalo: ${lineBalance.gargalo.etapa} (${lineBalance.gargalo.maquina} · ${lineBalance.gargalo.tempoMin} min)`
        : "Fluxo balanceado sem gargalo crítico",
      tone: lineBalance.eficienciaBalanceamentoPct < 70 ? "warn" : "ok",
    },
    {
      id: "acabamento",
      title: "Aplicações, Custo & Etiquetagem",
      metric: `R$ ${simulatedPricing.custoFinal.toFixed(2)}/pç · Margem ${simulatedPricing.margemLiquidaRealPct.toFixed(1)}%`,
      detail: `${compResumo} · NCM ${doc.etiquetagem?.ncm || "não declarado"}`,
      tone:
        simulatedPricing.margemLiquidaRealPct < simulatedPricing.margemLiquidaAlvoPct
          ? "warn"
          : "ok",
    },
  ];

  const leadText =
    leadDaysDelta === 0
      ? `mantém o prazo de ${simulatedLeadDays} dias úteis`
      : leadDaysDelta > 0
        ? `adiciona +${leadDaysDelta} dia(s) útil(eis) ao prazo (total ${simulatedLeadDays}d)`
        : `reduz o prazo em ${Math.abs(leadDaysDelta)} dia(s) útil(eis) (total ${simulatedLeadDays}d)`;

  const marginText =
    Math.abs(marginDeltaPp) < 0.05
      ? `preserva a margem líquida em ${simulatedPricing.margemLiquidaRealPct.toFixed(1)}%`
      : marginDeltaPp > 0
        ? `eleva a margem líquida em +${marginDeltaPp.toFixed(1)} pp (${simulatedPricing.margemLiquidaRealPct.toFixed(1)}%)`
        : `comprime a margem líquida em ${marginDeltaPp.toFixed(1)} pp (${simulatedPricing.margemLiquidaRealPct.toFixed(1)}%)`;

  const mrpAlert =
    mrp.itensComFalta > 0
      ? ` Atenção: ${mrp.itensComFalta} insumo(s) entram em ruptura (reposição líquida R$ ${mrp.custoCompraTotal.toFixed(2)}).`
      : " Estoque de matéria-prima cobre 100% do lote simulado.";

  const executiveAdvisory = `Lote de ${simulatedBatchQty} peças ${leadText} e ${marginText}.${mrpAlert}`;

  return {
    ref,
    baseBatchQty,
    simulatedBatchQty,
    basePricing,
    simulatedPricing,
    marginDeltaPp,
    unitCostDeltaBrl,
    projectedGrossRevenueBrl,
    projectedNetProfitBrl,
    lineBalance,
    internalDailyCapacity,
    externalDailyCapacity,
    combinedDailyCapacity,
    baseLeadDays,
    simulatedLeadDays,
    leadDaysDelta,
    mrp,
    mrpCoveragePct,
    hotspots,
    executiveAdvisory,
  };
}

export interface PrintViabilityReport {
  score: number;
  recommendedTipo: AplicacaoTipo;
  estimatedUnitCostBrl: number;
  estimatedSetupBrl: number;
  fiberCompatibility: "compativel" | "atencao";
  alerts: string[];
  recommendations: string[];
}

export function mapPrintTecnicaToAplicacaoTipo(tecnica: PrintAsset["tecnica"]): AplicacaoTipo {
  switch (tecnica) {
    case "silk":
      return "Silk";
    case "sublimacao":
      return "Sublimação";
    case "localizada":
      return "Transfer";
    case "digital":
    case "rotativa":
    default:
      return "Sublimação";
  }
}

export function analyzePrintTechnicalViability(
  print: PrintAsset,
  targetDoc?: TechSheetData,
): PrintViabilityReport {
  const alerts: string[] = [];
  const recommendations: string[] = [];
  let score = 94;

  const recommendedTipo = mapPrintTecnicaToAplicacaoTipo(print.tecnica);
  const w = print.repeat.widthCm > 0 ? print.repeat.widthCm : 24;
  const h = print.repeat.heightCm > 0 ? print.repeat.heightCm : 28;
  const colors = Math.max(1, print.colorCount || print.colors.length || 1);

  let estimatedUnitCostBrl = 3.2;
  let estimatedSetupBrl = 0;

  if (print.tecnica === "silk") {
    estimatedSetupBrl = round2(colors * 85); // revelação de telas/quadros + fotolito
    estimatedUnitCostBrl = round2(1.6 + colors * 0.55);
    if (colors > 6) {
      score -= 14;
      alerts.push(
        `Silk com ${colors} telas eleva custo de setup (R$ ${estimatedSetupBrl.toFixed(2)}) e risco de fora-de-registro no carrossel.`,
      );
      recommendations.push(
        "Considere policromia indexada (4 telas) ou DTF/Transfer para lotes < 300 peças.",
      );
    } else {
      recommendations.push(
        `Jogo de ${colors} tela(s) ótimo para tiragens acima de ${Math.max(120, colors * 45)} peças.`,
      );
    }
  } else if (print.tecnica === "rotativa") {
    estimatedSetupBrl = round2(colors * 420); // gravação de cilindros níquel
    estimatedUnitCostBrl = round2(2.4 + colors * 0.25);
    if (colors > 8) {
      score -= 10;
      alerts.push(
        `Estamparia rotativa com ${colors} cilindros exige metragem mínima industrial elevada (≥ 1.000m).`,
      );
    }
    recommendations.push(
      `Rapport ${w} × ${h} cm compatível com cilindro padrão 640 mm — valide encaixe lateral sem emenda visível.`,
    );
  } else if (print.tecnica === "sublimacao") {
    estimatedSetupBrl = 45;
    estimatedUnitCostBrl = round2(2.8 + (w * h) / 650);
    recommendations.push(
      "Calandra a 205 °C por 35s — zero toque superficial, preservando respirabilidade da malha.",
    );
  } else {
    estimatedSetupBrl = 35;
    estimatedUnitCostBrl = round2(3.5 + (w * h) / 500);
    recommendations.push(
      "Estamparia digital/DTF ideal para lotes flexíveis e alta definição cromática sem custo de telas.",
    );
  }

  let fiberCompatibility: "compativel" | "atencao" = "compativel";
  if (targetDoc) {
    const comp = targetDoc.etiquetagem?.composicao ?? [];
    const polyPct = comp
      .filter((f) => /poli[eé]ster/i.test(f.fibra))
      .reduce((acc, f) => acc + f.pct, 0);

    if (print.tecnica === "sublimacao" && polyPct < 80) {
      fiberCompatibility = "atencao";
      score -= 22;
      alerts.push(
        `Incompatibilidade química: Sublimação dispersa exige ≥ 80% Poliéster, mas a ficha possui ${polyPct}% Poliéster. A cor desbotará na 1ª lavagem.`,
      );
      recommendations.push(
        "Migre a técnica para Silk base d'água, Estamparia Digital Reativa ou DTF.",
      );
    } else if (print.tecnica === "sublimacao" && polyPct >= 80) {
      recommendations.push(
        `Compatibilidade química excelente (${polyPct}% Poliéster na ficha alvo).`,
      );
    }
  }

  return {
    score: Math.max(40, Math.min(100, score)),
    recommendedTipo,
    estimatedUnitCostBrl,
    estimatedSetupBrl,
    fiberCompatibility,
    alerts,
    recommendations,
  };
}

export function buildAplicacaoFromPrint(
  print: PrintAsset,
  posicao = "Peito central",
  targetDoc?: TechSheetData,
): AplicacaoDraft {
  const report = analyzePrintTechnicalViability(print, targetDoc);
  const larguraCm = print.repeat.widthCm > 0 ? print.repeat.widthCm : 24;
  const alturaCm = print.repeat.heightCm > 0 ? print.repeat.heightCm : 28;
  return {
    tipo: report.recommendedTipo,
    posicao,
    arte: `${print.code} · ${print.name}`,
    larguraCm,
    alturaCm,
    cores: Math.max(1, print.colorCount || print.colors.length || 1),
    qtdPorPeca: 1,
    custoUnitario: report.estimatedUnitCostBrl,
    custoSetup: report.estimatedSetupBrl,
    obs: `Vinculado da Cartela de Estampas (${print.code}) · fornecedor ${print.supplier ?? "interno"}`,
  };
}
