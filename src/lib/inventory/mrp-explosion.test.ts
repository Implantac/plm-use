import { describe, expect, it } from "vitest";
import { INITIAL_PRIVATE_LABEL_ORDERS } from "@/lib/sales/private-label-queue";
import { seedFor } from "@/lib/techsheet/store";
import { buildMrpCsv, computeMrpNetExplosion, normalizeMaterialName } from "./mrp-explosion";

describe("MRP I Explosão Líquida de Materiais", () => {
  it("calcula necessidade bruta, desconta estoque disponível e apura orçamento de compra líquida", () => {
    const summary = computeMrpNetExplosion({
      orders: INITIAL_PRIVATE_LABEL_ORDERS,
      sheets: {
        DEV000006: seedFor("DEV000006"),
        "V24-001": seedFor("V24-001"),
      },
    });

    expect(summary.totalGrossItems).toBeGreaterThan(2);
    expect(summary.shortageCount).toBeGreaterThan(0);
    expect(summary.totalPurchaseBudgetBrl).toBeGreaterThan(0);

    const csv = buildMrpCsv(summary);
    // a coluna `origem_saldo` diz, linha a linha, se o saldo é do almoxarifado
    // ou apenas referência do BOM — o CSV não pode insinuar estoque físico.
    expect(csv).toContain("necessidade_bruta;saldo_almoxarifado;origem_saldo;compra_liquida");
    expect(csv).toContain("Malha Piquet Pima");
  });

  it("marca cada linha com a origem do saldo: almoxarifado quando há saldo real", () => {
    const sheets = { DEV000006: seedFor("DEV000006") };
    const semEstoque = computeMrpNetExplosion({ orders: INITIAL_PRIVATE_LABEL_ORDERS, sheets });

    // sem balance informado, nada é saldo real
    expect(semEstoque.provenance.hasRealStock).toBe(false);
    expect(semEstoque.provenance.realStockLines).toBe(0);
    expect(semEstoque.rows.every((r) => r.stockSource === "bom_referencia")).toBe(true);

    // agora com um material realmente presente no almoxarifado
    const material = semEstoque.rows[0].materialName;
    const comEstoque = computeMrpNetExplosion({
      orders: INITIAL_PRIVATE_LABEL_ORDERS,
      sheets,
      cloudBalancesByName: { [normalizeMaterialName(material)]: 999 },
    });

    const linha = comEstoque.rows.find((r) => r.materialName === material)!;
    expect(linha.stockSource).toBe("almoxarifado");
    expect(linha.availableStock).toBe(999);
    // saldo acima da necessidade zera a compra daquele insumo
    expect(linha.netPurchaseQty).toBe(0);
    expect(comEstoque.provenance.realStockLines).toBeGreaterThan(0);
    expect(comEstoque.provenance.referenceLines).toBe(
      comEstoque.totalGrossItems - comEstoque.provenance.realStockLines,
    );
  });

  it("não confunde referência do BOM com saldo físico no CSV", () => {
    const summary = computeMrpNetExplosion({
      orders: INITIAL_PRIVATE_LABEL_ORDERS,
      sheets: { DEV000006: seedFor("DEV000006") },
    });
    const csv = buildMrpCsv(summary);
    expect(csv.split("\n")[0]).toContain("origem_saldo");
    expect(csv).toContain("bom_referencia");
  });

  it("normaliza o nome do material para casar ficha × almoxarifado", () => {
    expect(normalizeMaterialName("  Malha Piquet Pima ")).toBe("malha piquet pima");
    expect(normalizeMaterialName("LINHA DE COSTURA 120")).toBe("linha de costura 120");
    expect(normalizeMaterialName("Botão  4 furos")).toBe("botao 4 furos");
  });
});
