import { describe, expect, it } from "vitest";
import {
  bomItemCustoEfetivo,
  calcRendimentoMporKg,
  computeGradedMatrix,
  converterKgParaMetro,
  converterMetroParaKg,
  parseExcelBomPaste,
  parseExcelMeasurementsPaste,
  validateComposicaoAbnt,
} from "./textile";
import {
  compareTaxRegimes,
  computeFullTechSheetPricing,
  computeReverseTargetCost,
  TAX_REGIME_PRESETS,
} from "./pricing";
import { buildCatalogPublicationPlan } from "./publish-catalog";
import { buildTechSheetPrintHtml } from "./print";
import { deserializeTechSheetRow, serializeTechSheetDoc } from "./server";
import { seedFor } from "./store";

describe("engenharia têxtil pura (rendimento, quebra, graduação, ABNT, Excel)", () => {
  it("calcula rendimento m/kg e converte kg ↔ m com consistência", () => {
    // 1000 / (1.80 m * 135 g/m²) = 4.1152 m/kg
    const rend = calcRendimentoMporKg(1.8, 135);
    expect(rend).toBeCloseTo(4.1152, 3);
    const kg = converterMetroParaKg(1.07, 1.8, 135);
    expect(kg).toBeCloseTo(0.26, 2);
    const mBack = converterKgParaMetro(kg, 1.8, 135);
    expect(mBack).toBeCloseTo(1.07, 2);
  });

  it("bomItemCustoEfetivo multiplica consumo × (1 + perda%) × custoUnitario quando presente e preserva legado", () => {
    expect(
      bomItemCustoEfetivo({
        consumo: "0,260",
        perdaPct: 7,
        custoUnitario: 39.8,
        custo: 0,
      }),
    ).toBe(11.07);

    // Legado v1/v2 sem custoUnitario mantém o campo custo intacto
    expect(bomItemCustoEfetivo({ consumo: "1.2", custo: 42 })).toBe(42);
  });

  it("computeGradedMatrix aplica salto positivo e negativo a partir do tamanhoBase e respeita overrides", () => {
    const matrix = computeGradedMatrix({
      tamanhoBase: "M",
      tamanhos: ["PP", "P", "M", "G", "GG"],
      unidade: "cm",
      pontos: [
        {
          id: "a",
          codigo: "A",
          nome: "Tórax",
          valorBase: 54,
          regraGraduacaoCm: 2,
          toleranciaCm: 1,
          overrides: { GG: 59 },
        },
      ],
    });
    expect(matrix[0].values).toEqual({
      PP: 50,
      P: 52,
      M: 54,
      G: 56,
      GG: 59,
    });
  });

  it("validateComposicaoAbnt valida soma 100% e gera resumo normativo", () => {
    const ok = validateComposicaoAbnt([
      { fibra: "Poliéster", pct: 96 },
      { fibra: "Elastano", pct: 4 },
    ]);
    expect(ok.valida).toBe(true);
    expect(ok.somaPct).toBe(100);
    expect(ok.resumo).toBe("96% Poliéster · 4% Elastano");

    const bad = validateComposicaoAbnt([{ fibra: "Algodão", pct: 85 }]);
    expect(bad.valida).toBe(false);
  });

  it("parseExcelBomPaste ignora cabeçalho e lê TSV do Excel com vírgula decimal", () => {
    const tsv = [
      "Tipo\tMaterial\tFornecedor\tConsumo\tUnidade\tPerda%\tCustoUnit",
      "Tecido\tMalha Dry UV50\tCamargo\t0,260\tkg\t7\t39,80",
      "Aviamento\tEtiqueta Transfer\tReal\t1\tun\t2\t1,00",
    ].join("\n");
    const rows = parseExcelBomPaste(tsv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      tipo: "Tecido",
      material: "Malha Dry UV50",
      consumo: "0.26",
      perdaPct: 7,
      custoUnitario: 39.8,
      custo: 11.07,
    });
    expect(rows[1].custo).toBe(1.02);
  });
});

