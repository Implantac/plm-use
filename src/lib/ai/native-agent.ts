// Agente nativo do AI Product Studio: monta a proposta de produto por regras
// de moda locais, sem chamar o provedor de IA (não consome créditos).
import type { ProductBriefingInput, ProductProposal } from "@/components/ai/product-studio.utils";

type Rule = {
  match: RegExp;
  category: string;
  family: string;
  silhouette: string;
  details: string[];
  materials: string[];
};

const RULES: Rule[] = [
  {
    match: /bon[eé]|cap/i,
    category: "Acessórios",
    family: "Bonés",
    silhouette: "Copa estruturada 6 gomos, aba curva",
    details: [
      "Fecho regulável traseiro (snapback ou fivela)",
      "Ilhoses bordados nos gomos",
      "Fita interna com etiqueta da marca",
      "Área frontal livre para bordado ou silk",
    ],
    materials: [
      "Sarja de algodão 100%",
      "Entretela frontal termocolante",
      "Fita de gorgurão interna",
    ],
  },
  {
    match: /camis[ae]ta|t-?shirt|tee/i,
    category: "Malha",
    family: "Camisetas",
    silhouette: "Reta, ombro levemente caído",
    details: [
      "Gola careca em ribana 1x1",
      "Barra e mangas com costura galoneira",
      "Vivo de ombro a ombro",
      "Etiqueta estampada na nuca",
    ],
    materials: ["Meia malha 100% algodão penteado 30.1", "Ribana 1x1 para gola"],
  },
  {
    match: /camisa|shirt/i,
    category: "Tecido plano",
    family: "Camisas",
    silhouette: "Reta com pala nas costas",
    details: ["Gola com pé e entretela", "Abotoamento frontal", "Punho com carcela", "Barra curva"],
    materials: ["Tricoline 100% algodão", "Linho misto", "Botões de poliéster ou madrepérola"],
  },
  {
    match: /vestido|dress/i,
    category: "Tecido plano",
    family: "Vestidos",
    silhouette: "Cintura marcada, saia evasê",
    details: [
      "Recorte na cintura",
      "Zíper invisível nas costas",
      "Forro parcial",
      "Barra feita à mão ou overlock fino",
    ],
    materials: ["Viscose", "Linho", "Crepe de poliéster"],
  },
  {
    match: /cal[çc]a|pants|jeans/i,
    category: "Tecido plano",
    family: "Calças",
    silhouette: "Cintura média, perna reta",
    details: [
      "Bolsos faca frontais",
      "Bolsos embutidos traseiros",
      "Braguilha com zíper",
      "Passantes no cós",
    ],
    materials: ["Sarja com elastano", "Denim 12oz", "Aviamentos metálicos"],
  },
  {
    match: /moletom|hoodie|blus[ãa]o/i,
    category: "Malha",
    family: "Moletons",
    silhouette: "Ampla, ombro caído",
    details: ["Capuz com cordão", "Bolso canguru", "Punhos e barra em ribana", "Costura reforçada"],
    materials: ["Moletom flanelado 3 cabos", "Ribana com elastano"],
  },
  {
    match: /saia|skirt/i,
    category: "Tecido plano",
    family: "Saias",
    silhouette: "Midi, levemente evasê",
    details: ["Cós com entretela", "Zíper invisível lateral", "Pences traseiras"],
    materials: ["Alfaiataria leve", "Viscose"],
  },
];

const FALLBACK: Rule = {
  match: /./,
  category: "Vestuário",
  family: "Peças",
  silhouette: "Modelagem comercial regular",
  details: ["Acabamentos internos limpos", "Etiqueta de composição e marca"],
  materials: ["Algodão", "Mistos com elastano"],
};

const COLOR_WORDS = [
  "preto",
  "branco",
  "off-white",
  "areia",
  "bege",
  "azul",
  "marinho",
  "verde",
  "oliva",
  "vermelho",
  "rosa",
  "cinza",
  "caramelo",
  "laranja",
  "terracota",
  "estampad[ao]",
];

function list(text?: string) {
  return (text ?? "")
    .split(/[,;/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function nativeProposal(b: ProductBriefingInput): ProductProposal {
  const text = [b.description, b.category, b.fabric, b.inspiration].join(" ");
  const rule = RULES.find((r) => r.match.test(text)) ?? FALLBACK;
  const found = COLOR_WORDS.filter((c) => new RegExp(c, "i").test(text)).map((c) =>
    c.replace("estampad[ao]", "estampado"),
  );
  const colors = list(b.colors).length
    ? list(b.colors)
    : found.length
      ? found
      : ["preto", "off-white", "areia"];
  const materials = list(b.fabric).length
    ? [...list(b.fabric), ...rule.materials.slice(0, 1)]
    : rule.materials;
  const head = b.description.trim().split(/[,.]/)[0].slice(0, 60);
  const name = head.charAt(0).toUpperCase() + head.slice(1);
  const notes = [
    "Proposta criada pelo agente nativo (regras locais), sem consumo de créditos.",
    "Validar modelagem e medidas com a tabela oficial da coleção antes da ficha técnica.",
  ];
  if (b.targetPrice)
    notes.push(`Conferir custo de materiais contra o preço-alvo ${b.targetPrice}.`);
  if (!b.collection) notes.push("Informe a coleção para vincular a tabela oficial de medidas.");

  return {
    name: name || `${rule.family} conceito`,
    description: `${b.description.trim()}. Pensado para ${b.audience || "o público da marca"}${b.occasion ? `, ocasião ${b.occasion}` : ""}${b.mood ? `, clima ${b.mood}` : ""}.`,
    category: b.category || rule.category,
    family: rule.family,
    line: b.line || b.collection || "Linha principal",
    silhouette: rule.silhouette,
    details: rule.details,
    suggestedMaterials: materials,
    colors,
    variations: colors.slice(0, 4).map((c) => `${rule.family.replace(/s$/, "")} em ${c}`),
    validationNotes: notes,
    imageIdeas: ["frente", "costas", "detalhe", "still"],
    visualIdentity: [rule.silhouette, `Paleta: ${colors.join(", ")}`, `Base: ${materials[0]}`],
  };
}
