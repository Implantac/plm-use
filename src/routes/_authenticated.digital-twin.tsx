import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Box,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  Factory,
  FileSpreadsheet,
  Layers,
  Loader2,
  RotateCcw,
  Sliders,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ExpandImageBadge, ImageLightbox } from "@/components/ui/image-lightbox";
import { nativeVisualSvg } from "@/lib/ai/native-visual";
import {
  buildPhotorealisticGarmentPrompt,
  buildStudioPayloadFromTechSheet,
} from "@/lib/ai/photorealism";
import { streamImage } from "@/lib/streamImage";
import { defaultColorwaysFor, useTechSheetStore } from "@/lib/techsheet/store";
import { simulateDigitalTwinScenario } from "@/lib/techsheet/digital-twin";

export const Route = createFileRoute("/_authenticated/digital-twin")({
  head: () => ({
    meta: [
      { title: "Gêmeo Digital & Simulador What-If | USE MODA PLM" },
      {
        name: "description",
        content:
          "Réplica digital viva da Ficha Técnica com telemetria 3D de tecido, custo, célula de costura e simulador industrial What-If.",
      },
    ],
  }),
  component: DigitalTwinPage,
});

type TwinLayerId = "design" | "fabrics" | "cost" | "factory";

const brl = (v: number) =>
  (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const ALPHA_STAGE_STYLE: React.CSSProperties = {
  backgroundColor: "#131C2E",
  backgroundImage:
    "linear-gradient(45deg, rgba(255,255,255,0.055) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.055) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.055) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.055) 75%)",
  backgroundSize: "22px 22px",
  backgroundPosition: "0 0, 0 11px, 11px -11px, -11px 0px",
};

function DigitalTwinPage() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const ensure = useTechSheetStore((s) => s.ensure);
  const updatePreCost = useTechSheetStore((s) => s.updatePreCost);

  const [selectedRef, setSelectedRef] = useState("DEV000006");
  const doc = useTechSheetStore((s) => s.data[selectedRef] ?? ensure(selectedRef));

  const colorways = doc.colorways?.length ? doc.colorways : defaultColorwaysFor();
  const [selectedCwId, setSelectedCwId] = useState<string>(colorways[0]?.id ?? "");
  const activeCw = colorways.find((c) => c.id === selectedCwId) ?? colorways[0];

  const [layer, setLayer] = useState<TwinLayerId>("design");
  const [angle, setAngle] = useState<"frente" | "costas">("frente");
  const [aiRenderSrc, setAiRenderSrc] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Controles do Simulador Industrial What-If
  const defaultBatch = Math.max(100, Number(doc.preCost.tiragemPlanejada) || 500);
  const [batchQty, setBatchQty] = useState<number>(defaultBatch);
  const [fabricCostDeltaPct, setFabricCostDeltaPct] = useState<number>(0);
  const [outsourceSharePct, setOutsourceSharePct] = useState<number>(0);
  const [cellEfficiencyPct, setCellEfficiencyPct] = useState<number>(82);
  const [operators, setOperators] = useState<number>(8);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refParam = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (refParam) {
      ensure(refParam);
      setSelectedRef(refParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBatchQty(Math.max(100, Number(doc.preCost.tiragemPlanejada) || 500));
    setSelectedCwId(colorways[0]?.id ?? "");
    setAiRenderSrc(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRef]);

  const refOptions = useMemo(() => {
    const base = ["DEV000006", "V24-001", "U25-014", "I25-088"];
    for (const k of Object.keys(sheetsMap)) {
      if (!base.includes(k)) base.push(k);
    }
    return base;
  }, [sheetsMap]);

  const sim = useMemo(
    () =>
      simulateDigitalTwinScenario(selectedRef, doc, {
        batchQty,
        fabricCostDeltaPct,
        outsourceSharePct,
        cellEfficiencyPct,
        operators,
      }),
    [
      selectedRef,
      doc,
      batchQty,
      fabricCostDeltaPct,
      outsourceSharePct,
      cellEfficiencyPct,
      operators,
    ],
  );

  const volumetricDataUrl = useMemo(() => {
    const svg = nativeVisualSvg({
      family: doc.meta?.category,
      category: doc.meta?.category,
      name: doc.meta?.name || selectedRef,
      color: activeCw?.hex || "#1D6B47",
      view: angle,
      transparent: true,
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [doc.meta?.category, doc.meta?.name, selectedRef, activeCw?.hex, angle]);

  const displaySrc = aiRenderSrc || volumetricDataUrl;

  async function renderAiTwin() {
    setAiBusy(true);
    try {
      const payload = buildStudioPayloadFromTechSheet(selectedRef, doc, activeCw?.id);
      const plan = buildPhotorealisticGarmentPrompt({
        productName: payload.proposal.name,
        category: payload.proposal.category,
        silhouette: payload.proposal.silhouette,
        materials: payload.proposal.suggestedMaterials,
        gramaturaGm2: payload.gramaturaGm2,
        composicao: payload.composicao,
        colorDescription: activeCw ? `${activeCw.name} (${activeCw.hex})` : undefined,
        primaryHex: activeCw?.hex,
        secondaryHex: activeCw?.secondaryHex,
        constructionDetails: payload.proposal.details,
        applications: payload.applications,
        preset: "ghost_mannequin",
        lighting: "softbox_neutro",
        view: angle,
        transparentCutout: true,
      });

      await streamImage(
        "/api/generate-image",
        plan.prompt,
        (dataUrl) => setAiRenderSrc(dataUrl),
        undefined,
        { background: "transparent", size: plan.size, inputFidelity: "high" },
      );
      toast.success("Gêmeo Digital renderizado em alta definição com fundo PNG transparente!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao renderizar Gêmeo IA.");
    } finally {
      setAiBusy(false);
    }
  }

  function resetScenario() {
    setBatchQty(defaultBatch);
    setFabricCostDeltaPct(0);
    setOutsourceSharePct(0);
    setCellEfficiencyPct(82);
    setOperators(8);
    toast.info("Cenário restaurado para os parâmetros base da Ficha Técnica.");
  }

  function commitBatchToSheet() {
    updatePreCost(selectedRef, { tiragemPlanejada: batchQty });
    toast.success(
      `Tiragem planejada de ${batchQty} peças gravada na Ficha Técnica ${selectedRef}.`,
    );
  }

  const LAYER_TABS: Array<{ id: TwinLayerId; label: string }> = [
    { id: "design", label: "1 · Design 3D" },
    { id: "fabrics", label: "2 · Tecidos & MRP" },
    { id: "cost", label: "3 · Custo & Margem" },
    { id: "factory", label: "4 · Célula & Gargalo" },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Cabeçalho conectado à Ficha Técnica */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary text-2xs uppercase tracking-wider"
            >
              PLM Digital Twin · Tempo Real
            </Badge>
            <span className="text-2xs font-mono text-muted-foreground">
              Sincronizado com BOM · BOP · Precificação · MRP
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Gêmeo Digital & Simulador What-If
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inspecione o impacto físico, financeiro e fabril de cada decisão antes de liberar a
            Ordem de Produção.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Selecionar Ficha Técnica do Gêmeo Digital"
            value={selectedRef}
            onChange={(e) => setSelectedRef(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground"
          >
            {refOptions.map((r) => (
              <option key={r} value={r}>
                {r} — {sheetsMap[r]?.meta?.name ?? "Ficha Técnica"}
              </option>
            ))}
          </select>

          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link to="/tech-sheet" search={{ ref: selectedRef } as never}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Abrir Ficha
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5 text-xs">
            <Link to="/ai-center" search={{ ref: selectedRef } as never}>
              <Sparkles className="h-3.5 w-3.5" /> AI Studio HD
            </Link>
          </Button>
        </div>
      </header>

      {/* 5 KPIs Industriais em Tempo Real */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="glass-card rounded-lg p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Custo Final / Peça
            </span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1.5 text-lg font-bold font-mono text-foreground">
            {brl(sim.simulatedPricing.custoFinal)}
          </p>
          <p
            className={`text-[11px] font-mono ${
              sim.unitCostDeltaBrl > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {sim.unitCostDeltaBrl === 0
              ? `Base ${brl(sim.basePricing.custoFinal)}`
              : `${sim.unitCostDeltaBrl > 0 ? "+" : ""}${brl(sim.unitCostDeltaBrl)} vs base`}
          </p>
        </Card>

        <Card className="glass-card rounded-lg p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Margem Líquida
            </span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1.5 text-lg font-bold font-mono text-foreground">
            {sim.simulatedPricing.margemLiquidaRealPct.toFixed(1)}%
          </p>
          <p
            className={`text-[11px] font-mono ${
              sim.marginDeltaPp < 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {sim.marginDeltaPp === 0
              ? `Lucro ${brl(sim.projectedNetProfitBrl)} no lote`
              : `${sim.marginDeltaPp > 0 ? "+" : ""}${sim.marginDeltaPp.toFixed(1)} pp (${brl(sim.projectedNetProfitBrl)})`}
          </p>
        </Card>

        <Card className="glass-card rounded-lg p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Capacidade Combinada
            </span>
            <Factory className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1.5 text-lg font-bold font-mono text-foreground">
            {sim.combinedDailyCapacity} pçs/dia
          </p>
          <p className="text-[11px] text-muted-foreground">
            Interna {sim.internalDailyCapacity}/d
            {sim.externalDailyCapacity > 0 ? ` + Facção ${sim.externalDailyCapacity}/d` : ""}
          </p>
        </Card>

        <Card className="glass-card rounded-lg p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lead Time Estimado
            </span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1.5 text-lg font-bold font-mono text-foreground">
            {sim.simulatedLeadDays} dias úteis
          </p>
          <p
            className={`text-[11px] font-mono ${
              sim.leadDaysDelta > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {sim.leadDaysDelta === 0
              ? `Prazo padrão (${sim.baseLeadDays}d)`
              : `${sim.leadDaysDelta > 0 ? "+" : ""}${sim.leadDaysDelta}d vs lote base`}
          </p>
        </Card>

        <Card className="glass-card rounded-lg p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cobertura Estoque MRP
            </span>
            <Box className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-1.5 text-lg font-bold font-mono text-foreground">
            {sim.mrpCoveragePct}%
          </p>
          <p
            className={`text-[11px] ${
              sim.mrp.itensComFalta > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {sim.mrp.itensComFalta > 0
              ? `Comprar ${brl(sim.mrp.custoCompraTotal)}`
              : "100% coberto no almoxarifado"}
          </p>
        </Card>
      </div>

      {/* Palco 3D + Simulador What-If */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)] gap-5">
        {/* Coluna Esquerda: Palco Gêmeo 3D em Fundo PNG Transparente + Camadas de Raio-X */}
        <Card className="glass-card rounded-lg p-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Camadas do Gêmeo">
              {LAYER_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={layer === t.id}
                  onClick={() => setLayer(t.id)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                    layer === t.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {(["frente", "costas"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => {
                    setAngle(side);
                    setAiRenderSrc(null);
                  }}
                  className={`rounded border px-2 py-1 text-2xs uppercase font-semibold ${
                    angle === side
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {side === "frente" ? "Frente 0°" : "Costas 180°"}
                </button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={aiBusy}
                onClick={() => void renderAiTwin()}
                className="h-7 gap-1.5 text-xs"
              >
                {aiBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 text-primary" />
                )}
                Renderizar Foto IA (PNG)
              </Button>
            </div>
          </div>

          {/* Palco Visual Transparente + Hotspots Industriais */}
          <div
            style={ALPHA_STAGE_STYLE}
            className="relative grid min-h-[420px] grid-cols-1 md:grid-cols-[1fr_minmax(220px,300px)_1fr] items-center gap-3 rounded-lg border border-border p-4 overflow-hidden"
          >
            {/* Hotspots esquerdos */}
            <div className="space-y-3 z-10">
              {sim.hotspots.slice(0, 2).map((spot) => (
                <div
                  key={spot.id}
                  className="rounded-md border border-white/15 bg-[#101829]/88 p-2.5 text-slate-100 shadow-md backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                      {spot.title}
                    </span>
                    {spot.tone === "warn" ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold font-mono text-white">{spot.metric}</p>
                  <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">{spot.detail}</p>
                </div>
              ))}
            </div>

            {/* Peça central clicável para ampliar em Tela Cheia */}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Ampliar Gêmeo Digital de ${doc.meta?.name || selectedRef} em tela cheia`}
              className="group relative mx-auto flex h-[340px] w-full cursor-zoom-in items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ExpandImageBadge label="Ampliar Gêmeo" />
              <img
                src={displaySrc}
                alt={`Gêmeo Digital ${doc.meta?.name || selectedRef}`}
                className="max-h-[325px] w-auto object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </button>

            {/* Hotspots direitos */}
            <div className="space-y-3 z-10">
              {sim.hotspots.slice(2, 4).map((spot) => (
                <div
                  key={spot.id}
                  className="rounded-md border border-white/15 bg-[#101829]/88 p-2.5 text-slate-100 shadow-md backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
                      {spot.title}
                    </span>
                    {spot.tone === "warn" ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold font-mono text-white">{spot.metric}</p>
                  <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">{spot.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Seletor de Colorways + Raio-X Detalhado da Camada Ativa */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-2xs uppercase tracking-wider text-muted-foreground mr-1">
                Variantes:
              </span>
              {colorways.map((cw) => (
                <button
                  key={cw.id}
                  type="button"
                  onClick={() => {
                    setSelectedCwId(cw.id);
                    setAiRenderSrc(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition ${
                    cw.id === activeCw?.id
                      ? "border-primary bg-primary/15 text-foreground font-semibold"
                      : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-black/20"
                    style={{ backgroundColor: cw.hex }}
                  />
                  {cw.name}
                </button>
              ))}
            </div>
            <span className="text-2xs text-muted-foreground">
              Fundo PNG transparente ativo · clique na peça para lupa em tela cheia
            </span>
          </div>

          {/* Conteúdo Dinâmico da Camada Selecionada */}
          {layer === "design" && (
            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              {(doc.medidas?.pontos ?? []).slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="rounded-md border border-border/70 bg-muted/30 p-2.5 flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-primary mr-1.5">{p.codigo}</span>
                    <span className="text-foreground">{p.nome}</span>
                  </div>
                  <span className="font-mono font-semibold text-foreground">
                    {p.valorBase} cm{" "}
                    <span className="text-muted-foreground font-normal">(±{p.toleranciaCm})</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {layer === "fabrics" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-2xs uppercase text-muted-foreground">
                    <th className="py-1.5 pr-2">Insumo BOM</th>
                    <th className="py-1.5 px-2 text-right">
                      Necessidade ({sim.simulatedBatchQty} pçs)
                    </th>
                    <th className="py-1.5 px-2 text-right">Almoxarifado</th>
                    <th className="py-1.5 pl-2 text-right">Compra Líquida</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.mrp.materials.map((m) => (
                    <tr key={m.bomId} className="border-b border-border/50">
                      <td className="py-1.5 pr-2 font-medium text-foreground">{m.material}</td>
                      <td className="py-1.5 px-2 text-right font-mono">
                        {m.necessidadeBruta.toFixed(1)} {m.unidade}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-muted-foreground">
                        {m.saldoAlmoxarifado.toFixed(1)} {m.unidade}
                      </td>
                      <td
                        className={`py-1.5 pl-2 text-right font-mono font-semibold ${
                          m.faltaComprar > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {m.faltaComprar > 0
                          ? `Comprar ${m.faltaComprar.toFixed(1)} ${m.unidade}`
                          : "Coberto"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {layer === "cost" && (
            <div className="grid gap-3 sm:grid-cols-4 text-xs">
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <p className="text-2xs uppercase text-muted-foreground">Matéria-Prima (BOM)</p>
                <p className="mt-1 font-mono text-sm font-bold text-foreground">
                  {brl(sim.simulatedPricing.bom)}
                </p>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <p className="text-2xs uppercase text-muted-foreground">Costura + Facção</p>
                <p className="mt-1 font-mono text-sm font-bold text-foreground">
                  {brl(sim.simulatedPricing.bop)}
                </p>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <p className="text-2xs uppercase text-muted-foreground">Aplicações + Setup/pç</p>
                <p className="mt-1 font-mono text-sm font-bold text-foreground">
                  {brl(sim.simulatedPricing.aplicacoesPeca + sim.simulatedPricing.setupPorPeca)}
                </p>
              </div>
              <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                <p className="text-2xs uppercase text-muted-foreground">PV Sugerido Divisor</p>
                <p className="mt-1 font-mono text-sm font-bold text-primary">
                  {brl(sim.simulatedPricing.precoSugerido)}
                </p>
              </div>
            </div>
          )}

          {layer === "factory" && (
            <div className="space-y-2">
              {sim.lineBalance.stations.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-muted-foreground mr-2">#{st.seq}</span>
                    <span className="font-medium text-foreground">{st.etapa}</span>
                    <span className="ml-2 text-2xs text-muted-foreground">({st.maquina})</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {st.tempoMin.toFixed(2)} min · {st.postosAlocados} posto(s)
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      st.acimaDoPitch
                        ? "border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]"
                        : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px]"
                    }
                  >
                    {st.ocupacaoPostoPct.toFixed(0)}% ocup.
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Coluna Direita: Simulador Industrial What-If */}
        <div className="space-y-4">
          <Card className="glass-card rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" /> Simulador What-If em Tempo Real
              </h2>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={resetScenario}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Base
              </Button>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="sim-batch">Volume do lote simulado</Label>
                  <span className="font-mono font-semibold text-foreground">{batchQty} peças</span>
                </div>
                <input
                  id="sim-batch"
                  type="range"
                  min={100}
                  max={5000}
                  step={50}
                  value={batchQty}
                  onChange={(e) => setBatchQty(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="sim-fabric-delta">Choque de preço nos tecidos</Label>
                  <span className="font-mono font-semibold text-foreground">
                    {fabricCostDeltaPct > 0 ? `+${fabricCostDeltaPct}%` : `${fabricCostDeltaPct}%`}
                  </span>
                </div>
                <input
                  id="sim-fabric-delta"
                  type="range"
                  min={-20}
                  max={35}
                  step={1}
                  value={fabricCostDeltaPct}
                  onChange={(e) => setFabricCostDeltaPct(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="sim-outsource">Rateio para Facção Externa</Label>
                  <span className="font-mono font-semibold text-foreground">
                    {outsourceSharePct}% externo
                  </span>
                </div>
                <input
                  id="sim-outsource"
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={outsourceSharePct}
                  onChange={(e) => setOutsourceSharePct(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="sim-eff" className="text-2xs">
                    Eficiência Célula ({cellEfficiencyPct}%)
                  </Label>
                  <input
                    id="sim-eff"
                    type="range"
                    min={60}
                    max={95}
                    step={1}
                    value={cellEfficiencyPct}
                    onChange={(e) => setCellEfficiencyPct(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sim-ops" className="text-2xs">
                    Costureiras ({operators})
                  </Label>
                  <input
                    id="sim-ops"
                    type="range"
                    min={4}
                    max={24}
                    step={1}
                    value={operators}
                    onChange={(e) => setOperators(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-primary/25 bg-primary/8 p-3 space-y-2">
              <p className="text-2xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Parecer Preditivo do Gêmeo
              </p>
              <p className="text-xs text-foreground leading-relaxed">{sim.executiveAdvisory}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-border/70 bg-muted/30 p-2.5">
                <span className="text-2xs text-muted-foreground block">Faturamento Bruto Lote</span>
                <strong className="font-mono text-sm text-foreground">
                  {brl(sim.projectedGrossRevenueBrl)}
                </strong>
              </div>
              <div className="rounded border border-border/70 bg-muted/30 p-2.5">
                <span className="text-2xs text-muted-foreground block">Lucro Líquido Lote</span>
                <strong
                  className={`font-mono text-sm ${
                    sim.projectedNetProfitBrl >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {brl(sim.projectedNetProfitBrl)}
                </strong>
              </div>
            </div>

            <Button type="button" className="w-full text-xs gap-1.5" onClick={commitBatchToSheet}>
              <Layers className="h-3.5 w-3.5" /> Gravar Tiragem ({batchQty} pçs) na Ficha Técnica
            </Button>
          </Card>
        </div>
      </div>

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        items={[
          {
            src: displaySrc,
            alt: `Gêmeo Digital ${doc.meta?.name || selectedRef} (${angle})`,
            title: `${doc.meta?.name || selectedRef} · ${activeCw?.name ?? "Variante"} (${angle})`,
            subtitle: `${selectedRef} · Custo Simulado ${brl(sim.simulatedPricing.custoFinal)} · Margem ${sim.simulatedPricing.margemLiquidaRealPct.toFixed(1)}% · PNG Transparente`,
            exportBaseName: `gemeo-digital-${selectedRef.toLowerCase()}-${angle}`,
          },
        ]}
      />
    </div>
  );
}
