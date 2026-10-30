// Painel Esquerdo do Cockpit Fluido PLM 2.0:
//  1) Croqui Técnico Frente/Costas parametrizado pela Variante de Cor ativa
//     com callouts POM clicáveis + alternância p/ Foto Real;
//  2) Seletor/editor rápido da Cartela de Variantes (Colorways);
//  3) Termômetro financeiro ao vivo (MP + MO + Aplicações + Mark-up Divisor + Margem Líquida);
//  4) Etiquetagem Técnica ABNT NBR NM ISO 3758 / Conmetro (composição 100% + ícones).
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  Image as ImageIcon,
  Palette,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  defaultColorwaysFor,
  defaultEtiquetagemFor,
  useTechSheetStore,
} from "@/lib/techsheet/store";
import {
  CARE_SYMBOL_LABELS,
  validateComposicaoAbnt,
  type CareSymbolChoice,
  type TechSheetColorway,
} from "@/lib/techsheet/textile";
import { computeFullTechSheetPricing } from "@/lib/techsheet/pricing";

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

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
  const setColorways = useTechSheetStore((s) => s.setColorways);
  const setEtiquetagem = useTechSheetStore((s) => s.setEtiquetagem);
  const setImage = useTechSheetStore((s) => s.setImage);

  const [viewMode, setViewMode] = useState<"croqui" | "foto">("croqui");
  const [cwDialogOpen, setCwDialogOpen] = useState(false);
  const [abntDialogOpen, setAbntDialogOpen] = useState(false);
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);
  const [fotoInput, setFotoInput] = useState(doc.image ?? "");

  const [newCw, setNewCw] = useState({
    code: "",
    name: "",
    hex: "#1D6B47",
    secondaryHex: "#EAB308",
  });

  const colorways = doc.colorways?.length ? doc.colorways : defaultColorwaysFor();
  const activeCw = colorways.find((c) => c.id === activeColorwayId) ?? colorways[0];
  const etiquetagem = doc.etiquetagem ?? defaultEtiquetagemFor();
  const compCheck = useMemo(
    () => validateComposicaoAbnt(etiquetagem.composicao),
    [etiquetagem.composicao],
  );
  const pricing = useMemo(() => computeFullTechSheetPricing(doc), [doc]);

  const primaryHex = activeCw?.hex || "#1D6B47";
  const accentHex = activeCw?.secondaryHex || "#EAB308";

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

  const margemBoa = pricing.margemLiquidaRealPct >= pricing.margemLiquidaAlvoPct - 0.5;

  return (
    <Card className="glass-card rounded-xl p-4 space-y-4 border-border/70">
      {/* Barra superior do estúdio visual */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={viewMode === "croqui" ? "default" : "outline"}
            className="h-7 text-2xs px-2.5"
            onClick={() => setViewMode("croqui")}
          >
            <Sparkles className="w-3 h-3 mr-1" /> Croqui Técnico
          </Button>
          <Button
            size="sm"
            variant={viewMode === "foto" ? "default" : "outline"}
            className="h-7 text-2xs px-2.5"
            onClick={() => setViewMode("foto")}
          >
            <ImageIcon className="w-3 h-3 mr-1" /> Foto / Prévia
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-2xs px-2 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setFotoInput(doc.image ?? "");
            setFotoDialogOpen(true);
          }}
        >
          URL Mídia
        </Button>
      </div>

      {/* Área do Croqui Técnico Frente/Costas interativo ou Foto */}
      <div className="rounded-lg bg-slate-950/60 border border-border/60 p-3 relative overflow-hidden">
        {viewMode === "croqui" ? (
          <div className="space-y-2">
            <svg
              viewBox="0 0 420 230"
              className="w-full h-auto select-none"
              role="img"
              aria-label={`Croqui técnico frente e costas — ${activeCw?.name ?? refAtual}`}
            >
              <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primaryHex} stopOpacity="0.98" />
                  <stop offset="100%" stopColor={primaryHex} stopOpacity="0.82" />
                </linearGradient>
              </defs>

              {/* FRENTE */}
              <g transform="translate(18, 12)">
                <text
                  x="82"
                  y="10"
                  fontSize="8"
                  fill="#94a3b8"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  FRENTE
                </text>
                {/* Corpo Camiseta Frente */}
                <path
                  d="M52,22 L66,18 L82,36 L98,18 L112,22 L148,46 L134,82 L116,74 L116,192 L48,192 L48,74 L30,82 L16,46 Z"
                  fill="url(#bodyGrad)"
                  stroke="#e2e8f0"
                  strokeWidth="1.4"
                />
                {/* Recortes laterais esportivos */}
                <path d="M48,74 L56,74 L56,192 L48,192 Z" fill={accentHex} opacity="0.9" />
                <path d="M108,74 L116,74 L116,192 L108,192 Z" fill={accentHex} opacity="0.9" />
                {/* Gola V Ribana Listrada */}
                <path
                  d="M66,18 L82,42 L98,18 L93,17 L82,34 L71,17 Z"
                  fill={accentHex}
                  stroke="#0f172a"
                  strokeWidth="0.9"
                />
                {/* Punhos */}
                <path d="M16,46 L30,82 L34,80 L21,44 Z" fill={accentHex} />
                <path d="M148,46 L134,82 L130,80 L143,44 Z" fill={accentHex} />

                {/* Aplicação Peito Esquerdo */}
                {doc.aplicacoes.length > 0 && (
                  <rect
                    x="92"
                    y="54"
                    width="14"
                    height="14"
                    rx="2"
                    fill={accentHex}
                    fillOpacity="0.85"
                    stroke="#fff"
                    strokeWidth="0.9"
                  />
                )}

                {/* Cotas POM A (Tórax) e B (Comprimento) */}
                <line
                  x1="48"
                  y1="88"
                  x2="116"
                  y2="88"
                  stroke="#38bdf8"
                  strokeWidth="1.1"
                  strokeDasharray="3 2"
                />
                <g className="cursor-pointer" onClick={() => onFocusSection?.("sec-medidas")}>
                  <circle cx="82" cy="88" r="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
                  <text
                    x="82"
                    y="91"
                    fontSize="8"
                    fill="#38bdf8"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    A
                  </text>
                </g>

                <line
                  x1="68"
                  y1="20"
                  x2="68"
                  y2="192"
                  stroke="#34d399"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
                <g className="cursor-pointer" onClick={() => onFocusSection?.("sec-medidas")}>
                  <circle
                    cx="68"
                    cy="134"
                    r="8"
                    fill="#0f172a"
                    stroke="#34d399"
                    strokeWidth="1.2"
                  />
                  <text
                    x="68"
                    y="137"
                    fontSize="8"
                    fill="#34d399"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    B
                  </text>
                </g>
              </g>

              {/* COSTAS */}
              <g transform="translate(222, 12)">
                <text
                  x="82"
                  y="10"
                  fontSize="8"
                  fill="#94a3b8"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  COSTAS
                </text>
                <path
                  d="M52,22 L66,18 Q82,23 98,18 L112,22 L148,46 L134,82 L116,74 L116,192 L48,192 L48,74 L30,82 L16,46 Z"
                  fill="url(#bodyGrad)"
                  stroke="#e2e8f0"
                  strokeWidth="1.4"
                />
                <path d="M48,74 L55,74 L55,192 L48,192 Z" fill={accentHex} opacity="0.9" />
                <path d="M109,74 L116,74 L116,192 L109,192 Z" fill={accentHex} opacity="0.9" />
                {/* Gola costas + etiqueta interna */}
                <path d="M66,18 Q82,24 98,18" fill="none" stroke={accentHex} strokeWidth="3" />
                <rect x="77" y="24" width="10" height="7" rx="1" fill="#f8fafc" opacity="0.85" />
                {/* Cota C (Manga) */}
                <line
                  x1="112"
                  y1="22"
                  x2="148"
                  y2="46"
                  stroke="#fbbf24"
                  strokeWidth="1.1"
                  strokeDasharray="3 2"
                />
                <g className="cursor-pointer" onClick={() => onFocusSection?.("sec-medidas")}>
                  <circle
                    cx="132"
                    cy="34"
                    r="8"
                    fill="#0f172a"
                    stroke="#fbbf24"
                    strokeWidth="1.2"
                  />
                  <text
                    x="132"
                    y="37"
                    fontSize="8"
                    fill="#fbbf24"
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    C
                  </text>
                </g>
              </g>
            </svg>

            <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground pt-1 border-t border-border/40">
              <span>
                <strong className="text-sky-400">A</strong> Tórax ·{" "}
                <strong className="text-emerald-400">B</strong> Compr. ·{" "}
                <strong className="text-amber-400">C</strong> Manga
              </span>
              <span className="truncate">
                Cor ativa: <strong className="text-foreground">{activeCw?.name}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="aspect-[4/3] rounded-md overflow-hidden bg-muted/30 flex items-center justify-center">
            {doc.image && /^https:\/\//.test(doc.image) ? (
              <img
                src={doc.image}
                alt={doc.meta?.name ?? refAtual}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                <Eye className="w-6 h-6 mx-auto text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma foto HTTPS vinculada a {refAtual}. Clique em &ldquo;URL Mídia&rdquo; para
                  anexar foto real do piloto.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cartela de Variantes (Colorways) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary" /> Cartela de Variantes (
            {colorways.length})
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-2xs"
            onClick={() => setCwDialogOpen(true)}
          >
            <Plus className="w-3 h-3 mr-1" /> Variante
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {colorways.map((cw) => {
            const selected = cw.id === activeCw?.id;
            return (
              <div
                key={cw.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs transition cursor-pointer ${
                  selected
                    ? "border-primary bg-primary/15 text-foreground font-semibold"
                    : "border-border/70 bg-muted/30 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onSelectColorway(cw.id)}
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                  style={{
                    background: cw.secondaryHex
                      ? `linear-gradient(135deg, ${cw.hex} 55%, ${cw.secondaryHex} 55%)`
                      : cw.hex,
                  }}
                />
                <span>{cw.code}</span>
                {colorways.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remover variante ${cw.name}`}
                    className="ml-0.5 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColorway(cw.id);
                    }}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Termômetro Financeiro & Mark-up Divisor ao vivo */}
      <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2.5">
        <div className="grid grid-cols-3 gap-1.5 text-2xs">
          <div className="rounded bg-background/60 px-2 py-1.5 border border-border/50">
            <span className="text-muted-foreground block">MP (BOM)</span>
            <strong className="text-foreground">{brl(pricing.bom)}</strong>
          </div>
          <div className="rounded bg-background/60 px-2 py-1.5 border border-border/50">
            <span className="text-muted-foreground block">MO + Aplic.</span>
            <strong className="text-foreground">
              {brl(pricing.bop + pricing.aplicacoesPeca + pricing.setupPorPeca)}
            </strong>
          </div>
          <div className="rounded bg-primary/10 px-2 py-1.5 border border-primary/30">
            <span className="text-primary block">Custo Final</span>
            <strong className="text-foreground">{brl(pricing.custoFinal)}</strong>
          </div>
        </div>

        <div className="flex items-center justify-between text-2xs text-muted-foreground">
          <span>
            Impostos + Comercial:{" "}
            <strong className="text-foreground">{pricing.deducoesSemLucroPct}%</strong>
          </span>
          <span>
            Divisor:{" "}
            <strong className="text-foreground">
              {pricing.divisorInvalido ? "Inválido" : pricing.markupDivisor.toFixed(4)}
            </strong>
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
          <div>
            <span className="text-2xs uppercase tracking-wider text-muted-foreground block">
              PV Calculado
            </span>
            <span className="text-base font-bold text-primary">{brl(pricing.precoSugerido)}</span>
          </div>
          <div className="text-right">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground block">
              Meta Comercial
            </span>
            <span className="text-sm font-semibold text-foreground">
              {doc.preCost.targetPreco ? brl(doc.preCost.targetPreco) : "—"}
            </span>
          </div>
        </div>

        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-2xs">
            <span className="text-muted-foreground">Margem Líquida Real</span>
            <span
              className={`font-semibold flex items-center gap-1 ${
                margemBoa ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {margemBoa ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              {pricing.margemLiquidaRealPct.toFixed(1)}% ({brl(pricing.lucroLiquidoPeca)}/pç)
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${margemBoa ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{
                width: `${Math.max(4, Math.min(100, pricing.margemLiquidaRealPct * 3))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Etiquetagem Técnica ABNT / INMETRO */}
      <div className="rounded-lg border border-border/70 bg-muted/15 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Etiquetagem ABNT / INMETRO
          </span>
          <Badge variant="outline" className="text-[10px] font-mono">
            NCM {etiquetagem.ncm}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-foreground truncate">{compCheck.resumo}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-2xs shrink-0"
            onClick={() => setAbntDialogOpen(true)}
          >
            Editar fibras
          </Button>
        </div>
        {!compCheck.valida && (
          <p className="text-2xs text-destructive">
            Atenção Conmetro: soma atual = {compCheck.somaPct}% (deve fechar 100%).
          </p>
        )}

        <div
          className="grid grid-cols-5 gap-1 pt-1"
          title="Clique em cada símbolo ISO 3758 para alternar"
        >
          {(Object.keys(CARE_SYMBOL_LABELS) as Array<keyof CareSymbolChoice>).map((k) => {
            const val = etiquetagem.cuidados[k];
            const dict = CARE_SYMBOL_LABELS[k] as Record<string, { short: string; desc: string }>;
            const info = dict[val];
            return (
              <button
                key={k}
                type="button"
                onClick={() => cycleCare(k)}
                title={`${info.desc} (clique para alternar)`}
                className="rounded border border-border/70 bg-background/60 py-1.5 px-1 text-center hover:border-primary/60 transition"
              >
                <span className="block text-xs font-mono font-bold text-foreground">
                  {info.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dialog: Nova Variante de Cor */}
      <Dialog open={cwDialogOpen} onOpenChange={setCwDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Variante de Cor (Colorway) — {refAtual}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código Curto</Label>
                <Input
                  placeholder="Ex.: AZ-OURO"
                  value={newCw.code}
                  onChange={(e) => setNewCw((s) => ({ ...s, code: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Nome Comercial da Cor</Label>
                <Input
                  placeholder="Ex.: Marinho / Ouro"
                  value={newCw.name}
                  onChange={(e) => setNewCw((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cor Principal (Corpo)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCw.hex}
                    onChange={(e) => setNewCw((s) => ({ ...s, hex: e.target.value }))}
                    className="h-9 w-12 rounded border border-border bg-transparent cursor-pointer"
                  />
                  <Input
                    value={newCw.hex}
                    onChange={(e) => setNewCw((s) => ({ ...s, hex: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Cor Detalhe / Gola</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newCw.secondaryHex}
                    onChange={(e) => setNewCw((s) => ({ ...s, secondaryHex: e.target.value }))}
                    className="h-9 w-12 rounded border border-border bg-transparent cursor-pointer"
                  />
                  <Input
                    value={newCw.secondaryHex}
                    onChange={(e) => setNewCw((s) => ({ ...s, secondaryHex: e.target.value }))}
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

      {/* Dialog: Composição & NCM ABNT */}
      <Dialog open={abntDialogOpen} onOpenChange={setAbntDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Etiquetagem Técnica ABNT / Conmetro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">NCM Fiscal</Label>
                <Input
                  value={etiquetagem.ncm}
                  onChange={(e) =>
                    setEtiquetagem(refAtual, { ...etiquetagem, ncm: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">País de Origem</Label>
                <Input
                  value={etiquetagem.paisOrigem}
                  onChange={(e) =>
                    setEtiquetagem(refAtual, { ...etiquetagem, paisOrigem: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Fibras Têxteis (Soma deve ser 100%)</Label>
                <Button size="sm" variant="outline" className="h-7 text-2xs" onClick={addFibra}>
                  + Fibra
                </Button>
              </div>
              {etiquetagem.composicao.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Ex.: Poliéster"
                    value={f.fibra}
                    onChange={(e) => updateFibra(idx, "fibra", e.target.value)}
                  />
                  <Input
                    type="number"
                    className="w-24"
                    value={f.pct}
                    onChange={(e) => updateFibra(idx, "pct", e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => removeFibra(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <p
                className={`text-xs font-medium ${compCheck.valida ? "text-emerald-400" : "text-destructive"}`}
              >
                Soma atual: {compCheck.somaPct}%{" "}
                {compCheck.valida ? "✓ Válida" : "— ajuste para 100%"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAbntDialogOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Foto HTTPS */}
      <Dialog open={fotoDialogOpen} onOpenChange={setFotoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Foto Real / Render da Peça ({refAtual})</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">URL HTTPS da imagem</Label>
            <Input
              placeholder="https://..."
              value={fotoInput}
              onChange={(e) => setFotoInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFotoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setImage(refAtual, fotoInput);
                setFotoDialogOpen(false);
                if (fotoInput.startsWith("https://")) setViewMode("foto");
                toast.success("Imagem da ficha atualizada.");
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
