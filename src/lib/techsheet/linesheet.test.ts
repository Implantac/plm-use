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

    const fin = computeLookFinancialSummary(look.items, sheets);
    expect(fin.items[0].linkedToTechSheet).toBe(true);
    expect(fin.totalSuggestedPrice).toBeGreaterThan(fin.totalIndustrialCost);
    expect(fin.comboKitB2bPrice).toBeLessThan(fin.totalSuggestedPrice);
    expect(fin.comboGrossMarginPct).toBeGreaterThan(40);

    const plan = buildFullLookEditorialPrompt(look, sheets);
    expect(plan.background).toBe("transparent");
    expect(plan.size).toBe("1024x1536");
    expect(plan.prompt).toContain("100% pure alpha-channel transparent PNG background");
    expect(plan.prompt).toContain("micro-perforated");
  });

  it("converte Ficha Técnica em linha do Mapa de Coleção e exporta CSV + HTML A4 Paisagem", () => {
    const devSheet = seedFor("DEV000006");
    const sheets = { DEV000006: devSheet };
    const row = techSheetToMatrixRow("DEV000006", devSheet);

    expect(row.refCode).toBe("DEV000006");
    expect(row.cells.length).toBeGreaterThanOrEqual(2);

    const csv = buildLineSheetCsvPtBr([row], sheets);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("DEV000006");
    expect(csv).toContain("6109.90.00");

    const html = buildLineSheetPrintableHtml("Verão 2027", "SS27", [row], sheets);
    expect(html).toContain("LINE SHEET COMERCIAL B2B");
    expect(html).toContain("Camiseta Esportiva Dry Pro");
  });
});
