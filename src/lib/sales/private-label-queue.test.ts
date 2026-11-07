import { describe, expect, it } from "vitest";
import { pedidosSalvos } from "@/test/pedidos-salvos";
import {
  buildBlindOrderProductionSheetHtml,
  clonePrivateLabelOrder,
  consolidateNominalRosterToGrade,
  evaluateOrderCosting,
  parseNominalRosterPaste,
} from "./private-label-queue";

describe("Fila de Custos Private Label, Lista Nominal & Ficha Cega A4", () => {
  it("converte colagem TSV de Lista Nominal e consolida automaticamente a grade PP..3G", () => {
    const raw = [
      "Nome\tNúmero\tTamanho",
      "ANA PAULA\t09\tP",
      "CARLOS EDUARDO\t10\tM",
      "MARCOS VINICIUS\t05\tM",
      "ROBERTO DIAS\t99\tXG",
    ].join("\n");

    const parsed = parseNominalRosterPaste(raw);
    expect(parsed).toHaveLength(4);
    expect(parsed[3]?.size).toBe("3G"); // XG normalizado para 3G

    const { grade, totalPieces } = consolidateNominalRosterToGrade(parsed);
    expect(totalPieces).toBe(4);
    expect(grade.P).toBe(1);
    expect(grade.M).toBe(2);
    expect(grade["3G"]).toBe(1);
  });

  it("clona pedido B2B preservando grade/operações/lista nominal e gera Ficha Cega sem vazar R$", () => {
    const src = pedidosSalvos()[0]!;
    const evalSmall = evaluateOrderCosting(src);
    expect(evalSmall.totalPieces).toBe(8);
    expect(evalSmall.setupPerPieceBrl).toBeGreaterThan(20); // setup alto diluído em lote pequeno (8 pçs)
    expect(evalSmall.marginHealthy).toBe(false); // alerta de margem abaixo da meta!

    const cloned = clonePrivateLabelOrder(src, 3);
    expect(cloned.orderNumber).toBe("PD-2026-803");
    expect(cloned.status).toBe("Aguardando Custo");
    expect(cloned.nominalRoster).toHaveLength(8);

    const blindHtml = buildBlindOrderProductionSheetHtml(src);
    expect(blindHtml).toContain("FICHA DE PRODUÇÃO DO PEDIDO · CEGA DE CUSTO E PREÇO");
    expect(blindHtml).toContain("LUCAS FERREIRA");
    expect(blindHtml).not.toContain("R$");
    expect(blindHtml).not.toContain("69.9");
  });
});
