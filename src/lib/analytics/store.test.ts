import { describe, expect, it } from "vitest";
import { analyticsKpisSeed, filterAnalyticsKpis, validateKpiDraft } from "./store";

describe("filterAnalyticsKpis", () => {
  it("q vazio devolve a mesma lista (sem cópia)", () => {
    expect(filterAnalyticsKpis(analyticsKpisSeed, "  ")).toBe(analyticsKpisSeed);
  });
  it("busca em label E sub, case-insensitive", () => {
    expect(filterAnalyticsKpis(analyticsKpisSeed, "YOY").map((k) => k.id)).toEqual([2]);
    expect(filterAnalyticsKpis(analyticsKpisSeed, "mercado").map((k) => k.id)).toEqual([2]);
  });
  it("zero resultado é zero resultado (empty state da tela decide)", () => {
    expect(filterAnalyticsKpis(analyticsKpisSeed, "inexistente")).toEqual([]);
  });
});

describe("validateKpiDraft", () => {
  it("rascunho saudável passa", () => {
    expect(validateKpiDraft({ label: "Meta 27", value: "2.4M" })).toBeNull();
  });
  it("label curto é rejeitado (era o buraco do card vazio)", () => {
    expect(validateKpiDraft({ label: " m ", value: "1" })).toMatch(/nome/);
  });
  it("value vazio é rejeitado com instrução explícita de “—”", () => {
    expect(validateKpiDraft({ label: "ok", value: "   " })).toMatch(/valor/);
  });
});
