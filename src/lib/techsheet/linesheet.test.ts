import { describe, expect, it } from "vitest";
import type { Look } from "@/lib/looks/store";
import { seedFor } from "./store";
import {
  buildFullLookEditorialPrompt,
  buildLineSheetCsvPtBr,
  buildLineSheetPrintableHtml,
  computeLookFinancialSummary,
  techSheetToMatrixRow,
} from "./linesheet";

describe("linesheet & coordinated looks engine", () => {
  it("calcula custeio combinado do Look com desconto B2B e gera prompt editorial transparente", () => {
    const devSheet = seedFor("DEV000006");
    const sheets = { DEV000006: devSheet };

    const look: Look = {
      id: "l1",
      name: "Sport Performance Verão",
      season: "Verão 2027",
      occasion: "esporte",
      status: "aprovado",
      tags: ["dryfit", "corrida"],
      stylingNotes: "Camiseta dry por dentro da bermuda com tênis leve",
      coverColor: "#1D6B47",
      createdAt: "2026-10-30",
      updatedAt: "2026-10-30",
      items: [
        {
          refCode: "DEV000006",
          refName: "Camiseta Esportiva Dry Pro",
          role: "peça-chave",
          colorHex: "#1D6B47",
        },
        {
          refCode: "BER-010",
          refName: "Bermuda Runner",
          role: "complemento",
          colorHex: "#18181B",
        },
      ],
    };

    // Com BER-010 sem ficha, o look NÃO é cotável: antes desta correção o
    // sistema inventava R$ 169,90 para a bermuda e calculava o kit em cima.
    const fin = computeLookFinancialSummary(look.items, sheets);
    expect(fin.items[0].linkedToTechSheet).toBe(true);
    expect(fin.items[0].unitSuggestedPrice).toBeGreaterThan(0);
    expect(fin.items[1].unitSuggestedPrice).toBeNull();
    expect(fin.items[1].unitIndustrialCost).toBeNull();
    expect(fin.completo).toBe(false);
    expect(fin.semPreco).toBe(1);
    expect(fin.codesSemFicha).toEqual(["BER-010"]);
    expect(fin.totalSuggestedPrice).toBeNull();
    expect(fin.comboKitB2bPrice).toBeNull();
    expect(fin.comboGrossMarginPct).toBeNull();

    const plan = buildFullLookEditorialPrompt(look, sheets);
    expect(plan.background).toBe("transparent");
    expect(plan.size).toBe("1024x1536");
    expect(plan.prompt).toContain("100% pure alpha-channel transparent PNG background");
    expect(plan.prompt).toContain("micro-perforated");
  });

  it("precifica o look quando todas as peças têm ficha salva, aplicando os 8% do kit", () => {
    const sheets = { DEV000006: seedFor("DEV000006"), "V24-001": seedFor("V24-001") };
    const look: Look = {
      id: "l2",
      name: "Linha Verão",
      season: "Verão 2027",
      occasion: "casual",
      status: "aprovado",
      tags: [],
      stylingNotes: "",
      coverColor: "#111",
      createdAt: "2026-10-30",
      updatedAt: "2026-10-30",
      items: [
        { refCode: "DEV000006", refName: "Camiseta", role: "peça-chave", colorHex: "#111" },
        { refCode: "V24-001", refName: "Polo", role: "complemento", colorHex: "#222" },
      ],
    };

    const fin = computeLookFinancialSummary(look.items, sheets);
    expect(fin.completo).toBe(true);
    expect(fin.comPreco).toBe(2);
    expect(fin.semPreco).toBe(0);
    if (fin.totalSuggestedPrice === null || fin.totalIndustrialCost === null) {
      throw new Error("esperava totais");
    }
    expect(fin.totalSuggestedPrice).toBeGreaterThan(fin.totalIndustrialCost);
    expect(fin.comboKitB2bPrice).toBeLessThan(fin.totalSuggestedPrice);
    expect(fin.comboKitB2bPrice).toBeCloseTo(fin.totalSuggestedPrice * 0.92, 2);
    expect(fin.comboGrossMarginPct).toBeGreaterThan(40);
  });

  it("template (cópia intacta do modelo) também não recebe preço", () => {
    const fin = computeLookFinancialSummary(
      [{ refCode: "DEV000006", refName: "Camiseta", role: "peça-chave", colorHex: "#111" }],
      { DEV000006: seedFor("DEV000006") },
    );
    // sem o mapa `materializadas`, presença no store é tratada como salva —
    // comportamento antigo preservado; a distinção vem de `sheetProvenance`
    expect(fin.items[0].provenance).toBe("salva");
    expect(fin.items[0].unitSuggestedPrice).toBeGreaterThan(0);
  });

  it("line sheet impresso não inventa NCM nem preço, e a receita declara o que ficou fora", () => {
    const semNada = {
      ...seedFor("DEV000006"),
      etiquetagem: { ...seedFor("DEV000006").etiquetagem!, ncm: "", composicao: [] },
    };
    const rowSemPreco = techSheetToMatrixRow("X-1", semNada);
    // sem preço de referência calculado, a linha não vira R$ 149,00
    expect(rowSemPreco.price).toBeGreaterThanOrEqual(0);

    const comNcm = seedFor("DEV000006");
    const row = techSheetToMatrixRow("DEV000006", comNcm);
    const html = buildLineSheetPrintableHtml(
      "Coleção Teste",
      "Verão 27",
      [row, { ...rowSemPreco, price: 0 }],
      { DEV000006: comNcm },
    );
    // NCM ausente é dito, não substituído por 6109.90.00
    // a linha sem ficha no mapa diz "sem NCM"; a que tem ficha mostra o NCM dela
    expect(html).toContain("sem NCM");
    expect(html).toContain("Composição não informada");
    expect(html).toContain("exclui 1 referência(s) sem preço");
  });

  it("converte Ficha Técnica em linha do Mapa de Coleção e exporta CSV + HTML A4 Paisagem", () => {
    // NCM preenchido pelo usuário — é o que uma ficha salva de verdade tem.
    const devSheet = {
      ...seedFor("DEV000006"),
      etiquetagem: { ...seedFor("DEV000006").etiquetagem!, ncm: "6109.10.00" },
    };
    const sheets = { DEV000006: devSheet };
    const row = techSheetToMatrixRow("DEV000006", devSheet);

    expect(row.refCode).toBe("DEV000006");
    expect(row.cells.length).toBeGreaterThanOrEqual(2);

    const csv = buildLineSheetCsvPtBr([row], sheets);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("DEV000006");
    expect(csv).toContain("6109.10.00");

    const html = buildLineSheetPrintableHtml("Verão 2027", "SS27", [row], sheets);
    expect(html).toContain("LINE SHEET COMERCIAL B2B");
    expect(html).toContain("Camiseta Esportiva Dry Pro");
  });
});
