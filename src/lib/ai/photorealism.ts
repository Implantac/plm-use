// Motor de Direção de Fotografia Comercial & Microfísica Têxtil para Geração de Imagens Ultra-Realistas
// Converte especificações de produto/Ficha Técnica (fibras, gramatura g/m², ligamento, aviamentos,
// costuras e códigos Pantone/Hex) em prompts ópticos calibrados de médio-formato (Hasselblad / Phase One),
// eliminando aspecto plástico de IA e contradições de iluminação/fundo transparente.

import type { ProductBriefingInput, ProductProposal } from "@/components/ai/product-studio.utils";
import type { TechSheetData } from "@/lib/techsheet/store";

export type PhotoStudioPresetId =
  "ghost_mannequin" | "editorial_model" | "campaign_lifestyle" | "macro_textile" | "flat_lay";

export type LightingPresetId =
  "softbox_neutro" | "luz_natural_janela" | "editorial_dramatico" | "luz_rasante_textura";

export type ImageSizeOption = "1024x1024" | "1024x1536" | "1536x1024";
export type ImageBackgroundOption = "opaque" | "transparent" | "auto";

export interface PhotoPresetConfig {
  id: PhotoStudioPresetId;
  label: string;
  shortDesc: string;
  defaultSize: ImageSizeOption;
  defaultBackground: ImageBackgroundOption;
  cameraSpec: string;
  compositionSpec: string;
}

export const PHOTO_STUDIO_PRESETS: Record<PhotoStudioPresetId, PhotoPresetConfig> = {
  ghost_mannequin: {
    id: "ghost_mannequin",
    label: "Ghost Mannequin 3D (E-commerce)",
    shortDesc:
      "Peça vestida em manequim invisível 3D, caimento real por gravidade e foco 100% têxtil",
    defaultSize: "1024x1536",
    defaultBackground: "opaque",
    cameraSpec:
      "Shot on Phase One XF IQ4 150MP medium-format digital back, Schneider Kreuznach 90mm LS f/8 lens, ISO 50, razor-sharp edge-to-edge focus across every seam and yarn",
    compositionSpec:
      "3D invisible ghost-mannequin hollow-neck commercial packshot, authentic three-dimensional volume filled as if worn by a real torso, natural gravity hem hang, visible interior back-neck facing depth, centered full-garment framing",
  },
  editorial_model: {
    id: "editorial_model",
    label: "Modelo Real · Lookbook 85mm",
    shortDesc:
      "Modelo humano realista, pele com textura natural, estúdio editorial tipo Zara/Vogue",
    defaultSize: "1024x1536",
    defaultBackground: "opaque",
    cameraSpec:
      "Shot on Hasselblad X2D 100C medium-format camera, XCD 85mm f/2.8 portrait prime lens at f/4, ISO 64, natural filmic tonal roll-off and true skin/fabric color science",
    compositionSpec:
      "High-end commercial fashion lookbook photograph worn by a charismatic real adult model with natural posture, authentic skin micro-texture (visible pores, natural complexion, zero airbrushing), organic tension folds at elbows, shoulders and waist, clean warm architectural cyclorama studio backdrop with soft floor shadow",
  },
  campaign_lifestyle: {
    id: "campaign_lifestyle",
    label: "Campanha Lifestyle (Luz Natural)",
    shortDesc: "Cena externa/arquitetônica em golden hour, lente 50mm f/2 com bokeh orgânico",
    defaultSize: "1536x1024",
    defaultBackground: "opaque",
    cameraSpec:
      "Shot on Leica SL3 full-frame camera, APO-Summicron-SL 50mm f/2 ASPH lens at f/2.8, natural optical depth-of-field bokeh, subtle Kodak Portra 160 color rendition",
    compositionSpec:
      "Luxury fashion campaign editorial on location in contemporary Brazilian minimalist architecture, real human model in relaxed candid movement, natural wind and motion interaction on garment hem, authentic environmental bounce light",
  },
  macro_textile: {
    id: "macro_textile",
    label: "Macro Textura & Costura (100mm)",
    shortDesc: "Close-up extremo da trama do fio, pespontos, ribana e acabamento industrial",
    defaultSize: "1024x1024",
    defaultBackground: "opaque",
    cameraSpec:
      "Shot on Canon EOS R5 with RF 100mm f/2.8L Macro IS USM lens at f/8, focus-stacked studio macro photography, extreme micro-contrast",
    compositionSpec:
      "Detailed close-up macro study of the garment's collar, shoulder seam, hem stitching and primary fabric surface, showcasing individual yarn twist, needle perforations, thread tension and trim craftsmanship",
  },
  flat_lay: {
    id: "flat_lay",
    label: "Flat Lay Zenital (Mesa Estúdio)",
    shortDesc: "Fotografia aérea sobre bancada de pedra/linho com dobras orgânicas reais",
    defaultSize: "1024x1024",
    defaultBackground: "opaque",
    cameraSpec:
      "Overhead tether shot on Phase One IQ4 150MP, 55mm lens at f/9, zero barrel distortion, crisp fabric topography",
    compositionSpec:
      "Styled commercial overhead flat-lay garment photography resting naturally on a matte warm limestone studio table, subtle hand-styled organic fabric folds and contact shadows, one single garment only",
  },
};

