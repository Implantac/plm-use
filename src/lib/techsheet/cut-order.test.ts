import { describe, expect, it } from "vitest";
import { seedFor } from "./store";
import {
  buildCutOrderPrintableHtml,
  computeLayAndCutPlan,
  evaluateRollShadeBatch,
  evaluateTechSheetGateReadiness,
} from "./cut-order";

describe("Sala de Corte (Enfesto/Fardos), Nuance de Rolos & Stage-Gate PLM", () => {
  it("divide folhas em múltiplos enfestos pelo limite da faca e gera pacotes numerados", () => {
    const doc = seedFor("DEV000006");
    const plan = computeLayAndCutPlan(doc, {
      markerRatio: { P: 1, M: 2, G: 2, GG: 1 },
      totalPlies: 140,
      maxPliesPerSpread: 60,
      endLossCm: 4,
      colorName: "Verde Brasil",
    });

    expect(plan.pecasPorFolha).toBe(6);
    expect(plan.totalPecasCortadas).toBe(840);
    expect(plan.spreads).toHaveLength(3); // 60 + 60 + 20
    expect(plan.bundles).toHaveLength(18); // 3 spreads * 6 bundles/spread
    expect(plan.descansoMalhaHoras).toBe(24); // contém elastano

    const html = buildCutOrderPrintableHtml("DEV000006", "Camiseta Dry Pro", "Verde Brasil", plan);
    expect(html).toContain("FRD-001");
    expect(html).toContain("840 peças");
  });

  it("detecta conflito de partida/nuance entre rolos têxteis e avalia prontidão Stage-Gate", () => {
    const okBatch = evaluateRollShadeBatch([
      {
        id: "r1",
        rollCode: "RL-101",
        material: "Malha Dry Fit",
        partida: "PT-901",
        nuance: "A1",
        deltaECmc: 0.35,
        larguraRealM: 1.8,
        gramaturaRealGm2: 135,
        pesoLiquidoKg: 24.5,
        metragemM: 100.8,
        status: "Liberado",
      },
      {
        id: "r2",
        rollCode: "RL-102",
        material: "Malha Dry Fit",
        partida: "PT-901",
        nuance: "A1",
        deltaECmc: 0.48,
        larguraRealM: 1.81,
        gramaturaRealGm2: 136,
        pesoLiquidoKg: 25.2,
        metragemM: 103.1,
        status: "Liberado",
      },
    ]);
    expect(okBatch.homogeneo).toBe(true);

    const mixedBatch = evaluateRollShadeBatch([
      {
        id: "r1",
        rollCode: "RL-101",
        material: "Malha Dry Fit",
        partida: "PT-901",
        nuance: "A1",
        deltaECmc: 0.35,
        larguraRealM: 1.8,
        gramaturaRealGm2: 135,
        pesoLiquidoKg: 24.5,
        metragemM: 100.8,
        status: "Liberado",
      },
      {
        id: "r3",
        rollCode: "RL-205",
        material: "Malha Dry Fit",
        partida: "PT-944",
        nuance: "B2",
        deltaECmc: 1.25,
        larguraRealM: 1.8,
        gramaturaRealGm2: 135,
        pesoLiquidoKg: 22.0,
        metragemM: 90.5,
        status: "Liberado",
      },
    ]);
    expect(mixedBatch.homogeneo).toBe(false);

    const gate = evaluateTechSheetGateReadiness({
      ...seedFor("DEV000006"),
      etiquetagem: { ...seedFor("DEV000006").etiquetagem!, ncm: "6109.10.00" },
    });
    expect(gate.scorePct).toBe(100);
    expect(gate.readyToAdvance).toBe(true);

    // Sem NCM a ficha perde o check de etiquetagem: 80% em vez de 100%.
    // O gate técnico (BOM/BOP/POM/CAD) não trava por NCM — quem trava é o gate
    // de catálogo em `omnichannel-readiness`, e o documento em `dpp-expedition`.
    const semNcm = evaluateTechSheetGateReadiness(seedFor("DEV000006"));
    expect(semNcm.scorePct).toBe(80);
    expect(semNcm.checks.find((c) => c.id === "abnt")?.ok).toBe(false);
  });
});
