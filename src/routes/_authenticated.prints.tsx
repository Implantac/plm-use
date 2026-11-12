// H1-03 · Cartela de Estampas (inspirado em Coleção.Moda / Kubix Link / NedGraphics).
// Biblioteca versionada de estampas com metadados (repeat, cores, técnica, fornecedor),
// diagnóstico químico/industrial IA, geração de arte em PNG transparente, upload real
// de arquivo, vínculo direto com Aplicações da Ficha Técnica e expansão em tela cheia.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { onQuickAction } from "@/lib/nav/routes";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Sparkles,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Link2,
  Loader2,
  Ruler,
  Layers as LayersIcon,
  History,
  Tag,
  FileImage,
  Wand2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ExpandImageBadge, ImageLightbox } from "@/components/ui/image-lightbox";
import { toast } from "sonner";
import { FieldMessage } from "@/components/ui/field-message";
import { LocalHistoryButton } from "@/components/entity/LocalHistoryButton";
import {
  listPrints,
  subscribe,
  upsertPrint,
  addVersion,
  type PrintAsset,
} from "@/lib/prints/store";
import { APLICACAO_POSICOES_SUGERIDAS } from "@/lib/techsheet/aplicacoes";
import {
  analyzePrintTechnicalViability,
  buildAplicacaoFromPrint,
} from "@/lib/techsheet/digital-twin";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { SemFichaSalva } from "@/components/techsheet/SemFichaSalva";
import { useOperationalRefs, useSelectedRef } from "@/lib/techsheet/use-operational-refs";
import { streamImage } from "@/lib/streamImage";

