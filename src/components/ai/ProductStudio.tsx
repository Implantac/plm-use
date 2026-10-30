import { ImageExportMenu } from "@/components/export/ImageExportMenu";
import {
  ExpandImageBadge,
  ImageLightbox,
  type LightboxImageItem,
} from "@/components/ui/image-lightbox";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ArrowRight,
  Bot,
  Camera,
  FileSpreadsheet,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  Save,
  Sliders,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { askAgent } from "@/lib/ai/agents.functions";
import { nativeProposal } from "@/lib/ai/native-agent";
import { nativeVisualPng } from "@/lib/ai/native-visual";
import {
  buildPhotorealisticGarmentPrompt,
  buildStudioPayloadFromTechSheet,
  inferPresetFromView,
  LIGHTING_PRESETS,
  PHOTO_STUDIO_PRESETS,
  type LightingPresetId,
  type PhotoStudioPresetId,
} from "@/lib/ai/photorealism";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { streamImage } from "@/lib/streamImage";
import { useQuery } from "@tanstack/react-query";
import {
  activeForCollection,
  listOfficialModels,
  officialMeasuresBlock,
} from "@/lib/official-models";
import { uploadGeneratedImage, storageAssetSource } from "@/lib/storage/assets";
import { supabase } from "@/integrations/supabase/client";
import { useReferences } from "@/hooks/use-references";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TechSketchPanel } from "./TechSketchPanel";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { FieldMessage } from "@/components/ui/field-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildConceptPrompt,
  buildVariationIdeas,
  normalizeProductProposal,
  type ProductBriefingInput,
} from "./product-studio.utils";

const ProposalSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  family: z.string(),
  line: z.string(),
  silhouette: z.string(),
  details: z.array(z.string()),
  suggestedMaterials: z.array(z.string()),
  colors: z.array(z.string()),
  variations: z.array(z.string()),
  validationNotes: z.array(z.string()),
  imageIdeas: z.array(z.string()).optional(),
  visualIdentity: z.array(z.string()).optional(),
});

type Proposal = z.infer<typeof ProposalSchema>;

type Briefing = ProductBriefingInput;

function normalizeTextList(value: unknown, keys: string[]): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((entry) => {
    if (typeof entry === "string") return entry;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    const record = entry as Record<string, unknown>;
    const details = keys
      .map((key) => record[key])
      .filter((part): part is string => typeof part === "string" && Boolean(part.trim()));
    return details.join(" — ");
  });
}

function normalizeVisualIdentity(value: unknown): unknown {
  if (Array.isArray(value)) return normalizeTextList(value, ["mood", "aesthetic", "targetVibe"]);
  if (!value || typeof value !== "object") return value;
  return Object.values(value as Record<string, unknown>).filter(
    (entry): entry is string => typeof entry === "string" && Boolean(entry.trim()),
  );
}

const IMAGE_VIEWS = [
  "frente",
  "costas",
  "lateral",
  "detalhe",
  "still",
  "modelo",
  "editorial",
  "catálogo",
  "campanha",
  "lifestyle",
] as const;

const ARTWORK_PLACEMENTS = [
  { value: "centro-frente", label: "Centro da frente" },
  { value: "peito-esquerdo", label: "Peito esquerdo" },
  { value: "peito-direito", label: "Peito direito" },
  { value: "centro-costas", label: "Centro das costas" },
  { value: "manga-esquerda", label: "Manga esquerda" },
  { value: "manga-direita", label: "Manga direita" },
  { value: "frente-bone", label: "Frente do boné" },
  { value: "lateral-esquerda-bone", label: "Lateral esquerda do boné" },
  { value: "lateral-direita-bone", label: "Lateral direita do boné" },
  { value: "traseira-bone", label: "Traseira do boné" },
] as const;

const ARTWORK_TECHNIQUES = [
  { value: "silk", label: "Silk screen" },
  { value: "bordado", label: "Bordado" },
  { value: "sublimacao", label: "Sublimação" },
  { value: "dtf", label: "DTF" },
] as const;

const MAX_ARTWORK_BYTES = 10 * 1024 * 1024;
const ACCEPTED_ARTWORK_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Arquivo inválido."));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

const EMPTY_BRIEFING: Briefing = {
  description: "",
  audience: "",
  gender: "",
  ageRange: "",
  occasion: "",
  category: "",
  collection: "",
  season: "",
  line: "",
  targetPrice: "",
  fabric: "",
  colors: "",
  mood: "",
  inspiration: "",
};

function nextReferenceCode(existingCodes: string[]) {
  const used = new Set(existingCodes.map((code) => code.toLocaleUpperCase("pt-BR")));
  let sequence = 1;
  let candidate = "IA-001";
  while (used.has(candidate)) {
    sequence += 1;
    candidate = `IA-${String(sequence).padStart(3, "0")}`;
  }
  return candidate;
}

