import { describe, expect, it } from "vitest";
import { resolveSheet, sheetProvenance, summarizeSheets } from "./provenance";
import { seedFor, type TechSheetData } from "./store";

const salvo: TechSheetData = seedFor("V24-001");

describe("procedência da ficha técnica", () => {
  it("marca como 'salva' quando a ficha veio do store", () => {
    expect(sheetProvenance({ "V24-001": salvo }, "V24-001")).toBe("salva");
  });

  it("marca como 'referencia' quando a ficha só existe no seed", () => {
    expect(sheetProvenance({}, "V24-001")).toBe("referencia");
    expect(sheetProvenance(undefined, "DEV000006")).toBe("referencia");
  });

  it("resolveSheet devolve o doc do store e não chama o fallback", () => {
    let chamou = 0;
    const { doc, provenance } = resolveSheet({ "V24-001": salvo }, "V24-001", (c) => {
      chamou += 1;
      return seedFor(c);
    });
    expect(provenance).toBe("salva");
    expect(doc).toBe(salvo);
    expect(chamou).toBe(0);
  });

  it("resolveSheet usa o fallback e admite que é referência", () => {
    const { doc, provenance } = resolveSheet({}, "DEV000006", seedFor);
    expect(provenance).toBe("referencia");
    expect(doc.meta?.name).toBe(seedFor("DEV000006").meta?.name);
  });

  it("summarizeSheets conta salvas × referências e lista os códigos em falta", () => {
    const r = summarizeSheets({ "V24-001": salvo }, ["V24-001", "DEV000006", "U25-014"]);
    expect(r).toEqual({
      total: 3,
      salvas: 1,
      referencias: 2,
      codesReferencia: ["DEV000006", "U25-014"],
    });
  });
});
