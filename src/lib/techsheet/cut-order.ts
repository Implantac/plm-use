// Motor Industrial de Sala de Corte (Plano de Enfesto, Fardos/Pacotes de Costura),
// Controle de Rolos por Partida/Nuance (ΔE CMC) e Checklist Stage-Gate de Engenharia.

import {
  defaultEncaixeCadFor,
  defaultEtiquetagemFor,
  defaultMedidasFor,
  LIFECYCLE_STAGES,
  type TechSheetData,
} from "./store";
import { converterMetroParaKg, round2, validateComposicaoAbnt } from "./textile";

export interface CutPlanParams {
  markerRatio: Record<string, number>; // ex.: { P: 1, M: 2, G: 2, GG: 1 }
  totalPlies: number; // total de folhas desejadas (ex.: 140)
  maxPliesPerSpread: number; // limite da faca/enfesto (ex.: 60 folhas)
  endLossCm: number; // perda de pontas nas extremidades (ex.: 4 cm)
  colorName: string;
}

export interface SpreadTableItem {
  spreadNumber: number;
  plies: number;
  linearMeters: number;
  weightKg: number;
  piecesCut: number;
}

export interface CutBundleTicket {
  bundleCode: string;
  spreadNumber: number;
  size: string;
  colorName: string;
  plyRange: string;
  qtyPieces: number;
}

export interface CutOrderPlanResult {
  comprimentoRiscoM: number;
  comprimentoMesaM: number;
  larguraEnfestoM: number;
  gramaturaGm2: number;
  eficienciaPct: number;
  pecasPorFolha: number;
  totalFolhas: number;
  totalPecasCortadas: number;
  metragemLinearTotalM: number;
  pesoTotalMalhaKg: number;
  descansoMalhaHoras: number;
  pecasPorTamanho: Record<string, number>;
  spreads: SpreadTableItem[];
  bundles: CutBundleTicket[];
}

export interface FabricRollItem {
  id: string;
  rollCode: string;
  material: string;
  partida: string; // lote de tingimento (ex.: PT-2609)
  nuance: string; // shade band (ex.: A1, A2, B1)
  deltaECmc: number; // leitura espectrofotômetro (ex.: 0.35)
  larguraRealM: number;
  gramaturaRealGm2: number;
  pesoLiquidoKg: number;
  metragemM: number;
  status: "Liberado" | "Reservado Corte" | "Quarentena";
}

export interface ShadeCompatibilityReport {
  selectedCount: number;
  totalKg: number;
  totalMeters: number;
  distinctPartidas: string[];
  distinctNuances: string[];
  maxDeltaE: number;
  widthVariationCm: number;
  homogeneo: boolean;
  verdict: string;
}

export interface GateReadinessReport {
  stageCurrent: number;
  stageLabel: string;
  nextStageLabel: string | null;
  scorePct: number;
  readyToAdvance: boolean;
  checks: Array<{ id: string; label: string; ok: boolean; detail: string }>;
}

export function computeLayAndCutPlan(
  doc: TechSheetData,
  params: CutPlanParams,
): CutOrderPlanResult {
  const cad = doc.encaixeCad ?? defaultEncaixeCadFor();
  const mainFabric = doc.bom.find((b) => b.tipo === "Tecido");
  const gramaturaGm2 = Math.max(60, Number(mainFabric?.gramaturaGm2) || 155);
  const larguraEnfestoM = Math.max(0.8, Number(cad.larguraEnfestoM) || 1.8);
  const comprimentoRiscoM = Math.max(0.5, Number(cad.comprimentoRiscoM) || 5.35);
  const endLossM = Math.max(0, Number(params.endLossCm) || 0) / 100;
  const comprimentoMesaM = round2(comprimentoRiscoM + endLossM);

  const sizes = Object.keys(params.markerRatio);
  const pecasPorFolha = Math.max(
    1,
    sizes.reduce((acc, s) => acc + Math.max(0, Math.round(params.markerRatio[s] || 0)), 0),
  );
  const totalFolhas = Math.max(1, Math.round(params.totalPlies || 60));
  const maxPlies = Math.max(5, Math.round(params.maxPliesPerSpread || 60));

  const etq = doc.etiquetagem ?? defaultEtiquetagemFor();
  const hasElastano = etq.composicao.some(
    (c) => /elastano|lycra|spandex/i.test(c.fibra) && c.pct >= 2,
  );
  const descansoMalhaHoras = hasElastano ? 24 : 0;

  const spreads: SpreadTableItem[] = [];
  const bundles: CutBundleTicket[] = [];
  let remaining = totalFolhas;
  let spreadNumber = 1;
  let plyCursor = 1;
  let bundleSeq = 1;

  while (remaining > 0) {
    const plies = Math.min(remaining, maxPlies);
    const linearMeters = round2(plies * comprimentoMesaM);
    const weightKg = round2(converterMetroParaKg(linearMeters, larguraEnfestoM, gramaturaGm2));
    const piecesCut = plies * pecasPorFolha;

    spreads.push({
      spreadNumber,
      plies,
      linearMeters,
      weightKg,
      piecesCut,
    });

    const plyEnd = plyCursor + plies - 1;
    for (const sz of sizes) {
      const ratio = Math.max(0, Math.round(params.markerRatio[sz] || 0));
      for (let r = 0; r < ratio; r++) {
        bundles.push({
          bundleCode: `FRD-${String(bundleSeq).padStart(3, "0")}`,
          spreadNumber,
          size: sz,
          colorName: params.colorName || "Padrão",
          plyRange: `${plyCursor}–${plyEnd}`,
          qtyPieces: plies,
        });
        bundleSeq++;
      }
    }

    plyCursor = plyEnd + 1;
    remaining -= plies;
    spreadNumber++;
  }

  const pecasPorTamanho: Record<string, number> = {};
  for (const sz of sizes) {
    pecasPorTamanho[sz] = Math.max(0, Math.round(params.markerRatio[sz] || 0)) * totalFolhas;
  }

  const metragemLinearTotalM = round2(spreads.reduce((acc, s) => acc + s.linearMeters, 0));
  const pesoTotalMalhaKg = round2(spreads.reduce((acc, s) => acc + s.weightKg, 0));

  return {
    comprimentoRiscoM,
    comprimentoMesaM,
    larguraEnfestoM,
    gramaturaGm2,
    eficienciaPct: cad.eficienciaPct,
    pecasPorFolha,
    totalFolhas,
    totalPecasCortadas: totalFolhas * pecasPorFolha,
    metragemLinearTotalM,
    pesoTotalMalhaKg,
    descansoMalhaHoras,
    pecasPorTamanho,
    spreads,
    bundles,
  };
}

