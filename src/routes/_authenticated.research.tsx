import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Hash,
  Palette,
  Shirt,
  Sparkles,
  SwatchBook,
  Tags,
} from "lucide-react";
import { ModuleLayout, ModuleActionMenu } from "@/components/modules/ModuleLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MoodBoard } from "@/components/research/MoodBoard";
import { AiCroquiPanel } from "@/components/research/AiCroquiPanel";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";
import {
  BRIEFING_DEMO_LABEL,
  briefingsOperacionais,
  convertBriefingToTechSheetStore,
  useResearchGtmStore,
  type BriefingInsight,
} from "@/lib/techsheet/research-gtm";
import type { GarmentSilhouette } from "@/lib/techsheet/textile";

export const Route = createFileRoute("/_authenticated/research")({
  component: ResearchHub,
});

const CAPSULES: Array<"Todos" | BriefingInsight["capsule"]> = [
  "Todos",
  "Alto Verão 2027",
  "Cápsula Resort",
  "Alfaiataria Tech",
  "Essenciais Pima",
];

function ResearchHub() {
  const navigate = useNavigate();
  const briefings = useResearchGtmStore((s) => s.briefings);
  const upsertBriefing = useResearchGtmStore((s) => s.upsertBriefing);
  const deleteBriefing = useResearchGtmStore((s) => s.deleteBriefing);
  const markBriefingConverted = useResearchGtmStore((s) => s.markBriefingConverted);

  const [selectedCapsule, setSelectedCapsule] = useState<(typeof CAPSULES)[number]>("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [zoomItem, setZoomItem] = useState<BriefingInsight | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BriefingInsight | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    capsule: BriefingInsight["capsule"];
    imageUrl: string;
    fabricSuggestion: string;
    gramaturaGm2: string;
    compositionFibra: string;
    silhouette: GarmentSilhouette;
    colorName: string;
    colorHex: string;
    targetPriceBrl: string;
    tags: string;
  }>({
    title: "",
    capsule: "Alto Verão 2027",
    imageUrl:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=800",
    fabricSuggestion: "Meia Malha Pima 170 g/m²",
    gramaturaGm2: "170",
    compositionFibra: "Algodão Pima",
    silhouette: "camiseta_v",
    colorName: "Off-White",
    colorHex: "#F5F2EB",
    targetPriceBrl: "189.90",
    tags: "verao, pima, essencial",
  });

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return briefings.filter((b) => {
      if (selectedCapsule !== "Todos" && b.capsule !== selectedCapsule) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.fabricSuggestion.toLowerCase().includes(q) ||
        b.colorName.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [briefings, selectedCapsule, searchTerm]);

  const convertedCount = useMemo(
    () => briefings.filter((b) => Boolean(b.convertedRefCode)).length,
    [briefings],
  );

  // Onda 41: os 4 briefings de fábrica têm confidencePct e targetPriceBrl
  // inventados. A média 92,5% virava "Aderência Comercial · score tendência".
  const briefingsReais = useMemo(() => briefingsOperacionais(briefings), [briefings]);
  const soVitrine = briefingsReais.length === 0;
  const avgConfidence = useMemo(() => {
    if (briefingsReais.length === 0) return null;
    return Math.round(
      briefingsReais.reduce((a, b) => a + b.confidencePct, 0) / briefingsReais.length,
    );
  }, [briefingsReais]);

  function handleOpenDialog(item?: BriefingInsight) {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        capsule: item.capsule,
        imageUrl: item.imageUrl,
        fabricSuggestion: item.fabricSuggestion,
        gramaturaGm2: String(item.gramaturaGm2),
        compositionFibra: item.compositionFibra,
        silhouette: item.silhouette,
        colorName: item.colorName,
        colorHex: item.colorHex,
        targetPriceBrl: String(item.targetPriceBrl),
        tags: item.tags.join(", "),
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        capsule: "Alto Verão 2027",
        imageUrl:
          "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=800",
        fabricSuggestion: "Meia Malha Pima 170 g/m²",
        gramaturaGm2: "170",
        compositionFibra: "Algodão Pima",
        silhouette: "camiseta_v",
        colorName: "Off-White",
        colorHex: "#F5F2EB",
        targetPriceBrl: "189.90",
        tags: "verao, pima, essencial",
      });
    }
    setIsDialogOpen(true);
  }

  function handleSave() {
    if (!formData.title.trim()) {
      toast.error("Informe o título do briefing criativo.");
      return;
    }
    const tagArray = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    const next: BriefingInsight = {
      id: editingItem?.id ?? `br-${Date.now()}`,
      title: formData.title.trim(),
      capsule: formData.capsule,
      imageUrl: formData.imageUrl.trim(),
      fabricSuggestion: formData.fabricSuggestion.trim() || "Tecido Principal",
      gramaturaGm2: Math.max(60, Number(formData.gramaturaGm2) || 165),
      compositionFibra: formData.compositionFibra.trim() || "Algodão",
      silhouette: formData.silhouette,
      colorName: formData.colorName.trim() || "Cor Base",
      colorHex: formData.colorHex.trim() || "#1D6B47",
      targetPriceBrl: Math.max(29, Number(formData.targetPriceBrl) || 179.9),
      confidencePct: editingItem?.confidencePct ?? 93,
      tags: tagArray.length > 0 ? tagArray : ["#colecao"],
      convertedRefCode: editingItem?.convertedRefCode,
    };

    upsertBriefing(next);
    setIsDialogOpen(false);
    toast.success(
      editingItem ? "Briefing criativo atualizado!" : "Novo briefing fixado no hub persistido!",
    );
  }

  function handleConvertBriefing(item: BriefingInsight, idx: number) {
    const refCode = convertBriefingToTechSheetStore(item, idx + 1);
    markBriefingConverted(item.id, refCode);
    toast.success(
      `Ficha Técnica ${refCode} gerada com tecido ${item.fabricSuggestion} (${item.gramaturaGm2} g/m²)!`,
    );
    void navigate({ to: "/tech-sheet", search: { ref: refCode } as never });
  }

  function handlePinAiRender(dataUrl: string) {
    const newItem: BriefingInsight = {
      id: `br-ai-${Date.now()}`,
      title: `Criação Studio IA · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      capsule: "Alto Verão 2027",
      imageUrl: dataUrl,
      fabricSuggestion: "Linho / Algodão Premium 180 g/m²",
      gramaturaGm2: 180,
      compositionFibra: "Linho",
      silhouette: "camisa_polo",
      colorName: "Cru Studio",
      colorHex: "#E8E0D5",
      targetPriceBrl: 249.9,
      confidencePct: 96,
      tags: ["#ia-studio", "#png-transparente"],
    };
    upsertBriefing(newItem);
    toast.success("Arte IA (fundo transparente) fixada nos Briefings para virar Ficha Técnica!");
  }

  return (
    <ModuleLayout
      title="Pesquisa Criativa & Conversor de Briefing"
      subtitle="Briefings persistidos por cápsula, croquis/fotos IA em PNG transparente e conversão em 1 clique para Ficha Técnica Industrial (BOM, cor, gramatura e ABNT)."
      version="Creative-to-Engineering v3.0"
      onAdd={() => handleOpenDialog()}
      onSearch={setSearchTerm}
      searchPlaceholder="Buscar briefing, tecido, gramatura, cor ou tag"
      metrics={[
        {
          label: "Briefings Ativos",
          value: soVitrine ? "—" : String(briefingsReais.length),
          detail: soVitrine ? "só demonstração" : "persistidos",
        },
        {
          label: "Fichas Geradas",
          value: String(convertedCount),
          detail: "enviadas p/ engenharia",
        },
        { label: "Cápsulas", value: String(CAPSULES.length - 1), detail: "em planejamento" },
        {
          label: "Aderência Comercial",
          value: avgConfidence === null ? "—" : `${avgConfidence}%`,
          detail: avgConfidence === null ? "score não apurável" : "score tendência",
        },
      ]}
    >
      {/* Onda 63: siglas medidas no texto desta tela, sem glossário até aqui. */}
      <GlossarioTermos siglas={["ABNT", "CAD", "DPP", "ESG", "OTB"]} testId="glossario-research" />
      {soVitrine && (
        <div
          data-testid="briefing-so-vitrine"
          className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300"
        >
          <strong>{briefings.length} briefings de demonstração.</strong> {BRIEFING_DEMO_LABEL}. Crie
          ou edite um briefing para que a aderência comercial e o preço-alvo passem a ser apurados.
          <CtaProximoPasso
            passo="ficha"
            onAcao={() => handleOpenDialog()}
            label="Criar briefing"
            testId="cta-briefing-so-vitrine"
          />
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 mb-6">
        <Card className="glass-card rounded-xl p-5 border-primary/20 bg-primary/[0.03]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Silhuetas Chave", value: "Polo Tricot, Jogger Tech, Raglan", icon: Shirt },
              {
                label: "Bases Homologadas",
                value: "Linho 195g, Pima 165g, Bi-Stretch",
                icon: SwatchBook,
              },
              {
                label: "Cartela Direcional",
                value: "Areia, Sálvia, Ônix, Atlântico",
                icon: Palette,
              },
              { label: "Ponte PLM", value: "1-Clique → BOM + ABNT + Cor", icon: Tags },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-background/60 p-3.5"
              >
                <item.icon className="h-4 w-4 text-primary" />
                <p className="mt-2 text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-xs font-bold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-2xs font-semibold uppercase tracking-[0.05em] text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Termômetro Sell-Through & OTB
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>• Fibras naturais monomaterial (Linho/Pima) elevam nota ESG DPP para Classe A.</p>
              <p>• Meta de preço-alvo calibrada direto no divisor Mark-up da Ficha Técnica.</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/ai-center" })}
            className="mt-3 w-full gap-1.5 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Abrir AI Product Studio Completo
          </Button>
        </Card>
      </div>

      <div className="flex items-center gap-2 border-b border-border/60 pb-4 mb-6 overflow-x-auto">
        {CAPSULES.map((cat) => (
          <Button
            key={cat}
            type="button"
            size="sm"
            variant={selectedCapsule === cat ? "default" : "ghost"}
            onClick={() => setSelectedCapsule(cat)}
            className="text-2xs tracking-[0.04em]"
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative group"
          >
            <Card className="glass-card rounded-xl overflow-hidden hover:border-primary/40 transition-all flex flex-col h-full">
              <div className="relative aspect-[4/4] bg-muted/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setZoomItem(item)}
                  title="Clique para expandir referência visual em tela cheia"
                  className="w-full h-full block cursor-zoom-in"
                >
                  <img
                    src={item.imageUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={item.title}
                  />
                </button>
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <Badge className="bg-background/90 text-foreground border-border text-[10px]">
                    {item.capsule}
                  </Badge>
                  {item.demo && (
                    <Badge
                      variant="outline"
                      title={BRIEFING_DEMO_LABEL}
                      className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                    >
                      Demonstração
                    </Badge>
                  )}
                </div>
                <div className="absolute top-2.5 right-2.5 z-10">
                  <ModuleActionMenu
                    onEdit={() => handleOpenDialog(item)}
                    onDelete={() => {
                      deleteBriefing(item.id);
                      toast.info("Briefing removido.");
                    }}
                    onView={() => setZoomItem(item)}
                  />
                </div>
              </div>

              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 text-2xs font-mono text-muted-foreground">
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: item.colorHex }}
                      />
                      {item.colorName}
                    </span>
                    <span className="text-2xs font-mono font-bold text-primary">
                      R$ {item.targetPriceBrl.toFixed(2)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground leading-snug">{item.title}</h3>
                  <p className="text-2xs text-muted-foreground mt-1">
                    {item.fabricSuggestion} · 100% {item.compositionFibra}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex gap-1.5 flex-wrap">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                      >
                        <Hash className="w-2.5 h-2.5" /> {tag.replace("#", "")}
                      </span>
                    ))}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={item.convertedRefCode ? "outline" : "default"}
                    onClick={() => handleConvertBriefing(item, i)}
                    className="w-full h-8 text-xs gap-1.5"
                  >
                    {item.convertedRefCode ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Abrir Ficha {item.convertedRefCode}
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Converter em Ficha Técnica
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Briefing Criativo" : "Novo Briefing Criativo para Engenharia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-[1fr_170px] gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Nome da Peça</Label>
                <Input
                  aria-label="Nome da Peça"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Camisa Linho Resort Manga Curta"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Cápsula</Label>
                <select
                  aria-label="Cápsula"
                  value={formData.capsule}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capsule: e.target.value as BriefingInsight["capsule"],
                    })
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                >
                  {CAPSULES.filter((c) => c !== "Todos").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_110px_130px] gap-2.5">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Tecido Sugerido</Label>
                <Input
                  aria-label="Tecido Sugerido"
                  value={formData.fabricSuggestion}
                  onChange={(e) => setFormData({ ...formData, fabricSuggestion: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Gramatura g/m²</Label>
                <Input
                  aria-label="Gramatura g/m²"
                  type="number"
                  value={formData.gramaturaGm2}
                  onChange={(e) => setFormData({ ...formData, gramaturaGm2: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Fibra ABNT</Label>
                <Input
                  aria-label="Fibra ABNT"
                  value={formData.compositionFibra}
                  onChange={(e) => setFormData({ ...formData, compositionFibra: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Silhueta CAD</Label>
                <select
                  aria-label="Silhueta CAD"
                  value={formData.silhouette}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      silhouette: e.target.value as GarmentSilhouette,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="camiseta_v">Camiseta / Top</option>
                  <option value="camisa_polo">Polo / Camisa</option>
                  <option value="moletom_raglan">Moletom / Casaco</option>
                  <option value="calca_jogger">Calça / Bottom</option>
                </select>
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Nome Cor</Label>
                <Input
                  aria-label="Nome Cor"
                  value={formData.colorName}
                  onChange={(e) => setFormData({ ...formData, colorName: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">HEX</Label>
                <Input
                  aria-label="HEX"
                  value={formData.colorHex}
                  onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Preço Alvo R$</Label>
                <Input
                  aria-label="Preço Alvo R$"
                  type="number"
                  step="0.1"
                  value={formData.targetPriceBrl}
                  onChange={(e) => setFormData({ ...formData, targetPriceBrl: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-2xs uppercase text-muted-foreground">
                URL da Imagem / Render
              </Label>
              <Input
                aria-label="URL da Imagem / Render"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-2xs uppercase text-muted-foreground">Tags</Label>
              <Input
                aria-label="Tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Briefing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {zoomItem && (
        <ImageLightbox
          open={Boolean(zoomItem)}
          onOpenChange={(next) => {
            if (!next) setZoomItem(null);
          }}
          items={[
            {
              src: zoomItem.imageUrl,
              alt: zoomItem.title,
              title: `${zoomItem.title} · ${zoomItem.capsule}`,
              subtitle: `${zoomItem.fabricSuggestion} · Cor ${zoomItem.colorName} (${zoomItem.colorHex})`,
              exportBaseName: `briefing-${zoomItem.id}`,
            },
          ]}
        />
      )}

      <MoodBoard />
      <AiCroquiPanel onSave={handlePinAiRender} />
    </ModuleLayout>
  );
}
