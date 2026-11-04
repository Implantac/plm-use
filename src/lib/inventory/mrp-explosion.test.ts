import { describe, expect, it } from "vitest";
import { INITIAL_PRIVATE_LABEL_ORDERS } from "@/lib/sales/private-label-queue";
import { seedFor } from "@/lib/techsheet/store";
import { buildMrpCsv, computeMrpNetExplosion } from "./mrp-explosion";

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
    expect(csv).toContain("necessidade_bruta;saldo_almoxarifado;compra_liquida");
    expect(csv).toContain("Malha Piquet Pima");
  });
});
