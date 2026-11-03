import { describe, expect, it } from "vitest";
import { seedFor } from "./store";
import {
  buildDppPrintableHtml,
  buildPackingListPrintableHtml,
  buildPreNfeXml400,
  computeDigitalProductPassport,
  computePackingAndNfePreview,
} from "./dpp-expedition";

describe("Passaporte Digital do Produto (DPP ESG) & Expedição Pré-NFe 4.00", () => {
  it("calcula pegada de carbono, água, circularidade, QR vetorial e certificado DPP A4", () => {
    const dpp = computeDigitalProductPassport("DEV000006", seedFor("DEV000006"));
    expect(dpp.pieceWeightGrams).toBeGreaterThan(50);
    expect(dpp.carbonKgCo2e).toBeGreaterThan(0);
    expect(dpp.waterLiters).toBeGreaterThan(0);
    expect(dpp.circularityScore).toBeGreaterThanOrEqual(35);
    expect(dpp.qrSvgDataUrl).toContain("data:image/svg+xml");

    const html = buildDppPrintableHtml(dpp);
    expect(html).toContain("Passaporte Digital do Produto");
    expect(html).toContain("DEV000006");
  });

  it("calcula caixas master, peso bruto/cubagem, CFOP estadual/interestadual e XML SEFAZ NFe 4.00", () => {
    const summarySp = computePackingAndNfePreview(
      [{ refCode: "DEV000006", qtyPieces: 72, doc: seedFor("DEV000006") }],
      "Luxury Boutique SP",
      "12.345.678/0001-90",
      "SP",
    );
    expect(summarySp.cfop).toBe("6101"); // PR -> SP interestadual
    expect(summarySp.totalMasterBoxes).toBe(3); // 72 / 24
    expect(summarySp.grossWeightKg).toBeGreaterThan(summarySp.netWeightKg);

    const summaryPr = computePackingAndNfePreview(
      [{ refCode: "V24-001", qtyPieces: 24, doc: seedFor("V24-001") }],
      "Urban Concept Curitiba",
      "09.112.880/0001-09",
      "PR",
    );
    expect(summaryPr.cfop).toBe("5101"); // PR -> PR interno

    const xml = buildPreNfeXml400(summarySp);
    expect(xml).toContain('<infNFe versao="4.00"');
    expect(xml).toContain("<CFOP>6101</CFOP>");
    expect(xml).toContain("<qVol>3</qVol>");

    const packingHtml = buildPackingListPrintableHtml(summarySp);
    expect(packingHtml).toContain("Romaneio de Expedição");
    expect(packingHtml).toContain("Luxury Boutique SP");
  });
});