export const Route = createFileRoute("/_authenticated/prints")({
  head: () => ({
    meta: [
      { title: "Cartela de Estampas · USE MODA PLM" },
      {
        name: "description",
        content:
          "Biblioteca versionada de estampas com rapport, técnica, cores, fornecedor de estamparia e vínculo direto com a ficha técnica.",
      },
      { property: "og:title", content: "Cartela de Estampas · USE MODA PLM" },
      {
        property: "og:description",
        content: "Cadastre estampas, controle versões e vincule à ficha técnica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrintsRoute,
});

const STATUS_LABEL: Record<PrintAsset["status"], string> = {
  rascunho: "Rascunho",
  em_prova: "Em prova",
  aprovada: "Aprovada",
  arquivada: "Arquivada",
};

const STATUS_CLASS: Record<PrintAsset["status"], string> = {
  rascunho: "bg-muted/40 text-muted-foreground",
  em_prova: "bg-status-progress/15 text-status-progress border-status-progress/30",
  aprovada: "bg-status-approved/15 text-status-approved border-status-approved/30",
  arquivada: "bg-muted/50 text-muted-foreground",
};

const TECNICA_LABEL: Record<PrintAsset["tecnica"], string> = {
  digital: "Digital",
  rotativa: "Rotativa",
  localizada: "Localizada",
  sublimacao: "Sublimação",
  silk: "Silk",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Arquivo inválido."));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

function PrintsRoute() {
  const prints = useSyncExternalStore(
    (l) => {
      const off = subscribe(l);
      return () => off();
    },
    () => listPrints(),
    () => listPrints(),
  );

  const [selectedId, setSelectedId] = useState<string>(prints[0]?.id ?? "");
  const [filter, setFilter] = useState<PrintAsset["status"] | "todas">("todas");

  const filtered = useMemo(
    () => (filter === "todas" ? prints : prints.filter((p) => p.status === filter)),
    [prints, filter],
  );

  const selected = useMemo(
    () => prints.find((p) => p.id === selectedId) ?? filtered[0] ?? prints[0],
    [prints, filtered, selectedId],
  );

  const metrics = useMemo(() => {
    const total = prints.length;
    const approved = prints.filter((p) => p.status === "aprovada").length;
    const inProof = prints.filter((p) => p.status === "em_prova").length;
    const linked = prints.reduce((s, p) => s + p.linkedRefs, 0);
    return [
      { label: "Estampas ativas", value: String(total), detail: `${approved} aprovadas` },
      { label: "Em prova", value: String(inProof), detail: "aguardando OK" },
      { label: "Refs vinculadas", value: String(linked), detail: "em produção" },
      {
        label: "Reutilização",
        value: total ? `${Math.round((linked / Math.max(total, 1)) * 10) / 10}x` : "0x",
        detail: "média por estampa",
      },
    ];
  }, [prints]);

  const handleAddPrint = useCallback(() => {
    const id = `est-${Date.now()}`;
    upsertPrint({
      id,
      code: `EST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "Nova estampa",
      tecnica: "digital",
      repeat: { widthCm: 40, heightCm: 50 },
      colorCount: 1,
      colors: ["#888888"],
      status: "rascunho",
      cover:
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=900",
      fileFormat: "AI",
      linkedRefs: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
      tags: [],
      versions: [
        {
          id: `v-${Date.now()}`,
          label: "v1",
          createdAt: new Date().toISOString().slice(0, 10),
          createdBy: "Você",
          image:
            "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600",
        },
      ],
    });
    setSelectedId(id);
    toast.success("Estampa criada");
  }, []);

  useEffect(() => onQuickAction("quick:new-print", handleAddPrint), [handleAddPrint]);

  return (
    <ModuleLayout
      title="Cartela de Estampas"
      subtitle="Biblioteca versionada de estampas com técnica, rapport e fornecedor de estamparia. Vincula à ficha técnica e à cartela de cores."
      version="H1-03 · V5"
      searchPlaceholder="Buscar estampa, código ou tag"
      metrics={metrics}
      onAdd={handleAddPrint}
    >
      {/* Filtros de status */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["todas", "rascunho", "em_prova", "aprovada", "arquivada"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-2xs uppercase tracking-widest border transition-colors ${
              filter === f
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border-strong/70"
            }`}
          >
            {f === "todas" ? "Todas" : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Grid de estampas */}
        <div className="grid grid-cols-2 gap-3 content-start">
          {filtered.map((p) => {
            const active = selected?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`text-left rounded-lg overflow-hidden border transition-all ${
                  active
                    ? "border-primary/60 ring-2 ring-primary/30"
                    : "border-border hover:border-border-strong/70"
                }`}
              >
                <div className="relative aspect-square bg-black/40">
                  <OptimizedImage
                    src={p.cover}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge
                      variant="outline"
                      className={`text-2xs uppercase tracking-widest ${STATUS_CLASS[p.status]}`}
                    >
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 flex gap-0.5">
                    {p.colors.slice(0, 5).map((c, i) => (
                      <div
                        key={i}
                        className="h-3 w-3 rounded-full border border-border-strong"
                        style={{ background: c }}
                      />
                    ))}
                    {p.colors.length > 5 && (
                      <span
                        className="text-2xs text-white/80 ml-0.5 self-center"
                        title={`${p.colors.length} variações de cor da estampa`}
                      >
                        +{p.colors.length - 5}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2.5 bg-muted/40">
                  <p className="text-2xs font-mono text-muted-foreground">{p.code}</p>
                  <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                  <div className="flex items-center justify-between mt-1 text-2xs text-muted-foreground">
                    <span>{TECNICA_LABEL[p.tecnica]}</span>
                    <span className="flex items-center gap-1">
                      <Link2 className="h-2.5 w-2.5" /> {p.linkedRefs}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              Nenhuma estampa com esse filtro
            </div>
          )}
        </div>

        {/* Detalhe */}
        {selected && <PrintDetail print={selected} />}
      </div>
    </ModuleLayout>
  );
}

function PrintDetail({ print }: { print: PrintAsset }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const lightboxItems = useMemo(() => {
    const base = [
      {
        src: print.cover,
        alt: print.name,
        title: `${print.code} · ${print.name}`,
        subtitle: `${TECNICA_LABEL[print.tecnica]} · ${print.colorCount} cor(es) · Inspeção em tela cheia`,
        exportBaseName: print.code.toLowerCase(),
      },
    ];
    for (const v of print.versions) {
      if (!base.some((it) => it.src === v.image)) {
        base.push({
          src: v.image,
          alt: `${print.name} (${v.label})`,
          title: `${print.code} · ${v.label}`,
          subtitle: v.note || `Criada em ${v.createdAt}`,
          exportBaseName: `${print.code.toLowerCase()}-${v.label}`,
        });
      }
    }
    return base;
  }, [print]);

  function openLightboxAt(src: string) {
    const idx = lightboxItems.findIndex((it) => it.src === src);
    setLightboxIndex(idx >= 0 ? idx : 0);
    setLightboxOpen(true);
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-muted/50 overflow-hidden">
        <div className="group relative aspect-[16/9] bg-black/40 overflow-hidden">
          <button
            type="button"
            onClick={() => openLightboxAt(print.cover)}
            aria-label={`Ampliar estampa ${print.name} em tela cheia`}
            className="block h-full w-full cursor-zoom-in text-left"
          >
            <ExpandImageBadge />
            <OptimizedImage
              src={print.cover}
              alt={print.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </button>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
            <div className="pointer-events-none">
              <p className="text-2xs font-mono text-slate-300 uppercase tracking-widest">
                {print.code}
              </p>
              <h2 className="text-2xl font-bold text-slate-100 leading-tight">{print.name}</h2>
              <p className="text-xs text-slate-200 mt-1">
                {TECNICA_LABEL[print.tecnica]} · {print.season ?? "—"} · {print.brand ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LocalHistoryButton
                entityType="print_design"
                entityId={print.id}
                entityLabel={`${print.code} · ${print.name}`}
                variant="outline"
                size="sm"
                className="gap-1.5 border-border-strong/70 bg-black/50 text-slate-100 hover:bg-black/70"
              />
              <Badge
                variant="outline"
                className={`${STATUS_CLASS[print.status]} text-2xs uppercase tracking-widest`}
              >
                {STATUS_LABEL[print.status]}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="p-5 space-y-4">
          {/* Metadados técnicos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <MetaCell
              icon={<Ruler className="h-3.5 w-3.5" />}
              label="Rapport"
              value={
                print.repeat.widthCm === 0 && print.repeat.heightCm === 0
                  ? "Localizada"
                  : `${print.repeat.widthCm} × ${print.repeat.heightCm} cm`
              }
            />
            <MetaCell
              icon={<LayersIcon className="h-3.5 w-3.5" />}
              label="Cores"
              value={`${print.colorCount} · CMYK/Spot`}
            />
            <MetaCell
              icon={<FileImage className="h-3.5 w-3.5" />}
              label="Arquivo"
              value={`${print.fileFormat}${print.fileSizeMb ? ` · ${print.fileSizeMb} MB` : ""}`}
            />
            <MetaCell
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Atualizada"
              value={print.updatedAt}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Estamparia:{" "}
              <span className="text-foreground font-medium">{print.supplier ?? "—"}</span>
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {print.linkedRefs} referências vinculadas
            </span>
          </div>

          {print.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {print.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-2xs text-muted-foreground"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
            <NewVersionDialog printId={print.id} />
            {print.status !== "aprovada" && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  upsertPrint({ ...print, status: "aprovada" });
                  toast.success(`${print.code} aprovada`);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setLinkDialogOpen(true)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary" /> Vincular à Ficha Técnica
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setAiDialogOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Análise & Variante IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de versões (clicáveis para ampliar em tela cheia) */}
      <Card className="border-border bg-muted/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span className="text-2xs uppercase tracking-[0.05em] text-muted-foreground">
                Histórico de versões
              </span>
            </div>
            <span className="text-2xs text-muted-foreground">Clique na miniatura para ampliar</span>
          </div>
          <div className="space-y-2">
            {print.versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/40 p-2"
              >
                <button
                  type="button"
                  onClick={() => openLightboxAt(v.image)}
                  aria-label={`Ampliar versão ${v.label}`}
                  className="h-12 w-12 rounded overflow-hidden border border-border flex-shrink-0 cursor-zoom-in"
                >
                  <OptimizedImage
                    src={v.image}
                    alt={v.label}
                    className="h-full w-full object-cover"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{v.label}</p>
                  <p className="text-2xs text-muted-foreground truncate">
                    {v.createdAt} · {v.createdBy}
                    {v.note ? ` · ${v.note}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        items={lightboxItems}
        initialIndex={lightboxIndex}
      />

      <PrintAiDialog print={print} open={aiDialogOpen} onOpenChange={setAiDialogOpen} />
      <LinkPrintToTechSheetDialog
        print={print}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />
    </div>
  );
}

function MetaCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/40 p-2.5">
      <div className="flex items-center gap-1.5 text-2xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-xs font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

function PrintAiDialog({
  print,
  open,
  onOpenChange,
}: {
  print: PrintAsset;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { sheetsMap, codes: refOptions } = useOperationalRefs();
  const [targetRef, setTargetRef] = useSelectedRef(refOptions);
  const [promptExtra, setPromptExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [generatedSrc, setGeneratedSrc] = useState<string | null>(null);

  // Sem ficha salva não há compatibilidade química para analisar: a "análise
  // industrial" de uma estampa contra uma ficha de demonstração é número inventado.
  // `targetRef` só existe se estiver em `codes` (fichas salvas), então não há
  // fallback: buscar direto no mapa deixa a regra visível.
  const targetDoc = useMemo(
    () => (targetRef ? (sheetsMap[targetRef] ?? null) : null),
    [sheetsMap, targetRef],
  );
  const viability = useMemo(
    () => (targetDoc ? analyzePrintTechnicalViability(print, targetDoc) : null),
    [print, targetDoc],
  );

  async function generatePrintVariant() {
    setBusy(true);
    setGeneratedSrc(null);
    let finalDataUrl = "";
    try {
      const prompt = [
        `High-precision commercial textile print motif / graphic artwork for fashion apparel: "${print.name}" (${TECNICA_LABEL[print.tecnica]}).`,
        promptExtra.trim() ? `Variation direction: ${promptExtra.trim()}.` : "",
        `Color palette limited to ${Math.max(1, print.colorCount)} spot colors (${print.colors.join(", ")}).`,
        "Clean production-ready graphic artwork isolated on a 100% pure alpha-channel transparent PNG background, crisp edges, zero garment mockup, zero backdrop, zero text watermark.",
      ]
        .filter(Boolean)
        .join(" ");

      await streamImage(
        "/api/generate-image",
        prompt,
        (dataUrl) => {
          finalDataUrl = dataUrl;
          setGeneratedSrc(dataUrl);
        },
        undefined,
        { background: "transparent", size: "1024x1024", inputFidelity: "high" },
      );

      if (finalDataUrl) {
        const nextNum = print.versions.length + 1;
        addVersion(print.id, {
          id: `v-${Date.now()}`,
          label: `v${nextNum} · IA PNG Alpha`,
          createdAt: new Date().toISOString().slice(0, 10),
          createdBy: "Agente Têxtil IA",
          note: promptExtra.trim() || "Arte gerada em fundo PNG transparente",
          image: finalDataUrl,
        });
        toast.success(`Nova versão v${nextNum} gerada em PNG transparente e salva no histórico!`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar variante IA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Análise Industrial & Variante IA · {print.code} ({TECNICA_LABEL[print.tecnica]})
          </DialogTitle>
        </DialogHeader>
        {!targetDoc || !viability ? (
          <SemFichaSalva acao="analisar a compatibilidade química da estampa" />
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="print-ai-ref">Validar compatibilidade química contra a Ficha:</Label>
              <select
                id="print-ai-ref"
                value={targetRef}
                onChange={(e) => setTargetRef(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {refOptions.map((r) => (
                  <option key={r} value={r}>
                    {r} — {sheetsMap[r]?.meta?.name ?? "Ficha Técnica"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded border border-border bg-muted/40 p-2.5">
                <span className="text-2xs uppercase text-muted-foreground block">
                  Score Técnico
                </span>
                <strong className="font-mono text-sm text-foreground">{viability.score}/100</strong>
              </div>
              <div className="rounded border border-border bg-muted/40 p-2.5">
                <span className="text-2xs uppercase text-muted-foreground block">Custo / Peça</span>
                <strong className="font-mono text-sm text-foreground">
                  R$ {viability.estimatedUnitCostBrl.toFixed(2)}
                </strong>
              </div>
              <div className="rounded border border-border bg-muted/40 p-2.5">
                <span className="text-2xs uppercase text-muted-foreground block">
                  Setup Estimado
                </span>
                <strong className="font-mono text-sm text-foreground">
                  R$ {viability.estimatedSetupBrl.toFixed(2)}
                </strong>
              </div>
            </div>

            {viability.alerts.map((a, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-amber-700 dark:text-amber-300"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{a}</span>
              </div>
            ))}

            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              {viability.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>

            <div className="border-t border-border pt-3 space-y-2">
              <Label htmlFor="print-ai-prompt" className="text-2xs uppercase tracking-wider">
                Gerar nova variante de estampa em PNG Transparente (IA)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="print-ai-prompt"
                  value={promptExtra}
                  onChange={(e) => setPromptExtra(e.target.value)}
                  placeholder="Ex.: traço botânico minimalista em verde-esmeralda e dourado"
                  disabled={busy}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void generatePrintVariant()}
                  className="gap-1.5 shrink-0"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )}
                  Gerar PNG
                </Button>
              </div>
              {generatedSrc && (
                <div className="rounded-md border border-border p-2 flex items-center justify-center bg-[#141D2E]">
                  <img src={generatedSrc} alt="Variante gerada" className="h-36 object-contain" />
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkPrintToTechSheetDialog({
  print,
  open,
  onOpenChange,
}: {
  print: PrintAsset;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { sheetsMap, codes: refOptions } = useOperationalRefs();
  const addAplicacao = useTechSheetStore((s) => s.addAplicacao);

  const [targetRef, setTargetRef] = useSelectedRef(refOptions);
  const [posicao, setPosicao] = useState<string>("Peito central");

  function confirmLink() {
    if (!targetRef) {
      toast.error("Nenhuma ficha salva para receber a estampa. Salve uma ficha técnica antes.");
      return;
    }
    // Onda 35: vincular estampa não pode fabricar a ficha. `targetRef` vem de
    // `useOperationalRefs`, então a ausência é erro declarado, não `ensure()`.
    const doc = sheetsMap[targetRef];
    if (!doc) {
      toast.error("A ficha de destino não está mais salva. Selecione outra referência.");
      return;
    }
    const draft = buildAplicacaoFromPrint(print, posicao, doc);
    addAplicacao(targetRef, draft);
    upsertPrint({
      ...print,
      linkedRefs: (print.linkedRefs || 0) + 1,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    toast.success(
      `Estampa ${print.code} vinculada em Aplicações (${posicao}) da Ficha Técnica ${targetRef}!`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular {print.code} à Ficha Técnica</DialogTitle>
        </DialogHeader>
        {refOptions.length === 0 ? (
          <SemFichaSalva acao="vincular a estampa a uma ficha técnica" />
        ) : (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="link-print-ref">Ficha Técnica de destino</Label>
              <select
                id="link-print-ref"
                value={targetRef}
                onChange={(e) => setTargetRef(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {refOptions.map((r) => (
                  <option key={r} value={r}>
                    {r} — {sheetsMap[r]?.meta?.name ?? "Ficha Técnica"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="link-print-pos">Posição na peça</Label>
              <select
                id="link-print-pos"
                value={posicao}
                onChange={(e) => setPosicao(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                {APLICACAO_POSICOES_SUGERIDAS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmLink} className="gap-1.5">
            <Link2 className="h-3.5 w-3.5" /> Inserir em Aplicações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewVersionDialog({ printId }: { printId: string }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [image, setImage] = useState(
    "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=600",
  );
  const [format, setFormat] = useState<PrintAsset["fileFormat"]>("AI");

  async function handleFileUpload(file?: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("O arquivo deve ter até 10 MB.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
      toast.success(`Arquivo ${file.name} carregado na prévia.`);
    } catch {
      toast.error("Não foi possível ler o arquivo enviado.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-3.5 w-3.5" /> Nova versão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova versão da estampa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-2xs uppercase tracking-widest" required>
                Rótulo
              </Label>
              <Input
                aria-label="Rótulo"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  if (e.target.value.trim()) setLabelError(null);
                }}
                placeholder="v2 · ajuste rapport"
                aria-invalid={!!labelError}
              />
              {labelError && <FieldMessage variant="error">{labelError}</FieldMessage>}
            </div>
            <div>
              <Label className="text-2xs uppercase tracking-widest">Formato</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as PrintAsset["fileFormat"])}
              >
                <SelectTrigger aria-label="Formato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["AI", "PSD", "SVG", "TIFF", "PDF"] as const).map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-2xs uppercase tracking-widest">
              Enviar arquivo de arte (PNG, JPG, WEBP ou SVG) ou informar URL
            </Label>
            <Input
              aria-label="Enviar arquivo de arte (PNG, JPG, WEBP ou SVG) ou informar URL"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => void handleFileUpload(e.target.files?.[0])}
              className="text-xs"
            />
            <Input
              aria-label="Enviar arquivo de arte (PNG, JPG, WEBP ou SVG) ou informar URL"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://... ou Data URL carregada"
            />
          </div>
          <div>
            <Label className="text-2xs uppercase tracking-widest">Nota</Label>
            <Textarea
              aria-label="Nota"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="O que mudou nesta versão?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!label.trim()) {
                setLabelError("Dê um rótulo à versão (ex.: v2).");
                return;
              }
              setLabelError(null);
              addVersion(printId, {
                id: `v-${Date.now()}`,
                label: label.trim(),
                createdAt: new Date().toISOString().slice(0, 10),
                createdBy: "Você",
                note: note.trim() || undefined,
                image,
              });
              toast.success(`Versão ${label} adicionada`);
              setLabel("");
              setNote("");
              setOpen(false);
            }}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