export function evaluateRollShadeBatch(rolls: FabricRollItem[]): ShadeCompatibilityReport {
  if (rolls.length === 0) {
    return {
      selectedCount: 0,
      totalKg: 0,
      totalMeters: 0,
      distinctPartidas: [],
      distinctNuances: [],
      maxDeltaE: 0,
      widthVariationCm: 0,
      homogeneo: true,
      verdict: "Selecione rolos para validar homogeneidade de partida/nuance.",
    };
  }

  const totalKg = round2(rolls.reduce((a, r) => a + r.pesoLiquidoKg, 0));
  const totalMeters = round2(rolls.reduce((a, r) => a + r.metragemM, 0));
  const distinctPartidas = Array.from(new Set(rolls.map((r) => r.partida)));
  const distinctNuances = Array.from(new Set(rolls.map((r) => r.nuance)));
  const maxDeltaE = round2(Math.max(...rolls.map((r) => r.deltaECmc)));
  const widths = rolls.map((r) => r.larguraRealM);
  const widthVariationCm = round2((Math.max(...widths) - Math.min(...widths)) * 100);
  const hasQuarantine = rolls.some((r) => r.status === "Quarentena");

  const homogeneo =
    !hasQuarantine &&
    distinctPartidas.length === 1 &&
    distinctNuances.length === 1 &&
    maxDeltaE <= 0.85 &&
    widthVariationCm <= 2.5;

  const reasons: string[] = [];
  if (hasQuarantine) reasons.push("há rolo em Quarentena");
  if (distinctPartidas.length > 1)
    reasons.push(`mistura de partidas (${distinctPartidas.join(" × ")})`);
  if (distinctNuances.length > 1)
    reasons.push(`nuances distintas (${distinctNuances.join(" × ")})`);
  if (maxDeltaE > 0.85) reasons.push(`ΔE CMC ${maxDeltaE} > 0,85`);
  if (widthVariationCm > 2.5) reasons.push(`variação de largura ${widthVariationCm} cm`);

  return {
    selectedCount: rolls.length,
    totalKg,
    totalMeters,
    distinctPartidas,
    distinctNuances,
    maxDeltaE,
    widthVariationCm,
    homogeneo,
    verdict: homogeneo
      ? `Enfesto único liberado — Partida ${distinctPartidas[0]} · Nuance ${distinctNuances[0]} (ΔE máx ${maxDeltaE}).`
      : `Bloquear enfesto misto: ${reasons.join(" · ")} — separar enfestos para evitar sombra na peça!`,
  };
}

