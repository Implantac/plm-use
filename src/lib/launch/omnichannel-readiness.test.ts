import { describe, expect, it } from "vitest";
import { seedFor } from "@/lib/techsheet/store";
import { buildOmnichannelCatalogCsv, evaluateOmnichannelReadiness } from "./omnichannel-readiness";

describe("Gate Go/No-Go Omnichannel & Exportação de Catálogo VTEX/Shopify", () => {
  it("avalia score de prontidão de fichas reais e gera feed CSV com EAN-13 válido e NCM", () => {
    const sheets = {
      "V24-001": seedFor("V24-001"),
      DEV000006: seedFor("DEV000006"),
    };

    const evaluated = evaluateOmnichannelReadiness(sheets);
    expect(evaluated).toHaveLength(2);
    expect(evaluated[0]!.readinessScorePct).toBeGreaterThanOrEqual(80);
    expect(evaluated[0]!.ean13).toHaveLength(13);

    const csv = buildOmnichannelCatalogCsv(evaluated);
    expect(csv).toContain("sku_ref;ean13_gtin;nome_comercial");
    expect(csv).toContain("6109.90.00");
    expect(csv).toContain("https://dpp.usemoda.ind.br/V24-001");
  });
});
