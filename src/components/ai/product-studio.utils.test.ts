import { describe, expect, it } from "vitest";
import {
  buildConceptPrompt,
  buildVariationIdeas,
  normalizeProductProposal,
} from "./product-studio.utils";

describe("product-studio utils", () => {
  it("constrói um prompt completo a partir do briefing", () => {
    const prompt = buildConceptPrompt({
      description: "Camisa premium de linho",
      audience: "Mulheres 25-40",
      occasion: "dia a dia elegante",
      category: "camisa",
      collection: "Verão 2027",
      season: "verão",
      line: "premium",
      targetPrice: "299",
      fabric: "linho",
      colors: "off-white, azul-marinho",
      gender: "feminino",
      ageRange: "25-40",
      mood: "minimalista",
      inspiration: "arquitetura e praia",
    });

    expect(prompt).toContain("Camisa premium de linho");
    expect(prompt).toContain("feminino");
    expect(prompt).toContain("minimalista");
    expect(prompt).toContain("linho");
  });

  it("gera variações visuais consistentes com a identidade do produto", () => {
    const base = normalizeProductProposal({
      name: "Camisa de linho",
      description: "Camisa feminina premium de linho",
      category: "Camisa",
      family: "Essencial",
      line: "Premium",
      silhouette: "Relaxada",
      details: ["Gola masculina", "Bolsos discretos"],
      suggestedMaterials: ["Linho"],
      colors: ["Off-white", "Azul-marinho"],
      variations: ["Off-white", "Azul"],
      validationNotes: ["Validar caimento"],
      imageIdeas: ["frente", "costas"],
      visualIdentity: ["minimalista", "premium"],
    });

    const variationIdeas = buildVariationIdeas(base, {
      description: "Camisa premium de linho",
      colors: "off-white, azul",
      season: "verão",
      fabric: "linho",
      mood: "minimalista",
    });

    expect(variationIdeas.length).toBeGreaterThan(0);
    expect(variationIdeas.join(" ")).toContain("linho");
    expect(variationIdeas.join(" ")).toContain("minimalista");
  });
});
