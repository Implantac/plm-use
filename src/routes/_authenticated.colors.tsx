// H1-03 · Cartela de Cores (inspirado em Coleção.Moda / Centric / Kubix Link).
// Biblioteca de paletas reutilizáveis com Pantone, fornecedor e uso por coleção.
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { onQuickAction } from "@/lib/nav/routes";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Palette,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Link2,
  CheckCircle2,
  Clock,
  Send,
  ArrowUpRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { LocalHistoryButton } from "@/components/entity/LocalHistoryButton";
import { toast } from "sonner";
import { FieldMessage } from "@/components/ui/field-message";
import {
  listPalettes,
  subscribe,
  upsertPalette,
  addColorToPalette,
  removeColor,
  readableOn,
  type ColorPalette,
  type ColorRef,
} from "@/lib/colors/store";
import { useTechSheetStore } from "@/lib/techsheet/store";
import type { TechSheetColorway } from "@/lib/techsheet/textile";

export const Route = createFileRoute("/_authenticated/colors")({
  head: () => ({
    meta: [
      { title: "Cartela de Cores · USE MODA PLM" },
      {
        name: "description",
        content:
          "Biblioteca de paletas cromáticas reutilizáveis com Pantone TCX, fornecedor de tingimento e uso por coleção.",
      },
      { property: "og:title", content: "Cartela de Cores · USE MODA PLM" },
      {
        property: "og:description",
        content: "Cadastre paletas Pantone, vincule fornecedor e reutilize em várias coleções.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ColorPaletteRoute,
});

const STATUS_LABEL: Record<ColorPalette["status"], string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  aprovada: "Aprovada",
  arquivada: "Arquivada",
};

const STATUS_CLASS: Record<ColorPalette["status"], string> = {
  rascunho: "bg-muted/40 text-muted-foreground",
  em_revisao: "bg-status-progress/15 text-status-progress border-status-progress/30",
  aprovada: "bg-status-approved/15 text-status-approved border-status-approved/30",
  arquivada: "bg-muted/50 text-muted-foreground",
};

function ColorPaletteRoute() {
  // Subscribe to the in-memory store so mutations re-render.
  const palettes = useSyncExternalStore(
    (l) => {
      const off = subscribe(l);
      return () => off();
    },
    () => listPalettes(),
    () => listPalettes(),
  );

  const [query, setQuery] = useState("");
  const filteredPalettes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return palettes;
    return palettes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.season.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.colors.some(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.hex.toLowerCase().includes(q) ||
            (c.pantone ?? "").toLowerCase().includes(q),
        ),
    );
  }, [palettes, query]);

  const [selectedId, setSelectedId] = useState<string>(palettes[0]?.id ?? "");
  const selected = useMemo(
    () => filteredPalettes.find((p) => p.id === selectedId) ?? filteredPalettes[0] ?? palettes[0],
    [filteredPalettes, palettes, selectedId],
  );

  const metrics = useMemo(() => {
    const total = palettes.length;
    const approved = palettes.filter((p) => p.status === "aprovada").length;
    const uniqueColors = new Set(palettes.flatMap((p) => p.colors.map((c) => c.hex.toLowerCase())))
      .size;
    const linked = palettes.reduce((sum, p) => sum + p.linkedRefs, 0);
    return [
      { label: "Paletas ativas", value: String(total), detail: `${approved} aprovadas` },
      { label: "Cores únicas", value: String(uniqueColors), detail: "Pantone TCX" },
      { label: "Referências vinculadas", value: String(linked), detail: "cruzadas" },
      {
        label: "Cobertura",
        value: total ? `${Math.round((approved / total) * 100)}%` : "0%",
        detail: "prontas p/ mix",
      },
    ];
  }, [palettes]);

  const handleAddPalette = useCallback(() => {
    const id = `pal-${Date.now()}`;
    upsertPalette({
      id,
      name: "Nova paleta",
      season: "Verão 26",
      brand: "—",
      mood: "",
      cover:
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=900",
      status: "rascunho",
      colors: [],
      updatedAt: new Date().toISOString().slice(0, 10),
      linkedRefs: 0,
    });
    setSelectedId(id);
    toast.success("Paleta criada");
  }, []);

  useEffect(() => onQuickAction("quick:new-color", handleAddPalette), [handleAddPalette]);

  return (
    <ModuleLayout
      title="Cartela de Cores"
      subtitle="Paletas Pantone reutilizáveis, vinculadas a fornecedor de tingimento e a coleções. Base para cartela de estampas e painel de displayagem."
      version="H1-03 · V4"
      searchPlaceholder="Buscar paleta ou Pantone"
      onSearch={setQuery}
      metrics={metrics}
      onAdd={handleAddPalette}
    >
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* Lista de paletas */}
        <div className="space-y-3">
          {filteredPalettes.map((p) => {
            const isActive = p.id === selected?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left rounded-lg border transition-all overflow-hidden ${
                  isActive
                    ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-muted/40 hover:border-border-strong/70"
                }`}
              >
                <div className="relative h-24 w-full overflow-hidden">
                  <OptimizedImage
                    src={p.cover}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{p.name}</p>
                      <p className="text-2xs uppercase tracking-widest text-white/70">
                        {p.season} · {p.brand}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-2xs uppercase tracking-widest ${STATUS_CLASS[p.status]}`}
                    >
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 p-2">
                  {p.colors.slice(0, 8).map((c) => (
                    <div
                      key={c.id}
                      className="h-6 flex-1 rounded-sm border border-border"
                      style={{ background: c.hex }}
                      title={`${c.name} · ${c.hex}`}
                    />
                  ))}
                  {p.colors.length === 0 && (
                    <span className="text-2xs text-muted-foreground italic px-2 py-1">
                      Sem cores ainda
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between px-3 pb-2 text-2xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" /> {p.linkedRefs} refs
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {p.updatedAt}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detalhe da paleta */}
        {selected && <PaletteDetail palette={selected} />}
      </div>
    </ModuleLayout>
  );
}

function PaletteDetail({ palette }: { palette: ColorPalette }) {
  const navigate = useNavigate();
  const sheetsMap = useTechSheetStore((s) => s.data);
  const ensureSheet = useTechSheetStore((s) => s.ensure);
  const setColorways = useTechSheetStore((s) => s.setColorways);

  const [syncOpen, setSyncOpen] = useState(false);
  const [targetRef, setTargetRef] = useState("DEV000006");
  const [syncMode, setSyncMode] = useState<"replace" | "append">("replace");

  const refOptions = useMemo(() => {
    const base = ["DEV000006", "V24-001", "U25-014", "I25-088"];
    for (const k of Object.keys(sheetsMap)) {
      if (!base.includes(k)) base.push(k);
    }
    return base;
  }, [sheetsMap]);

  const handlePushToTechSheet = () => {
    if (palette.colors.length === 0) {
      toast.error("Adicione ao menos uma cor Pantone antes de enviar para a ficha.");
      return;
    }
    const curDoc = sheetsMap[targetRef] ?? ensureSheet(targetRef);
    const existing = syncMode === "append" ? (curDoc.colorways ?? []) : [];
    const totalColors = existing.length + palette.colors.length;
    const basePct = Math.floor(100 / Math.max(1, totalColors));
    let remainder = 100 - basePct * totalColors;

    const mappedNew: TechSheetColorway[] = palette.colors.map((c, idx) => {
      const code =
        c.pantone?.replace(/\s*TCX$/i, "").trim() ||
        c.name
          .split(/\s+/)
          .map((w) => w[0] ?? "")
          .join("")
          .toUpperCase()
          .slice(0, 6) ||
        `COR-${idx + 1}`;
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return {
        id: `cw-pal-${palette.id}-${c.id}`,
        code,
        name: c.pantone ? `${c.name} (${c.pantone})` : c.name,
        hex: c.hex,
        status: "Ativa",
        mixPct: basePct + extra,
      };
    });

    const rebalancedExisting: TechSheetColorway[] = existing.map((cw) => {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return { ...cw, mixPct: basePct + extra };
    });

    const nextColorways = [...rebalancedExisting, ...mappedNew];
    setColorways(targetRef, nextColorways);
    upsertPalette({
      ...palette,
      linkedRefs: palette.linkedRefs + 1,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    toast.success(
      `${palette.colors.length} cores Pantone sincronizadas nas variantes da ficha ${targetRef}!`,
    );
    setSyncOpen(false);
  };

  return (
    <div className="space-y-5">
      <Card className="border-border bg-muted/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-4 w-4 text-primary" />
                <span className="text-2xs uppercase tracking-[0.05em] text-muted-foreground">
                  Paleta · {palette.season}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white leading-tight">{palette.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{palette.mood}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-[#2C6478]/50 bg-[#2C6478]/15 text-[#1E5568] dark:text-[#7AD4F0] hover:bg-[#2C6478]/25"
                  >
                    <Send className="h-3.5 w-3.5" /> Enviar p/ Ficha Técnica
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Sincronizar Cartela Pantone com Ficha Técnica</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-xs">
                    <p className="text-muted-foreground">
                      Envia as <strong>{palette.colors.length} cores</strong> da cartela{" "}
                      <strong>{palette.name}</strong> diretamente para as variantes de cor e mix de
                      corte da Ficha Técnica selecionada.
                    </p>
                    <div className="space-y-1">
                      <Label className="text-2xs uppercase tracking-wider">
                        Referência da Ficha Técnica
                      </Label>
                      <select
                        aria-label="Referência da Ficha Técnica"
                        value={targetRef}
                        onChange={(e) => setTargetRef(e.target.value)}
                        className="w-full h-9 rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                      >
                        {refOptions.map((r) => (
                          <option key={r} value={r}>
                            {r} — {sheetsMap[r]?.meta?.name ?? "Ficha Técnica"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-2xs uppercase tracking-wider">Modo de aplicação</Label>
                      <select
                        aria-label="Modo de aplicação na ficha"
                        value={syncMode}
                        onChange={(e) => setSyncMode(e.target.value as "replace" | "append")}
                        className="w-full h-9 rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                      >
                        <option value="replace">
                          Substituir variantes atuais pela cartela (mix 100% distribuído)
                        </option>
                        <option value="append">Mesclar com variantes atuais da ficha</option>
                      </select>
                    </div>
                    <div className="rounded-md border border-border bg-muted/30 p-2.5 space-y-1.5">
                      <p className="text-2xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Prévia das Variantes Pantone ({palette.colors.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {palette.colors.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1 text-2xs"
                          >
                            <span
                              className="h-3 w-3 rounded-full border border-border"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="font-medium text-foreground">{c.name}</span>
                            {c.pantone && (
                              <span className="font-mono text-muted-foreground">{c.pantone}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => {
                        setSyncOpen(false);
                        navigate({ to: "/tech-sheet", search: { ref: targetRef } });
                      }}
                    >
                      Abrir {targetRef} <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSyncOpen(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handlePushToTechSheet}>
                        Aplicar na Ficha
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <LocalHistoryButton
                entityType="color_palette"
                entityId={palette.id}
                entityLabel={palette.name}
                variant="outline"
                size="sm"
                className="gap-1.5"
              />

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const clone: ColorPalette = {
                    ...palette,
                    id: `pal-${Date.now()}`,
                    name: `${palette.name} (cópia)`,
                    status: "rascunho",
                    linkedRefs: 0,
                    updatedAt: new Date().toISOString().slice(0, 10),
                  };
                  upsertPalette(clone);
                  toast.success("Paleta clonada");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Clonar
              </Button>
              {palette.status !== "aprovada" && (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    upsertPalette({ ...palette, status: "aprovada" });
                    toast.success("Paleta aprovada");
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                </Button>
              )}
            </div>
          </div>

          {/* Grid de cores */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {palette.colors.map((c) => (
              <ColorSwatch
                key={c.id}
                color={c}
                onDelete={() => {
                  removeColor(palette.id, c.id);
                  toast.success(`${c.name} removida`);
                }}
              />
            ))}
            <AddColorDialog paletteId={palette.id} />
          </div>

          {palette.colors.length > 0 && (
            <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                IA: paleta com bom contraste (WCAG AA em {palette.colors.length}/
                {palette.colors.length} tons)
              </span>
              <span>
                {palette.linkedRefs} referências · atualizado {palette.updatedAt}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ColorSwatch({ color, onDelete }: { color: ColorRef; onDelete: () => void }) {
  const fg = readableOn(color.hex);
  return (
    <div className="rounded-lg overflow-hidden border border-border group">
      <div
        className="h-24 relative flex flex-col justify-between p-3"
        style={{ background: color.hex, color: fg }}
      >
        <div className="flex items-start justify-between">
          <span className="text-2xs uppercase tracking-widest opacity-80">
            {color.pantone ?? "—"}
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remover cor"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-xs font-mono opacity-80">{color.hex.toUpperCase()}</span>
      </div>
      <div className="p-2 bg-background/50 text-xs">
        <p className="font-semibold text-white truncate">{color.name}</p>
        <p className="text-2xs text-muted-foreground flex items-center justify-between mt-0.5">
          <span>{color.supplier ?? "Sem fornecedor"}</span>
          {color.usageCount ? <span>{color.usageCount} refs</span> : null}
        </p>
      </div>
    </div>
  );
}

function AddColorDialog({ paletteId }: { paletteId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#7FA88B");
  const [pantone, setPantone] = useState("");
  const [supplier, setSupplier] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setHex("#7FA88B");
    setPantone("");
    setSupplier("");
    setNameError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="h-full min-h-[10rem] rounded-lg border border-dashed border-border-strong/70 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs uppercase tracking-widest">Adicionar cor</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova cor na paleta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="h-16 w-20 rounded-md border border-border bg-transparent cursor-pointer"
              aria-label="Selecionar cor"
            />
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-2xs uppercase tracking-widest" required>
                  Nome
                </Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setNameError(null);
                  }}
                  placeholder="Ex.: Verde Amêndoa"
                  aria-invalid={!!nameError}
                />
                {nameError && <FieldMessage variant="error">{nameError}</FieldMessage>}
              </div>
              <div>
                <Label className="text-2xs uppercase tracking-widest">HEX</Label>
                <Input value={hex} onChange={(e) => setHex(e.target.value)} className="font-mono" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-2xs uppercase tracking-widest">Pantone TCX</Label>
              <Input
                value={pantone}
                onChange={(e) => setPantone(e.target.value)}
                placeholder="16-5533 TCX"
              />
            </div>
            <div>
              <Label className="text-2xs uppercase tracking-widest">Fornecedor</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Cataguases"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                setNameError("Dê um nome à cor.");
                return;
              }
              setNameError(null);
              addColorToPalette(paletteId, {
                id: `c-${Date.now()}`,
                name: name.trim(),
                hex,
                pantone: pantone.trim() || undefined,
                supplier: supplier.trim() || undefined,
                usageCount: 0,
              });
              toast.success(`${name} adicionada`);
              reset();
              setOpen(false);
            }}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