describe("motor financeiro Mark-up Divisor + inclusão de Aplicações", () => {
  it("soma BOM + BOP + Aplicações + Setup diluído e calcula PV pelo Mark-up Divisor", () => {
    const doc = seedFor("DEV000006");
    const p = computeFullTechSheetPricing(doc);

    // Aplicações (2.30) + Setup (90 / 200 = 0.45) entram no custo industrial!
    expect(p.aplicacoesPeca).toBe(2.3);
    expect(p.setupPorPeca).toBe(0.45);
    expect(p.industrial).toBeCloseTo(p.bom + p.bop + 2.3 + 0.45, 2);

    // Simples Nacional: 8.5 + 7 + 2.5 + 2 + 1 = 21% deduções + 20% margem = 41% → divisor 0.59
    expect(p.deducoesSemLucroPct).toBe(21);
    expect(p.markupDivisor).toBe(0.59);
    expect(p.precoSugerido).toBeCloseTo(p.custoFinal / 0.59, 1);
  });

  it("bloqueia divisor inválido quando soma das deduções >= 99%", () => {
    const doc = seedFor("DEV-ERR");
    doc.preCost.pricingMode = "divisor";
    doc.preCost.divisor = {
      ...TAX_REGIME_PRESETS.LUCRO_REAL.values,
      impostosPct: 60,
      margemLiquidaAlvoPct: 40,
    };
    const p = computeFullTechSheetPricing(doc);
    expect(p.divisorInvalido).toBe(true);
    expect(p.precoSugerido).toBe(0);
  });
});

