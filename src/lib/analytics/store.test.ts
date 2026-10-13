import { describe, expect, it } from "vitest";
import { analyticsKpisSeed, filterAnalyticsKpis } from "./store";

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
