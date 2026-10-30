// Painel Esquerdo do Cockpit Fluido PLM 2.0 (fiel ao layout de referência):
//  1) Estúdio de Croqui Técnico em fundo branco de prancheta (Frente + Costas lado a lado),
//     silhuetas intercambiáveis, cotas vivas (A-Tórax / B-Comprimento) e pinos numerados;
//  2) Modo Prévia IA 3D volumétrica + link p/ AI Product Studio ou Foto Real;
//  3) Cartela de Variantes (Colorways) bicolor interativa;
//  4) Faixa compacta MP | MO | Aplic. | Custo Ind. + gaveta rápida Impostos/Comissões + PV vs Meta;
//  5) Etiquetagem Técnica ABNT NBR NM ISO 3758 / Conmetro (NCM + 100% fibras + ícones vetoriais SVG);
//  6) Barra viva inferior de Margem Líquida Atingida.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  MapPin,
  Palette,
  Plus,
  ShieldCheck,
  Shirt,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  defaultCalloutsFor,
  defaultColorwaysFor,
  defaultEtiquetagemFor,
  defaultMedidasFor,
  useTechSheetStore,
} from "@/lib/techsheet/store";
import {
  CARE_SYMBOL_LABELS,
  validateComposicaoAbnt,
  type CareSymbolChoice,
  type GarmentCalloutPin,
  type GarmentSilhouette,
  type TechSheetColorway,
} from "@/lib/techsheet/textile";
import { computeFullTechSheetPricing, resolveDivisorParams } from "@/lib/techsheet/pricing";

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const SILHOUETTES: Array<{ id: GarmentSilhouette; label: string }> = [
  { id: "camiseta_v", label: "Esportivo Dry" },
  { id: "camisa_polo", label: "Polo Piquet" },
  { id: "moletom_raglan", label: "Moletom Raglan" },
  { id: "calca_jogger", label: "Calça Jogger" },
];

export interface GarmentSketchStudioProps {
  refAtual: string;
  activeColorwayId: string;
  onSelectColorway: (id: string) => void;
  onFocusSection?: (sectionId: string) => void;
}

