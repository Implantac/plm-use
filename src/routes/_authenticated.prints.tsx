// H1-03 · Cartela de Estampas (inspirado em Coleção.Moda / Kubix Link / NedGraphics).
// Biblioteca versionada de estampas com metadados (repeat, cores, técnica, fornecedor).
import { useMemo, useState, useSyncExternalStore } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Sparkles,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  Link2,
  Ruler,
  Layers as LayersIcon,
  History,
  Tag,
  FileImage,
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
import { toast } from "sonner";
import { LocalHistoryButton } from "@/components/entity/LocalHistoryButton";
import {
  listPrints,
  subscribe,
  upsertPrint,
  addVersion,
  type PrintAsset,
} from "@/lib/prints/store";

export const Route = createFileRoute("/_authenticated/prints")({
  head: () => ({
    meta: [
      { title: "Cartela de Estampas · USE MODA PLM" },
      {
        name: "description",
        content:
          "Biblioteca versionada de estampas com rapport, técnica, cores, fornecedor de estamparia e uso por referência.",
      },
      { property: "og:title", content: "Cartela de Estampas · USE MODA PLM" },
      {
        property: "og:description",
        content:
          "Cadastre estampas, controle versões e vincule à ficha técnica.",
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
  em_prova: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  aprovada: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  arquivada: "bg-white/5 text-muted-foreground",
};

const TECNICA_LABEL: Record<PrintAsset["tecnica"], string> = {
  digital: "Digital",
  rotativa: "Rotativa",
  localizada: "Localizada",
  sublimacao: "Sublimação",
  silk: "Silk",
};

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

  return (
    <ModuleLayout
      title="Cartela de Estampas"
      subtitle="Biblioteca versionada de estampas com técnica, rapport e fornecedor de estamparia. Vincula à ficha técnica e à cartela de cores."
      version="H1-03 · V4"
      searchPlaceholder="Buscar estampa, código ou tag"
      metrics={metrics}
      onAdd={() => {
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
      }}
    >
      {/* Filtros de status */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["todas", "rascunho", "em_prova", "aprovada", "arquivada"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest border transition-colors ${
              filter === f
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-white/10 text-muted-foreground hover:border-white/20"
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
                    : "border-white/10 hover:border-white/20"
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
                      className={`text-[9px] uppercase tracking-widest ${STATUS_CLASS[p.status]}`}
                    >
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 flex gap-0.5">
                    {p.colors.slice(0, 5).map((c, i) => (
                      <div
                        key={i}
                        className="h-3 w-3 rounded-full border border-white/40"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-2.5 bg-white/[0.02]">
                  <p className="text-[10px] font-mono text-muted-foreground">{p.code}</p>
                  <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
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
            <div className="col-span-2 rounded-lg border border-dashed border-white/10 p-8 text-center text-xs text-muted-foreground">
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
  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="relative aspect-[16/9] bg-black/40">
          <OptimizedImage
            src={print.cover}
            alt={print.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono text-white/60 uppercase tracking-widest">
                {print.code}
              </p>
              <h2 className="text-2xl font-bold text-white leading-tight">{print.name}</h2>
              <p className="text-xs text-white/70 mt-1">
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
                className="gap-1.5 border-white/20 bg-black/40 text-white hover:bg-black/60"
              />
              <Badge
                variant="outline"
                className={`${STATUS_CLASS[print.status]} text-[10px] uppercase tracking-widest`}
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
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-white/5">
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
              onClick={() => toast.info("Análise IA em breve")}
            >
              <Sparkles className="h-3.5 w-3.5" /> Análise IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de versões */}
      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Histórico de versões
            </span>
          </div>
          <div className="space-y-2">
            {print.versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] p-2"
              >
                <div className="h-12 w-12 rounded overflow-hidden border border-white/10 flex-shrink-0">
                  <OptimizedImage
                    src={v.image}
                    alt={v.label}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{v.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {v.createdAt} · {v.createdBy}
                    {v.note ? ` · ${v.note}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] p-2.5">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-xs font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

function NewVersionDialog({ printId }: { printId: string }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [image, setImage] = useState(
    "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=600",
  );
  const [format, setFormat] = useState<PrintAsset["fileFormat"]>("AI");

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
              <Label className="text-[10px] uppercase tracking-widest">Rótulo</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="v2 · ajuste rapport"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest">Formato</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as PrintAsset["fileFormat"])}>
                <SelectTrigger>
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
          <div>
            <Label className="text-[10px] uppercase tracking-widest">
              URL da prévia (upload em breve)
            </Label>
            <Input value={image} onChange={(e) => setImage(e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-widest">Nota</Label>
            <Textarea
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
                toast.error("Dê um rótulo à versão (ex.: v2)");
                return;
              }
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