describe("envelope v3 + PDF Facção Cego + Ponte Ficha → Catálogo", () => {
  it("serialize/deserialize preserva todos os blocos v3 (colorways, medidas, etiquetagem, encaixeCad, meta)", () => {
    const doc = seedFor("DEV000006");
    const row = serializeTechSheetDoc("DEV000006", doc, "u-1");
    const back = deserializeTechSheetRow(row);
    expect(back.colorways).toEqual(doc.colorways);
    expect(back.medidas).toEqual(doc.medidas);
    expect(back.etiquetagem).toEqual(doc.etiquetagem);
    expect(back.encaixeCad).toEqual(doc.encaixeCad);
    expect(back.meta).toEqual(doc.meta);
  });

  it("PDF Facção (omitCosts: true) remove 100% dos valores em R$ e pré-custo mantendo medidas e ABNT", () => {
    const doc = seedFor("DEV000006");
    const html = buildTechSheetPrintHtml(
      {
        ref: "DEV000006",
        name: "Camiseta Esportiva Dry Pro",
        category: "Esportivo",
        season: "Verão 2027",
      },
      doc,
      new Date("2026-10-30T12:00:00Z"),
      { omitCosts: true },
    ).replace(/\u00a0/g, " ");

    expect(html).toContain("VIA FACÇÃO / OFICINA (SEM CUSTO)");
    expect(html).toContain("Tabela de Medidas Graduada");
    expect(html).toContain("96% Poliéster · 4% Elastano");
    expect(html).not.toContain("R$");
    expect(html).not.toContain("Pré-custo");
  });

  it("buildCatalogPublicationPlan mapeia BOM p/ kinds válidos do SQL e aplicações p/ drivers", () => {
    const doc = seedFor("DEV000006");
    const plan = buildCatalogPublicationPlan(doc);
    expect(plan.product.code).toBe("DEV000006");
    expect(plan.product.reference_code).toBe("DEV000006");
    expect(plan.product.grade).toEqual(["PP", "P", "M", "G", "GG"]);

    const baseOpt = plan.groups.find((g) => g.code === "estrutura-plm")!.options[0];
    expect(baseOpt.material_consumption).toHaveLength(4);
    for (const m of baseOpt.material_consumption) {
      expect(["tecido", "aviamento", "linha", "embalagem", "servico"]).toContain(m.kind);
    }

    const appGroup = plan.groups.find((g) => g.code === "aplicacoes-plm")!;
    expect(appGroup.options[0].driver).toBe("m2"); // Transfer → m2
    expect(appGroup.options[0].setup_cost).toBe(90);
  });

  it("parseExcelMeasurementsPaste importa cotas POM e preserva silhueta/callouts no envelope v3", () => {
    const poms = parseExcelMeasurementsPaste(
      "E\tLargura Barra\t52\t+2,0 cm\t± 1,0 cm\nF;Cava Retilínea;23;1,0;0,5",
    );
    expect(poms).toHaveLength(2);
    expect(poms[0]).toMatchObject({
      codigo: "E",
      nome: "Largura Barra",
      valorBase: 52,
      regraGraduacaoCm: 2,
      toleranciaCm: 1,
    });
    expect(poms[1]).toMatchObject({
      codigo: "F",
      nome: "Cava Retilínea",
      valorBase: 23,
      regraGraduacaoCm: 1,
      toleranciaCm: 0.5,
    });

    const doc = seedFor("DEV000006");
    expect(doc.meta?.silhouette).toBe("camiseta_v");
    expect(doc.meta?.callouts).toHaveLength(3);
    const payload = serializeTechSheetDoc("DEV000006", doc, "u-1");
    const restored = deserializeTechSheetRow(payload);
    expect(restored.meta?.silhouette).toBe("camiseta_v");
    expect(restored.meta?.callouts?.[0]?.label).toContain("Gola V");
  });

  it("Target Costing reverso e comparativo tributário (Simples x Presumido x Real) são coerentes", () => {
    const doc = seedFor("DEV000006");
    // Com PV teto alto (R$ 149,90), a referência tem folga positiva de custo industrial
    const okTarget = computeReverseTargetCost(doc, 149.9);
    expect(okTarget.viavel).toBe(true);
    expect(okTarget.custoIndustrialMaximo).toBeGreaterThan(29);
    expect(okTarget.folgaCustoIndustrial).toBeGreaterThan(0);

    // Com PV teto espremido (R$ 49,90), o custo industrial estoura o teto reverso
    const tightTarget = computeReverseTargetCost(doc, 49.9);
    expect(tightTarget.viavel).toBe(false);
    expect(tightTarget.folgaCustoIndustrial).toBeLessThan(0);

    // Comparativo entre os regimes tributários brasileiros mantém ordem crescente de carga
    const regimes = compareTaxRegimes(doc);
    expect(regimes).toHaveLength(4);
    const simples = regimes.find((r) => r.regime === "SIMPLES_CONFECCAO")!;
    const presumido = regimes.find((r) => r.regime === "LUCRO_PRESUMIDO")!;
    const real = regimes.find((r) => r.regime === "LUCRO_REAL")!;
    expect(simples.precoSugerido).toBeLessThan(presumido.precoSugerido);
    expect(presumido.precoSugerido).toBeLessThan(real.precoSugerido);
  });

  it("PDF A4 Cego de Facção embute Croqui SVG Frente+Costas, Callouts e Matriz Cor sem R$", () => {
    const doc = seedFor("DEV000006");
    const blindHtml = buildTechSheetPrintHtml(
      {
        ref: "DEV000006",
        name: "Camiseta Esportiva Dry Pro",
        category: "Esportivo",
        season: "Verão 2027",
      },
      doc,
      new Date("2026-10-30T12:00:00Z"),
      { omitCosts: true },
    );
    expect(blindHtml).toContain('class="croqui-svg"');
    expect(blindHtml).toContain("Gola V Ribana Listrada");
    expect(blindHtml).toContain("Var VD-OURO");
    expect(blindHtml).toContain("Símbolos ISO 3758");
    expect(blindHtml).not.toContain("R$");
  });
});
