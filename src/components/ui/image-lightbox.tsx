import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Grid,
  Maximize2,
  Moon,
  RotateCcw,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ImageExportMenu } from "@/components/export/ImageExportMenu";

export interface LightboxImageItem {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  exportBaseName?: string;
}

type BackdropMode = "checker" | "dark" | "light";

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LightboxImageItem[];
  initialIndex?: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3.5;
const ZOOM_STEP = 0.5;

const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundColor: "#141D2E",
  backgroundImage:
    "linear-gradient(45deg, rgba(255,255,255,0.07) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.07) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.07) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.07) 75%)",
  backgroundSize: "24px 24px",
  backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
};

export function ImageLightbox({ open, onOpenChange, items, initialIndex = 0 }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [backdrop, setBackdrop] = useState<BackdropMode>("checker");
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (open) {
      const safeIndex = Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1));
      setIndex(safeIndex);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, initialIndex, items.length]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const changeZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(nextZoom.toFixed(2))));
    setZoom(clamped);
    if (clamped <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, []);

  const goPrev = useCallback(() => {
    if (items.length <= 1) return;
    setIndex((i) => (i - 1 + items.length) % items.length);
    resetView();
  }, [items.length, resetView]);

  const goNext = useCallback(() => {
    if (items.length <= 1) return;
    setIndex((i) => (i + 1) % items.length);
    resetView();
  }, [items.length, resetView]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        changeZoom(zoom + ZOOM_STEP);
      } else if (e.key === "-") {
        e.preventDefault();
        changeZoom(zoom - ZOOM_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        resetView();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, goPrev, goNext, changeZoom, zoom, resetView]);

  const current = items[index] ?? items[0];
  if (!current) return null;

  const stageStyle: React.CSSProperties =
    backdrop === "checker"
      ? CHECKERBOARD_STYLE
      : backdrop === "light"
        ? { backgroundColor: "#EEF2F6" }
        : { backgroundColor: "#0B101D" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button.absolute]:hidden flex h-[94dvh] max-h-[94dvh] w-[96vw] max-w-[96vw] sm:max-w-[96vw] flex-col gap-0 overflow-hidden rounded-xl border border-border/80 bg-[#101829] p-0 text-slate-100 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#152036] px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-sm font-semibold text-slate-100">
              {current.title || current.alt}
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-slate-300">
              {current.subtitle ||
                "Inspeção em tela cheia · Fundo PNG transparente · Use a roda do mouse ou clique para ampliar"}
            </DialogDescription>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div
              className="flex items-center rounded-md border border-white/10 bg-[#0E1627] p-0.5"
              role="group"
              aria-label="Fundo de inspeção"
            >
              <button
                type="button"
                onClick={() => setBackdrop("checker")}
                title="Grade Alpha (Fundo Transparente)"
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  backdrop === "checker"
                    ? "bg-teal-500/20 text-teal-300"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Grid className="h-3.5 w-3.5" /> Alpha
              </button>
              <button
                type="button"
                onClick={() => setBackdrop("light")}
                title="Fundo Claro de Estúdio"
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  backdrop === "light"
                    ? "bg-teal-500/20 text-teal-300"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Sun className="h-3.5 w-3.5" /> Claro
              </button>
              <button
                type="button"
                onClick={() => setBackdrop("dark")}
                title="Fundo Escuro"
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  backdrop === "dark"
                    ? "bg-teal-500/20 text-teal-300"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Moon className="h-3.5 w-3.5" /> Escuro
              </button>
            </div>

            <div
              className="flex items-center rounded-md border border-white/10 bg-[#0E1627] p-0.5"
              role="group"
              aria-label="Controles de zoom"
            >
              <button
                type="button"
                onClick={() => changeZoom(zoom - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Reduzir zoom"
                className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => changeZoom(zoom === 1 ? 2 : 1)}
                className="min-w-[52px] px-1.5 text-center font-mono text-[11px] font-semibold text-slate-200 hover:text-teal-300"
                title="Alternar zoom 100% / 200%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => changeZoom(zoom + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Aumentar zoom"
                className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              {zoom > 1 && (
                <button
                  type="button"
                  onClick={resetView}
                  aria-label="Restaurar enquadramento"
                  title="Restaurar 100%"
                  className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <ImageExportMenu
              src={current.src}
              baseName={current.exportBaseName || current.title || "peca-plm-hd"}
            />

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar visualização em tela cheia"
              className="h-7 gap-1 px-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" /> Fechar
            </Button>
          </div>
        </div>

        <div
          style={stageStyle}
          className={`relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden ${
            zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
          }`}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.25 : -0.25;
            changeZoom(zoom + delta);
          }}
          onPointerDown={(e) => {
            movedRef.current = false;
            if (zoom <= 1) return;
            setDragging(true);
            dragStartRef.current = {
              x: e.clientX,
              y: e.clientY,
              panX: pan.x,
              panY: pan.y,
            };
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragging || !dragStartRef.current) return;
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
              movedRef.current = true;
            }
            setPan({
              x: dragStartRef.current.panX + dx,
              y: dragStartRef.current.panY + dy,
            });
          }}
          onPointerUp={() => {
            setDragging(false);
            dragStartRef.current = null;
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            if (movedRef.current) {
              movedRef.current = false;
              return;
            }
            changeZoom(zoom > 1 ? 1 : 2);
          }}
        >
          {items.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Imagem anterior"
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-[#101829]/85 p-2.5 text-slate-100 shadow-lg backdrop-blur hover:bg-[#192640]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <img
            src={current.src}
            alt={current.alt}
            draggable={false}
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transition: dragging ? "none" : "transform 160ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="max-h-[80dvh] max-w-[90vw] object-contain drop-shadow-[0_14px_32px_rgba(0,0,0,0.35)]"
          />

          {items.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Próxima imagem"
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/15 bg-[#101829]/85 p-2.5 text-slate-100 shadow-lg backdrop-blur hover:bg-[#192640]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto border-t border-white/10 bg-[#121C30] px-4 py-2">
            {items.map((item, idx) => (
              <button
                key={`${item.src.slice(0, 48)}-${idx}`}
                type="button"
                onClick={() => {
                  setIndex(idx);
                  resetView();
                }}
                className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-md border transition-all ${
                  idx === index
                    ? "border-teal-400 ring-2 ring-teal-400/40"
                    : "border-white/15 opacity-70 hover:opacity-100"
                }`}
                style={CHECKERBOARD_STYLE}
                title={item.title || item.alt}
              >
                <img src={item.src} alt={item.alt} className="h-full w-full object-contain p-0.5" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ExpandImageBadge({ label = "Clique para ampliar" }: { label?: string }) {
  return (
    <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#101829]/80 px-2 py-1 text-[11px] font-medium text-slate-100 opacity-85 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
      <Maximize2 className="h-3 w-3 text-teal-300" />
      {label}
    </span>
  );
}
