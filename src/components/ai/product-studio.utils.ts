export type ProductBriefingInput = {
  description: string;
  audience?: string;
  occasion?: string;
  category?: string;
  collection?: string;
  season?: string;
  line?: string;
  targetPrice?: string;
  fabric?: string;
  colors?: string;
  gender?: string;
  ageRange?: string;
  mood?: string;
  inspiration?: string;
};

export type ProductProposal = {
  name: string;
  description: string;
  category: string;
  family: string;
  line: string;
  silhouette: string;
  details: string[];
  suggestedMaterials: string[];
  colors: string[];
  variations: string[];
  validationNotes: string[];
  imageIdeas?: string[];
  visualIdentity?: string[];
};

export function normalizeProductProposal(raw: Partial<ProductProposal> = {}): ProductProposal {
  return {
    name: raw.name ?? "Produto conceitual",
    description: raw.description ?? "",
    category: raw.category ?? "",
    family: raw.family ?? "",
    line: raw.line ?? "",
    silhouette: raw.silhouette ?? "",
    details: Array.isArray(raw.details) ? raw.details.filter(Boolean) : [],
    suggestedMaterials: Array.isArray(raw.suggestedMaterials) ? raw.suggestedMaterials.filter(Boolean) : [],
    colors: Array.isArray(raw.colors) ? raw.colors.filter(Boolean) : [],
    variations: Array.isArray(raw.variations) ? raw.variations.filter(Boolean) : [],
    validationNotes: Array.isArray(raw.validationNotes) ? raw.validationNotes.filter(Boolean) : [],
    imageIdeas: Array.isArray(raw.imageIdeas) ? raw.imageIdeas.filter(Boolean) : ["frente", "costas", "modelo", "campanha"],
    visualIdentity: Array.isArray(raw.visualIdentity) ? raw.visualIdentity.filter(Boolean) : [],
  };
}

export function buildConceptPrompt(briefing: ProductBriefingInput): string {
  return [
    "Crie uma proposta conceitual premium de produto de moda com foco em consumo real, estética comercial e viabilidade de desenvolvimento.",
    `Descrição: ${briefing.description || "não informada"}`,
    `Público: ${briefing.audience || "não informado"}`,
    `Gênero: ${briefing.gender || "não informado"}`,
    `Faixa etária: ${briefing.ageRange || "não informada"}`,
    `Ocasião: ${briefing.occasion || "não informada"}`,
    `Categoria: ${briefing.category || "não informada"}`,
    `Coleção: ${briefing.collection || "não informada"}`,
    `Temporada: ${briefing.season || "não informada"}`,
    `Linha: ${briefing.line || "não informada"}`,
    `Preço-alvo: ${briefing.targetPrice || "não informado"}`,
    `Tecido desejado: ${briefing.fabric || "não informado"}`,
    `Cores: ${briefing.colors || "não informadas"}`,
    `Mood: ${briefing.mood || "não informado"}`,
    `Inspiração: ${briefing.inspiration || "não informada"}`,
    "Responda somente em JSON válido com as chaves: name, description, category, family, line, silhouette, details, suggestedMaterials, colors, variations, validationNotes, imageIdeas, visualIdentity.",
    "A resposta deve ser comercialmente coerente, com linguagem de produto e visual premium, preservando identidade do item em todos os ângulos.",
    "Crie 3 a 6 variações conceituais e 4 a 6 direções de imagem: frente, costas, lateral, modelo, campanha e detalhe.",
    "Não invente custo real, fornecedor, fornecedor, estoque ou margem. Isso é um rascunho conceitual e precisa de validação humana.",
  ].join("\n");
}

export function buildVariationIdeas(
  base: Partial<ProductProposal>,
  briefing: Pick<ProductBriefingInput, "colors" | "fabric" | "mood" | "season" | "description">,
): string[] {
  const baseName = base.name ?? "Produto";
  const material = base.suggestedMaterials?.[0] ?? briefing.fabric ?? "tecido";
  const mood = base.visualIdentity?.[0] ?? briefing.mood ?? "minimalista";
  const palette = (base.colors?.length ? base.colors : parseCsv(briefing.colors ?? "")).slice(0, 4);
  const colors = palette.length ? palette : ["Off-white", "Azul-marinho", "Areia", "Preto"];

  const seed = [
    `${baseName} em ${material} ${mood}`,
    `${baseName} em ${colors[0]} com acabamento ${mood}`,
    `${baseName} em ${colors[1] ?? colors[0]} para ${briefing.season ?? "temporada"}`,
    `${baseName} com detailing premium em ${material}`,
    `${baseName} em ${colors[2] ?? colors[0]} com identidade ${mood}`,
  ];

  return uniqueStrings([
    ...seed,
    ...(base.variations?.map((variation) => `${baseName} ${variation.toLowerCase()}`) ?? []),
  ]).slice(0, 5);
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean).map((value) => value.trim())));
}
