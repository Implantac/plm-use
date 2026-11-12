// H1-03 · Painel de Displayagem (inspirado em Coleção.Moda / Centric Visual Line Planner).
// Canvas livre para montar looks/coordenados com recortes PNG/SVG transparentes das
// Fichas Técnicas + referências de catálogo e lupa em tela cheia (ImageLightbox).
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Clock,
  ImageUp,
  Grip,
  Maximize2,
  Minus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { toast } from "sonner";
import { nativeVisualSvg } from "@/lib/ai/native-visual";
import { computeFullTechSheetPricing } from "@/lib/techsheet/pricing";
import { useTechSheetStore, type TechSheetData } from "@/lib/techsheet/store";
import {
  listBoards,
  pranchasOperacionais,
  subscribe,
  upsertBoard,
  addItem,
  moveItem,
  resizeItem,
  removeItem,
  refCatalog,
  type DisplayBoard,
  type BoardItem,
} from "@/lib/display/store";

export const Route = createFileRoute("/_authenticated/display")({
  head: () => ({
    meta: [
      { title: "Painel de Displayagem · USE MODA PLM" },
      {
        name: "description",
        content:
          "Canvas livre para montar looks e coordenados antes do showroom com peças recortadas em fundo transparente.",
      },
      { property: "og:title", content: "Painel de Displayagem · USE MODA PLM" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DisplayRoute,
});

const STATUS_LABEL: Record<DisplayBoard["status"], string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  aprovada: "Aprovada",
};
const STATUS_CLASS: Record<DisplayBoard["status"], string> = {
  rascunho: "bg-muted/40 text-muted-foreground",
  em_revisao: "bg-status-progress/15 text-status-progress border-status-progress/30",
  aprovada: "bg-status-approved/15 text-status-approved border-status-approved/30",
};

interface PaletteRefEntry {
  code: string;
  name: string;
  image: string;
  category: string;
  colorHex: string;
  price: number;
  transparentCutout?: boolean;
  /** `true` = vitrine: ilustra o canvas, mas o preço não é apurado. */
  demo?: boolean;
}

function buildTechSheetPaletteItems(sheetsMap: Record<string, TechSheetData>): PaletteRefEntry[] {
  const staticCodes = new Set(refCatalog.map((r) => r.code));
  // Só ficha que existe: `["DEV000006", ...keys]` + `?? seedFor` colocava a
  // referência de demonstração no quadro de displayagem com preço calculado.
  const keys = Object.keys(sheetsMap).filter((code) => code in sheetsMap || !staticCodes.has(code));
  return keys.map((code) => {
    const doc = sheetsMap[code]!;
    const pricing = computeFullTechSheetPricing(doc);
    const cw = doc.colorways?.[0];
    const hex = cw?.hex || "#1D6B47";
    const svg = nativeVisualSvg({
      family: doc.meta?.category,
      category: doc.meta?.category,
      name: doc.meta?.name || code,
      color: hex,
      view: "frente",
      transparent: true,
    });
    return {
      code,
      name: doc.meta?.name || code,
      image: doc.image || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      category: doc.meta?.category || "Ficha PLM",
      colorHex: hex,
      price: Math.round(pricing.precoReferenciaMargem || pricing.precoSugerido || 0),
      transparentCutout: !doc.image,
    };
  });
}

function isCutoutImage(src: string): boolean {
  return src.startsWith("data:image/svg+xml") || src.startsWith("data:image/png");
}

function DisplayRoute() {
  const boards = useSyncExternalStore(
    (l) => {
      const off = subscribe(l);
      return () => off();
    },
    () => listBoards(),
    () => listBoards(),
  );
  const sheetsMap = useTechSheetStore((s) => s.data);

  const combinedCatalog = useMemo<PaletteRefEntry[]>(() => {
    const plmItems = buildTechSheetPaletteItems(sheetsMap);
    const existingCodes = new Set(plmItems.map((i) => i.code));
    // Onda 72: o catálogo estático é vitrine (`demo: true`) — o preço dele
    // não é apurado como real; a peça ilustra o canvas.
    const rest = refCatalog
      .filter((r) => !existingCodes.has(r.code))
      .map((r) => ({ ...r, demo: true, transparentCutout: isCutoutImage(r.image) }));
    return [...plmItems, ...rest];
  }, [sheetsMap]);

  const [selectedId, setSelectedId] = useState<string>(boards[0]?.id ?? "");
  const selected = boards.find((b) => b.id === selectedId) ?? boards[0];

  // Demonstração ilustra a displayagem, mas não entra nas métricas — mesmo
  // contrato das coleções (Onda 51) e dos materiais (Onda 69).
  const reais = useMemo(() => pranchasOperacionais(boards), [boards]);

  const metrics = useMemo(() => {
    const total = reais.length;
    const approved = reais.filter((b) => b.status === "aprovada").length;
    const items = reais.reduce((s, b) => s + b.items.length, 0);
    return [
      {
        label: "Painéis ativos",
        value: String(total),
        detail: total ? `${approved} aprovados` : "só demonstração na lista",
        demo: total === 0,
      },
      {
        label: "Looks montados",
        value: String(items),
        detail: total ? "peças posicionadas" : "só demonstração na lista",
        demo: total === 0,
      },
      {
        label: "Peças/look",
        value: total ? String(Math.round(items / total)) : "—",
        detail: total ? "média" : "só demonstração na lista",
        demo: total === 0,
      },
      {
        label: "Prontos p/ showroom",
        value: String(approved),
        detail: total ? "publicáveis" : "só demonstração na lista",
        demo: total === 0,
      },
    ];
  }, [reais]);

  return (
    <ModuleLayout
      title="Painel de Displayagem"
      subtitle="Monte lookbooks arrastando Fichas Técnicas recortadas em PNG/SVG transparente e referências no canvas."
      version="H1-03 · V5"
      searchPlaceholder="Buscar painel"
      metrics={metrics}
      onAdd={() => {
        const id = `board-${Date.now()}`;
        upsertBoard({
          id,
          name: "Novo painel",
          season: "Verão 2027",
          target: "—",
          status: "rascunho",
          cover:
            "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600",
          updatedAt: new Date().toISOString().slice(0, 10),
          bgColor: "#F5F0E8",
          items: [],
        });
        setSelectedId(id);
        toast.success("Painel criado");
      }}
    >
      {boards.some((b) => b.demo) && (
        <div
          data-testid="display-demo"
          className="mb-5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-muted-foreground"
        >
          <strong className="text-foreground">Painéis de demonstração na lista.</strong> Os painéis
          e as referências marcados como demonstração (seed do sistema) ilustram o canvas, mas{" "}
          <strong>não entram nas métricas</strong> acima e o preço deles não é apurado no total do
          look. O PLM não é ERP: nenhum preço de vitrine é apurado como real.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_250px]">
        {/* Lista de painéis */}
        <div className="space-y-2">
          <p className="text-2xs uppercase tracking-widest text-muted-foreground px-1">Painéis</p>
          {boards.map((b) => {
            const active = b.id === selected?.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedId(b.id)}
                className={`w-full text-left rounded-lg border overflow-hidden transition-all ${
                  active
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:border-border-strong/70"
                }`}
              >
                <div className="relative h-16">
                  <OptimizedImage
                    src={b.cover}
                    alt={b.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <Badge
                    variant="outline"
                    className={`absolute top-1.5 right-1.5 text-2xs uppercase tracking-widest ${STATUS_CLASS[b.status]}`}
                  >
                    {STATUS_LABEL[b.status]}
                  </Badge>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-white truncate">{b.name}</p>
                  <p className="text-2xs text-muted-foreground truncate">
                    {b.season} · {b.target}
                  </p>
                  <p className="text-2xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-2.5 w-2.5" /> {b.updatedAt} · {b.items.length} peças
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Canvas */}
        {selected && <BoardCanvas board={selected} catalog={combinedCatalog} />}

        {/* Palette de referências + Fichas Técnicas transparentes */}
        {selected && <RefPalette boardId={selected.id} catalog={combinedCatalog} />}
      </div>
    </ModuleLayout>
  );
}

function BoardCanvas({ board, catalog }: { board: DisplayBoard; catalog: PaletteRefEntry[] }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lightboxItem, setLightboxItem] = useState<BoardItem | null>(null);

  const onPointerDown = (e: React.PointerEvent, item: BoardItem) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragId(item.id);
    setOffset({
      x: ((e.clientX - rect.left) / rect.width) * 100 - item.x,
      y: ((e.clientY - rect.top) / rect.height) * 100 - item.y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100 - offset.x));
    const y = Math.max(0, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100 - offset.y));
    moveItem(board.id, dragId, x, y);
  };

  const onPointerUp = () => setDragId(null);

  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const code = e.dataTransfer.getData("text/plain");
    const ref = catalog.find((r) => r.code === code);
    if (!ref || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(85, ((e.clientX - rect.left) / rect.width) * 100 - 10));
    const y = Math.max(0, Math.min(85, ((e.clientY - rect.top) / rect.height) * 100 - 10));
    addItem(board.id, {
      id: `i-${Date.now()}`,
      refCode: ref.code,
      refName: ref.name,
      image: ref.image,
      category: ref.category,
      colorHex: ref.colorHex,
      price: ref.price,
      demo: ref.demo === true,
      x,
      y,
      w: 22,
    });
    toast.success(`${ref.code} adicionada ao painel`);
  };

  // Só peça real entra no total do look; vitrine não apura preço. Painel de
  // demonstração inteiro é vitrine — nenhuma peça dele é apurada.
  const itensReais = board.demo ? [] : board.items.filter((i) => i.demo !== true);
  const totalPrice = itensReais.reduce((s, i) => s + (i.price ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            <span className="text-2xs uppercase tracking-[0.05em] text-muted-foreground">
              Canvas · {board.season}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white truncate">{board.name}</h2>
          <p className="text-xs text-muted-foreground">
            Alvo: {board.target} · {board.items.length} peças · Total look{" "}
            {itensReais.length > 0 ? `R$ ${totalPrice.toLocaleString("pt-BR")}` : "—"}{" "}
            {board.items.length > itensReais.length ? "(vitrine ilustrativa, não apurada)" : ""}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1.5 text-2xs uppercase tracking-widest text-muted-foreground">
            Fundo
            <input
              type="color"
              value={board.bgColor}
              onChange={(e) => upsertBoard({ ...board, bgColor: e.target.value })}
              className="h-7 w-9 rounded border border-border bg-transparent cursor-pointer"
              aria-label="Cor de fundo"
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              upsertBoard({
                ...board,
                id: `board-${Date.now()}`,
                name: `${board.name} (cópia)`,
                status: "rascunho",
                updatedAt: new Date().toISOString().slice(0, 10),
              });
              toast.success("Painel clonado");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Clonar
          </Button>
          {board.status !== "aprovada" && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                upsertBoard({ ...board, status: "aprovada" });
                toast.success("Painel aprovado — pronto para showroom");
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
            </Button>
          )}
        </div>
      </div>

      <div
        ref={canvasRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onCanvasDrop}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="relative w-full aspect-[4/5] rounded-lg border-2 border-dashed border-border overflow-hidden touch-none"
        style={{ background: board.bgColor }}
      >
        {board.items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-black/40 pointer-events-none">
            <ImageUp className="h-8 w-8 mb-2" />
            <p className="text-xs uppercase tracking-widest">
              Arraste referências ou Fichas Técnicas transparentes da barra lateral →
            </p>
          </div>
        )}

        {board.items.map((item) => {
          const cutout = isCutoutImage(item.image);
          return (
            <div
              key={item.id}
              onPointerDown={(e) => onPointerDown(e, item)}
              className={`absolute group cursor-grab active:cursor-grabbing select-none rounded-lg ${
                cutout
                  ? "bg-transparent"
                  : "overflow-hidden shadow-2xl bg-[#fff] ring-1 ring-black/10"
              } ${dragId === item.id ? "z-20 scale-105" : "z-10"} transition-transform`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.w}%`,
              }}
            >
              <div className="relative aspect-[3/4]">
                {cutout ? (
                  <img
                    src={item.image}
                    alt={item.refName}
                    className="h-full w-full object-contain pointer-events-none drop-shadow-[0_14px_22px_rgba(0,0,0,0.3)]"
                  />
                ) : (
                  <OptimizedImage
                    src={item.image}
                    alt={item.refName}
                    className="h-full w-full object-cover pointer-events-none"
                  />
                )}
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Grip className="h-3 w-3 text-white drop-shadow" />
                </div>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setLightboxItem(item)}
                    className="h-5 w-5 rounded bg-black/70 text-white text-2xs flex items-center justify-center"
                    aria-label={`Ampliar ${item.refName}`}
                    title="Ampliar em tela cheia"
                  >
                    <Maximize2 className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => resizeItem(board.id, item.id, Math.min(item.w + 3, 45))}
                    className="h-5 w-5 rounded bg-black/60 text-white text-2xs flex items-center justify-center"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => resizeItem(board.id, item.id, Math.max(item.w - 3, 8))}
                    className="h-5 w-5 rounded bg-black/60 text-white text-2xs flex items-center justify-center"
                    aria-label="Diminuir"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      removeItem(board.id, item.id);
                      toast.success(`${item.refCode} removida`);
                    }}
                    className="h-5 w-5 rounded bg-status-rejected/80 text-white flex items-center justify-center"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
              <div
                className={`px-1.5 py-1 text-2xs leading-tight ${
                  cutout
                    ? "rounded bg-slate-900/75 text-slate-100 backdrop-blur-xs mt-0.5 text-center"
                    : "bg-[#fff]"
                }`}
              >
                <p className={`font-mono ${cutout ? "text-teal-300" : "text-black/60"}`}>
                  {item.refCode}
                </p>
                <p className={`font-semibold truncate ${cutout ? "text-white" : "text-black"}`}>
                  {item.refName}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {lightboxItem && (
        <ImageLightbox
          open={Boolean(lightboxItem)}
          onOpenChange={(next) => {
            if (!next) setLightboxItem(null);
          }}
          items={[
            {
              src: lightboxItem.image,
              alt: lightboxItem.refName,
              title: `${lightboxItem.refCode} · ${lightboxItem.refName}`,
              subtitle: `${lightboxItem.category} · R$ ${lightboxItem.price ?? 0} · Displayagem`,
              exportBaseName: lightboxItem.refCode.toLowerCase(),
            },
          ]}
        />
      )}
    </div>
  );
}

function RefPalette({ boardId, catalog }: { boardId: string; catalog: PaletteRefEntry[] }) {
  const [q, setQ] = useState("");
  const filtered = catalog.filter(
    (r) =>
      r.code.toLowerCase().includes(q.toLowerCase()) ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.category.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Card className="border-border bg-muted/50 h-fit sticky top-4">
      <CardContent className="p-3 space-y-2">
        <div>
          <p className="text-2xs uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">
            Fichas PLM (PNG Alpha) & Referências
          </p>
          <Input
            aria-label="Buscar ficha PLM ou referência por código ou nome"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar código ou nome"
            className="text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-[520px] overflow-y-auto pr-1">
          {filtered.map((r) => (
            <div
              key={r.code}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", r.code)}
              onDoubleClick={() => {
                addItem(boardId, {
                  id: `i-${Date.now()}`,
                  refCode: r.code,
                  refName: r.name,
                  image: r.image,
                  category: r.category,
                  colorHex: r.colorHex,
                  price: r.price,
                  x: 28,
                  y: 26,
                  w: 22,
                });
                toast.success(`${r.code} adicionada`);
              }}
              className="rounded-md overflow-hidden border border-border bg-muted/40 cursor-grab hover:border-primary/40 transition-colors"
              title="Arraste para o canvas ou dê duplo clique"
            >
              <div
                className="aspect-square relative flex items-center justify-center p-1"
                style={
                  r.transparentCutout
                    ? {
                        backgroundColor: "#141D2E",
                        backgroundImage:
                          "linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)",
                        backgroundSize: "14px 14px",
                        backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0px",
                      }
                    : undefined
                }
              >
                {r.transparentCutout ? (
                  <img
                    src={r.image}
                    alt={r.name}
                    className="h-full w-full object-contain pointer-events-none"
                  />
                ) : (
                  <OptimizedImage
                    src={r.image}
                    alt={r.name}
                    className="h-full w-full object-cover pointer-events-none"
                  />
                )}
                <span
                  className="absolute bottom-1 right-1 h-3 w-3 rounded-full border border-border-strong"
                  style={{ background: r.colorHex }}
                />
              </div>
              <div className="p-1.5">
                <p className="text-2xs font-mono text-muted-foreground">{r.code}</p>
                <p className="text-2xs font-semibold text-white truncate leading-tight">{r.name}</p>
                <p className="text-2xs text-muted-foreground">
                  {r.category} · {r.demo ? "demonstração · sem preço apurado" : `R$ ${r.price}`}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-2xs text-muted-foreground text-center pt-1 border-t border-border/60">
          Arraste ou dê duplo clique
        </p>
      </CardContent>
    </Card>
  );
}
