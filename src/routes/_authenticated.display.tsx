// H1-03 · Painel de Displayagem (inspirado em Coleção.Moda / Centric Visual Line Planner).
// Canvas livre para montar looks/coordenados antes de publicar no showroom.
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
  Minus,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";
import {
  listBoards,
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
          "Canvas livre para montar looks e coordenados antes do showroom. Arraste referências, agrupe por look e aprove para lookbook.",
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
  em_revisao: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  aprovada: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function DisplayRoute() {
  const boards = useSyncExternalStore(
    (l) => {
      const off = subscribe(l);
      return () => off();
    },
    () => listBoards(),
    () => listBoards(),
  );

  const [selectedId, setSelectedId] = useState<string>(boards[0]?.id ?? "");
  const selected =
    boards.find((b) => b.id === selectedId) ?? boards[0];

  const metrics = useMemo(() => {
    const total = boards.length;
    const approved = boards.filter((b) => b.status === "aprovada").length;
    const items = boards.reduce((s, b) => s + b.items.length, 0);
    return [
      { label: "Painéis ativos", value: String(total), detail: `${approved} aprovados` },
      { label: "Looks montados", value: String(items), detail: "peças posicionadas" },
      {
        label: "Peças/look",
        value: total ? String(Math.round(items / total)) : "0",
        detail: "média",
      },
      { label: "Prontos p/ showroom", value: String(approved), detail: "publicáveis" },
    ];
  }, [boards]);

  return (
    <ModuleLayout
      title="Painel de Displayagem"
      subtitle="Monte lookbooks arrastando referências no canvas. Aprovado, publica no showroom como coordenado."
      version="H1-03 · V4"
      searchPlaceholder="Buscar painel"
      metrics={metrics}
      onAdd={() => {
        const id = `board-${Date.now()}`;
        upsertBoard({
          id,
          name: "Novo painel",
          season: "Verão 26",
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
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
        {/* Lista de painéis */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-1">
            Painéis
          </p>
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
                    : "border-white/10 hover:border-white/20"
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
                    className={`absolute top-1.5 right-1.5 text-[9px] uppercase tracking-widest ${STATUS_CLASS[b.status]}`}
                  >
                    {STATUS_LABEL[b.status]}
                  </Badge>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-white truncate">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {b.season} · {b.target}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-2.5 w-2.5" /> {b.updatedAt} · {b.items.length} peças
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Canvas */}
        {selected && <BoardCanvas board={selected} />}

        {/* Palette de referências */}
        {selected && <RefPalette boardId={selected.id} />}
      </div>
    </ModuleLayout>
  );
}

function BoardCanvas({ board }: { board: DisplayBoard }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

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
    const ref = refCatalog.find((r) => r.code === code);
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
      x,
      y,
      w: 20,
    });
    toast.success(`${ref.code} adicionada ao painel`);
  };

  const totalPrice = board.items.reduce((s, i) => s + (i.price ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Canvas · {board.season}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white truncate">{board.name}</h2>
          <p className="text-xs text-muted-foreground">
            Alvo: {board.target} · {board.items.length} peças · Total look R${" "}
            {totalPrice.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            Fundo
            <input
              type="color"
              value={board.bgColor}
              onChange={(e) => upsertBoard({ ...board, bgColor: e.target.value })}
              className="h-7 w-9 rounded border border-white/10 bg-transparent cursor-pointer"
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
        className="relative w-full aspect-[4/5] rounded-xl border-2 border-dashed border-white/10 overflow-hidden touch-none"
        style={{ background: board.bgColor }}
      >
        {board.items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-black/40 pointer-events-none">
            <ImageUp className="h-8 w-8 mb-2" />
            <p className="text-xs uppercase tracking-widest">
              Arraste referências da barra lateral →
            </p>
          </div>
        )}

        {board.items.map((item) => (
          <div
            key={item.id}
            onPointerDown={(e) => onPointerDown(e, item)}
            className={`absolute group cursor-grab active:cursor-grabbing select-none rounded-lg overflow-hidden shadow-2xl bg-white ring-1 ring-black/10 ${
              dragId === item.id ? "z-20 scale-105" : "z-10"
            } transition-transform`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.w}%`,
            }}
          >
            <div className="relative aspect-[3/4]">
              <OptimizedImage
                src={item.image}
                alt={item.refName}
                className="h-full w-full object-cover pointer-events-none"
              />
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Grip className="h-3 w-3 text-white drop-shadow" />
              </div>
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => resizeItem(board.id, item.id, Math.min(item.w + 3, 45))}
                  className="h-5 w-5 rounded bg-black/60 text-white text-[10px] flex items-center justify-center"
                  aria-label="Aumentar"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => resizeItem(board.id, item.id, Math.max(item.w - 3, 8))}
                  className="h-5 w-5 rounded bg-black/60 text-white text-[10px] flex items-center justify-center"
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
                  className="h-5 w-5 rounded bg-red-500/80 text-white flex items-center justify-center"
                  aria-label="Remover"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            <div className="px-1.5 py-1 bg-white text-[9px] leading-tight">
              <p className="font-mono text-black/60">{item.refCode}</p>
              <p className="font-semibold text-black truncate">{item.refName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefPalette({ boardId }: { boardId: string }) {
  const [q, setQ] = useState("");
  const filtered = refCatalog.filter(
    (r) =>
      r.code.toLowerCase().includes(q.toLowerCase()) ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.category.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Card className="border-white/10 bg-white/[0.03] h-fit sticky top-4">
      <CardContent className="p-3 space-y-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 px-0.5">
            Biblioteca de referências
          </p>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar código ou nome"
            className="h-8 text-xs"
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
                  x: 30,
                  y: 30,
                  w: 20,
                });
                toast.success(`${r.code} adicionada`);
              }}
              className="rounded-md overflow-hidden border border-white/10 bg-white/[0.02] cursor-grab hover:border-primary/40 transition-colors"
              title="Arraste para o canvas ou dê duplo clique"
            >
              <div className="aspect-square relative">
                <OptimizedImage
                  src={r.image}
                  alt={r.name}
                  className="h-full w-full object-cover pointer-events-none"
                />
                <span
                  className="absolute bottom-1 right-1 h-3 w-3 rounded-full border border-white/60"
                  style={{ background: r.colorHex }}
                />
              </div>
              <div className="p-1.5">
                <p className="text-[9px] font-mono text-muted-foreground">{r.code}</p>
                <p className="text-[10px] font-semibold text-white truncate leading-tight">
                  {r.name}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {r.category} · R$ {r.price}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground text-center pt-1 border-t border-white/5">
          Arraste ou dê duplo clique
        </p>
      </CardContent>
    </Card>
  );
}
