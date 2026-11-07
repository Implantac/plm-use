import { describe, expect, it } from "vitest";
import { seedFor } from "./store";
import { parceirosSalvos } from "@/test/parceiros-salvos";
import {
  INITIAL_SERVICE_ORDERS,
  buildBlindServiceOrderHtml,
  buildRemessaNfeXml400,
  computePartnerMetrics,
  computeServiceOrderMetrics,
} from "./outsourcing-os";

describe("Terceirização Industrial · Facções, Lavanderia & Remessa CFOP 5901/5902/5124", () => {
  it("calcula saldo em poder de terceiros, CFOP estadual (5901/5902/5124) e interestadual (6901/6902/6124)", () => {
    const doc = seedFor("DEV000006");
    const partnerPr = parceirosSalvos()[0]!; // PR
    const partnerSc = parceirosSalvos()[2]!; // SC

    const mPr = computeServiceOrderMetrics(INITIAL_SERVICE_ORDERS[0]!, partnerPr, doc, "PR");
    expect(mPr.cfopRemessa).toBe("5901");
    expect(mPr.cfopRetorno).toBe("5902");
    expect(mPr.cfopCobranca).toBe("5124");
    expect(mPr.balanceInThirdParty).toBe(176); // 600 - 420 - 4 - 0

    const mSc = computeServiceOrderMetrics(INITIAL_SERVICE_ORDERS[2]!, partnerSc, doc, "PR");
    expect(mSc.cfopRemessa).toBe("6901");
    expect(mSc.cfopRetorno).toBe("6902");
    expect(mSc.cfopCobranca).toBe("6124");
  });

  it("apura glosa financeira quando quebra + 2ª qualidade excedem a franquia técnica contratual", () => {
    const doc = seedFor("U25-014");
    const partnerLav = parceirosSalvos()[1]!;
    // 400 enviadas, franquia 1% = 4 pçs; retorno 2ª=5 + perda=3 -> total avaria 8 -> excesso 4 pçs
    const m = computeServiceOrderMetrics(INITIAL_SERVICE_ORDERS[1]!, partnerLav, doc, "PR");
    expect(m.excessLossPieces).toBe(4);
    expect(m.penaltyGlosaBrl).toBeGreaterThan(0);
    expect(m.netPayableBrl).toBeLessThan(m.grossLaborPayableBrl);
    expect(m.status).toBe("Alerta Quebra");
  });

  it("gera XML NFe 4.00 de Remessa com CST 50 (suspensão ICMS) e Guia OS Cega sem preço comercial", () => {
    // Remessa ao terceiro leva NCM: ficha sem classificação não emite (Onda 28).
    const doc = {
      ...seedFor("DEV000006"),
      etiquetagem: { ...seedFor("DEV000006").etiquetagem!, ncm: "6109.10.00" },
    };
    const partner = parceirosSalvos()[0]!;
    const os = INITIAL_SERVICE_ORDERS[0]!;

    const xml = buildRemessaNfeXml400(os, partner, doc);
    expect(xml).toContain('<infNFe versao="4.00"');
    expect(xml).toContain("<CFOP>5901</CFOP>");
    expect(xml).toContain("<CST>50</CST>");

    const blindHtml = buildBlindServiceOrderHtml(os, partner, doc);
    expect(blindHtml).toContain("FICHA TÉCNICA CEGA");
    expect(blindHtml).toContain("OS-2026-041");
    expect(blindHtml).not.toContain("Markup");

    // Capacidade só conta OS com ficha salva (Onda 27): sem mapa, nada entra.
    const semFicha = computePartnerMetrics(partner, INITIAL_SERVICE_ORDERS, {});
    expect(semFicha.piecesInPossession).toBe(0);

    const comFicha = computePartnerMetrics(partner, INITIAL_SERVICE_ORDERS, {
      DEV000006: seedFor("DEV000006"),
      "V24-001": seedFor("V24-001"),
      "U25-014": seedFor("U25-014"),
    });
    expect(comFicha.overallScore).toBeGreaterThanOrEqual(90);
    expect(comFicha.tier).toBe("A+");
    expect(comFicha.piecesInPossession).toBe(176);
  });
});