export function GarmentSketchStudio({
  refAtual,
  activeColorwayId,
  onSelectColorway,
  onFocusSection,
}: GarmentSketchStudioProps) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const doc = useTechSheetStore((s) => s.data[refAtual] ?? ensure(refAtual));
  const updateMeta = useTechSheetStore((s) => s.updateMeta);
  const updatePreCost = useTechSheetStore((s) => s.updatePreCost);
  const setColorways = useTechSheetStore((s) => s.setColorways);
  const setEtiquetagem = useTechSheetStore((s) => s.setEtiquetagem);
  const setImage = useTechSheetStore((s) => s.setImage);

  const [viewMode, setViewMode] = useState<"croqui" | "previa3d" | "foto">("croqui");
  const [canvasSide, setCanvasSide] = useState<"ambos" | "frente" | "costas">("ambos");
  const [taxExpanded, setTaxExpanded] = useState(false);

  const [cwDialogOpen, setCwDialogOpen] = useState(false);
  const [abntDialogOpen, setAbntDialogOpen] = useState(false);
  const [pinsDialogOpen, setPinsDialogOpen] = useState(false);
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);
  const [fotoInput, setFotoInput] = useState(doc.image ?? "");

  const [newCw, setNewCw] = useState({
    code: "",
    name: "",
    hex: "#1D6B47",
    secondaryHex: "#EAB308",
  });

  const silhouette: GarmentSilhouette = doc.meta?.silhouette ?? "camiseta_v";
  const callouts: GarmentCalloutPin[] = doc.meta?.callouts?.length
    ? doc.meta.callouts
    : defaultCalloutsFor();
  const colorways = doc.colorways?.length ? doc.colorways : defaultColorwaysFor();
  const activeCw = colorways.find((c) => c.id === activeColorwayId) ?? colorways[0];
  const etiquetagem = doc.etiquetagem ?? defaultEtiquetagemFor();
  const medidas = doc.medidas ?? defaultMedidasFor();

  const pomA = medidas.pontos.find((p) => p.codigo.toUpperCase() === "A") ?? medidas.pontos[0];
  const pomB = medidas.pontos.find((p) => p.codigo.toUpperCase() === "B") ?? medidas.pontos[1];

  const compCheck = useMemo(
    () => validateComposicaoAbnt(etiquetagem.composicao),
    [etiquetagem.composicao],
  );
  const pricing = useMemo(() => computeFullTechSheetPricing(doc), [doc]);
  const divParams = useMemo(() => resolveDivisorParams(doc.preCost.divisor), [doc.preCost.divisor]);

  const primaryHex = activeCw?.hex || "#1D6B47";
  const accentHex = activeCw?.secondaryHex || "#EAB308";
  const productTitle = doc.meta?.name || `Camiseta Esportiva Dry Pro`;

  const cycleSilhouette = () => {
    const idx = SILHOUETTES.findIndex((s) => s.id === silhouette);
    const next = SILHOUETTES[(idx + 1) % SILHOUETTES.length];
    updateMeta(refAtual, { silhouette: next.id });
    toast.success(`Silhueta alterada para ${next.label}`);
  };

  const addColorway = () => {
    if (!newCw.name.trim()) {
      toast.error("Informe o nome da variante de cor.");
      return;
    }
    const created: TechSheetColorway = {
      id: `cw-${Date.now().toString(36)}`,
      code: newCw.code.trim().toUpperCase() || `CW-0${colorways.length + 1}`,
      name: newCw.name.trim(),
      hex: newCw.hex,
      secondaryHex: newCw.secondaryHex,
      status: "Ativa",
    };
    const next = [...colorways, created];
    setColorways(refAtual, next);
    onSelectColorway(created.id);
    setNewCw({ code: "", name: "", hex: "#0F766E", secondaryHex: "#F8FAFC" });
    setCwDialogOpen(false);
    toast.success(`Variante ${created.name} adicionada à cartela.`);
  };

  const removeColorway = (id: string) => {
    if (colorways.length <= 1) {
      toast.warning("A ficha precisa manter ao menos 1 variante de cor.");
      return;
    }
    const next = colorways.filter((c) => c.id !== id);
    setColorways(refAtual, next);
    if (activeCw?.id === id && next[0]) onSelectColorway(next[0].id);
  };

  const cycleCare = <K extends keyof CareSymbolChoice>(key: K) => {
    const keys = Object.keys(CARE_SYMBOL_LABELS[key]) as Array<CareSymbolChoice[K]>;
    const curIdx = keys.indexOf(etiquetagem.cuidados[key]);
    const nextVal = keys[(curIdx + 1) % keys.length];
    setEtiquetagem(refAtual, {
      ...etiquetagem,
      cuidados: { ...etiquetagem.cuidados, [key]: nextVal },
    });
  };

  const updateFibra = (idx: number, field: "fibra" | "pct", val: string) => {
    const next = etiquetagem.composicao.map((f, i) =>
      i === idx ? { ...f, [field]: field === "pct" ? Math.max(0, Number(val) || 0) : val } : f,
    );
    setEtiquetagem(refAtual, { ...etiquetagem, composicao: next });
  };

  const addFibra = () => {
    setEtiquetagem(refAtual, {
      ...etiquetagem,
      composicao: [...etiquetagem.composicao, { fibra: "Viscose", pct: 0 }],
    });
  };

  const removeFibra = (idx: number) => {
    if (etiquetagem.composicao.length <= 1) return;
    setEtiquetagem(refAtual, {
      ...etiquetagem,
      composicao: etiquetagem.composicao.filter((_, i) => i !== idx),
    });
  };

  const updateCallout = (id: string, patch: Partial<GarmentCalloutPin>) => {
    const next = callouts.map((c) => (c.id === id ? { ...c, ...patch } : c));
    updateMeta(refAtual, { callouts: next });
  };

  const addCallout = () => {
    const maxNum = callouts.reduce((m, c) => Math.max(m, c.num), 0);
    const created: GarmentCalloutPin = {
      id: `pin-${Date.now().toString(36)}`,
      num: maxNum + 1,
      label: "Novo detalhe construtivo",
      view: "frente",
      x: 50,
      y: 65,
    };
    updateMeta(refAtual, { callouts: [...callouts, created] });
  };

  const removeCallout = (id: string) => {
    updateMeta(refAtual, { callouts: callouts.filter((c) => c.id !== id) });
  };

  const margemBoa = pricing.margemLiquidaRealPct >= pricing.margemLiquidaAlvoPct - 0.5;
  const aplicSetupPeca = Math.round((pricing.aplicacoesPeca + pricing.setupPorPeca) * 100) / 100;
  const pvExibido = pricing.precoSugerido;
  const metaPv = doc.preCost.targetPreco ?? pvExibido;
  const dentroMetaPv = !pricing.divisorInvalido && pvExibido <= metaPv + 0.05;
  const marginBarPct = Math.max(
    4,
    Math.min(
      100,
      (Math.max(0, pricing.margemLiquidaRealPct) / Math.max(1, pricing.margemLiquidaAlvoPct)) * 85,
    ),
  );

  return (
    <Card className="glass-card rounded-xl p-4 space-y-3.5 border-border/80 shadow-sm">
      {/* 1. Cabeçalho Identificador da Peça + Silhueta */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
            <Shirt className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-tight text-foreground truncate">
              <span className="font-mono text-teal-600 dark:text-teal-400">{refAtual}</span>
              {" - "}
              {productTitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={cycleSilhouette}
          title="Clique para alternar a silhueta base do croqui CAD"
          className="shrink-0 rounded-md border border-border/80 bg-muted/50 hover:bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground hover:text-foreground transition"
        >
          {SILHOUETTES.find((s) => s.id === silhouette)?.label ?? "Esportivo"}
        </button>
      </div>

      {/* Abas Croqui Técnico | Prévia IA 3D | Foto */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="inline-flex rounded-lg border border-border/70 bg-muted/30 p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setViewMode("croqui")}
            className={`px-2.5 py-1 rounded-md text-2xs font-medium transition flex items-center gap-1 ${
              viewMode === "croqui"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-3 h-3 text-teal-500" /> Croqui Técnico
          </button>
          <button
            type="button"
            onClick={() => setViewMode("previa3d")}
            className={`px-2.5 py-1 rounded-md text-2xs font-medium transition flex items-center gap-1 ${
              viewMode === "previa3d"
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3 h-3 text-teal-500" /> Prévia IA 3D
          </button>
          {doc.image && (
            <button
              type="button"
              onClick={() => setViewMode("foto")}
              className={`px-2 py-1 rounded-md text-2xs font-medium transition flex items-center gap-1 ${
                viewMode === "foto"
                  ? "bg-background text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="w-3 h-3" /> Foto
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPinsDialogOpen(true)}
            title="Editar pinos e legendas construtivas do croqui"
            className="rounded border border-border/60 bg-background/60 px-2 py-1 text-2xs text-muted-foreground hover:text-foreground transition inline-flex items-center gap-1"
          >
            <MapPin className="w-3 h-3 text-teal-500" /> Pinos ({callouts.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFotoInput(doc.image ?? "");
              setFotoDialogOpen(true);
            }}
            className="rounded border border-border/60 bg-background/60 px-2 py-1 text-2xs text-muted-foreground hover:text-foreground transition"
          >
            Mídia
          </button>
        </div>
      </div>

      {/* 2. Prancheta Estúdio Off-White (#ECEDEE idêntico à referência visual) */}
      <div
        style={{ backgroundColor: "#ECEDEE", color: "#0F172A", borderColor: "#CBD5E1" }}
        className="rounded-lg border p-2.5 relative shadow-inner overflow-hidden"
      >
        {/* Seletor rápido de vista no canto superior direito da prancheta */}
        {viewMode === "croqui" && (
          <div
            style={{ backgroundColor: "#F1F5F9", borderColor: "#CBD5E1", color: "#475569" }}
            className="absolute top-2 right-2 z-10 inline-flex rounded border p-0.5 text-[10px] font-semibold shadow-2xs"
          >
            {(
              [
                { id: "ambos", label: "Frente + Costas" },
                { id: "frente", label: "Frente" },
                { id: "costas", label: "Costas" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCanvasSide(opt.id)}
                style={
                  canvasSide === opt.id
                    ? { backgroundColor: "#0F172A", color: "#F8FAFC" }
                    : undefined
                }
                className="px-1.5 py-0.5 rounded transition"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {viewMode === "croqui" && (
          <div>
            <TechnicalGarmentSvg
              silhouette={silhouette}
              side={canvasSide}
              primaryHex={primaryHex}
              accentHex={accentHex}
              pomACm={pomA?.valorBase ?? 54}
              pomBCm={pomB?.valorBase ?? 70}
              hasChestApp={doc.aplicacoes.length > 0}
              callouts={callouts}
              onClickMeasures={() => onFocusSection?.("sec-medidas")}
              onClickCallout={() => setPinsDialogOpen(true)}
            />

            {/* Legenda técnica de pinos no rodapé da prancheta branca */}
            {callouts.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {callouts.map((pin) => (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={() => setPinsDialogOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-teal-700 transition"
                    >
                      <span
                        style={{ backgroundColor: "#0F172A", color: "#F8FAFC" }}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold font-mono"
                      >
                        {pin.num}
                      </span>
                      <span style={{ color: "#1E293B" }}>{pin.label}</span>
                    </button>
                  ))}
                </div>
                <span style={{ color: "#64748B" }} className="text-[10px] font-mono">
                  Base {medidas.tamanhoBase}
                </span>
              </div>
            )}
          </div>
        )}

        {viewMode === "previa3d" && (
          <div className="py-2 space-y-2">
            <Volumetric3dPreviewSvg
              primaryHex={primaryHex}
              accentHex={accentHex}
              colorName={activeCw?.name ?? "Variante"}
            />
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-600">
              <span>Simulação volumétrica Drape 3D · {activeCw?.code}</span>
              <Link
                to="/ai-center"
                className="font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Gerar no AI Studio
              </Link>
            </div>
          </div>
        )}

        {viewMode === "foto" && (
          <div className="flex flex-col items-center justify-center min-h-[210px] gap-2">
            {doc.image ? (
              <img
                src={doc.image}
                alt={refAtual}
                className="max-h-[225px] rounded-md object-contain"
              />
            ) : (
              <p className="text-xs text-slate-500">Nenhuma foto vinculada.</p>
            )}
          </div>
        )}
      </div>

      {/* 3. Cartela de Variantes (Colorways) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold text-foreground flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-teal-500" /> Cartela de Variantes{" "}
            <span className="text-muted-foreground font-normal">(Colorways)</span>
          </span>
          <button
            type="button"
            onClick={() => setCwDialogOpen(true)}
            className="text-2xs font-medium text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" /> Cor
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {colorways.map((cw) => {
            const selected = cw.id === activeCw?.id;
            return (
              <div
                key={cw.id}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs transition cursor-pointer ${
                  selected
                    ? "border-teal-500/70 bg-teal-500/12 text-foreground font-semibold shadow-2xs"
                    : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onSelectColorway(cw.id)}
              >
                <span className="inline-flex items-center -space-x-1">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/50 shadow-2xs"
                    style={{ backgroundColor: cw.hex }}
                  />
                  {cw.secondaryHex && (
                    <span
                      className="w-3 h-3 rounded-full border border-white/50 shadow-2xs"
                      style={{ backgroundColor: cw.secondaryHex }}
                    />
                  )}
                </span>
                <span className="font-mono text-[11px]">{cw.code}</span>
                {colorways.length > 1 && selected && (
                  <button
                    type="button"
                    aria-label={`Remover variante ${cw.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColorway(cw.id);
                    }}
                    className="ml-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Faixa Compacta de Custos (MP | MO | Aplic. | Custo Ind.) + PV Calculado vs Meta */}
      <div className="rounded-lg border border-border/80 bg-muted/25 p-2.5 space-y-2.5">
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div
            onClick={() => onFocusSection?.("sec-bom")}
            className="cursor-pointer rounded-md border border-border/70 bg-background/80 px-1.5 py-1 hover:border-teal-500/50 transition"
            title="Matéria-Prima (BOM com quebra técnica)"
          >
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
              MP
            </span>
            <span className="font-mono text-[11px] font-semibold text-foreground">
              {brl(pricing.bom)}
            </span>
          </div>

          <div
            onClick={() => onFocusSection?.("sec-roteiro")}
            className="cursor-pointer rounded-md border border-[#5B9D94]/50 bg-[#3B6C66]/45 px-1.5 py-1 hover:border-[#72B9AF] transition"
            title="Mão de Obra Direta / Facção (BOP)"
          >
            <span className="block text-[9px] uppercase tracking-wider text-emerald-700 dark:text-[#B4E4DC]">
              MO
            </span>
            <span className="font-mono text-[11px] font-semibold text-emerald-800 dark:text-[#DCF6F1]">
              {brl(pricing.bop)}
            </span>
          </div>

          <div
            onClick={() => onFocusSection?.("sec-aplicacoes")}
            className="cursor-pointer rounded-md border border-border/70 bg-background/80 px-1.5 py-1 hover:border-teal-500/50 transition"
            title="Aplicações (Estampa/Bordado/Transfer) + Setup diluído"
          >
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
              Aplic.
            </span>
            <span className="font-mono text-[11px] font-semibold text-foreground">
              {brl(aplicSetupPeca)}
            </span>
          </div>

          <div
            onClick={() => onFocusSection?.("sec-custo")}
            style={{
              backgroundColor: "rgba(161, 155, 119, 0.34)",
              borderColor: "rgba(186, 180, 140, 0.55)",
            }}
            className="cursor-pointer rounded-md border px-1.5 py-1 hover:opacity-95 transition"
            title="Custo Industrial Direto por peça (MP + MO + Aplicações + Setup/lote)"
          >
            <span className="block text-[9px] uppercase tracking-wider text-amber-800 dark:text-[#EAE4C5] font-semibold">
              Custo Ind.
            </span>
            <span className="font-mono text-[11px] font-bold text-amber-900 dark:text-[#FAF6E4]">
              {brl(pricing.industrial)}
            </span>
          </div>
        </div>

        {/* Acordeão Rápido: Impostos + Comissões */}
        <div>
          <button
            type="button"
            onClick={() => setTaxExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-2xs text-muted-foreground hover:text-foreground py-0.5 transition"
          >
            <span className="inline-flex items-center gap-1">
              {taxExpanded ? (
                <ChevronDown className="w-3 h-3 text-teal-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-teal-500" />
              )}
              Impostos + Comissões + Desp. Variáveis:{" "}
              <strong className="font-mono text-foreground">
                {pricing.deducoesSemLucroPct.toFixed(1)}%
              </strong>
            </span>
            <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400">
              Divisor {pricing.markupDivisor.toFixed(3)}
            </span>
          </button>

          {taxExpanded && (
            <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-3 gap-1.5">
              <div>
                <label className="text-[10px] text-muted-foreground block">Impostos %</label>
                <Input
                  type="number"
                  step="0.5"
                  value={divParams.impostosPct}
                  onChange={(e) =>
                    updatePreCost(refAtual, {
                      pricingMode: "divisor",
                      divisor: {
                        ...divParams,
                        regime: "PERSONALIZADO",
                        impostosPct: Math.max(0, Number.parseFloat(e.target.value) || 0),
                      },
                    })
                  }
                  className="h-6 text-2xs font-mono px-1.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block">Comissão %</label>
                <Input
                  type="number"
                  step="0.5"
                  value={divParams.comissaoPct}
                  onChange={(e) =>
                    updatePreCost(refAtual, {
                      pricingMode: "divisor",
                      divisor: {
                        ...divParams,
                        regime: "PERSONALIZADO",
                        comissaoPct: Math.max(0, Number.parseFloat(e.target.value) || 0),
                      },
                    })
                  }
                  className="h-6 text-2xs font-mono px-1.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block">Lucro Alvo %</label>
                <Input
                  type="number"
                  step="0.5"
                  value={divParams.margemLiquidaAlvoPct}
                  onChange={(e) =>
                    updatePreCost(refAtual, {
                      pricingMode: "divisor",
                      divisor: {
                        ...divParams,
                        regime: "PERSONALIZADO",
                        margemLiquidaAlvoPct: Math.max(0, Number.parseFloat(e.target.value) || 0),
                      },
                    })
                  }
                  className="h-6 text-2xs font-mono px-1.5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Linha PV Calculado vs Meta editável */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60 flex-wrap">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xs text-muted-foreground">PV Calculado:</span>
            <span className="text-sm font-bold font-mono text-teal-600 dark:text-teal-300">
              {pricing.divisorInvalido ? "Inválido" : brl(pvExibido)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-muted-foreground">Meta R$:</span>
            <input
              type="number"
              step="0.1"
              aria-label="Preço de venda meta"
              value={doc.preCost.targetPreco ?? Math.round(pvExibido * 100) / 100}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                updatePreCost(refAtual, {
                  targetPreco: Number.isFinite(v) && v > 0 ? v : undefined,
                });
              }}
              className="w-16 h-6 rounded border border-border/80 bg-background px-1.5 text-right font-mono text-xs font-semibold text-foreground focus:outline-none focus:border-teal-500"
            />
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                dentroMetaPv
                  ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-300"
              }`}
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              {dentroMetaPv ? "Meta OK" : "Acima"}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Etiquetagem ABNT / INMETRO + Ícones Vetoriais ISO 3758 */}
      <div className="rounded-lg border border-border/70 bg-muted/15 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setAbntDialogOpen(true)}
            className="text-2xs font-semibold text-foreground hover:text-teal-500 transition flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-500" /> Etiquetagem ABNT / INMETRO
          </button>
          <div className="flex items-center gap-1 text-2xs font-mono text-muted-foreground">
            <span>NCM:</span>
            <input
              type="text"
              value={etiquetagem.ncm}
              aria-label="Código NCM fiscal"
              onChange={(e) => setEtiquetagem(refAtual, { ...etiquetagem, ncm: e.target.value })}
              className="w-20 rounded border border-transparent hover:border-border/80 focus:border-teal-500 bg-transparent px-1 py-0.5 text-right font-mono text-2xs text-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setAbntDialogOpen(true)}
            className="text-2xs font-medium text-muted-foreground hover:text-foreground truncate max-w-[190px]"
            title="Clique para editar percentuais de fibras Conmetro"
          >
            {compCheck.resumo || "Definir fibras têxteis"}
          </button>

          {/* 5 Símbolos Vetoriais ISO 3758 Clicáveis */}
          <div className="flex items-center gap-1">
            {(Object.keys(CARE_SYMBOL_LABELS) as Array<keyof CareSymbolChoice>).map((k) => {
              const val = etiquetagem.cuidados[k];
              const dict = CARE_SYMBOL_LABELS[k] as Record<string, { short: string; desc: string }>;
              const info = dict[val];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => cycleCare(k)}
                  title={`${info?.desc ?? val} — clique para alternar símbolo ISO 3758`}
                  className="h-7 w-7 rounded border border-border/70 bg-background/80 hover:border-teal-500/70 flex items-center justify-center text-foreground transition"
                >
                  <IsoCareVectorIcon kind={k} code={String(val)} />
                </button>
              );
            })}
          </div>
        </div>

        {!compCheck.valida && (
          <p className="text-[11px] text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" /> Soma de fibras = {compCheck.somaPct}%
            (Conmetro exige 100%).
          </p>
        )}
      </div>

      {/* 6. Barra Viva Inferior: Margem Líquida + Validação Conmetro */}
      <div className="rounded-lg border border-border/80 bg-background/80 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-2xs font-medium text-muted-foreground">
            Margem Líquida:{" "}
            <strong
              className={`font-mono text-xs ${
                margemBoa
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {pricing.margemLiquidaRealPct.toFixed(1)}%{" "}
              {margemBoa ? "(Atingida)" : `(Alvo ${pricing.margemLiquidaAlvoPct}%)`}
            </strong>
          </span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
              pricing.lucroLiquidoPeca >= 0
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            {pricing.lucroLiquidoPeca >= 0 ? "+" : ""}
            {brl(pricing.lucroLiquidoPeca)}/pç
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              margemBoa ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${marginBarPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
          <span>
            Conmetro:{" "}
            <strong className={compCheck.valida ? "text-emerald-500" : "text-destructive"}>
              {compCheck.somaPct}%
            </strong>
          </span>
          <span className="truncate max-w-[210px]">{compCheck.resumo}</span>
        </div>
      </div>

      {/* Dialog: Nova Variante de Cor */}
      <Dialog open={cwDialogOpen} onOpenChange={setCwDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Variante na Cartela ({refAtual})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Código Cor</Label>
                <Input
                  placeholder="VD-OURO"
                  value={newCw.code}
                  onChange={(e) => setNewCw((s) => ({ ...s, code: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Nome Comercial da Cor</Label>
                <Input
                  placeholder="Verde Bandeira / Ouro"
                  value={newCw.name}
                  onChange={(e) => setNewCw((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cor Principal (Corpo)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={newCw.hex}
                    onChange={(e) => setNewCw((s) => ({ ...s, hex: e.target.value }))}
                    className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={newCw.hex}
                    onChange={(e) => setNewCw((s) => ({ ...s, hex: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Cor Contraste (Gola/Recorte)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={newCw.secondaryHex}
                    onChange={(e) => setNewCw((s) => ({ ...s, secondaryHex: e.target.value }))}
                    className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={newCw.secondaryHex}
                    onChange={(e) => setNewCw((s) => ({ ...s, secondaryHex: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCwDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addColorway}>Adicionar Variante</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pinos / Callouts Construtivos do Croqui */}
      <Dialog open={pinsDialogOpen} onOpenChange={setPinsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pinos e Detalhes Construtivos do Croqui ({refAtual})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 py-2 max-h-[340px] overflow-y-auto">
            {callouts.map((pin) => (
              <div
                key={pin.id}
                className="grid grid-cols-12 gap-2 items-center rounded border border-border/70 p-2 bg-muted/20"
              >
                <div className="col-span-2">
                  <Label className="text-[10px]">Nº</Label>
                  <Input
                    type="number"
                    value={pin.num}
                    onChange={(e) =>
                      updateCallout(pin.id, { num: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div className="col-span-6">
                  <Label className="text-[10px]">Especificação Construtiva</Label>
                  <Input
                    value={pin.label}
                    onChange={(e) => updateCallout(pin.id, { label: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-[10px]">Vista</Label>
                  <select
                    value={pin.view}
                    onChange={(e) =>
                      updateCallout(pin.id, { view: e.target.value as "frente" | "costas" })
                    }
                    className="h-7 w-full rounded border border-border bg-background px-1.5 text-xs"
                  >
                    <option value="frente">Frente</option>
                    <option value="costas">Costas</option>
                  </select>
                </div>
                <div className="col-span-1 pt-4 text-right">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCallout(pin.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full text-xs" onClick={addCallout}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Pino Construtivo
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setPinsDialogOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Etiquetagem ABNT / INMETRO Completa */}
      <Dialog open={abntDialogOpen} onOpenChange={setAbntDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Etiquetagem Obrigatória ABNT / Conmetro ({refAtual})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Classificação Fiscal (NCM)</Label>
                <Input
                  value={etiquetagem.ncm}
                  onChange={(e) =>
                    setEtiquetagem(refAtual, { ...etiquetagem, ncm: e.target.value })
                  }
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">País de Origem</Label>
                <Input
                  value={etiquetagem.paisOrigem}
                  onChange={(e) =>
                    setEtiquetagem(refAtual, { ...etiquetagem, paisOrigem: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Composição Têxtil (soma obrigatória = 100%)</Label>
                <Button size="sm" variant="outline" className="h-6 text-2xs" onClick={addFibra}>
                  <Plus className="w-3 h-3 mr-1" /> Fibra
                </Button>
              </div>
              {etiquetagem.composicao.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={f.fibra}
                    onChange={(e) => updateFibra(idx, "fibra", e.target.value)}
                    placeholder="Ex.: Poliéster, Algodão, Elastano"
                    className="h-8 text-xs flex-1"
                  />
                  <Input
                    type="number"
                    value={f.pct}
                    onChange={(e) => updateFibra(idx, "pct", e.target.value)}
                    className="h-8 text-xs w-20 font-mono text-right"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removeFibra(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <p
                className={`text-2xs font-medium ${
                  compCheck.valida ? "text-emerald-500" : "text-destructive"
                }`}
              >
                Total atual: {compCheck.somaPct}% {compCheck.valida ? "✓ Válido Conmetro" : ""}
              </p>
            </div>

            <div>
              <Label className="text-xs">Instruções Complementares na Etiqueta</Label>
              <Input
                value={etiquetagem.instrucoesExtras ?? ""}
                onChange={(e) =>
                  setEtiquetagem(refAtual, { ...etiquetagem, instrucoesExtras: e.target.value })
                }
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAbntDialogOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: URL de Foto Real / Mídia */}
      <Dialog open={fotoDialogOpen} onOpenChange={setFotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular Foto / Render da Peça ({refAtual})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">URL https:// da imagem (piloto fotografado ou render)</Label>
            <Input
              placeholder="https://..."
              value={fotoInput}
              onChange={(e) => setFotoInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImage(refAtual, undefined);
                setViewMode("croqui");
                setFotoDialogOpen(false);
              }}
            >
              Limpar Foto
            </Button>
            <Button
              onClick={() => {
                const clean = fotoInput.trim();
                setImage(refAtual, clean || undefined);
                if (clean) setViewMode("foto");
                setFotoDialogOpen(false);
                toast.success("Mídia vinculada à ficha técnica.");
              }}
            >
              Salvar Mídia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ============================================================================
 * Subcomponentes Vetoriais de Alta Precisão (Croqui CAD + Prévia 3D + ISO 3758)
 * ========================================================================== */

function TechnicalGarmentSvg({
  silhouette,
  side,
  primaryHex,
  accentHex,
  pomACm,
  pomBCm,
  hasChestApp,
  callouts,
  onClickMeasures,
  onClickCallout,
}: {
  silhouette: GarmentSilhouette;
  side: "ambos" | "frente" | "costas";
  primaryHex: string;
  accentHex: string;
  pomACm: number;
  pomBCm: number;
  hasChestApp: boolean;
  callouts: GarmentCalloutPin[];
  onClickMeasures: () => void;
  onClickCallout: () => void;
}) {
  const showFront = side === "ambos" || side === "frente";
  const showBack = side === "ambos" || side === "costas";
  const viewBox = side === "ambos" ? "0 0 356 208" : "0 0 196 208";
  const frontX = side === "ambos" ? 6 : 14;
  const backX = side === "ambos" ? 182 : 14;

  return (
    <svg
      viewBox={viewBox}
      className="w-full h-auto select-none"
      role="img"
      aria-label="Croqui técnico plano frente e costas"
    >
      <defs>
        <linearGradient id="plmBodyShade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={primaryHex} />
          <stop offset="55%" stopColor={primaryHex} stopOpacity="0.94" />
          <stop offset="100%" stopColor={primaryHex} stopOpacity="0.84" />
        </linearGradient>
        <filter id="softGarmentShadow" x="-10%" y="-10%" width="125%" height="125%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.16" />
        </filter>
      </defs>

      {/* FRENTE */}
      {showFront && (
        <g transform={`translate(${frontX}, 10)`} filter="url(#softGarmentShadow)">
          <text
            x="84"
            y="8"
            fontSize="7.5"
            fill="#64748b"
            textAnchor="middle"
            fontWeight="700"
            letterSpacing="0.08em"
          >
            FRENTE
          </text>

          {silhouette === "calca_jogger" ? (
            <g>
              {/* Cós elástico */}
              <rect
                x="44"
                y="18"
                width="80"
                height="13"
                rx="2"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="1.2"
              />
              {/* Pernas Jogger */}
              <path
                d="M44,31 L124,31 L130,115 L118,188 L96,188 L88,92 L80,92 L72,188 L50,188 L38,115 Z"
                fill="url(#plmBodyShade)"
                stroke="#1e293b"
                strokeWidth="1.3"
              />
              {/* Faixas laterais esportivas */}
              <path d="M44,31 L50,31 L54,188 L50,188 L38,115 Z" fill={accentHex} opacity="0.92" />
              <path
                d="M124,31 L118,31 L114,188 L118,188 L130,115 Z"
                fill={accentHex}
                opacity="0.92"
              />
              {/* Punhos ribana tornozelo */}
              <rect
                x="50"
                y="188"
                width="22"
                height="9"
                rx="1.5"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <rect
                x="96"
                y="188"
                width="22"
                height="9"
                rx="1.5"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="1"
              />
            </g>
          ) : (
            <g>
              {/* Sombra interna da gola */}
              <path d="M63,20 Q84,30 105,20 L105,36 L63,36 Z" fill="#0f172a" opacity="0.35" />

              {/* Corpo anatômico da camiseta/polo/moletom */}
              <path
                d={
                  silhouette === "moletom_raglan"
                    ? "M63,20 L105,20 L154,56 L140,126 L124,122 L120,76 L120,192 L48,192 L48,76 L44,122 L28,126 L14,56 Z"
                    : "M48,26 L64,19 L84,41 L104,19 L120,26 L154,52 L139,84 L119,74 L121,194 L47,194 L49,74 L29,84 L14,52 Z"
                }
                fill="url(#plmBodyShade)"
                stroke="#1e293b"
                strokeWidth="1.35"
                strokeLinejoin="round"
              />

              {/* Recortes laterais ergonômicos em cor contraste (idêntico à imagem ideal) */}
              <path d="M49,74 Q56,115 55,194 L47,194 L49,74 Z" fill={accentHex} opacity="0.94" />
              <path
                d="M119,74 Q112,115 113,194 L121,194 L119,74 Z"
                fill={accentHex}
                opacity="0.94"
              />

              {/* Costuras de cava anatômicas */}
              <path
                d="M48,26 Q54,54 49,74"
                fill="none"
                stroke="#0f172a"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
              <path
                d="M120,26 Q114,54 119,74"
                fill="none"
                stroke="#0f172a"
                strokeOpacity="0.35"
                strokeWidth="1"
              />

              {/* Vivo/punho das mangas */}
              {silhouette !== "moletom_raglan" && (
                <>
                  <path
                    d="M14,52 L29,84 L34,81 L19,49 Z"
                    fill={accentHex}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                  />
                  <path
                    d="M154,52 L139,84 L134,81 L149,49 Z"
                    fill={accentHex}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                  />
                </>
              )}

              {/* Gola conforme silhueta (Gola V Ribana Listrada / Polo / Careca) */}
              {silhouette === "camisa_polo" ? (
                <g>
                  <path
                    d="M62,19 L54,32 L78,36 L84,27 L90,36 L114,32 L106,19 Q84,25 62,19 Z"
                    fill={accentHex}
                    stroke="#1e293b"
                    strokeWidth="1.1"
                  />
                  <rect
                    x="80"
                    y="34"
                    width="8"
                    height="28"
                    rx="1"
                    fill={accentHex}
                    stroke="#1e293b"
                    strokeWidth="0.9"
                  />
                </g>
              ) : (
                <path
                  d="M64,19 L84,45 L104,19 L98,17 L84,36 L70,17 Z"
                  fill={accentHex}
                  stroke="#1e293b"
                  strokeWidth="1.05"
                />
              )}

              {/* Pesponto barra galoneira */}
              <line
                x1="48"
                y1="189"
                x2="120"
                y2="189"
                stroke="#ffffff"
                strokeOpacity="0.45"
                strokeWidth="0.9"
                strokeDasharray="2.5 2"
              />

              {/* Etiqueta interna transfer no decote */}
              <rect x="79" y="22" width="10" height="5" rx="1" fill="#f8fafc" opacity="0.85" />

              {/* Logo/Transfer Alto Relevo Peito Esquerdo */}
              {(hasChestApp || silhouette === "camiseta_v") && (
                <g>
                  <rect
                    x="96"
                    y="53"
                    width="16"
                    height="9"
                    rx="1.5"
                    fill={accentHex}
                    fillOpacity="0.22"
                    stroke={accentHex}
                    strokeWidth="0.9"
                  />
                  <text
                    x="104"
                    y="59.5"
                    fontSize="5.2"
                    fontWeight="800"
                    fill="#ffffff"
                    textAnchor="middle"
                  >
                    DRY
                  </text>
                </g>
              )}
            </g>
          )}

          {/* Cotas de Engenharia Vivas sobre a Frente: (A) Tórax + (B) Comprimento */}
          <g className="cursor-pointer" onClick={onClickMeasures}>
            {/* Cota Horizontal A - Tórax */}
            <line
              x1="49"
              y1="82"
              x2="119"
              y2="82"
              stroke="#e2e8f0"
              strokeWidth="1.1"
              strokeDasharray="2.5 2"
            />
            <circle cx="63" cy="82" r="7" fill="#0f172a" stroke="#5eead4" strokeWidth="1.2" />
            <text
              x="63"
              y="84.8"
              fontSize="7.2"
              fill="#5eead4"
              textAnchor="middle"
              fontWeight="700"
            >
              A
            </text>
            <rect
              x="73"
              y="75.5"
              width="32"
              height="12"
              rx="2.5"
              fill="#0f172a"
              fillOpacity="0.82"
            />
            <text
              x="89"
              y="83.8"
              fontSize="6.8"
              fill="#f8fafc"
              textAnchor="middle"
              fontWeight="600"
            >
              {pomACm} cm
            </text>

            {/* Cota Vertical B - Comprimento */}
            <line
              x1="72"
              y1="21"
              x2="72"
              y2="193"
              stroke="#cbd5e1"
              strokeOpacity="0.75"
              strokeWidth="1"
              strokeDasharray="2.5 2"
            />
            <rect
              x="57"
              y="103"
              width="32"
              height="12"
              rx="2.5"
              fill="#0f172a"
              fillOpacity="0.82"
            />
            <text
              x="73"
              y="111.2"
              fontSize="6.5"
              fill="#cbd5e1"
              textAnchor="middle"
              fontWeight="600"
            >
              {pomBCm} cm
            </text>
          </g>

          {/* Pinos Construtivos Numerados na Frente */}
          {callouts
            .filter((c) => c.view === "frente")
            .map((pin) => {
              const cx = 16 + (pin.x / 100) * 136;
              const cy = 18 + (pin.y / 100) * 176;
              return (
                <g key={pin.id} className="cursor-pointer" onClick={onClickCallout}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="7.5"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth="1.4"
                  />
                  <text
                    x={cx}
                    y={cy + 2.6}
                    fontSize="7.5"
                    fill="#ffffff"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    {pin.num}
                  </text>
                </g>
              );
            })}
        </g>
      )}

      {/* COSTAS */}
      {showBack && (
        <g transform={`translate(${backX}, 10)`} filter="url(#softGarmentShadow)">
          <text
            x="84"
            y="8"
            fontSize="7.5"
            fill="#64748b"
            textAnchor="middle"
            fontWeight="700"
            letterSpacing="0.08em"
          >
            COSTAS
          </text>

          {silhouette === "calca_jogger" ? (
            <g>
              <rect
                x="44"
                y="18"
                width="80"
                height="13"
                rx="2"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="1.2"
              />
              <path
                d="M44,31 L124,31 L130,115 L118,188 L96,188 L88,94 L80,94 L72,188 L50,188 L38,115 Z"
                fill="url(#plmBodyShade)"
                stroke="#1e293b"
                strokeWidth="1.3"
              />
              <rect
                x="92"
                y="46"
                width="20"
                height="18"
                rx="2"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.6"
                strokeWidth="1"
              />
              <rect
                x="50"
                y="188"
                width="22"
                height="9"
                rx="1.5"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <rect
                x="96"
                y="188"
                width="22"
                height="9"
                rx="1.5"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="1"
              />
            </g>
          ) : (
            <g>
              <path
                d="M48,26 L64,19 Q84,25 104,19 L120,26 L154,52 L139,84 L119,74 L121,194 L47,194 L49,74 L29,84 L14,52 Z"
                fill="url(#plmBodyShade)"
                stroke="#1e293b"
                strokeWidth="1.35"
                strokeLinejoin="round"
              />
              {/* Recortes laterais costas */}
              <path d="M49,74 Q57,115 56,194 L47,194 L49,74 Z" fill={accentHex} opacity="0.94" />
              <path
                d="M119,74 Q111,115 112,194 L121,194 L119,74 Z"
                fill={accentHex}
                opacity="0.94"
              />
              {/* Gola ribana costas */}
              <path
                d="M64,19 Q84,26 104,19 L102,24 Q84,31 66,24 Z"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="0.9"
              />
              {/* Punhos */}
              <path
                d="M14,52 L29,84 L34,81 L19,49 Z"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="0.8"
              />
              <path
                d="M154,52 L139,84 L134,81 L149,49 Z"
                fill={accentHex}
                stroke="#1e293b"
                strokeWidth="0.8"
              />
              {/* Pala respirável costas */}
              <path
                d="M50,48 Q84,56 118,48"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.4"
                strokeWidth="0.9"
                strokeDasharray="2.5 2"
              />
            </g>
          )}

          {/* Pinos Construtivos Numerados nas Costas */}
          {callouts
            .filter((c) => c.view === "costas")
            .map((pin) => {
              const cx = 16 + (pin.x / 100) * 136;
              const cy = 18 + (pin.y / 100) * 176;
              return (
                <g key={pin.id} className="cursor-pointer" onClick={onClickCallout}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="7.5"
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth="1.4"
                  />
                  <text
                    x={cx}
                    y={cy + 2.6}
                    fontSize="7.5"
                    fill="#ffffff"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    {pin.num}
                  </text>
                </g>
              );
            })}
        </g>
      )}
    </svg>
  );
}

function Volumetric3dPreviewSvg({
  primaryHex,
  accentHex,
  colorName,
}: {
  primaryHex: string;
  accentHex: string;
  colorName: string;
}) {
  return (
    <svg
      viewBox="0 0 380 205"
      className="w-full h-auto select-none"
      role="img"
      aria-label={`Prévia 3D ${colorName}`}
    >
      <defs>
        <radialGradient id="studioBg" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </radialGradient>
        <linearGradient id="drape3d" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor={primaryHex} stopOpacity="0.86" />
          <stop offset="35%" stopColor={primaryHex} />
          <stop offset="68%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor={primaryHex} stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <rect width="380" height="205" rx="8" fill="url(#studioBg)" />
      <ellipse cx="190" cy="192" rx="82" ry="7" fill="#0f172a" opacity="0.16" />
      <g transform="translate(106, 8)">
        <path
          d="M48,22 L65,15 L84,38 L103,15 L120,22 L156,49 L140,83 L120,73 L122,180 L46,180 L48,73 L28,83 L12,49 Z"
          fill={primaryHex}
        />
        <path
          d="M48,22 L65,15 L84,38 L103,15 L120,22 L156,49 L140,83 L120,73 L122,180 L46,180 L48,73 L28,83 L12,49 Z"
          fill="url(#drape3d)"
          stroke="#0f172a"
          strokeOpacity="0.3"
          strokeWidth="1.1"
        />
        <path d="M48,73 Q56,115 55,180 L46,180 Z" fill={accentHex} opacity="0.95" />
        <path d="M120,73 Q112,115 113,180 L122,180 Z" fill={accentHex} opacity="0.95" />
        <path d="M65,15 L84,41 L103,15 L97,13 L84,32 L71,13 Z" fill={accentHex} />
        {/* Dobras volumétricas de caimento */}
        <path
          d="M66,62 Q72,115 63,172"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M101,58 Q96,118 104,172"
          stroke="#0f172a"
          strokeOpacity="0.16"
          strokeWidth="3"
          fill="none"
        />
      </g>
    </svg>
  );
}

function IsoCareVectorIcon({ kind, code }: { kind: keyof CareSymbolChoice; code: string }) {
  if (kind === "lavagem") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M3 8l2 11h14l2-11" />
        <path d="M4 11c2-1.5 4 1.5 6 0s4-1.5 6 0 3 1 4 0" />
        {code === "NAO_LAVAR" ? (
          <path d="M4 6l16 14M20 6L4 20" strokeWidth="1.8" />
        ) : (
          <text
            x="12"
            y="17.5"
            fontSize="6.5"
            fill="currentColor"
            stroke="none"
            textAnchor="middle"
            fontWeight="700"
          >
            {code.startsWith("40") ? "40" : code === "MAO" ? "M" : "30"}
          </text>
        )}
      </svg>
    );
  }
  if (kind === "alvejamento") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <polygon points="12,4 21,19 3,19" />
        {code === "NAO_ALVEJAR" && <path d="M5 6l14 14M19 6L5 20" />}
        {code === "SEM_CLORO" && <path d="M11 10l-3 9M16 10l-3 9" />}
      </svg>
    );
  }
  if (kind === "secagem") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <rect x="4" y="4" width="16" height="16" rx="1" />
        {code.includes("TAMBOR") ? (
          <circle cx="12" cy="12" r="5.5" />
        ) : code === "HORIZONTAL" ? (
          <line x1="7" y1="12" x2="17" y2="12" />
        ) : (
          <path d="M12 4v10M4 9l5-5" />
        )}
        {code === "NAO_SECAR_TAMBOR" && <path d="M4 4l16 16M20 4L4 20" />}
      </svg>
    );
  }
  if (kind === "passadoria") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M9 6h8l3 10H3c0-4 3-7 7-7h8" />
        {code === "NAO_PASSAR" ? (
          <path d="M5 5l14 14M19 5L5 19" />
        ) : (
          <circle cx="11" cy="13" r="1.2" fill="currentColor" />
        )}
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <circle cx="12" cy="12" r="8" />
      {code === "NAO_LIMPAR_SECO" ? (
        <path d="M5 5l14 14M19 5L5 19" />
      ) : (
        <text
          x="12"
          y="14.5"
          fontSize="8"
          fill="currentColor"
          stroke="none"
          textAnchor="middle"
          fontWeight="700"
        >
          {code.startsWith("UMIDO") ? "W" : "P"}
        </text>
      )}
    </svg>
  );
}
