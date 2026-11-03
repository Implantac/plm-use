import { describe, expect, it } from "vitest";
import type { MeasurementChart } from "@/lib/measurements/store";
import { seedFor } from "./store";
import {
  buildDefaultQuotesForItem,
  buildShowroomCatalogItem,
  buildShowroomOrderPrintableHtml,
  explodeBomRequirements,
  measurementChartToTechSheetSpec,
  scoreRfqProposals,
} from "./sourcing-rfq";

describe("Sourcing Industrial RFQ, Tabelas POM & Showroom B2B", () => {
  it("explode a BOM pela tiragem planejada e classifica propostas RFQ por Score TCO", () => {
    const doc = seedFor("DEV000006");
    const reqs = explodeBomRequirements(doc);
    expect(reqs.length).toBeGreaterThan(0);

    const first = reqs[0]!;
    expect(first.necessidadeBrutaLote).toBeGreaterThan(0);

    const quotes = buildDefaultQuotesForItem(first);
    const scored = scoreRfqProposals(quotes, first);
    expect(scored).toHaveLength(3);
    expect(scored.filter((q) => q.winner)).toHaveLength(1);
    expect(scored.find((q) => q.winner)!.scoreTco).toBeGreaterThan(70);
  });

  it("converte Tabela Corporativa de Medidas em especificação POM da Ficha Técnica e gera espelho B2B", () => {
    const chart: MeasurementChart = {
      id: "tm-test",
      code: "TM-TOP-01",
      name: "Base Camiseta",
      category: "Top",
      segment: "Unissex",
      fit: "regular",
      unit: "cm",
      linkedRefs: 2,
      status: "aprovada",
      updatedAt: "2026-11-03",
      updatedBy: "Modelagem",
      points: [
        { id: "p1", code: "A", label: "Tórax", toleranceCm: 1 },
        { id: "p2", code: "B", label: "Comprimento", toleranceCm: 1.5 },
      ],
      grade: [
        { size: "P", values: { A: 50, B: 68 } },
        { size: "M", values: { A: 53, B: 70 } },
        { size: "G", values: { A: 57, B: 72 } },
      ],
    };

    const spec = measurementChartToTechSheetSpec(chart);
    expect(spec.tamanhoBase).toBe("M");
    expect(spec.pontos[0]!.valorBase).toBe(53);
    expect(spec.pontos[0]!.regraGraduacaoCm).toBe(4);
    expect(spec.pontos[0]!.overrides?.["P"]).toBe(50);

    const cat = buildShowroomCatalogItem("DEV000006", seedFor("DEV000006"));
    const html = buildShowroomOrderPrintableHtml("Boutique Jardins", "12.345.678/0001-90", [
      {
        refCode: cat.refCode,
        refName: cat.refName,
        colorName: cat.colorways[0]!.name,
        colorHex: cat.colorways[0]!.hex,
        packs: 3,
        piecesPerPack: 12,
        wholesaleUnitPrice: cat.wholesaleUnitPrice,
        suggestedRetailPrice: cat.suggestedRetailPrice,
        ncm: cat.ncm,
        abnt: cat.abnt,
      },
    ]);
    expect(html).toContain("Boutique Jardins");
    expect(html).toContain("36 peças");
  });
});
