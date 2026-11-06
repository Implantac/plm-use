// Motor Persistido de Pesquisa Criativa -> Engenharia (Briefing 1-Clique p/ Ficha Técnica)
// e Hub Go-To-Market (Campanhas, Drops, ROAS Real & Media Kit A4 com ESG DPP).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeDigitalProductPassport, resolveReferenceTechSheet } from "./dpp-expedition";
import { computeFullTechSheetPricing } from "./pricing";
import { emptyCareLabelSpec, useTechSheetStore, type TechSheetData } from "./store";
import { round2, type GarmentSilhouette } from "./textile";

export interface BriefingInsight {
  id: string;
  title: string;
  capsule: "Alto Verão 2027" | "Cápsula Resort" | "Alfaiataria Tech" | "Essenciais Pima";
  imageUrl: string;
  fabricSuggestion: string;
  gramaturaGm2: number;
  compositionFibra: string;
  silhouette: GarmentSilhouette;
  colorName: string;
  colorHex: string;
  targetPriceBrl: number;
  confidencePct: number;
  tags: string[];
  convertedRefCode?: string;
}

export type DropCampaignStatus = "Ativa" | "Em Produção Criativa" | "Planejada";

export interface GtmDropCampaign {
  id: string;
  name: string;
  collectionName: string;
  channel: string;
  dropDate: string;
  status: DropCampaignStatus;
  skuRefs: string[];
  creativeFormat: string;
  transparentStudioReady: boolean;
  productionCostBrl: number;
  mediaSpendBrl: number;
  attributedSalesBrl: number;
  clicksCount: number;
}