export const LIGHTING_PRESETS: Record<
  LightingPresetId,
  { id: LightingPresetId; label: string; promptSpec: string }
> = {
  softbox_neutro: {
    id: "softbox_neutro",
    label: "Softbox D55 Calibrado (Fiel à Cor)",
    promptSpec:
      "Calibrated 5500K D55 daylight-balanced Profoto Pro-11 octabox key light at 45°, large white book-light bounce fill, subtle overhead hair/shoulder separation rim, X-Rite ColorChecker accurate color reproduction with zero color cast",
  },
  luz_natural_janela: {
    id: "luz_natural_janela",
    label: "Luz Natural Difusa de Janela",
    promptSpec:
      "Soft directional north-facing studio window daylight diffused through muslin scrim, gentle natural shadow falloff, authentic ambient occlusion in fabric folds",
  },
  editorial_dramatico: {
    id: "editorial_dramatico",
    label: "Editorial Escultural (Alto Contraste)",
    promptSpec:
      "Sculptural silver beauty-dish key light with honeycomb grid, deep dimensional fold shadows, crisp specular micro-highlights along seam ridges and trims",
  },
  luz_rasante_textura: {
    id: "luz_rasante_textura",
    label: "Luz Rasante 30° (Máxima Textura Têxtil)",
    promptSpec:
      "Low-angle 30-degree raking directional studio strobe specifically positioned to graze the textile surface and reveal microscopic weave relief, rib knit channels and topstitch thread elevation",
  },
};

const TEXTILE_PHYSICS_RULES: Array<{ match: RegExp; physics: string }> = [
  {
    match: /dry\s*-?\s*fit|microperfurad|poliamida|uv\s*50|esportiv/i,
    physics:
      "engineered micro-perforated technical interlock knit with visible breathable micro-mesh pores, subtle semi-matte athletic yarn luster, fluid moisture-wicking drape, clean flatlock/coverstitch seams",
  },
  {
    match: /linho|flax/i,
    physics:
      "authentic woven 100% flax linen with organic slubbed warp-and-weft yarn irregularity, dry matte chalky texture, crisp natural crease memory and breathable weave micro-structure",
  },
  {
    match: /algod[ãa]o\s*penteado|30\.1|meia\s*malha|jersey|malha\s*100%\s*algod/i,
    physics:
      "fine combed 30/1 ring-spun cotton single-jersey knit showing microscopic V-shaped knit wales, zero plastic sheen, soft natural matte cotton handfeel, structured 1x1 rib-knit collar band",
  },
  {
    match: /piquet|piqu[êe]|polo/i,
    physics:
      "textured honeycomb cotton piqué knit with distinct geometric waffle micro-relief, structured polo collar rib knit and clean placket topstitching",
  },
  {
    match: /moletom|flanelad|3\s*cabos|fleece/i,
    physics:
      "heavyweight 3-end Diagonal French Terry / brushed fleece cotton Sweatshirt fabric (340 gsm) with substantial plush fold thickness, dense 2x1 elastane rib cuffs and hem",
  },
  {
    match: /jeans|denim| índigo|indigo/i,
    physics:
      "authentic 3x1 right-hand twill weave heavyweight cotton denim with visible diagonal indigo warp / unbleached weft grain, contrast tobacco core-spun topstitching, realistic seam roping and metallic hardware",
  },
  {
    match: /sarja|chino|brim/i,
    physics:
      "compact peached cotton-elastane diagonal twill weave (sarja) with crisp tailored structure, clean double-needle felled seams and matte natural surface",
  },
  {
    match: /tricoline|popeline|poplin/i,
    physics:
      "high-thread-count crisp combed cotton poplin (tricoline) plain weave with smooth matte finish, sharp fused collar stand roll, fine 5-stitches-per-cm single-needle topstitching and mother-of-pearl button reflections",
  },
  {
    match: /viscose|crepe|flu[íi]d/i,
    physics:
      "fluid high-twist crepe / viscose woven fabric with pebbled micro-grain surface, liquid cascading vertical drape folds, zero stiffness and delicate rolled hem",
  },
  {
    match: /ribana|canelad/i,
    physics:
      "elastic vertical 2x1 rib-knit structure with pronounced tactile knit ribs, natural recovery tension and clean overlock/coverstitch edges",
  },
  {
    match: /alfaiataria|blazer| lã|twill/i,
    physics:
      "structured suiting wool-blend twill fabric with crisp press creases, clean canvas chest drape, precision welt pockets and horn buttons",
  },
];

