import { describe, expect, it } from "vitest";
import type { PrintAsset } from "@/lib/prints/store";
import { seedFor } from "./store";
import {
  analyzePrintTechnicalViability,
  buildAplicacaoFromPrint,
  simulateDigitalTwinScenario,
} from "./digital-twin";

describe("digital-twin & print viability engine", () => {
  it("simula impacto real de lote, preço de tecido e facção no Gêmeo Digital", () => {
    const doc = seedFor("DEV000006");
    const base = simulateDigitalTwinScenario("DEV000006", doc, {
      batchQty: 500,
      fabricCostDeltaPct: 0,
      outsourceSharePct: 0,
      cellEfficiencyPct: 80,
      operators: 8,
    });

    expect(base.simulatedBatchQty).toBe(500);
    expect(base.internalDailyCapacity).toBeGreaterThan(0);
    expect(base.hotspots).toHaveLength(4);

    // Choque de +20% no tecido comprime margem líquida; 50% facção aumenta capacidade diária combinada
    const stressed = simulateDigitalTwinScenario("DEV000006", doc, {
      batchQty: 1200,
      fabricCostDeltaPct: 20,
      outsourceSharePct: 50,
      cellEfficiencyPct: 80,
      operators: 8,
    });

    expect(stressed.simulatedPricing.custoFinal).toBeGreaterThan(base.simulatedPricing.custoFinal);
    expect(stressed.marginDeltaPp).toBeLessThan(0);
    expect(stressed.combinedDailyCapacity).toBeGreaterThan(base.combinedDailyCapacity);
    expect(stressed.mrp.totalPieces).toBe(1200);
  });

  it("valida compatibilidade química de sublimação vs algodão/poliéster e gera AplicacaoDraft", () => {
    const polySheet = seedFor("DEV000006"); // 92% Poliéster / 8% Elastano
    const cottonSheet = {
      ...polySheet,
      etiquetagem: {
        ncm: "6109.10.00",
        paisOrigem: "Brasil",
        composicao: [{ fibra: "Algodão", pct: 100 }],
        cuidados: polySheet.etiquetagem!.cuidados,
      },
    };

    const subPrint: PrintAsset = {
      id: "p1",
      code: "EST-901",
      name: "Tropical Folhagem",
      tecnica: "sublimacao",
      repeat: { widthCm: 32, heightCm: 40 },
      colorCount: 4,
      colors: ["#1D6B47", "#EAB308"],
      status: "aprovada",
      cover: "https://example.com/p1.png",
      fileFormat: "TIFF",
      linkedRefs: 1,
      updatedAt: "2026-10-30",
      tags: ["verao"],
      versions: [],
    };

    const okReport = analyzePrintTechnicalViability(subPrint, polySheet);
    expect(okReport.fiberCompatibility).toBe("compativel");
    expect(okReport.score).toBeGreaterThanOrEqual(90);

    const warnReport = analyzePrintTechnicalViability(subPrint, cottonSheet);
    expect(warnReport.fiberCompatibility).toBe("atencao");
    expect(warnReport.alerts.join(" ")).toContain("Incompatibilidade química");

    const draft = buildAplicacaoFromPrint(subPrint, "Costas central", polySheet);
    expect(draft.tipo).toBe("Sublimação");
    expect(draft.arte).toContain("EST-901");
    expect(draft.larguraCm).toBe(32);
  });
});
