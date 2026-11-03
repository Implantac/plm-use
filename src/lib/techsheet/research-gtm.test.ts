import { describe, expect, it } from "vitest";
import { useTechSheetStore } from "./store";
import {
  INITIAL_BRIEFINGS,
  INITIAL_GTM_CAMPAIGNS,
  buildDropMediaKitHtml,
  computeGtmPortfolioSummary,
  convertBriefingToTechSheetStore,
} from "./research-gtm";

describe("Pesquisa Criativa -> Engenharia (Briefing 1-Clique) & Hub GTM Drops", () => {
  it("converte um Briefing Criativo em uma Ficha Técnica real no store com tecido, gramatura e composição ABNT", () => {
    const briefing = INITIAL_BRIEFINGS[0]!;
    const refCode = convertBriefingToTechSheetStore(briefing, 1);
    expect(refCode).toBe("CR27-101");

    const created = useTechSheetStore.getState().data[refCode];
    expect(created).toBeDefined();
    expect(created?.meta?.name).toBe("Polo Resort Tricot Linho Cru");
    expect(created?.bom[0]?.gramaturaGm2).toBe(195);
    expect(created?.etiquetagem?.composicao[0]?.fibra).toBe("Linho");
    expect(created?.colorways?.[0]?.hex).toBe("#D6C7B2");
  });

  it("calcula ROAS consolidado (mídia vs. investimento total c/ produção) e gera Media Kit A4 com ESG DPP", () => {
    const summary = computeGtmPortfolioSummary(INITIAL_GTM_CAMPAIGNS);
    expect(summary.totalCampaigns).toBe(3);
    expect(summary.blendedRoas).toBeGreaterThan(4);
    expect(summary.netFullRoas).toBeLessThan(summary.blendedRoas);

    const html = buildDropMediaKitHtml(INITIAL_GTM_CAMPAIGNS[0]!, {});
    expect(html).toContain("Release GTM & Media Kit");
    expect(html).toContain("DEV000006");
    expect(html).toContain("CO₂e");
  });
});