export function describeTextileMicroPhysics(
  materialsText: string,
  gramaturaGm2?: number,
  composicao?: string,
): string {
  const matched = TEXTILE_PHYSICS_RULES.filter((r) => r.match.test(materialsText)).map(
    (r) => r.physics,
  );
  const base =
    matched.length > 0
      ? matched.join("; ")
      : "authentic woven/knitted apparel textile with visible microscopic yarn twist, realistic weave grain, natural matte-to-satin physical light response and true gravity drape";

  const extras: string[] = [];
  if (gramaturaGm2 && gramaturaGm2 > 0) {
    const weightFeel =
      gramaturaGm2 < 140
        ? "lightweight airy drape"
        : gramaturaGm2 <= 220
          ? "medium-weight balanced commercial drape"
          : "heavyweight structured architectural drape";
    extras.push(`fabric weight ${gramaturaGm2} gsm (${weightFeel})`);
  }
  if (composicao?.trim()) {
    extras.push(`fiber composition ${composicao.trim()}`);
  }
  return extras.length ? `${base} (${extras.join(", ")})` : base;
}

export function inferPresetFromView(view: string): PhotoStudioPresetId {
  const v = view.trim().toLowerCase();
  if (v === "modelo" || v === "editorial") return "editorial_model";
  if (v === "campanha" || v === "lifestyle") return "campaign_lifestyle";
  if (v === "detalhe") return "macro_textile";
  if (v === "still") return "flat_lay";
  return "ghost_mannequin";
}

export interface RealisticGarmentPromptInput {
  productName: string;
  category?: string;
  silhouette?: string;
  materials?: string[];
  gramaturaGm2?: number;
  composicao?: string;
  colorDescription?: string;
  primaryHex?: string;
  secondaryHex?: string;
  constructionDetails?: string[];
  applications?: string[];
  visualMood?: string;
  view?: string;
  preset?: PhotoStudioPresetId;
  lighting?: LightingPresetId;
  transparentCutout?: boolean;
  keepReferenceIdentity?: boolean;
  variationColorOnly?: string;
}

export interface RealisticRenderPlan {
  prompt: string;
  size: ImageSizeOption;
  background: ImageBackgroundOption;
  preset: PhotoPresetConfig;
}

const VIEW_ANGLE_DIRECTION: Record<string, string> = {
  frente:
    "Direct front-facing orthographic 0-degree angle showing full front body, neckline, sleeves and hem symmetrically",
  costas:
    "Direct 180-degree back view showing rear yoke/collar, back body panels, back seams and hem",
  lateral:
    "Three-quarter / 90-degree side profile highlighting sleeve pitch, side seam / lateral panel and drape silhouette",
  detalhe:
    "Macro close-up framing the collar, shoulder topstitching, fabric weave and chest finish",
  still: "Overhead curated studio tabletop flat-lay composition",
  modelo: "Three-quarter length editorial portrait worn on a real adult fashion model",
  editorial: "Full-to-medium length high-fashion editorial lookbook frame on a real model",
  catálogo:
    "Clean commercial e-commerce catalog front-three-quarter presentation on seamless warm studio paper",
  campanha: "Wide cinematic luxury brand campaign frame in architectural daylight",
  lifestyle: "Natural candid lifestyle moment worn in a sunlit contemporary environment",
};