function parseProposal(reply: string): Proposal | null {
  const match = reply.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const LIST_KEYS = [
    "name",
    "title",
    "angle",
    "view",
    "part",
    "element",
    "material",
    "color",
    "concept",
    "description",
    "note",
  ];
  const list = (v: unknown) => {
    const arr = normalizeTextList(Array.isArray(v) ? v : v == null ? [] : [v], LIST_KEYS);
    return (arr as unknown[]).filter(
      (x): x is string => typeof x === "string" && Boolean(x.trim()),
    );
  };
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const d = parsed as Record<string, unknown>;
    const normalized = {
      name: str(d.name),
      description: str(d.description),
      category: str(d.category),
      family: str(d.family),
      line: str(d.line),
      silhouette: str(d.silhouette),
      details: list(d.details),
      suggestedMaterials: list(d.suggestedMaterials),
      colors: list(d.colors),
      variations: list(d.variations),
      validationNotes: list(d.validationNotes),
      imageIdeas: list(d.imageIdeas),
      visualIdentity: normalizeVisualIdentity(d.visualIdentity),
    };
    if (!normalized.name) return null;
    const result = ProposalSchema.safeParse(normalized);
    return result.success ? normalizeProductProposal(result.data) : null;
  } catch {
    return null;
  }
}

