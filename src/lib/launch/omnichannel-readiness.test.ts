import { describe, expect, it } from "vitest";
import { seedFor } from "@/lib/techsheet/store";
import {
  buildOmnichannelCatalogCsv,
  evaluateOmnichannelReadiness,
  resolveOmnichannelInputs,
} from "./omnichannel-readiness";

describe("Gate Go/No-Go Omnichannel & Exportação de Catálogo VTEX/Shopify", () => {
  it("avalia score de prontidão de fichas reais e gera feed CSV com EAN-13 válido e NCM", () => {
    // Ficha salva traz NCM preenchido; o default do modelo agora é vazio.
    const comNcm = (ref: string) => ({
      ...seedFor(ref),
      etiquetagem: { ...seedFor(ref).etiquetagem!, ncm: "6109.10.00" },
    });
    const sheets = { "V24-001": comNcm("V24-001"), DEV000006: comNcm("DEV000006") };

    const evaluated = evaluateOmnichannelReadiness(sheets);
    expect(evaluated).toHaveLength(2);
    expect(evaluated[0]!.readinessScorePct).toBeGreaterThanOrEqual(80);
    expect(evaluated[0]!.ean13).toHaveLength(13);

    const csv = buildOmnichannelCatalogCsv(evaluated);
    expect(csv).toContain("sku_ref;ean13_gtin;nome_comercial");
    expect(csv).toContain("6109.10.00");
    expect(csv).toContain("https://dpp.usemoda.ind.br/V24-001");
  });

  it("ficha sem NCM não é 'apta a go-live' e o feed sai sem NCM inventado", () => {
    const semNcm = seedFor("V24-001"); // default de etiquetagem agora vem vazio
    const [item] = evaluateOmnichannelReadiness({ "V24-001": semNcm });

    expect(item!.ncmFiscal).toBe("");
    expect(item!.abntComposition).not.toContain("Algodão Certificado");
    // 5 de 6 checks dariam 83% — mas sem NCM o status é pendência de qualquer jeito
    expect(item!.readinessScorePct).toBeGreaterThan(0);
    expect(item!.goNoGoStatus).toBe("PENDENCIA_ENGENHARIA");

    const csv = buildOmnichannelCatalogCsv([item!]);
    expect(csv).not.toContain("6109.10.00");
    expect(csv).not.toContain("6109.90.00");
  });
});

describe("Onda 30 — feed omnichannel não emite documento de demonstração", () => {
  it("store vazio: nada de seed, nada apurável", () => {
    const r = resolveOmnichannelInputs({});
    expect(r.docs).toEqual({});
    expect(r.apuravel).toBe(false);
    expect(r.provenance).toBe("referencia");
    expect(r.excluidas).toEqual([]);
    expect(evaluateOmnichannelReadiness(r.docs)).toEqual([]);
  });

  it("só templates materializados também não libera CSV nem A4", () => {
    const sheets = {
      "V24-001": seedFor("V24-001"),
      DEV000006: seedFor("DEV000006"),
    };
    const r = resolveOmnichannelInputs(sheets, { "V24-001": true, DEV000006: true });
    expect(r.apuravel).toBe(false);
    expect(r.docs).toEqual({});
    expect(r.excluidas.sort()).toEqual(["DEV000006", "V24-001"].sort());
  });

  it("ficha salva entra; template na mesma conta fica de fora", () => {
    const salva = seedFor("REAL-1");
    salva.meta = { ...salva.meta!, name: "Produto da empresa" };
    const r = resolveOmnichannelInputs(
      { "REAL-1": salva, "V24-001": seedFor("V24-001") },
      { "V24-001": true },
    );
    expect(r.apuravel).toBe(true);
    expect(Object.keys(r.docs)).toEqual(["REAL-1"]);
    expect(r.docs["REAL-1"]).toBe(salva);
    expect(r.excluidas).toEqual(["V24-001"]);
    expect(evaluateOmnichannelReadiness(r.docs)).toHaveLength(1);
  });
});
