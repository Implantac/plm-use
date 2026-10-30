import { describe, expect, it } from "vitest";
import {
  buildConceptPrompt,
  buildVariationIdeas,
  normalizeProductProposal,
} from "./product-studio.utils";
import {
  buildPhotorealisticGarmentPrompt,
  buildStudioPayloadFromTechSheet,
  describeTextileMicroPhysics,
  inferPresetFromView,
} from "@/lib/ai/photorealism";
import { nativeVisualSvg } from "@/lib/ai/native-visual";
import { seedFor } from "@/lib/techsheet/store";

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

  it("traduz tecidos brasileiros em microfísica têxtil real (trama, gramatura e composição)", () => {
    const dryFit = describeTextileMicroPhysics(
      "Malha Dry Fit UV50+ Microperfurada",
      145,
      "96% Poliéster / 4% Elastano",
    );
    expect(dryFit).toContain("micro-perforated");
    expect(dryFit).toContain("145 gsm");
    expect(dryFit).toContain("96% Poliéster");

    const linho = describeTextileMicroPhysics("Linho Puro Off-White", 185);
    expect(linho).toContain("slubbed");
    expect(linho).toContain("185 gsm");
  });

  it("constrói plano fotográfico médio-formato sem contradição de fundo transparente em modelo real", () => {
    expect(inferPresetFromView("modelo")).toBe("editorial_model");
    expect(inferPresetFromView("campanha")).toBe("campaign_lifestyle");
    expect(inferPresetFromView("detalhe")).toBe("macro_textile");

    // Mesmo se transparentCutout=true vier marcado, foto em modelo humano NUNCA usa fundo transparente
    const editorial = buildPhotorealisticGarmentPrompt({
      productName: "Camisa Linho Amalfi",
      materials: ["Linho Puro 180 g/m²"],
      view: "modelo",
      transparentCutout: true,
      primaryHex: "#C86B4A",
    });
    expect(editorial.preset.id).toBe("editorial_model");
    expect(editorial.background).toBe("opaque");
    expect(editorial.size).toBe("1024x1536");
    expect(editorial.prompt).toContain("Hasselblad X2D 100C");
    expect(editorial.prompt).toContain("#C86B4A");
    expect(editorial.prompt).toContain("NO plastic or waxy sheen");

    // Ghost mannequin permite recorte PNG transparente quando solicitado explicitamente
    const ghostCutout = buildPhotorealisticGarmentPrompt({
      productName: "Camiseta Dry Pro",
      preset: "ghost_mannequin",
      transparentCutout: true,
    });
    expect(ghostCutout.background).toBe("transparent");
    expect(ghostCutout.size).toBe("1024x1536");
  });

  it("hidrata o AI Product Studio diretamente a partir da Ficha Técnica e gera SVG volumétrico 3D", () => {
    const doc = seedFor("DEV000006");
    const payload = buildStudioPayloadFromTechSheet("DEV000006", doc);
    expect(payload.gramaturaGm2).toBe(135);
    expect(payload.composicao).toContain("Poliéster");
    expect(payload.primaryHex).toBe("#1D6B47");
    expect(payload.proposal.details.join(" ")).toContain("Gola V Ribana");

    const svgOpaque = nativeVisualSvg({
      family: "Camisetas",
      name: payload.proposal.name,
      color: payload.primaryHex,
      view: "frente",
    });
    expect(svgOpaque).toContain("studioCyclorama");
    expect(svgOpaque).toContain("torsoVolume");
  });
});