export function ProductStudio() {
  const { items, create, loading: referencesLoading, error: referencesError } = useReferences();
  const { openEntity } = useEntityDrawer();
  const ask = useServerFn(askAgent);
  const [briefing, setBriefing] = useState(EMPTY_BRIEFING);
  const [proposalText, setProposalText] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [productName, setProductName] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [visualView, setVisualView] = useState("frente");
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{
      view: string;
      src: string;
      storagePath: string;
      createdAt: string;
      conceptName: string;
      application?: { artworkName: string; placement: string; technique: string };
    }>
  >([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [keepIdentity, setKeepIdentity] = useState(true);
  const [nativeVisual, setNativeVisual] = useState(false);
  const [photoPreset, setPhotoPreset] = useState<PhotoStudioPresetId>("ghost_mannequin");
  const [lightingPreset, setLightingPreset] = useState<LightingPresetId>("softbox_neutro");
  const [transparentCutout, setTransparentCutout] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [customPromptOverride, setCustomPromptOverride] = useState("");
  const [techSheetCtx, setTechSheetCtx] = useState<{
    ref: string;
    gramaturaGm2?: number;
    composicao?: string;
    primaryHex?: string;
    secondaryHex?: string;
    applications: string[];
  } | null>(null);
  const [selectedTechRef, setSelectedTechRef] = useState("DEV000006");
  const sheetsMap = useTechSheetStore((s) => s.data);
  const ensureTechSheet = useTechSheetStore((s) => s.ensure);
  const [variationColors, setVariationColors] = useState("areia, azul, verde, preto, estampada");
  const [artwork, setArtwork] = useState<{ name: string; dataUrl: string } | null>(null);
  const [artworkError, setArtworkError] = useState("");
  const [artworkPlacement, setArtworkPlacement] = useState("centro-frente");
  const [artworkTechnique, setArtworkTechnique] = useState("silk");
  const { data: officialModels = [] } = useQuery({
    queryKey: ["official-models"],
    queryFn: listOfficialModels,
  });
  const [officialId, setOfficialId] = useState("");
  const official = officialModels.find((m) => m.id === officialId);
  // Troca automaticamente para a tabela oficial da coleção informada no briefing.
  const collectionActive = activeForCollection(officialModels, briefing.collection);
  useEffect(() => {
    if (collectionActive) setOfficialId(collectionActive.id);
  }, [collectionActive?.id]);

  const suggestedCode = useMemo(() => nextReferenceCode(items.map((item) => item.code)), [items]);
  const variationIdeas = useMemo(
    () => (proposal ? buildVariationIdeas(proposal, briefing) : []),
    [proposal, briefing],
  );

  const techSheetRefOptions = useMemo(() => {
    const base = ["DEV000006", "V24-001", "U25-014", "I25-088"];
    for (const k of Object.keys(sheetsMap)) {
      if (!base.includes(k)) base.push(k);
    }
    return base;
  }, [sheetsMap]);

  function importFromTechSheet(refCode: string) {
    const doc = sheetsMap[refCode] ?? ensureTechSheet(refCode);
    const payload = buildStudioPayloadFromTechSheet(refCode, doc);
    setBriefing(payload.briefing);
    setTechSheetCtx({
      ref: refCode,
      gramaturaGm2: payload.gramaturaGm2,
      composicao: payload.composicao,
      primaryHex: payload.primaryHex,
      secondaryHex: payload.secondaryHex,
      applications: payload.applications,
    });
    setVariationColors(
      (doc.colorways ?? []).map((c) => `${c.name} ${c.hex}`).join(", ") ||
        "areia, azul, verde, preto",
    );
    applyProposal(payload.proposal as Proposal);
    setCustomPromptOverride("");
    toast.success(
      `Engenharia da ficha ${refCode} importada (tecidos, gramatura, cartela e costuras).`,
    );
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refParam = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (refParam) {
      setSelectedTechRef(refParam);
      importFromTechSheet(refParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveRenderPlan = useMemo(() => {
    if (!proposal) return null;
    const anchor = keepIdentity
      ? [...generatedImages]
          .reverse()
          .find((img) => img.conceptName === proposal.name && !img.view.startsWith("variação"))
      : undefined;
    return buildPhotorealisticGarmentPrompt({
      productName: proposal.name,
      category: proposal.category,
      silhouette: proposal.silhouette,
      materials: proposal.suggestedMaterials,
      gramaturaGm2: techSheetCtx?.gramaturaGm2,
      composicao: techSheetCtx?.composicao,
      colorDescription: proposal.colors.join(", ") || briefing.colors,
      primaryHex: techSheetCtx?.primaryHex,
      secondaryHex: techSheetCtx?.secondaryHex,
      constructionDetails: proposal.details,
      applications: techSheetCtx?.applications,
      visualMood: proposal.visualIdentity?.join(", ") || briefing.mood,
      view: visualView,
      preset: photoPreset,
      lighting: lightingPreset,
      transparentCutout,
      keepReferenceIdentity: Boolean(anchor),
    });
  }, [
    proposal,
    keepIdentity,
    generatedImages,
    techSheetCtx,
    briefing.colors,
    briefing.mood,
    visualView,
    photoPreset,
    lightingPreset,
    transparentCutout,
  ]);

  const lightboxItems = useMemo<LightboxImageItem[]>(() => {
    const slug = (proposal?.name || productName || "peca")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    if (generatedImages.length > 0) {
      const list = generatedImages.map((img) => ({
        src: img.src,
        alt: `Visual ${img.view} de ${img.conceptName}`,
        title: `${img.conceptName} · ${img.view}`,
        subtitle: `Inspeção HD · ${PHOTO_STUDIO_PRESETS[photoPreset].defaultSize} · ${transparentCutout ? "Fundo PNG Transparente" : "Estúdio Opaco"}`,
        exportBaseName: `${slug}-${img.view}`,
      }));
      if (imageSource && !list.some((it) => it.src === imageSource)) {
        list.unshift({
          src: imageSource,
          alt: `Conceito visual de ${proposal?.name || "peça"}, ${visualView}`,
          title: `${proposal?.name || "Peça"} · ${visualView}`,
          subtitle: `Inspeção HD · ${PHOTO_STUDIO_PRESETS[photoPreset].defaultSize}`,
          exportBaseName: `${slug}-${visualView}`,
        });
      }
      return list;
    }
    if (imageSource) {
      return [
        {
          src: imageSource,
          alt: `Conceito visual de ${proposal?.name || "peça"}, ${visualView}`,
          title: `${proposal?.name || "Peça"} · ${visualView}`,
          subtitle: `Inspeção HD · ${PHOTO_STUDIO_PRESETS[photoPreset].defaultSize}`,
          exportBaseName: `${slug}-${visualView}`,
        },
      ];
    }
    return [];
  }, [
    generatedImages,
    imageSource,
    photoPreset,
    productName,
    proposal?.name,
    transparentCutout,
    visualView,
  ]);

  function openLightboxForSrc(src: string) {
    const idx = lightboxItems.findIndex((item) => item.src === src);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  }

  function applyProposal(nextProposal: Proposal) {
    setImageSource(null);
    setProposal(nextProposal);
    setProductName(nextProposal.name || productName || "");
    setProposalText(JSON.stringify(nextProposal, null, 2));
  }

  function updateBriefing<K extends keyof Briefing>(key: K, value: Briefing[K]) {
    setBriefing((current) => ({ ...current, [key]: value }));
  }

  async function generateConcept() {
    if (!briefing.description.trim() || generating) {
      if (!briefing.description.trim()) toast.error("Descreva a ideia do produto para começar.");
      return;
    }

    setGenerating(true);
    setProposal(null);
    setProposalText("");
    try {
      const result = await ask({
        data: {
          agent: "fashion",
          message:
            buildConceptPrompt(briefing) +
            (official ? `\n\n${officialMeasuresBlock(official)}` : ""),
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setProposalText(result.reply);
      const parsed = parseProposal(result.reply);
      if (parsed) {
        applyProposal(parsed);
      }
      setReferenceCode((current) => current || suggestedCode);
      if (!parsed) {
        toast.warning(
          "A proposta chegou em formato livre. Revise e informe um nome antes de salvar.",
        );
      }
    } catch {
      toast.error("Não foi possível gerar a proposta. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  async function generateVisual(variationColor?: string) {
    if (!proposal || !proposal.name) {
      toast.error("Gere uma proposta antes de criar a imagem.");
      return;
    }

    const anchor = keepIdentity
      ? [...generatedImages]
          .reverse()
          .find((img) => img.conceptName === proposal.name && !img.view.startsWith("variação"))
      : undefined;
    const viewLabel = variationColor ? `variação ${variationColor}` : visualView;

    setImageBusy(true);
    setImageSource(null);
    let latestImage = "";

    const renderPlan = buildPhotorealisticGarmentPrompt({
      productName: proposal.name,
      category: proposal.category,
      silhouette: proposal.silhouette,
      materials: proposal.suggestedMaterials,
      gramaturaGm2: techSheetCtx?.gramaturaGm2,
      composicao: techSheetCtx?.composicao,
      colorDescription: variationColor || proposal.colors.join(", ") || briefing.colors,
      primaryHex: variationColor ? undefined : techSheetCtx?.primaryHex,
      secondaryHex: variationColor ? undefined : techSheetCtx?.secondaryHex,
      constructionDetails: proposal.details,
      applications: techSheetCtx?.applications,
      visualMood: proposal.visualIdentity?.join(", ") || briefing.mood,
      view: visualView,
      preset: photoPreset,
      lighting: lightingPreset,
      transparentCutout,
      keepReferenceIdentity: Boolean(anchor),
      variationColorOnly: variationColor,
    });

    const finalPrompt =
      !variationColor && customPromptOverride.trim()
        ? customPromptOverride.trim()
        : renderPlan.prompt;

    try {
      if (nativeVisual) {
        latestImage = await nativeVisualPng({
          family: proposal.family,
          category: proposal.category,
          name: proposal.name,
          color: variationColor || techSheetCtx?.primaryHex || proposal.colors[0],
          view: visualView,
          transparent: renderPlan.background === "transparent",
        });
        setImageSource(latestImage);
      } else {
        await streamImage(
          "/api/generate-image",
          finalPrompt,
          (dataUrl) => {
            latestImage = dataUrl;
            setImageSource(dataUrl);
          },
          anchor?.src,
          {
            background: renderPlan.background,
            size: renderPlan.size,
            inputFidelity: "high",
          },
        );
      }
      const storagePath = await uploadGeneratedImage(latestImage);
      const createdAt = new Date().toISOString();
      setGeneratedImages((current) => [
        {
          view: viewLabel,
          src: latestImage,
          storagePath: storagePath ?? "",
          createdAt,
          conceptName: proposal.name,
        },
        ...current,
      ]);
      if (storagePath) {
        toast.success(`Visual ${viewLabel} gerado e salvo no armazenamento.`);
      } else {
        toast.warning("Visual gerado, mas não foi possível salvá-lo no armazenamento.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar a imagem.");
    } finally {
      setImageBusy(false);
    }
  }

  async function selectArtwork(file: File | undefined) {
    setArtworkError("");
    if (!file) return;
    if (!ACCEPTED_ARTWORK_TYPES.has(file.type)) {
      setArtworkError("Envie uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > MAX_ARTWORK_BYTES) {
      setArtworkError("A imagem deve ter no máximo 10 MB.");
      return;
    }
    try {
      setArtwork({ name: file.name, dataUrl: await fileToDataUrl(file) });
    } catch (error) {
      setArtworkError(error instanceof Error ? error.message : "Não foi possível ler a imagem.");
    }
  }

  async function applyArtwork() {
    if (!proposal || !imageSource || !artwork || imageBusy) return;
    const placement =
      ARTWORK_PLACEMENTS.find((item) => item.value === artworkPlacement)?.label ?? artworkPlacement;
    const technique =
      ARTWORK_TECHNIQUES.find((item) => item.value === artworkTechnique)?.label ?? artworkTechnique;
    const sourceGarment = imageSource;
    const viewLabel = `${visualView} · ${technique} · ${placement}`;
    const useTransparent = transparentCutout;
    const prompt = [
      "STRICT PHOTOGRAPHIC COMPOSITING: Reference image 1 is the exact physical garment photograph. Preserve 100% of its silhouette, proportions, stitching, fabric weave, color, camera perspective, studio lighting and alpha-transparent background.",
      "Reference image 2 is the exact artwork/emblem to apply. Preserve its geometry, typography, colors and proportions without redesigning it.",
      `Apply the artwork naturally onto the garment at: ${placement}. Industrial technique: ${technique}.`,
      artworkTechnique === "bordado"
        ? "Render realistic 3D satin/tatami embroidery threads with individual stitch direction, subtle fabric puckering at the border and physical thread luster."
        : artworkTechnique === "silk"
          ? "Render authentic plastisol/water-based screen-print ink following the underlying fabric folds, micro-weave texture and studio light falloff."
          : artworkTechnique === "sublimacao"
            ? "Render dye-sublimation infused directly into the yarn fibers so the knit/weave grain remains 100% visible with zero raised film edge."
            : "Render a precision DTF / silicone heat-transfer with crisp edges, accurate colors and subtle matte-satin film relief.",
      "Warp and shade the artwork naturally along the three-dimensional contour and creases of the garment. Do not add any extra text, watermark or decoration.",
    ].join(" ");

    setImageBusy(true);
    setImageSource(null);
    let latestImage = "";
    try {
      await streamImage(
        "/api/generate-image",
        prompt,
        (dataUrl) => {
          latestImage = dataUrl;
          setImageSource(dataUrl);
        },
        [sourceGarment, artwork.dataUrl],
        {
          background: useTransparent ? "transparent" : "opaque",
          size: PHOTO_STUDIO_PRESETS[photoPreset].defaultSize,
          inputFidelity: "high",
        },
      );
      const storagePath = await uploadGeneratedImage(latestImage);
      const createdAt = new Date().toISOString();
      setGeneratedImages((current) => [
        {
          view: viewLabel,
          src: latestImage,
          storagePath: storagePath ?? "",
          createdAt,
          conceptName: proposal.name,
          application: { artworkName: artwork.name, placement, technique },
        },
        ...current,
      ]);
      if (storagePath) toast.success("Arte aplicada e visual salvo no armazenamento.");
      else toast.warning("Arte aplicada, mas não foi possível salvar o visual no armazenamento.");
    } catch (error) {
      setImageSource(sourceGarment);
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar a arte.");
    } finally {
      setImageBusy(false);
    }
  }

  async function saveDraft() {
    const code = referenceCode.trim() || suggestedCode;
    const name = productName.trim();
    if (!proposalText || !name) {
      toast.error("Gere uma proposta e informe o nome do produto antes de salvar.");
      return;
    }
    if (
      items.some((item) => item.code.toLocaleUpperCase("pt-BR") === code.toLocaleUpperCase("pt-BR"))
    ) {
      toast.error("Este código já está em uso. Escolha outro código para a referência.");
      return;
    }

    const targetPriceValue = briefing.targetPrice ?? "";
    const parsedPrice = targetPriceValue.trim() ? Number(targetPriceValue) : null;
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      toast.error("Informe um preço-alvo válido ou deixe o campo vazio.");
      return;
    }

    const conceptPayload = normalizeProductProposal({
      ...proposal,
      variations: variationIdeas.length ? variationIdeas : (proposal?.variations ?? []),
      imageIdeas: proposal?.imageIdeas?.length
        ? proposal.imageIdeas
        : ["frente", "costas", "lateral", "modelo", "campanha"],
      visualIdentity: proposal?.visualIdentity?.length
        ? proposal.visualIdentity
        : [briefing.mood || "minimalista"],
    });

    const savedImages = generatedImages.filter(
      (image) => image.storagePath && image.conceptName === (proposal?.name ?? name),
    );

    setSaving(true);
    const created = await create({
      code,
      name,
      collection_id: (briefing.collection ?? "").trim() || null,
      season: (briefing.season ?? "").trim() || null,
      line: (briefing.line ?? "").trim() || proposal?.line || null,
      theme: (briefing.category ?? "").trim() || proposal?.category || null,
      target_price: parsedPrice,
      image_url: savedImages[0] ? storageAssetSource(savedImages[0].storagePath) : null,
      status: "IDEIA",
      metadata: {
        source: "ai_product_studio",
        review_status: "RASCUNHO_IA",
        generation_brief: buildConceptPrompt(briefing),
        generated_concept: JSON.stringify(conceptPayload, null, 2),
        variation_ideas: variationIdeas,
        image_ideas: conceptPayload.imageIdeas,
        visual_identity: conceptPayload.visualIdentity,
        generated_images: savedImages.map(({ view, storagePath, createdAt, application }) => ({
          view,
          storage_path: storagePath,
          created_at: createdAt,
          source_concept: proposal?.name ?? name,
          application: application ?? null,
          status: "concept",
        })),
        generated_at: new Date().toISOString(),
      },
    });
    setSaving(false);

    if (!created) {
      if (savedImages.length) {
        await supabase.storage
          .from("use-moda-assets")
          .remove(savedImages.map((image) => image.storagePath));
      }
      toast.error("Não foi possível salvar o rascunho da referência.");
      return;
    }

    toast.success("Rascunho salvo para revisão humana.");
    openEntity({ type: "reference", id: created.id, title: created.name, subtitle: created.code });
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">USE MODA PLM</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">AI Product Studio</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Transforme um briefing em conceito revisável. Salvar cria uma referência em Ideia, nunca
            um produto industrial aprovado.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/ai-agents">
            <Bot className="h-4 w-4" /> Conversar com agentes
          </Link>
        </Button>
      </header>

      {referencesError && (
        <p
          role="alert"
          className="rounded-md border border-status-rejected/30 bg-status-rejected/5 p-3 text-sm text-muted-foreground"
        >
          Não foi possível carregar referências existentes para validar códigos. Tente novamente
          antes de salvar.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.9fr)_minmax(320px,1.2fr)_minmax(240px,0.8fr)]">
        <section className="space-y-4" aria-labelledby="studio-briefing-title">
          <div>
            <h2 id="studio-briefing-title" className="text-sm font-semibold text-white">
              Briefing
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Contexto criativo ou sincronizado direto da Ficha Técnica
            </p>
          </div>

          {/* Ponte direta com a Ficha Técnica do PLM */}
          <div className="rounded-md border border-[#2C6478]/45 bg-[#2C6478]/10 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-[#1E5568] dark:text-[#7AD4F0]">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Importar Ficha Técnica
              </span>
              {techSheetCtx && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                >
                  {techSheetCtx.ref} sincronizada
                </Badge>
              )}
            </div>
            <div className="flex gap-1.5">
              <select
                aria-label="Selecionar Ficha Técnica para renderização realista"
                value={selectedTechRef}
                onChange={(e) => setSelectedTechRef(e.target.value)}
                className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {techSheetRefOptions.map((r) => (
                  <option key={r} value={r}>
                    {r} — {sheetsMap[r]?.meta?.name ?? "Ficha Técnica"}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs shrink-0"
                onClick={() => importFromTechSheet(selectedTechRef)}
              >
                Carregar Ficha
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Injeta gramatura (g/m²), composição ABNT, hexadecimais Pantone e costuras reais no
              motor fotográfico.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="studio-official">Modelo oficial (medidas reais)</Label>
              <select
                id="studio-official"
                value={officialId}
                onChange={(event) => setOfficialId(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              >
                <option value="">Nenhum — IA estima pela ABNT</option>
                {officialModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.colecao ? `${m.colecao} — ` : ""}
                    {m.nome} · tam. {m.tamanho_base}
                    {m.ativa ? " (oficial)" : ""}
                  </option>
                ))}
              </select>
              <Link to="/official-models" className="text-xs text-primary hover:underline">
                Gerenciar tabelas por coleção
              </Link>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-description">Ideia do produto *</Label>
              <Textarea
                id="studio-description"
                value={briefing.description}
                onChange={(event) => updateBriefing("description", event.target.value)}
                maxLength={1500}
                placeholder="Ex.: camisa feminina premium de linho para verão, estética minimalista."
                className="min-h-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-audience">Público</Label>
              <Input
                id="studio-audience"
                value={briefing.audience}
                onChange={(event) => updateBriefing("audience", event.target.value)}
                placeholder="Faixa etária, público, posicionamento"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="studio-gender">Gênero</Label>
                <Input
                  id="studio-gender"
                  value={briefing.gender}
                  onChange={(event) => updateBriefing("gender", event.target.value)}
                  placeholder="Feminino, masculino..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-age-range">Faixa etária</Label>
                <Input
                  id="studio-age-range"
                  value={briefing.ageRange}
                  onChange={(event) => updateBriefing("ageRange", event.target.value)}
                  placeholder="25-40"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="studio-occasion">Ocasião</Label>
                <Input
                  id="studio-occasion"
                  value={briefing.occasion}
                  onChange={(event) => updateBriefing("occasion", event.target.value)}
                  placeholder="Casual, festa…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-category">Categoria</Label>
                <Input
                  id="studio-category"
                  value={briefing.category}
                  onChange={(event) => updateBriefing("category", event.target.value)}
                  placeholder="Camisas, vestidos…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="studio-mood">Mood</Label>
                <Input
                  id="studio-mood"
                  value={briefing.mood}
                  onChange={(event) => updateBriefing("mood", event.target.value)}
                  placeholder="Minimalista, urbano…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-inspiration">Inspiração</Label>
                <Input
                  id="studio-inspiration"
                  value={briefing.inspiration}
                  onChange={(event) => updateBriefing("inspiration", event.target.value)}
                  placeholder="Praia, arquitetura…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-collection">Coleção</Label>
              <Input
                id="studio-collection"
                value={briefing.collection}
                onChange={(event) => updateBriefing("collection", event.target.value)}
                placeholder="Nome ou identificador da coleção"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="studio-season">Temporada</Label>
                <Input
                  id="studio-season"
                  value={briefing.season}
                  onChange={(event) => updateBriefing("season", event.target.value)}
                  placeholder="Verão 2027"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-line">Linha</Label>
                <Input
                  id="studio-line"
                  value={briefing.line}
                  onChange={(event) => updateBriefing("line", event.target.value)}
                  placeholder="Casual, premium…"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="studio-target-price">Preço-alvo (informado)</Label>
                <Input
                  id="studio-target-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={briefing.targetPrice}
                  onChange={(event) => updateBriefing("targetPrice", event.target.value)}
                  placeholder="R$"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studio-fabric">Tecido desejado</Label>
                <Input
                  id="studio-fabric"
                  value={briefing.fabric}
                  onChange={(event) => updateBriefing("fabric", event.target.value)}
                  placeholder="Linho, malha…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-colors">Cores e referências</Label>
              <Input
                id="studio-colors"
                value={briefing.colors}
                onChange={(event) => updateBriefing("colors", event.target.value)}
                placeholder="Off-white, azul-marinho…"
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => void generateConcept()}
            disabled={generating || !briefing.description.trim()}
          >
            {generating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Criando conceito…" : "Gerar proposta"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (!briefing.description.trim()) return;
              applyProposal(nativeProposal(briefing) as Proposal);
              setReferenceCode((current) => current || suggestedCode);
              toast.success("Proposta criada pelo agente nativo, sem usar créditos.");
            }}
            disabled={generating || !briefing.description.trim()}
          >
            Gerar com agente nativo (sem créditos)
          </Button>
        </section>

        <section
          className="min-h-[360px] border-y border-border py-4 xl:border-x xl:border-y-0 xl:px-5"
          aria-labelledby="studio-concept-title"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="studio-concept-title" className="text-sm font-semibold text-white">
                Conceito do produto
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Resposta real do Fashion AI; requer validação humana
              </p>
            </div>
            {proposalText && (
              <Badge variant="outline" className="border-status-progress/30 text-status-progress">
                Rascunho IA
              </Badge>
            )}
          </div>
          {!proposalText ? (
            <div className="mt-5 flex min-h-64 flex-col items-center justify-center gap-3 border border-dashed border-border-strong/70 px-5 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Preencha o briefing e gere uma proposta para começar a revisão.
              </p>
            </div>
          ) : proposal ? (
            <div className="mt-5 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{proposal.name}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {proposal.description}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const nextIdeas = buildVariationIdeas(proposal, briefing);
                    const nextProposal = normalizeProductProposal({
                      ...proposal,
                      variations: nextIdeas,
                      imageIdeas: proposal.imageIdeas?.length
                        ? proposal.imageIdeas
                        : ["frente", "costas", "lateral", "modelo", "campanha"],
                      visualIdentity: proposal.visualIdentity?.length
                        ? proposal.visualIdentity
                        : [briefing.mood || "minimalista"],
                    });
                    applyProposal(nextProposal);
                  }}
                >
                  Gerar variações
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ConceptField
                  label="Categoria / família"
                  value={[proposal.category, proposal.family].filter(Boolean).join(" · ")}
                />
                <ConceptField label="Linha" value={proposal.line} />
                <ConceptField label="Silhueta" value={proposal.silhouette} />
                <ConceptList
                  label="Materiais sugeridos · validar"
                  values={proposal.suggestedMaterials}
                />
                <ConceptList label="Cores sugeridas · validar" values={proposal.colors} />
                <ConceptList label="Detalhes de construção" values={proposal.details} />
                <ConceptList
                  label="Identidade visual"
                  values={proposal.visualIdentity ?? [briefing.mood || "minimalista"]}
                />
                <ConceptList
                  label="Direções de imagem"
                  values={proposal.imageIdeas ?? ["frente", "costas", "modelo", "campanha"]}
                />
                <ConceptList
                  label="Variações conceituais"
                  values={variationIdeas.length ? variationIdeas : proposal.variations}
                />
                <ConceptList label="Pontos para revisão humana" values={proposal.validationNotes} />
              </div>

              <div className="rounded-md border border-border bg-muted/50 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-2xs font-bold uppercase tracking-[0.05em] text-foreground">
                    <Camera className="h-3.5 w-3.5 text-[#2A6F7D] dark:text-[#6AD8FA]" /> Diretor de
                    Fotografia IA · Médio-Formato HD
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {IMAGE_VIEWS.map((view) => (
                      <Button
                        key={view}
                        type="button"
                        size="xs"
                        variant={visualView === view ? "secondary" : "ghost"}
                        onClick={() => {
                          setVisualView(view);
                          setPhotoPreset(inferPresetFromView(view));
                        }}
                        className="h-6 rounded-full px-2 text-2xs uppercase"
                      >
                        {view}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Controles de Câmera, Estúdio e Microfísica Têxtil */}
                <div className="grid gap-2.5 sm:grid-cols-2 rounded-md border border-border bg-background/60 p-2.5">
                  <div className="space-y-1">
                    <Label
                      htmlFor="studio-photo-preset"
                      className="text-2xs uppercase tracking-wider text-muted-foreground"
                    >
                      Set Fotográfico & Lente
                    </Label>
                    <select
                      id="studio-photo-preset"
                      value={photoPreset}
                      onChange={(e) => setPhotoPreset(e.target.value as PhotoStudioPresetId)}
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                    >
                      {Object.values(PHOTO_STUDIO_PRESETS).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.defaultSize})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {PHOTO_STUDIO_PRESETS[photoPreset].shortDesc}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="studio-lighting-preset"
                      className="text-2xs uppercase tracking-wider text-muted-foreground"
                    >
                      Iluminação & Fidelidade de Cor
                    </Label>
                    <select
                      id="studio-lighting-preset"
                      value={lightingPreset}
                      onChange={(e) => setLightingPreset(e.target.value as LightingPresetId)}
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                    >
                      {Object.values(LIGHTING_PRESETS).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Microfísica têxtil ativa (trama, torção de fio, pesponto e caimento real).
                    </p>
                  </div>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={keepIdentity}
                      onChange={(e) => setKeepIdentity(e.target.checked)}
                      className="accent-primary"
                    />
                    Trava de identidade (input_fidelity: high)
                  </label>
                  <label
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                    title="Gera PNG com canal alpha transparente para vitrine, catálogo e prancheta"
                  >
                    <input
                      type="checkbox"
                      checked={transparentCutout}
                      onChange={(e) => setTransparentCutout(e.target.checked)}
                      className="accent-primary"
                    />
                    Fundo PNG transparente (canal alpha)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={nativeVisual}
                      onChange={(e) => setNativeVisual(e.target.checked)}
                      className="accent-primary"
                    />
                    Prévia local 3D volumétrica (instantânea, sem consumir créditos de IA)
                  </label>
                </div>

                {liveRenderPlan && !nativeVisual && (
                  <details className="rounded border border-border/80 bg-background/50 px-2.5 py-1.5 text-xs">
                    <summary className="cursor-pointer select-none font-medium text-2xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5">
                        <Sliders className="h-3 w-3 text-[#2A6F7D] dark:text-[#6AD8FA]" /> Prompt
                        Óptico & Microfísica Têxtil ({liveRenderPlan.size} ·{" "}
                        {liveRenderPlan.background === "transparent"
                          ? "PNG Alpha"
                          : "Estúdio Realista"}
                        )
                      </span>
                      <span className="text-[10px] font-mono text-primary">ver / editar</span>
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      <Textarea
                        aria-label="Prompt fotográfico detalhado"
                        value={customPromptOverride || liveRenderPlan.prompt}
                        onChange={(e) => setCustomPromptOverride(e.target.value)}
                        className="min-h-24 font-mono text-[11px] leading-relaxed"
                      />
                      {customPromptOverride && (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => setCustomPromptOverride("")}
                        >
                          Restaurar prompt calibrado automático
                        </Button>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => void generateVisual()}
                    disabled={imageBusy}
                    className="w-full"
                  >
                    {imageBusy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {nativeVisual
                      ? `Gerar prévia volumétrica (${visualView})`
                      : `Renderizar foto realista HD (${visualView})`}
                  </Button>
                </div>

                {imageBusy && !imageSource && (
                  <div
                    className="flex h-72 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border-strong/70 bg-background/50 text-sm text-muted-foreground"
                    role="status"
                  >
                    <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                    Renderizando fotografia {visualView} ({PHOTO_STUDIO_PRESETS[photoPreset].label}
                    )…
                  </div>
                )}
                {imageSource && (
                  <div className="overflow-hidden rounded-md border border-border bg-background/70">
                    <button
                      type="button"
                      onClick={() => openLightboxForSrc(imageSource)}
                      aria-label={`Ampliar visual ${visualView} de ${proposal.name} em tela cheia`}
                      style={
                        transparentCutout
                          ? {
                              backgroundColor: "#141D2E",
                              backgroundImage:
                                "linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)",
                              backgroundSize: "20px 20px",
                              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                            }
                          : undefined
                      }
                      className="group relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ExpandImageBadge />
                      <img
                        src={imageSource}
                        alt={`Conceito visual de ${proposal.name}, ${visualView}`}
                        className="h-80 w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    </button>
                    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
                      <span>
                        Visual {visualView} · {PHOTO_STUDIO_PRESETS[photoPreset].defaultSize} ·{" "}
                        {transparentCutout ? "PNG transparente" : "estúdio"} · clique na imagem para
                        ampliar
                      </span>
                      <ImageExportMenu
                        src={imageSource}
                        baseName={`${proposal.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${visualView}`}
                      />
                    </div>
                  </div>
                )}
                {generatedImages.length > 0 && (
                  <div
                    className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                    aria-label="Histórico desta sessão"
                  >
                    {generatedImages.map((image) => (
                      <Button
                        key={`${image.view}-${image.createdAt}`}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setImageSource(image.src);
                          if (!image.application) setVisualView(image.view);
                        }}
                        className="h-auto min-w-0 flex-col items-stretch overflow-hidden rounded border border-border p-0 text-left"
                        aria-label={`Visual ${image.view} para ${image.conceptName}`}
                      >
                        <img src={image.src} alt="" className="aspect-square w-full object-cover" />
                        <span className="block truncate px-1 pt-1 text-2xs text-muted-foreground">
                          {image.view}
                        </span>
                        {image.conceptName !== proposal?.name && (
                          <span className="block truncate px-1 pb-1 text-2xs text-muted-foreground">
                            {image.conceptName}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Variações de cor
                  </p>
                  <Input
                    value={variationColors}
                    onChange={(e) => setVariationColors(e.target.value)}
                    placeholder="areia, azul, preto"
                    className="text-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    {variationColors
                      .split(",")
                      .map((c) => c.trim())
                      .filter(Boolean)
                      .slice(0, 8)
                      .map((color) => (
                        <Button
                          key={color}
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={imageBusy}
                          onClick={() => void generateVisual(color)}
                        >
                          {color}
                        </Button>
                      ))}
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div>
                    <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-foreground">
                      Aplicar logo ou estampa
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Use o visual exibido como peça base.
                    </p>
                  </div>

                  <Field invalid={Boolean(artworkError)}>
                    <Label htmlFor="studio-artwork-upload">Arquivo da arte</Label>
                    <Input
                      id="studio-artwork-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void selectArtwork(event.target.files?.[0])}
                      className="text-xs file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground"
                    />
                    <FieldMessage variant={artworkError ? "error" : "helper"}>
                      {artworkError || "PNG, JPG ou WEBP, até 10 MB."}
                    </FieldMessage>
                  </Field>

                  {artwork && (
                    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 p-2">
                      <img
                        src={artwork.dataUrl}
                        alt="Prévia da arte enviada"
                        className="h-16 w-16 shrink-0 rounded-sm object-contain"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                        {artwork.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remover arte"
                        title="Remover arte"
                        onClick={() => {
                          setArtwork(null);
                          setArtworkError("");
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <Label>Posição na peça</Label>
                      <Select value={artworkPlacement} onValueChange={setArtworkPlacement}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARTWORK_PLACEMENTS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <Label>Técnica</Label>
                      <Select value={artworkTechnique} onValueChange={setArtworkTechnique}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARTWORK_TECHNIQUES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    disabled={!artwork || !imageSource || imageBusy}
                    onClick={() => void applyArtwork()}
                  >
                    {imageBusy ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
                    Aplicar arte no visual
                  </Button>
                  {!imageSource && (
                    <FieldMessage>
                      Gere ou escolha um visual da peça antes de aplicar a arte.
                    </FieldMessage>
                  )}
                </div>
              </div>

              <TechSketchPanel
                productName={proposal.name}
                summary={[
                  proposal.name,
                  proposal.category,
                  proposal.silhouette,
                  proposal.suggestedMaterials.join(", "),
                  proposal.details.join(", "),
                ]
                  .filter(Boolean)
                  .join("; ")}
                modelId={officialId}
                onModelChange={setOfficialId}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-border bg-muted/50 p-4">
              <p className="mb-2 text-xs font-medium text-status-progress">
                Resposta em formato livre
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                {proposalText}
              </pre>
            </div>
          )}
          <div className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <ImageOff className="mt-0.5 h-4 w-4 shrink-0" />A geração usa o provedor de imagens
            configurado no servidor. Cada ângulo é gerado como uma imagem independente: a ferramenta
            tenta seguir a identidade descrita, mas não garante consistência entre vistas. Use os
            resultados como conceito visual, nunca como ficha técnica ou validação de construção.
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="studio-save-title">
          <div>
            <h2 id="studio-save-title" className="text-sm font-semibold text-white">
              Revisão e produto
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Nada é liberado sem sua confirmação
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="studio-reference-name">Nome da referência *</Label>
              <Input
                id="studio-reference-name"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                maxLength={240}
                placeholder="Revise o nome antes de salvar"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="studio-reference-code">Código *</Label>
              <Input
                id="studio-reference-code"
                value={referenceCode}
                onChange={(event) => setReferenceCode(event.target.value.toUpperCase())}
                maxLength={60}
                placeholder={referencesLoading ? "Carregando códigos…" : suggestedCode}
              />
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-white">Ao salvar</p>
            <p className="mt-1">
              Será criada uma referência em Ideia com a proposta anexada ao histórico de metadados.
              O status continua sujeito ao workflow normal.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => void saveDraft()}
            disabled={
              !proposalText ||
              !productName.trim() ||
              saving ||
              referencesLoading ||
              Boolean(referencesError)
            }
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar rascunho para revisão
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/references">
              Ver referências <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        items={lightboxItems}
        initialIndex={lightboxIndex}
      />
    </div>
  );
}

function ConceptField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border pb-3">
      <p className="text-2xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm text-white">{value || "Não informado"}</p>
    </div>
  );
}

function ConceptList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="min-w-0 border-b border-border pb-3">
      <p className="text-2xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-white">
        {values.length ? values.join(" · ") : "Não informado"}
      </p>
    </div>
  );
}