export function buildPhotorealisticGarmentPrompt(
  input: RealisticGarmentPromptInput,
): RealisticRenderPlan {
  const viewKey = (input.view ?? "frente").trim().toLowerCase();
  const presetId = input.preset ?? inferPresetFromView(viewKey);
  const preset = PHOTO_STUDIO_PRESETS[presetId];
  const lighting = LIGHTING_PRESETS[input.lighting ?? "softbox_neutro"];

  // Regra crítica anti-contradição: modelos humanos, campanhas, flat-lay e macro NUNCA usam
  // fundo transparente recortado, pois isso destrói sombras de contato, pele e iluminação real.
  const canUseTransparent = presetId === "ghost_mannequin";
  const useTransparent = Boolean(input.transparentCutout && canUseTransparent);
  const background: ImageBackgroundOption = useTransparent
    ? "transparent"
    : preset.defaultBackground;

  const materialsJoined = (input.materials ?? []).filter(Boolean).join(", ");
  const textilePhysics = describeTextileMicroPhysics(
    materialsJoined || input.productName,
    input.gramaturaGm2,
    input.composicao,
  );

  const targetColor =
    input.variationColorOnly || input.colorDescription || "neutral commercial colorway";
  const colorCalibration = [
    `Primary colorway: ${targetColor}`,
    input.primaryHex ? `exact primary dye hex ${input.primaryHex}` : "",
    input.secondaryHex ? `contrast trim/panel hex ${input.secondaryHex}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const angleInstruction =
    VIEW_ANGLE_DIRECTION[viewKey] ??
    `Commercial ${input.view || "front"} angle preserving exact garment proportions`;

  const constructionBlock = input.constructionDetails?.length
    ? `Construction & tailoring details: ${input.constructionDetails.join("; ")}. Visible realistic stitch gauge, seam allowances, authentic needle perforations and crisp pressing.`
    : "Construction & tailoring: industrial-grade clean seams, realistic stitch density (5 stitches per cm), accurate collar/neckline roll and natural hem tension.";

  const applicationsBlock = input.applications?.length
    ? `Surface embellishments on garment: ${input.applications.join("; ")} — rendered with authentic physical ink/thread relief integrated into the underlying textile grain.`
    : "";

  const backdropClause = useTransparent
    ? "Isolated cleanly on a 100% pure alpha transparent background with crisp natural fabric-edge anti-aliasing, no studio floor or external backdrop."
    : presetId === "ghost_mannequin"
      ? "Set against a seamless matte warm light-gray commercial studio cyclorama (#F1F2F4) with a subtle, physically accurate soft contact shadow beneath the garment."
      : "";

  const antiAiGuardrails =
    "STRICT PHOTOREALISM GUARDRAILS: indistinguishable from a raw unretouched commercial photograph; NO plastic or waxy sheen, NO CGI 3D-render look, NO oversaturated neon colors, NO melted or blurry stitches, NO asymmetrical collars, NO extra limbs or distorted hands, NO watermarks, NO floating text overlays or graphic callout lines.";

  if (input.keepReferenceIdentity) {
    const editPrompt = [
      "STRICT GARMENT IDENTITY LOCK: Reference image shows the exact physical garment prototype. Preserve 100% of its silhouette, cut lines, collar construction, sleeve length, seam placement, fabric weave and trims.",
      input.variationColorOnly
        ? `Re-dye ONLY the garment colorway to: ${colorCalibration}, maintaining identical yarn micro-texture, seam shadows and studio lighting.`
        : `Photograph this exact garment in ${angleInstruction}. ${preset.compositionSpec}.`,
      `Textile micro-physics: ${textilePhysics}.`,
      preset.cameraSpec + ".",
      lighting.promptSpec + ".",
      backdropClause,
      antiAiGuardrails,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      prompt: editPrompt,
      size: preset.defaultSize,
      background,
      preset,
    };
  }

  const cleanSentence = (s?: string) => (s ?? "").trim().replace(/\.+$/, "");

  const fullPrompt = [
    `Ultra-realistic commercial fashion photography of "${input.productName}" (${input.category || "apparel"}).`,
    `Garment silhouette: ${cleanSentence(input.silhouette) || "commercial tailored fit"}.`,
    `${cleanSentence(angleInstruction)}.`,
    `${cleanSentence(preset.compositionSpec)}.`,
    `${cleanSentence(colorCalibration)}.`,
    `Textile micro-physics: ${cleanSentence(textilePhysics)}.`,
    constructionBlock,
    applicationsBlock,
    input.visualMood ? `Editorial art direction & mood: ${cleanSentence(input.visualMood)}.` : "",
    `${cleanSentence(preset.cameraSpec)}.`,
    `${cleanSentence(lighting.promptSpec)}.`,
    backdropClause,
    antiAiGuardrails,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    prompt: fullPrompt,
    size: preset.defaultSize,
    background,
    preset,
  };
}

/**
 * Converte uma Ficha Técnica real do PLM (`TechSheetData`) em Briefing + Proposta + Parâmetros
 * Fotorrealistas para o AI Product Studio ou renderização direta no Cockpit.
 */
export function buildStudioPayloadFromTechSheet(
  ref: string,
  doc: TechSheetData,
  activeColorwayId?: string,
): {
  briefing: ProductBriefingInput;
  proposal: ProductProposal;
  gramaturaGm2?: number;
  composicao?: string;
  primaryHex?: string;
  secondaryHex?: string;
  applications: string[];
} {
  const meta = doc.meta ?? {
    name: `Peça ${ref}`,
    category: "Confecção",
    collection: "Verão 2027",
    statusLabel: "Em engenharia",
    stage: 3,
  };
  const fabrics = doc.bom.filter((b) => b.tipo === "Tecido");
  const mainFabric = fabrics[0] ?? doc.bom[0];
  const colorways = doc.colorways ?? [];
  const activeCw = colorways.find((c) => c.id === activeColorwayId) ?? colorways[0];

  const composicao = doc.etiquetagem?.composicao?.map((f) => `${f.pct}% ${f.fibra}`).join(" / ");

  const pinDetails = (doc.meta?.callouts ?? []).map((p) => p.label);
  const bopDetails = doc.bop.slice(0, 3).map((s) => `${s.etapa} (${s.maquina})`);
  const appSummaries = (doc.aplicacoes ?? []).map(
    (a) => `${a.tipo} em ${a.posicao} (${a.larguraCm}×${a.alturaCm}cm)`,
  );

  const colorNames = colorways.length
    ? colorways.map((c) => `${c.name} (${c.hex})`)
    : ["Off-White"];

  const briefing: ProductBriefingInput = {
    description: `${meta.name} (${ref}) — ${pinDetails.join(", ") || meta.category}`,
    category: meta.category,
    collection: meta.collection,
    season: meta.collection,
    line: meta.category,
    targetPrice: String(doc.preCost.targetPreco ?? ""),
    fabric: fabrics.map((f) => f.material).join(", ") || mainFabric?.material || "Tecido principal",
    colors: colorNames.join(", "),
    mood: "Fotografia comercial ultra-realista fiel à engenharia têxtil",
    inspiration: `Ficha Técnica ${ref} · NCM ${doc.etiquetagem?.ncm ?? "6109.90.00"}`,
  };

  const SILHOUETTE_LABELS: Record<string, string> = {
    camiseta: "Modelagem esportiva/regular de camiseta com caimento anatômico nos ombros e barra",
    polo: "Modelagem camisa polo estruturada com gola retilínea e peitilho",
    camisa: "Modelagem alfaiataria de camisa social com colarinho entretelado, pala e punhos",
    vestido: "Modelagem fluida de vestido com cintura anatômica e saia evasê",
    moletom: "Modelagem ampla de blusão moletom ombro caído com punhos e barra em ribana",
    calca: "Modelagem reta de calça com cós estruturado, braguilha e vincos alinhados",
  };
  const silhouetteDesc =
    (meta.silhouette && SILHOUETTE_LABELS[meta.silhouette]) ||
    `Modelagem comercial graduada (${meta.category})`;

  const proposal: ProductProposal = {
    name: meta.name,
    description: `Renderização fotorrealista sincronizada à Ficha Técnica ${ref} (${meta.collection}), respeitando gramatura ${mainFabric?.gramaturaGm2 ? `${mainFabric.gramaturaGm2} g/m²` : "industrial"}, composição ${composicao || "têxtil"} e acabamentos de costura.`,
    category: meta.category,
    family: meta.category,
    line: meta.collection,
    silhouette: silhouetteDesc,
    details: [...pinDetails, ...bopDetails].slice(0, 6),
    suggestedMaterials: doc.bom.map((b) =>
      b.gramaturaGm2 ? `${b.material} (${b.gramaturaGm2} g/m²)` : b.material,
    ),
    colors: colorNames,
    variations: colorways.map((c) => c.name),
    validationNotes: [
      `Sincronizado da Ficha Técnica ${ref} (Base ${doc.medidas?.tamanhoBase ?? "M"}).`,
      "Fidelidade cromática calibrada pelos hexadecimais da cartela.",
    ],
    imageIdeas: ["frente", "costas", "modelo", "detalhe", "campanha"],
    visualIdentity: ["Fotografia Comercial Médio-Formato", "Textura Têxtil Real"],
  };

  return {
    briefing,
    proposal,
    gramaturaGm2: mainFabric?.gramaturaGm2,
    composicao,
    primaryHex: activeCw?.hex,
    secondaryHex: activeCw?.secondaryHex,
    applications: appSummaries,
  };
}
