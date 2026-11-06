import { describe, expect, it } from "vitest";
import { seedFor, type TechSheetData } from "./store";
import { fichaDeclarada } from "@/test/ficha-declarada";
import {
  DocumentoNaoEmitivelError,
  buildDppPrintableHtml,
  buildPackingListPrintableHtml,
  buildPreNfeXml400,
  computeDigitalProductPassport,
  computePackingAndNfePreview,
  resolveReferenceTechSheet,
  dppRequirements,
} from "./dpp-expedition";

/** Ficha que o usuário salvou: está no mapa e não é materialização do modelo. */
const salvos: Record<string, TechSheetData> = {
  DEV000006: seedFor("DEV000006"),
  "V24-001": seedFor("V24-001"),
};

/** Onda 33: ficha apurável para DPP — NCM, origem, composição e encaixe declarados. */
function fichaCompleta(ref: string, ncm: string): TechSheetData {
  const base = fichaDeclarada(ref);
  return {
    ...base,
    etiquetagem: { ...base.etiquetagem!, ncm },
    encaixeCad: { ...base.encaixeCad!, eficienciaPct: 86.4 },
  };
}

/** Ficha com NCM preenchido — exigência para faturar. */
const salvosComNcm: Record<string, TechSheetData> = {
  DEV000006: {
    ...seedFor("DEV000006"),
    etiquetagem: { ...seedFor("DEV000006").etiquetagem!, ncm: "6109.10.00" },
  },
  "V24-001": {
    ...seedFor("V24-001"),
    etiquetagem: { ...seedFor("V24-001").etiquetagem!, ncm: "6105.10.00" },
  },
};

