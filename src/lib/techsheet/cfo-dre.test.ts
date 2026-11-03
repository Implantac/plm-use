import { describe, expect, it } from "vitest";
import { seedFor } from "./store";
import {
  buildDrePrintableHtml,
  buildLineBalancingPrintableHtml,
  computeCellGsdBalancing,
  computeCollectionDreSummary,
} from "./cfo-dre";

describe("Cronoanálise GSD / Yamazumi & DRE Gerencial CFO", () => {
  it("calcula Takt Time, alocação de máquinas/operadores e identifica o posto gargalo", () => {
    const doc = seedFor("DEV000006");
    const res = computeCellGsdBalancing(doc, {
      jornadaMinutosDia: 480,
      eficienciaOperacionalPct: 85,
      metaPecasDia: 420,
      custoMinutoIndustrial: 1.18,
    });

    expect(res.samInternoTotalMin).toBeGreaterThan(0);
    expect(res.taktTimeExigidoMin).toBeGreaterThan(0);
    expect(res.totalPostosAlocados).toBeGreaterThanOrEqual(
      doc.bop.filter((b) => !b.terceirizada).length,
    );
    expect(res.stations.filter((s) => s.isBottleneck)).toHaveLength(1);
    expect(res.eficienciaBalanceamentoPct).toBeGreaterThan(0);
    expect(res.eficienciaBalanceamentoPct).toBeLessThanOrEqual(100);

    const html = buildLineBalancingPrintableHtml("DEV000006", "Camiseta Dry Pro", res);
    expect(html).toContain("GARGALO");
    expect(html).toContain("DEV000006");
  });

  it("apura DRE Gerencial da coleção, OTB e Ponto de Equilíbrio a partir das Fichas Técnicas", () => {
    const dre = computeCollectionDreSummary({ DEV000006: seedFor("DEV000006") }, 75_000, 250_000);
    expect(dre.totalPieces).toBeGreaterThan(1000);
    expect(dre.grossRevenue).toBeGreaterThan(dre.netRevenue);
    expect(dre.contributionMarginBrl).toBeGreaterThan(0);
    expect(dre.breakEvenPieces).toBeGreaterThan(0);

    const html = buildDrePrintableHtml(dre);
    expect(html).toContain("EBITDA Operacional Projetado");
  });
});
