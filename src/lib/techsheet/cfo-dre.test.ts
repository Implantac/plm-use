import { describe, expect, it } from "vitest";
import { seedFor } from "./store";
import { computeFullTechSheetPricing } from "./pricing";
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
    // Com uma ficha, o volume é a tiragem planejada dela — não a soma das
    // quatro tiragens que o preset de demonstração plantava (5.350 peças).
    expect(dre.totalPieces).toBe(dre.skus[0]?.tiragem);
    expect(dre.totalPieces).toBeGreaterThan(0);
    expect(dre.grossRevenue).toBeGreaterThan(dre.netRevenue);
    expect(dre.contributionMarginBrl).toBeGreaterThan(0);
    expect(dre.breakEvenPieces).toBeGreaterThan(0);

    const html = buildDrePrintableHtml(dre);
    expect(html).toContain("EBITDA Operacional Projetado");
  });
});

describe("Onda 30 — a DRE não soma o modelo de demonstração", () => {
  it("sem nenhuma ficha salva, não há DRE a apurar", () => {
    const dre = computeCollectionDreSummary({}, 75_000, 250_000);
    expect(dre.apuravel).toBe(false);
    expect(dre.origem.apenasReferencia).toBe(true);
    expect(dre.origem.salvas).toEqual([]);
    expect(dre.origem.referencias.sort()).toEqual(
      ["DEV000006", "I25-088", "U25-014", "V24-001"].sort(),
    );
    expect(dre.skus).toEqual([]);
    expect(dre.totalPieces).toBe(0);
    expect(dre.grossRevenue).toBe(0);
    expect(dre.cmvTotal).toBe(0);
    // Inventar um prejuízo de R$ 75.000 a partir do vazio seria tão falso
    // quanto o EBITDA positivo que vinha dos quatro SKUs de exemplo.
    expect(dre.ebitdaBrl).toBe(0);
    expect(dre.breakEvenPieces).toBe(0);
  });

  it("SKUs de demonstração ficam declarados, mas fora de todos os acumuladores", () => {
    const doc = seedFor("V24-001");
    const dre = computeCollectionDreSummary({ "V24-001": doc }, 75_000, 250_000);
    expect(dre.apuravel).toBe(true);
    expect(dre.origem.apenasReferencia).toBe(false);
    expect(dre.origem.salvas).toEqual(["V24-001"]);
    expect(dre.origem.referencias.sort()).toEqual(["DEV000006", "I25-088", "U25-014"].sort());
    expect(dre.skus).toHaveLength(1);
    expect(dre.skus[0]?.salva).toBe(true);
    expect(dre.totalPieces).toBe(dre.skus[0]?.tiragem);
    expect(dre.grossRevenue).toBe(dre.skus[0]?.grossRevenue);
    expect(dre.cmvTotal).toBe(dre.skus[0]?.cmvTotal);
  });

  it("preço unitário sai da ficha, sem multiplicador de preset nem preço de papel", () => {
    const doc = seedFor("V24-001");
    const dre = computeCollectionDreSummary({ "V24-001": doc }, 75_000, 250_000);
    const pricing = computeFullTechSheetPricing(doc);
    const esperado =
      Math.round((pricing.precoReferenciaMargem || pricing.precoSugerido || 0) * 100) / 100;
    expect(dre.skus[0]?.unitPrice).toBe(esperado);
    expect(dre.skus[0]?.unitPrice).not.toBe(99.9);
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
    expect(dre.skus).toHaveLength(4);
    expect(dre.skus.every((s) => s.salva)).toBe(true);
  });

  it("somenteSalvas espelha os totais agora que o modelo saiu da soma", () => {
    const dre = computeCollectionDreSummary({ "V24-001": seedFor("V24-001") }, 75_000, 250_000);
    expect(dre.somenteSalvas).toEqual({
      totalPieces: dre.totalPieces,
      grossRevenue: dre.grossRevenue,
      contribuicaoBrl: dre.contributionMarginBrl,
    });
  });

  it("ficha só materializada por ensure() não entra na DRE", () => {
    // Abrir uma tela que chama ensure() grava o modelo no store. Sem o filtro
    // de `materializadas`, esse SKU passaria a contar como engenharia real.
    const sheets = { "V24-001": seedFor("V24-001"), DEV000006: seedFor("DEV000006") };
    const dre = computeCollectionDreSummary(sheets, 75_000, 250_000, {
      "V24-001": true,
      DEV000006: true,
    });
    expect(dre.apuravel).toBe(false);
    expect(dre.grossRevenue).toBe(0);
    expect(dre.skus).toEqual([]);
    expect(dre.origem.referencias).toContain("V24-001");

    const soUma = computeCollectionDreSummary(sheets, 75_000, 250_000, { "V24-001": true });
    expect(soUma.origem.salvas).toEqual(["DEV000006"]);
    expect(soUma.skus).toHaveLength(1);
  });

  it("o OTB só compromete com CMV de ficha salva", () => {
    const semFichas = computeCollectionDreSummary({}, 75_000, 250_000);
    expect(semFichas.otbCommittedBrl).toBe(0);
    expect(semFichas.otbRemainingBrl).toBe(250_000);
  });
});

describe("DRE impressa declara a origem sem imprimir número de demonstração", () => {
  it("com SKUs de demonstração excluídos, o A4 abre com um único aviso", () => {
    const dre = computeCollectionDreSummary({ "V24-001": seedFor("V24-001") }, 75_000, 250_000);
    const html = buildDrePrintableHtml(dre);
    expect(html).toContain("SKUs de demonstração excluídos da apuração");
    expect(html).toContain("U25-014");
    expect(html).toContain("Apurados: V24-001");
    // O A4 antigo renderizava o bloco de aviso duas vezes.
    expect(html.match(/border:1px solid #b45309/g)).toHaveLength(1);
  });

  it("sem ficha salva, o A4 diz que não é apurável e não imprime valor", () => {
    const html = buildDrePrintableHtml(computeCollectionDreSummary({}, 75_000, 250_000));
    expect(html).toContain("DRE não apurável: nenhuma ficha técnica salva");
    expect(html).toContain("—");
    expect(html).not.toContain("EBITDA Projetado: <strong>R$");
  });

  it("com todas as fichas salvas, o A4 não traz aviso", () => {
    const todas = {
      DEV000006: seedFor("DEV000006"),
      "V24-001": seedFor("V24-001"),
      "U25-014": seedFor("U25-014"),
      "I25-088": seedFor("I25-088"),
    };
    const html = buildDrePrintableHtml(computeCollectionDreSummary(todas, 75_000, 250_000));
    expect(html).not.toContain("excluídos da apuração");
    expect(html).not.toContain("DRE não apurável");
  });
});
