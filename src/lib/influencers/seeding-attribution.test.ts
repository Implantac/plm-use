import { describe, expect, it } from "vitest";
import { useInfluencersStore } from "./store";
import { buildSeedingBonusDispatchHtml, evaluateCreatorAttribution } from "./seeding-attribution";

describe("Seeding Attribution (Cupom/UTM), ROAS Creator & Guia CFOP 5910/6910", () => {
  it("calcula ROAS líquido (fee + CMV industrial), cupom, CAC e CFOP interestadual 6910", () => {
    const list = useInfluencersStore.getState().influencers;
    const rows = evaluateCreatorAttribution(list, 199.9, 42.5, "SC");
    expect(rows.length).toBeGreaterThan(0);

    const marina = rows[0]!;
    expect(marina.couponCode).toBe("USEMARINACO10");
    expect(marina.cfopRemessa).toBe("6910"); // SP != SC
    expect(marina.roas).toBeGreaterThan(1.5);

    const html = buildSeedingBonusDispatchHtml(marina);
    expect(html).toContain("CFOP 6910");
    expect(html).toContain("USEMARINACO10");
  });
});