export interface GtmPortfolioSummary {
  totalCampaigns: number;
  totalMediaSpendBrl: number;
  totalProductionBrl: number;
  totalInvestmentBrl: number;
  totalSalesBrl: number;
  blendedRoas: number;
  netFullRoas: number;
  transparentReadyCount: number;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function convertBriefingToTechSheetStore(
  briefing: BriefingInsight,
  nextSeq: number,
): string {
  const refCode =
    briefing.convertedRefCode || `CR27-${String(100 + Math.max(1, nextSeq)).padStart(3, "0")}`;
  const ts = useTechSheetStore.getState();
  // Onda 35: antes `ensure()` plantava BOM (4 itens), BOP (4), 3 colorways e
  // pré-custo 34/185%/200pçs do DEV000006; um `updateMeta` bastava para virar
  // "salva" e entrar na DRE. Agora a conversão parte de uma ficha VAZIA e
  // declara somente o que o briefing realmente traz.
  ts.criarFicha(refCode);

  ts.updateMeta(refCode, {
    name: briefing.title,
    collection: briefing.capsule,
    category:
      briefing.silhouette === "calca_jogger"
        ? "Bottom / Alfaiataria"
        : briefing.silhouette === "moletom_raglan"
          ? "Outerwear / Moletom"
          : "Top / Malharia & Plano",
    silhouette: briefing.silhouette,
    statusLabel: "Briefing Criativo → Engenharia",
    stage: 2,
  });

  if (briefing.imageUrl) {
    ts.setImage(refCode, briefing.imageUrl);
  }

  ts.setColorways(refCode, [
    {
      id: "cw-1",
      code: "COR-01",
      name: briefing.colorName,
      hex: briefing.colorHex,
      secondaryHex: "#F8FAFC",
      status: "Ativa",
      mixPct: 100,
    },
  ]);

  ts.setEtiquetagem(refCode, {
    ...emptyCareLabelSpec(),
    composicao: [{ fibra: briefing.compositionFibra || "Algodão", pct: 100 }],
  });

  // O briefing declara tecido e gramatura, não consumo nem custo. O item nasce
  // sem custo (0) e o gate de estágio continua reprovando até custear a BOM.
  ts.addBomItem(refCode, {
    tipo: "Tecido",
    material: briefing.fabricSuggestion,
    fornecedor: "",
    consumo: "",
    unidade: "kg",
    custo: 0,
    gramaturaGm2: briefing.gramaturaGm2,
    variantesCor: { "cw-1": `${briefing.colorHex} · ${briefing.colorName}` },
  });

  ts.updatePreCost(refCode, {
    targetPreco: briefing.targetPriceBrl,
  });

  return refCode;
}

export function computeCampaignRoas(
  c: Pick<GtmDropCampaign, "mediaSpendBrl" | "attributedSalesBrl">,
): number {
  if (c.mediaSpendBrl <= 0) return 0;
  return round2(c.attributedSalesBrl / c.mediaSpendBrl);
}

export function computeGtmPortfolioSummary(campaigns: GtmDropCampaign[]): GtmPortfolioSummary {
  const totalMediaSpendBrl = round2(
    campaigns.reduce((a, c) => a + Math.max(0, c.mediaSpendBrl), 0),
  );
  const totalProductionBrl = round2(
    campaigns.reduce((a, c) => a + Math.max(0, c.productionCostBrl), 0),
  );
  const totalInvestmentBrl = round2(totalMediaSpendBrl + totalProductionBrl);
  const totalSalesBrl = round2(
    campaigns.reduce((a, c) => a + Math.max(0, c.attributedSalesBrl), 0),
  );
  const blendedRoas = totalMediaSpendBrl > 0 ? round2(totalSalesBrl / totalMediaSpendBrl) : 0;
  const netFullRoas = totalInvestmentBrl > 0 ? round2(totalSalesBrl / totalInvestmentBrl) : 0;
  const transparentReadyCount = campaigns.filter((c) => c.transparentStudioReady).length;

  return {
    totalCampaigns: campaigns.length,
    totalMediaSpendBrl,
    totalProductionBrl,
    totalInvestmentBrl,
    totalSalesBrl,
    blendedRoas,
    netFullRoas,
    transparentReadyCount,
  };
}

export function buildDropMediaKitHtml(
  campaign: GtmDropCampaign,
  sheetsMap: Record<string, TechSheetData>,
): string {
  const roas = computeCampaignRoas(campaign);
  // Media kit leva declaração ESG e preço ao cliente final: só ficha salva.
  const linhas = campaign.skuRefs.flatMap((refCode) => {
    const ref = resolveReferenceTechSheet(refCode, sheetsMap);
    const dpp = computeDigitalProductPassport(ref);
    if (!ref.doc || !dpp) return [];
    const doc = ref.doc;
    const pricing = computeFullTechSheetPricing(doc);
    return [
      `<tr>
        <td><strong>${escapeHtml(refCode)}</strong> — ${escapeHtml(doc.meta?.name || refCode)}</td>
        <td>${escapeHtml(dpp.compositionText)}</td>
        <td>Classe ${dpp.esgGrade} (${dpp.carbonKgCo2e} kg CO₂e)</td>
        <td style="text-align:right">R$ ${pricing.precoSugerido.toFixed(2)}</td>
      </tr>`,
    ];
  });
  const skuRows =
    linhas.length > 0
      ? linhas.join("")
      : `<tr><td colspan="4">Nenhuma referência da campanha tem passaporte apurável (ficha salva, NCM de 8 dígitos, origem, composição ABNT e encaixe CAD declarados) — este media kit não declara composição, classe ESG nem preço.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Media Kit & Release de Drop · ${escapeHtml(campaign.name)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
  .hdr { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; }
  h1 { font-size: 16px; margin: 0; text-transform: uppercase; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #f8fafc; }
  .lbl { font-size: 9px; text-transform: uppercase; color: #64748b; display: block; }
  .val { font-size: 14px; font-weight: 700; margin-top: 3px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="hdr">
    <div>
      <h1>Release GTM & Media Kit · ${escapeHtml(campaign.name)}</h1>
      <div>Coleção: <strong>${escapeHtml(campaign.collectionName)}</strong> · Canal: <strong>${escapeHtml(campaign.channel)}</strong> · Data Drop: <strong>${escapeHtml(campaign.dropDate)}</strong></div>
      <div>Pack Studio PNG Fundo Transparente: <strong>${campaign.transparentStudioReady ? "Homologado HD" : "Em Captação"}</strong></div>
    </div>
    <div style="text-align:right">
      <div>Status: <strong>${escapeHtml(campaign.status)}</strong></div>
      <div>ROAS Atribuído: <strong>${roas.toFixed(2)}x</strong></div>
    </div>
  </div>
  <div class="kpis">
    <div class="box"><span class="lbl">Mídia Paga</span><span class="val">R$ ${campaign.mediaSpendBrl.toLocaleString("pt-BR")}</span></div>
    <div class="box"><span class="lbl">Produção Foto/Vídeo</span><span class="val">R$ ${campaign.productionCostBrl.toLocaleString("pt-BR")}</span></div>
    <div class="box"><span class="lbl">Receita Atribuída</span><span class="val">R$ ${campaign.attributedSalesBrl.toLocaleString("pt-BR")}</span></div>
    <div class="box"><span class="lbl">Tráfego Qualificado</span><span class="val">${campaign.clicksCount.toLocaleString("pt-BR")} cliques</span></div>
  </div>
  <h2 style="font-size:11px;text-transform:uppercase;margin:8px 0 4px">Line-up Técnico de Produtos do Drop & Argumento ESG</h2>
  <table>
    <thead><tr><th>Referência</th><th>Composição ABNT</th><th>Passaporte ESG (DPP)</th><th style="text-align:right">Preço Sugerido</th></tr></thead>
    <tbody>${skuRows || "<tr><td colspan='4'>Nenhum SKU vinculado</td></tr>"}</tbody>
  </table>
</body>
</html>`;
}

export const INITIAL_BRIEFINGS: BriefingInsight[] = [
  {
    id: "br-1",
    title: "Polo Resort Tricot Linho Cru",
    capsule: "Cápsula Resort",
    imageUrl:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=800",
    fabricSuggestion: "Malha Tricot Linho & Algodão 195 g/m²",
    gramaturaGm2: 195,
    compositionFibra: "Linho",
    silhouette: "camisa_polo",
    colorName: "Areia Natural",
    colorHex: "#D6C7B2",
    targetPriceBrl: 229.9,
    confidencePct: 95,
    tags: ["#linho", "#resort", "#monomaterial"],
  },
  {
    id: "br-2",
    title: "Calça Alfaiataria Tech Bi-Stretch",
    capsule: "Alfaiataria Tech",
    imageUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=800",
    fabricSuggestion: "Tecido Plano Poliamida Biodegradável 220 g/m²",
    gramaturaGm2: 220,
    compositionFibra: "Poliamida",
    silhouette: "calca_jogger",
    colorName: "Ônix Urbano",
    colorHex: "#1E293B",
    targetPriceBrl: 289.9,
    confidencePct: 92,
    tags: ["#alfaiataria", "#bistretch", "#urbano"],
  },
  {
    id: "br-3",
    title: "T-Shirt Gola V Algodão Pima Peruano",
    capsule: "Essenciais Pima",
    imageUrl:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800",
    fabricSuggestion: "Meia Malha Penteada Pima 165 g/m²",
    gramaturaGm2: 165,
    compositionFibra: "Algodão Pima",
    silhouette: "camiseta_v",
    colorName: "Verde Sálvia",
    colorHex: "#5F7D6B",
    targetPriceBrl: 169.9,
    confidencePct: 94,
    tags: ["#pima", "#essencial", "#altoverao"],
  },
  {
    id: "br-4",
    title: "Crewneck Raglan Moletinho Orgânico",
    capsule: "Alto Verão 2027",
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
    fabricSuggestion: "Moletinho Sem Felpa Algodão Orgânico 260 g/m²",
    gramaturaGm2: 260,
    compositionFibra: "Algodão Orgânico",
    silhouette: "moletom_raglan",
    colorName: "Azul Atlântico",
    colorHex: "#1D4ED8",
    targetPriceBrl: 259.9,
    confidencePct: 89,
    tags: ["#organico", "#raglan", "#pordosol"],
  },
];

export const INITIAL_GTM_CAMPAIGNS: GtmDropCampaign[] = [
  {
    id: "gtm-1",
    name: "Drop 01 · Alto Verão Performance & Pima",
    collectionName: "Alto Verão 2027",
    channel: "Meta Ads + Reels",
    dropDate: "2026-11-18",
    status: "Ativa",
    skuRefs: ["DEV000006", "V24-001"],
    creativeFormat: "Still PNG Transparente + Editorial 85mm",
    transparentStudioReady: true,
    productionCostBrl: 18_500,
    mediaSpendBrl: 42_000,
    attributedSalesBrl: 218_400,
    clicksCount: 38_400,
  },
  {
    id: "gtm-2",
    name: "Drop 02 · Cápsula Tech Fleece & Alfaiataria",
    collectionName: "Transição Outono 2027",
    channel: "Showroom B2B + Google Shopping",
    dropDate: "2026-12-02",
    status: "Em Produção Criativa",
    skuRefs: ["U25-014", "I25-088"],
    creativeFormat: "Lookbook B2B + Ghost Mannequin 3D",
    transparentStudioReady: true,
    productionCostBrl: 14_200,
    mediaSpendBrl: 26_500,
    attributedSalesBrl: 148_900,
    clicksCount: 21_900,
  },
  {
    id: "gtm-3",
    name: "Seeding Creators · Sustentabilidade DPP QR",
    collectionName: "Institucional ESG",
    channel: "Instagram Creators + TikTok",
    dropDate: "2026-11-25",
    status: "Planejada",
    skuRefs: ["V24-001", "U25-014"],
    creativeFormat: "Unboxing + Escaneamento QR Passaporte ESG",
    transparentStudioReady: false,
    productionCostBrl: 9_800,
    mediaSpendBrl: 15_000,
    attributedSalesBrl: 84_000,
    clicksCount: 16_200,
  },
];

interface ResearchGtmStoreState {
  briefings: BriefingInsight[];
  campaigns: GtmDropCampaign[];
  upsertBriefing: (item: BriefingInsight) => void;
  deleteBriefing: (id: string) => void;
  markBriefingConverted: (id: string, refCode: string) => void;
  upsertCampaign: (camp: GtmDropCampaign) => void;
  deleteCampaign: (id: string) => void;
}

export const useResearchGtmStore = create<ResearchGtmStoreState>()(
  persist(
    (set) => ({
      briefings: INITIAL_BRIEFINGS,
      campaigns: INITIAL_GTM_CAMPAIGNS,
      upsertBriefing: (item) =>
        set((s) => {
          const exists = s.briefings.some((b) => b.id === item.id);
          return {
            briefings: exists
              ? s.briefings.map((b) => (b.id === item.id ? item : b))
              : [item, ...s.briefings],
          };
        }),
      deleteBriefing: (id) => set((s) => ({ briefings: s.briefings.filter((b) => b.id !== id) })),
      markBriefingConverted: (id, refCode) =>
        set((s) => ({
          briefings: s.briefings.map((b) =>
            b.id === id ? { ...b, convertedRefCode: refCode } : b,
          ),
        })),
      upsertCampaign: (camp) =>
        set((s) => {
          const exists = s.campaigns.some((c) => c.id === camp.id);
          return {
            campaigns: exists
              ? s.campaigns.map((c) => (c.id === camp.id ? camp : c))
              : [camp, ...s.campaigns],
          };
        }),
      deleteCampaign: (id) => set((s) => ({ campaigns: s.campaigns.filter((c) => c.id !== id) })),
    }),
    { name: "use-moda:research-gtm-v1" },
  ),
);