describe("Passaporte Digital do Produto (DPP ESG) & Expedição Pré-NFe 4.00", () => {
  it("calcula pegada de carbono, água, circularidade, QR vetorial e certificado DPP A4", () => {
    const ref = resolveReferenceTechSheet("DEV000006", {
      DEV000006: fichaCompleta("DEV000006", "6109.10.00"),
    });
    const dpp = computeDigitalProductPassport(ref);
    expect(dpp).not.toBeNull();
    if (!dpp) throw new Error("esperava DPP");

    expect(dpp.pieceWeightGrams).toBeGreaterThan(50);
    expect(dpp.carbonKgCo2e).toBeGreaterThan(0);
    expect(dpp.waterLiters).toBeGreaterThan(0);
    expect(dpp.circularityScore).toBeGreaterThanOrEqual(35);
    expect(dpp.qrSvgDataUrl).toContain("data:image/svg+xml");

    const html = buildDppPrintableHtml({ ...dpp, ncm: "6109.10.00" });
    expect(html).toContain("Passaporte Digital do Produto");
    expect(html).toContain("DEV000006");
  });

  it("calcula caixas master, peso bruto/cubagem, CFOP estadual/interestadual e XML SEFAZ NFe 4.00", () => {
    const summarySp = computePackingAndNfePreview(
      [
        {
          refCode: "DEV000006",
          qtyPieces: 72,
          doc: salvosComNcm.DEV000006,
          provenance: "salva",
        },
      ],
      "Luxury Boutique SP",
      "12.345.678/0001-90",
      "SP",
    );
    expect(summarySp.cfop).toBe("6101"); // PR -> SP interestadual
    expect(summarySp.totalMasterBoxes).toBe(3); // 72 / 24
    expect(summarySp.grossWeightKg).toBeGreaterThan(summarySp.netWeightKg);
    expect(summarySp.ignoradas).toHaveLength(0);

    const summaryPr = computePackingAndNfePreview(
      [
        {
          refCode: "V24-001",
          qtyPieces: 24,
          doc: salvosComNcm["V24-001"],
          provenance: "salva",
        },
      ],
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

// ─────────────────────────────────────────────────────────────────────────────
// Onda 27: procedência é pré-requisito de documento
// ─────────────────────────────────────────────────────────────────────────────
describe("ficha não salva não vira documento", () => {
  it("resolveReferenceTechSheet marca 'salva' com ficha no mapa e 'referencia' sem ela", () => {
    const salva = resolveReferenceTechSheet("DEV000006", salvos);
    expect(salva.provenance).toBe("salva");
    expect(salva.emitivel).toBe(true);

    const solta = resolveReferenceTechSheet("I25-088", salvos);
    expect(solta.provenance).toBe("referencia");
    expect(solta.emitivel).toBe(false);
    // Onda 32: ausência é `null`, não uma ficha fabricada "para a vitrine".
    expect(solta.doc).toBeNull();
  });

  it("template (cópia intacta do modelo) também não é emitível", () => {
    const ref = resolveReferenceTechSheet("DEV000006", salvos, { DEV000006: true });
    expect(ref.provenance).toBe("template");
    expect(ref.emitivel).toBe(false);
    expect(computeDigitalProductPassport(ref)).toBeNull();
  });

  it("DPP de referência é null, não um passaporte com números inventados", () => {
    const ref = resolveReferenceTechSheet("I25-088", {});
    expect(computeDigitalProductPassport(ref)).toBeNull();
  });

  it("expedição ignora a referência sem ficha e diz o motivo", () => {
    const summary = computePackingAndNfePreview(
      [{ refCode: "I25-088", qtyPieces: 10, doc: null, provenance: "referencia" }],
      "Cliente",
      "00.000.000/0001-00",
      "SP",
    );
    expect(summary.lines).toHaveLength(0);
    expect(summary.ignoradas).toEqual([{ refCode: "I25-088", motivo: "sem-ficha" }]);
    expect(summary.totalPieces).toBe(0);
    expect(summary.productsTotalBrl).toBe(0);
  });

  it("ficha salva sem NCM também é barrada, em vez de virar 6109.90.00", () => {
    const semNcm = { ...seedFor("DEV000006") };
    semNcm.etiquetagem = { ...semNcm.etiquetagem!, ncm: "" };
    const summary = computePackingAndNfePreview(
      [{ refCode: "DEV000006", qtyPieces: 5, doc: semNcm, provenance: "salva" }],
      "Cliente",
      "00.000.000/0001-00",
      "SP",
    );
    expect(summary.ignoradas).toEqual([{ refCode: "DEV000006", motivo: "sem-ncm" }]);
  });

  it("geradores recusam emitir com linha pendente", () => {
    const summary = computePackingAndNfePreview(
      [{ refCode: "I25-088", qtyPieces: 10, doc: null, provenance: "referencia" }],
      "Cliente",
      "00.000.000/0001-00",
      "SP",
    );
    expect(() => buildPreNfeXml400(summary)).toThrow(DocumentoNaoEmitivelError);
    expect(() => buildPackingListPrintableHtml(summary)).toThrow(DocumentoNaoEmitivelError);
  });

  it("DPP impresso sem NCM é recusado", () => {
    const ref = resolveReferenceTechSheet("DEV000006", {
      DEV000006: fichaCompleta("DEV000006", "6109.10.00"),
    });
    const dpp = computeDigitalProductPassport(ref);
    if (!dpp) throw new Error("esperava DPP");
    const semNcm = { ...dpp, ncm: "" };
    expect(() => buildDppPrintableHtml(semNcm)).toThrow(DocumentoNaoEmitivelError);
  });

  it("a mensagem do erro nomeia a referência e o motivo", () => {
    const summary = computePackingAndNfePreview(
      [{ refCode: "I25-088", qtyPieces: 10, doc: null, provenance: "referencia" }],
      "Cliente",
      "00.000.000/0001-00",
      "SP",
    );
    try {
      buildPreNfeXml400(summary);
    } catch (err) {
      expect((err as Error).message).toContain("I25-088:sem-ficha");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Onda 32: o resolvedor não fabrica documento
// ─────────────────────────────────────────────────────────────────────────────
describe("Onda 32 — referência sem ficha é null, não ficha inventada", () => {
  it("as três refs que eram montadas à mão agora não devolvem documento", () => {
    for (const ref of ["V24-001", "U25-014", "I25-088", "QUALQUER-999"]) {
      const r = resolveReferenceTechSheet(ref, {});
      expect(r.doc).toBeNull();
      expect(r.provenance).toBe("referencia");
      expect(r.emitivel).toBe(false);
      expect(computeDigitalProductPassport(r)).toBeNull();
    }
  });

  it("ficha salva devolve o próprio documento, sem cópia nem enchimento", () => {
    const doc = salvos["V24-001"]!;
    const r = resolveReferenceTechSheet("V24-001", salvos);
    expect(r.doc).toBe(doc);
    expect(r.emitivel).toBe(true);
  });

  it("emitivel=true com doc=null não produz passaporte (defesa em profundidade)", () => {
    const montado = {
      refCode: "FALSO-1",
      doc: null,
      provenance: "salva" as const,
      emitivel: true,
    };
    expect(computeDigitalProductPassport(montado)).toBeNull();
  });

  it("expedição barra doc=null antes de ler NCM, sem lançar", () => {
    const summary = computePackingAndNfePreview(
      [{ refCode: "FALSO-1", qtyPieces: 8, doc: null, provenance: "salva" }],
      "Cliente",
      "00.000.000/0001-00",
      "SP",
    );
    expect(summary.lines).toEqual([]);
    expect(summary.ignoradas).toEqual([{ refCode: "FALSO-1", motivo: "sem-ficha" }]);
    expect(summary.productsTotalBrl).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Onda 33: o veto de NCM/origem entra no próprio DPP, não só no PDF
// ─────────────────────────────────────────────────────────────────────────────
describe("Onda 33 — nota ESG só com engenharia declarada", () => {
  const req = (doc: TechSheetData | null) =>
    dppRequirements({
      refCode: "X-1",
      doc,
      provenance: doc ? "salva" : "referencia",
      emitivel: doc !== null,
    });

  it("ficha que é cópia do modelo não produz DPP: NCM e origem faltam", () => {
    const copia = seedFor("DEV000006");
    const r = req(copia);
    expect(r.ok).toBe(false);
    expect(r.pendencias).toContain("sem-ncm");
    expect(r.pendencias).toContain("sem-origem");
    expect(
      computeDigitalProductPassport({
        refCode: "DEV000006",
        doc: copia,
        provenance: "salva",
        emitivel: true,
      }),
    ).toBeNull();
  });

  it("só o nome editado não basta — continua sem classificação fiscal", () => {
    const copia = seedFor("DEV000006");
    copia.meta = { ...copia.meta!, name: "Produto da empresa" };
    expect(req(copia).pendencias).toContain("sem-ncm");
  });

  it("NCM de 7 dígitos é veto, não arredondamento", () => {
    expect(req(fichaCompleta("X-1", "6109100")).pendencias).toContain("sem-ncm");
    expect(req(fichaCompleta("X-1", "6109.10.00")).ok).toBe(true);
  });

  it("falta de composição ou encaixe também barra, sem usar defaults", () => {
    const semComposicao = fichaCompleta("X-1", "6109.10.00");
    semComposicao.etiquetagem = { ...semComposicao.etiquetagem!, composicao: [] };
    expect(req(semComposicao).pendencias).toContain("sem-composicao");

    const semEncaixe = fichaCompleta("X-1", "6109.10.00");
    semEncaixe.encaixeCad = undefined;
    expect(req(semEncaixe).pendencias).toContain("sem-encaixe");
  });

  it("DPP completo declara a origem real, não 'Feito no Brasil' inventado", () => {
    const doc = fichaCompleta("X-1", "6109.10.00");
    doc.etiquetagem = { ...doc.etiquetagem!, paisOrigem: "Portugal" };
    const dpp = computeDigitalProductPassport({
      refCode: "X-1",
      doc,
      provenance: "salva",
      emitivel: true,
    });
    expect(dpp?.origin).toBe("Portugal");
    expect(dpp?.compositionText).not.toContain("não informada");
  });

  it("sem ficha a pendência é objetiva", () => {
    expect(req(null)).toEqual({ ok: false, pendencias: ["sem-ficha"] });
  });
});