export function evaluateTechSheetGateReadiness(doc: TechSheetData): GateReadinessReport {
  const stageCurrent = doc.meta?.stage ?? 3;
  const curStageObj =
    LIFECYCLE_STAGES.find((s) => s.stage === stageCurrent) ?? LIFECYCLE_STAGES[2]!;
  const nextStageObj = LIFECYCLE_STAGES.find((s) => s.stage === stageCurrent + 1) ?? null;

  const bomOk = doc.bom.length > 0 && doc.bom.every((b) => b.custo > 0);
  const bopOk = doc.bop.length > 0 && doc.bop.some((s) => s.tempoMin > 0);
  const med = doc.medidas ?? defaultMedidasFor();
  const pomOk = med.pontos.length >= 2 && med.tamanhos.length >= 3;
  const etq = doc.etiquetagem ?? defaultEtiquetagemFor();
  const abntCheck = validateComposicaoAbnt(etq.composicao);
  const etqOk = abntCheck.valida && Boolean(etq.ncm?.trim());
  const cad = doc.encaixeCad ?? defaultEncaixeCadFor();
  const cadOk = cad.eficienciaPct >= 75 && cad.larguraEnfestoM > 0;

  const checks = [
    {
      id: "bom",
      label: "BOM Industrial Custeada",
      ok: bomOk,
      detail: `${doc.bom.length} insumos cadastrados`,
    },
    {
      id: "bop",
      label: "Roteiro BOP & SAM",
      ok: bopOk,
      detail: `${doc.bop.length} operações cronometradas`,
    },
    {
      id: "pom",
      label: "Grade POM Graduada",
      ok: pomOk,
      detail: `${med.pontos.length} POMs × ${med.tamanhos.length} tamanhos`,
    },
    {
      id: "abnt",
      label: "Etiqueta ABNT 100% & NCM",
      ok: etqOk,
      detail: `NCM ${etq.ncm || "—"}`,
    },
    {
      id: "cad",
      label: "Risco CAD Homologado (≥75%)",
      ok: cadOk,
      detail: `Eficiência ${cad.eficienciaPct}%`,
    },
  ];

  const passed = checks.filter((c) => c.ok).length;
  const scorePct = Math.round((passed / checks.length) * 100);

  return {
    stageCurrent,
    stageLabel: curStageObj.label,
    nextStageLabel: nextStageObj?.label ?? null,
    scorePct,
    readyToAdvance: scorePct >= 80 && nextStageObj !== null,
    checks,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCutOrderPrintableHtml(
  refCode: string,
  refName: string,
  colorName: string,
  plan: CutOrderPlanResult,
): string {
  const spreadRows = plan.spreads
    .map(
      (s) => `<tr>
      <td>Mesa / Enfesto #${s.spreadNumber}</td>
      <td style="text-align:right">${s.plies} folhas</td>
      <td style="text-align:right">${s.linearMeters.toFixed(2)} m</td>
      <td style="text-align:right">${s.weightKg.toFixed(2)} kg</td>
      <td style="text-align:right"><strong>${s.piecesCut} pçs</strong></td>
    </tr>`,
    )
    .join("");

  const bundleRows = plan.bundles
    .slice(0, 24)
    .map(
      (b) => `<tr>
      <td><strong>${escapeHtml(b.bundleCode)}</strong></td>
      <td>Enfesto #${b.spreadNumber}</td>
      <td>${escapeHtml(b.size)}</td>
      <td>${escapeHtml(b.colorName)}</td>
      <td>Folhas ${escapeHtml(b.plyRange)}</td>
      <td style="text-align:right"><strong>${b.qtyPieces} pçs</strong></td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Ordem de Enfesto & Corte · ${escapeHtml(refCode)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
  header { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; }
  h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
  h2 { font-size: 12px; text-transform: uppercase; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Ordem Industrial de Enfesto, Corte & Pacotes</h1>
      <div>Referência: <strong>${escapeHtml(refCode)} — ${escapeHtml(refName)}</strong> · Cor: <strong>${escapeHtml(colorName)}</strong></div>
      <div>Risco: ${plan.comprimentoRiscoM}m (Mesa ${plan.comprimentoMesaM}m × Larg. ${plan.larguraEnfestoM}m · Efic. ${plan.eficienciaPct}%) · Descanso Malha: <strong>${plan.descansoMalhaHoras}h</strong></div>
    </div>
    <div style="text-align:right">
      <div>Total Cortado: <strong>${plan.totalPecasCortadas} peças</strong> (${plan.totalFolhas} folhas)</div>
      <div>Malha Requerida: <strong>${plan.pesoTotalMalhaKg.toFixed(2)} kg (${plan.metragemLinearTotalM.toFixed(1)} m)</strong></div>
    </div>
  </header>
  <h2>1. Programação de Mesas de Enfesto</h2>
  <table>
    <thead>
      <tr>
        <th>Mesa / Enfesto</th>
        <th style="text-align:right">Camadas (Folhas)</th>
        <th style="text-align:right">Metragem Linear</th>
        <th style="text-align:right">Peso Estimado</th>
        <th style="text-align:right">Peças Cortadas</th>
      </tr>
    </thead>
    <tbody>${spreadRows}</tbody>
  </table>
  <h2>2. Etiquetas de Fardo / Pacotes para Costura (${plan.bundles.length} pacotes gerados)</h2>
  <table>
    <thead>
      <tr>
        <th>Fardo</th>
        <th>Origem</th>
        <th>Tam.</th>
        <th>Cor</th>
        <th> Numeração Folhas</th>
        <th style="text-align:right">Qtd.</th>
      </tr>
    </thead>
    <tbody>${bundleRows}</tbody>
  </table>
</body>
</html>`;
}
