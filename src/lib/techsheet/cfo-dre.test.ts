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

describe("origem da DRE — o que é operação e o que é modelo", () => {
  it("sem nenhuma ficha salva, marca a coleção inteira como demonstração", () => {
    const dre = computeCollectionDreSummary({}, 75_000, 250_000);
    expect(dre.origem.apenasReferencia).toBe(true);
    expect(dre.origem.salvas).toEqual([]);
    expect(dre.origem.referencias.sort()).toEqual(
      ["DEV000006", "I25-088", "U25-014", "V24-001"].sort(),
    );
    // o número existe (serve de simulação), mas está rotulado como modelo
    expect(dre.ebitdaBrl).not.toBe(0);
  });

  it("marca como salvo só o SKU que veio do store", () => {
    const dre = computeCollectionDreSummary({ "V24-001": seedFor("V24-001") }, 75_000, 250_000);
    expect(dre.origem.apenasReferencia).toBe(false);
    expect(dre.origem.salvas).toEqual(["V24-001"]);
    expect(dre.origem.referencias.length).toBe(3);
    expect(dre.skus.find((s) => s.refCode === "V24-001")?.salva).toBe(true);
    expect(dre.skus.find((s) => s.refCode === "U25-014")?.salva).toBe(false);
  });

  it("somenteSalvas ignora o modelo em peças e receita", () => {
    const semSalvas = computeCollectionDreSummary({}, 75_000, 250_000);
    expect(semSalvas.somenteSalvas).toEqual({
      totalPieces: 0,
      grossRevenue: 0,
      contribuicaoBrl: 0,
    });

    const umaSalva = computeCollectionDreSummary(
      { "V24-001": seedFor("V24-001") },
      75_000,
      250_000,
    );
    expect(umaSalva.somenteSalvas.totalPieces).toBeGreaterThan(0);
    expect(umaSalva.somenteSalvas.totalPieces).toBeLessThan(umaSalva.totalPieces);
    expect(umaSalva.somenteSalvas.grossRevenue).toBeLessThan(umaSalva.grossRevenue);
  });

  it("todas salvas zera a lista de referências", () => {
    const todas = {
      DEV000006: seedFor("DEV000006"),
      "V24-001": seedFor("V24-001"),
      "U25-014": seedFor("U25-014"),
      "I25-088": seedFor("I25-088"),
    };
    const dre = computeCollectionDreSummary(todas, 75_000, 250_000);
    expect(dre.origem.referencias).toEqual([]);
    expect(dre.origem.apenasReferencia).toBe(false);
    expect(dre.skus.every((s) => s.salva)).toBe(true);
  });
});

describe("DRE impressa declara a origem", () => {
  it("com SKU de demonstração, o A4 abre com aviso", () => {
    const dre = computeCollectionDreSummary({ "V24-001": seedFor("V24-001") }, 75_000, 250_000);
    const html = buildDrePrintableHtml(dre);
    expect(html).toContain("Documento com dados de demonstração");
    expect(html).toContain("U25-014");
    expect(html).toContain("Salvos: V24-001");
  });

  it("com todas as fichas salvas, o A4 não traz o aviso", () => {
    const todas = {
      DEV000006: seedFor("DEV000006"),
      "V24-001": seedFor("V24-001"),
      "U25-014": seedFor("U25-014"),
      "I25-088": seedFor("I25-088"),
    };
    const html = buildDrePrintableHtml(computeCollectionDreSummary(todas, 75_000, 250_000));
    expect(html).not.toContain("Documento com dados de demonstração");
  });
});
