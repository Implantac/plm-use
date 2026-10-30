// Cockpit Fluido de Engenharia do Produto (PLM 2.0 — alinhado ao layout ideal):
//  - Barra superior operacional: Salvo automaticamente, Duplicar Base, PDF Facção
//    (Sem Custo), PDF Engenharia, Explosão SKUs/OP UseCloud e Publicar no Catálogo;
//  - Título hero editável inline (DEV000006 · Camiseta Esportiva Dry Pro · Coleção Verão 2027)
//    + Esteira de 7 Estágios de Engenharia;
//  - Coluna esquerda fixa (GarmentSketchStudio com prancheta branca Frente+Costas);
//  - Coluna direita fluida com abas de foco + badge interativo Encaixe CAD (88,3%).
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
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
  Boxes,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Copy,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  GitCompare,
  Layers,
  Plus,
  Ruler,
  Scissors,
  Send,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import {
  defaultColorwaysFor,
  defaultEncaixeCadFor,
  defaultMedidasFor,
  LIFECYCLE_STAGES,
  tempoTotalBOP,
  useTechSheetStore,
  type TechSheetLifecycleStage,
} from "@/lib/techsheet/store";
import { buildTechSheetPrintHtml, openPrintWindow } from "@/lib/techsheet/print";
import { computeFullTechSheetPricing } from "@/lib/techsheet/pricing";
import { publishTechSheetToCatalog } from "@/lib/techsheet/publish-catalog";
import {
  buildUseCloudProductionOrderPayload,
  buildUseCloudSkuExplosion,
} from "@/lib/erp/usecloud-adapter";
import { useReferences } from "@/hooks/use-references";
import { GarmentSketchStudio } from "@/components/techsheet/GarmentSketchStudio";
import { BomBopPanel } from "@/components/techsheet/BomBopPanel";
import { AplicacoesPanel } from "@/components/techsheet/AplicacoesPanel";
import { GradedMeasurementsPanel } from "@/components/techsheet/GradedMeasurementsPanel";
import { PreCostPanel } from "@/components/techsheet/PreCostPanel";
import { OperationSequencePanel } from "@/components/techsheet/OperationSequencePanel";
import { TechSheetVersions } from "@/components/techsheet/TechSheetVersions";

const techSheetSearchSchema = z.object({
  ref: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/tech-sheet")({
  validateSearch: techSheetSearchSchema,
  head: () => ({
    meta: [
      { title: "Ficha Técnica Fluida · USE MODA PLM" },
      {
        name: "description",
        content:
          "Cockpit unificado de engenharia têxtil: BOM × Matriz de Cores, Graduação Automática, Etiquetagem ABNT, Mark-up Divisor, PDF Facção e publicação no Catálogo Técnico.",
      },
    ],
  }),
  component: TechSheetPage,
});

type WorkspaceTab = "fluido" | "bom" | "medidas" | "roteiro" | "custo" | "versoes";

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

function TechSheetPage() {
  const { ref: refParam } = Route.useSearch();
  const navigate = useNavigate();
  const { items: dbRefs } = useReferences();

  const ensure = useTechSheetStore((s) => s.ensure);
  const allDocs = useTechSheetStore((s) => s.data);
  const dirtyMap = useTechSheetStore((s) => s.dirty);
  const updateMeta = useTechSheetStore((s) => s.updateMeta);
  const setEncaixeCad = useTechSheetStore((s) => s.setEncaixeCad);
  const duplicateTechSheet = useTechSheetStore((s) => s.duplicateTechSheet);

  const activeRef = (refParam?.trim() || "DEV000006").toUpperCase();
  const doc = useTechSheetStore((s) => s.data[activeRef] ?? ensure(activeRef));

  useEffect(() => {
    ensure(activeRef);
  }, [activeRef, ensure]);

  const linkedDbRef = useMemo(
    () => dbRefs.find((r) => r.code.toUpperCase() === activeRef),
    [dbRefs, activeRef],
  );

  const productName = linkedDbRef?.name ?? doc.meta?.name ?? `Camiseta Esportiva Dry Pro`;
  const productCategory = doc.meta?.category ?? "Esportivo / Malharia";
  const productCollection = linkedDbRef?.collection_id ?? doc.meta?.collection ?? "Verão 2027";
  const currentStage: TechSheetLifecycleStage = doc.meta?.stage ?? 3;
  const cad = doc.encaixeCad ?? defaultEncaixeCadFor();
  const samTotal = useMemo(() => tempoTotalBOP(doc.bop), [doc.bop]);

  const colorways = doc.colorways?.length ? doc.colorways : defaultColorwaysFor();
  const [activeCwId, setActiveCwId] = useState<string>(colorways[0]?.id ?? "cw-1");
  const [tab, setTab] = useState<WorkspaceTab>("fluido");

  const [cadOpen, setCadOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupCode, setDupCode] = useState("");
  const [dupName, setDupName] = useState("");

  const [pubOpen, setPubOpen] = useState(false);
  const [pubAutoValidate, setPubAutoValidate] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const [erpOpen, setErpOpen] = useState(false);
  const [opCustomer, setOpCustomer] = useState("");
  const [opQtyPerSize, setOpQtyPerSize] = useState(40);

  const pricing = useMemo(() => computeFullTechSheetPricing(doc), [doc]);
  const skuExplosion = useMemo(() => buildUseCloudSkuExplosion(doc), [doc]);
  const opPreview = useMemo(() => {
    const sizes = doc.medidas?.tamanhos ?? defaultMedidasFor().tamanhos;
    const activeCw = colorways.find((c) => c.id === activeCwId) ?? colorways[0];
    return buildUseCloudProductionOrderPayload(doc, {
      customerCode: opCustomer,
      grade: sizes.map((size) => ({
        colorCode: activeCw?.code ?? "UN",
        size,
        quantity: Math.max(0, opQtyPerSize),
      })),
    });
  }, [doc, colorways, activeCwId, opCustomer, opQtyPerSize]);

  const availableRefs = useMemo(() => {
    const set = new Set<string>(["DEV000006", activeRef]);
    Object.keys(allDocs).forEach((k) => set.add(k.toUpperCase()));
    dbRefs.forEach((r) => set.add(r.code.toUpperCase()));
    return Array.from(set).sort();
  }, [allDocs, dbRefs, activeRef]);

  const switchRef = (nextRef: string) => {
    const clean = nextRef.trim().toUpperCase();
    if (!clean) return;
    ensure(clean);
    void navigate({ to: "/tech-sheet", search: { ref: clean } });
  };

  const focusSection = (sectionId: string) => {
    setTab("fluido");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const exportPdf = (omitCosts: boolean) => {
    const html = buildTechSheetPrintHtml(
      {
        ref: activeRef,
        name: productName,
        category: productCategory,
        season: `${productCollection} · ${LIFECYCLE_STAGES.find((s) => s.stage === currentStage)?.short ?? "Ficha"}`,
        foto: doc.image,
      },
      doc,
      new Date(),
      { omitCosts },
    );
    if (!openPrintWindow(html)) {
      toast.warning(
        "O navegador bloqueou a janela de impressão — libere pop-ups para gerar o PDF.",
      );
    }
  };

  const handleDuplicate = () => {
    const code = dupCode.trim().toUpperCase();
    if (!code) {
      toast.error("Informe o novo código da referência (ex.: DEV000007).");
      return;
    }
    duplicateTechSheet(activeRef, code, dupName);
    setDupOpen(false);
    setDupCode("");
    setDupName("");
    toast.success(`Base ${activeRef} duplicada com sucesso para ${code}!`);
    switchRef(code);
  };

  const handlePublishCatalog = async () => {
    setPublishing(true);
    try {
      const res = await publishTechSheetToCatalog(doc, {
        code: activeRef,
        name: productName,
        family: productCategory,
        autoValidate: pubAutoValidate,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          `${activeRef} publicado no Catálogo (${res.optionsSynced ?? 0} opções sincronizadas · ${doc.bom.length + doc.aplicacoes.length} insumos · ${doc.bop.length} etapas).`,
        );
        setPubOpen(false);
      }
    } finally {
      setPublishing(false);
    }
  };

  const isDirty = Boolean(dirtyMap[activeRef]);

  return (
    <div className="space-y-4">
      {/* 1. BARRA OPERACIONAL SUPERIOR DO COCKPIT PLM 2.0 */}
      <div className="rounded-xl border border-border/80 bg-card/70 backdrop-blur-md px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Esquerda: Marca PLM + Seletor de Referência + Breadcrumb Rápido */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-500/15 border border-teal-500/35 px-2.5 py-1 text-2xs font-bold tracking-wider uppercase text-teal-700 dark:text-teal-300">
              <Layers className="w-3.5 h-3.5" /> USECLOUD · PLM
            </span>

            <select
              aria-label="Selecionar referência da ficha técnica"
              value={activeRef}
              onChange={(e) => switchRef(e.target.value)}
              className="h-8 rounded-md border border-border/80 bg-background px-2.5 text-xs font-mono font-bold text-foreground focus:outline-none focus:border-teal-500"
            >
              {availableRefs.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setDupCode(`DEV00000${availableRefs.length + 6}`);
                setDupName("Nova Modelagem Base");
                setDupOpen(true);
              }}
              className="h-8 rounded-md border border-dashed border-border/80 px-2.5 text-2xs font-medium text-muted-foreground hover:text-foreground hover:border-teal-500/60 transition inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-teal-500" /> Nova Ref.
            </button>
          </div>

          {/* Direita: Status Auto-save + Duplicar Base + PDF Facção (Sem Custo) + ERP + Catálogo */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setTab("versoes")}
              title="Clique para abrir histórico de versões e snapshots"
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-2xs font-medium transition ${
                isDirty
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {isDirty ? (
                <CloudUpload className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {isDirty ? "Sincronizando..." : "Salvo automaticamente"}
            </button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-2xs gap-1.5"
              onClick={() => {
                setDupCode(`${activeRef}-B`);
                setDupName(`${productName} (Variante)`);
                setDupOpen(true);
              }}
            >
              <Copy className="w-3.5 h-3.5 text-teal-500" /> Duplicar Base
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-2xs gap-1.5 border-teal-500/45 hover:border-teal-500"
              onClick={() => exportPdf(true)}
              title="Gera Ficha Técnica A4 para Facção Externa ocultando 100% dos custos e margens"
            >
              <FileDown className="w-3.5 h-3.5 text-teal-500" /> PDF Facção (Sem Custo)
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-2xs gap-1.5"
              onClick={() => exportPdf(false)}
              title="Gera Dossiê de Engenharia Completo com custos e Mark-up Divisor"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> PDF Engenharia
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-2xs gap-1.5"
              onClick={() => setErpOpen(true)}
              title="Explode grade SKU (Cor × Tamanho) e simula Ordem de Produção UseCloud sem cliente obrigatório"
            >
              <Boxes className="w-3.5 h-3.5 text-teal-500" /> SKUs / OP
            </Button>

            <Button
              size="sm"
              className="h-8 text-2xs gap-1.5 bg-teal-600 hover:bg-teal-500 text-white"
              onClick={() => setPubOpen(true)}
            >
              <Send className="w-3.5 h-3.5" /> Publicar Catálogo
            </Button>
          </div>
        </div>

        {/* Título Hero Editável Inline (DEV000006 · Camiseta Esportiva Dry Pro · Coleção Verão 2027) */}
        <div className="flex items-baseline justify-between gap-3 flex-wrap pt-0.5">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0 flex-1">
            <span className="text-lg lg:text-xl font-extrabold font-mono tracking-tight text-teal-600 dark:text-teal-400">
              {activeRef}
            </span>
            <span className="text-muted-foreground font-bold">·</span>
            <input
              type="text"
              value={productName}
              size={Math.max(16, productName.length + 1)}
              aria-label="Nome técnico do produto"
              onChange={(e) => updateMeta(activeRef, { name: e.target.value })}
              className="text-lg lg:text-xl font-bold tracking-tight text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-teal-500 focus:outline-none max-w-md"
            />
            <span className="text-muted-foreground font-bold">·</span>
            <span className="text-sm text-muted-foreground">Coleção</span>
            <input
              type="text"
              value={productCollection}
              aria-label="Coleção do produto"
              onChange={(e) => updateMeta(activeRef, { collection: e.target.value })}
              className="text-sm font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-teal-500 focus:outline-none w-36"
            />
          </div>

          <div className="flex items-center gap-3 text-2xs text-muted-foreground">
            <Link
              to="/cad"
              className="hover:text-teal-500 transition inline-flex items-center gap-1"
            >
              <Scissors className="w-3 h-3" /> Moldes CAD
            </Link>
            <Link
              to="/prototypes"
              className="hover:text-teal-500 transition inline-flex items-center gap-1"
            >
              <Ruler className="w-3 h-3" /> Pilotagem
            </Link>
          </div>
        </div>

        {/* Esteira Horizontal dos 7 Estágios (fiel à referência visual) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {LIFECYCLE_STAGES.map((st) => {
            const active = st.stage === currentStage;
            const done = st.stage < currentStage;
            return (
              <button
                key={st.stage}
                type="button"
                onClick={() => {
                  updateMeta(activeRef, { stage: st.stage });
                  if (st.stage === 7) focusSection("sec-custo");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap border transition ${
                  active
                    ? "bg-teal-500/20 border-teal-500/70 text-teal-800 dark:text-teal-200 font-bold shadow-xs"
                    : done
                      ? "bg-emerald-500/8 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CORPO EM 2 COLUNAS DO COCKPIT FLUIDO (ESQUERDA FIXA + DIREITA FLUIDA) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Coluna Esquerda Sticky: Estúdio de Croqui + Colorways + Resumo Custo/PV + ABNT */}
        <div className="w-full lg:w-[395px] xl:w-[420px] shrink-0 lg:sticky lg:top-2">
          <GarmentSketchStudio
            refAtual={activeRef}
            activeColorwayId={activeCwId}
            onSelectColorway={setActiveCwId}
            onFocusSection={focusSection}
          />
        </div>

        {/* Coluna Direita Fluida */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Sub-barra de Módulos + Badge Interativo Encaixe CAD (88,3%) à direita */}
          <div className="flex items-center justify-between gap-2 flex-wrap rounded-xl border border-border/80 bg-card/60 px-3 py-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: "fluido", label: "Visão Fluida (Ativo)" },
                  { id: "bom", label: "BOM × Matriz de Cores" },
                  { id: "medidas", label: "Medidas & Graduação" },
                  { id: "roteiro", label: `Roteiro de Costura (${samTotal.toFixed(1)} min)` },
                  { id: "custo", label: "Custo & Mark-up" },
                  { id: "versoes", label: `Versões (${doc.versoes.length})` },
                ] as const
              ).map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`px-2.5 py-1.5 rounded-md text-2xs font-semibold border transition ${
                      active
                        ? "border-teal-500/70 bg-teal-500/15 text-teal-800 dark:text-teal-200"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Badge Encaixe CAD (88,3%) no canto direito igual à imagem ideal */}
            <button
              type="button"
              onClick={() => setCadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/80 hover:border-teal-500/60 px-2.5 py-1.5 text-2xs font-medium text-foreground transition"
              title="Editar parâmetros de Risco/Encaixe CAD da ficha"
            >
              <Workflow className="w-3.5 h-3.5 text-teal-500" />
              <span>Encaixe CAD</span>
              <strong className="font-mono text-teal-600 dark:text-teal-300">
                ({cad.eficienciaPct.toFixed(1)}%)
              </strong>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Módulos Empilhados (Visão Fluida — BOM × Cores + Medidas Graduadas acima da dobra igual à referência ideal) */}
          {tab === "fluido" && (
            <>
              <BomBopPanel refAtual={activeRef} mode="bom-only" />
              <GradedMeasurementsPanel refAtual={activeRef} />
              <BomBopPanel refAtual={activeRef} mode="bop-only" />
              <div id="sec-aplicacoes" className="space-y-4">
                <AplicacoesPanel refAtual={activeRef} />
                <OperationSequencePanel refAtual={activeRef} />
              </div>
              <div id="sec-custo">
                <PreCostPanel refAtual={activeRef} />
              </div>
              <div id="ts-versoes">
                <TechSheetVersions refAtual={activeRef} />
              </div>
            </>
          )}

          {tab === "bom" && <BomBopPanel refAtual={activeRef} mode="bom-only" />}
          {tab === "medidas" && <GradedMeasurementsPanel refAtual={activeRef} />}
          {tab === "roteiro" && (
            <div className="space-y-4">
              <BomBopPanel refAtual={activeRef} mode="bop-only" />
              <AplicacoesPanel refAtual={activeRef} />
              <OperationSequencePanel refAtual={activeRef} />
            </div>
          )}
          {tab === "custo" && <PreCostPanel refAtual={activeRef} />}
          {tab === "versoes" && <TechSheetVersions refAtual={activeRef} />}
        </div>
      </div>

      {/* Dialog: Parâmetros de Encaixe CAD (Risco / Enfesto / Encolhimento) */}
      <Dialog open={cadOpen} onOpenChange={setCadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Engenharia de Molde &amp; Encaixe CAD ({activeRef})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Aproveitamento Encaixe (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={cad.eficienciaPct}
                  onChange={(e) =>
                    setEncaixeCad(activeRef, {
                      ...cad,
                      eficienciaPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Sistema CAD</Label>
                <select
                  aria-label="Sistema CAD"
                  value={cad.sistemaCad ?? "Audaces"}
                  onChange={(e) =>
                    setEncaixeCad(activeRef, {
                      ...cad,
                      sistemaCad: e.target.value as
                        "Audaces" | "Lectra" | "Gerber" | "Optitex" | "CLO3D" | "Outro",
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  {(["Audaces", "Lectra", "Gerber", "Optitex", "CLO3D", "Outro"] as const).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Largura Enfesto (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={cad.larguraEnfestoM}
                  onChange={(e) =>
                    setEncaixeCad(activeRef, {
                      ...cad,
                      larguraEnfestoM: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Comprimento Risco (m)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={cad.comprimentoRiscoM}
                  onChange={(e) =>
                    setEncaixeCad(activeRef, {
                      ...cad,
                      comprimentoRiscoM: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Encolhimento Urdume (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={cad.encolhimentoUrdumePct}
                  onChange={(e) =>
                    setEncaixeCad(activeRef, {
                      ...cad,
                      encolhimentoUrdumePct: Number(e.target.value) || 0,
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Encolhimento Trama (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={cad.encolhimentoTramaPct}
                  onChange={(e) =>
                    setEncaixeCad(activeRef, {
                      ...cad,
                      encolhimentoTramaPct: Number(e.target.value) || 0,
                    })
                  }
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Arquivo de Molde (.ADS / .DXF / .PLT)</Label>
              <Input
                value={cad.arquivoMolde ?? ""}
                onChange={(e) => setEncaixeCad(activeRef, { ...cad, arquivoMolde: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
              <Link to="/cad">
                <ExternalLink className="w-3.5 h-3.5" /> Abrir Repositório /cad
              </Link>
            </Button>
            <Button size="sm" onClick={() => setCadOpen(false)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Duplicar Base / Clonar Ficha */}
      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar Base de Engenharia ({activeRef})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Novo Código de Referência</Label>
              <Input
                placeholder="DEV000007"
                value={dupCode}
                onChange={(e) => setDupCode(e.target.value.toUpperCase())}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Nome do Novo Produto</Label>
              <Input
                placeholder="Regata Esportiva Dry Pro"
                value={dupName}
                onChange={(e) => setDupName(e.target.value)}
                className="text-xs"
              />
            </div>
            <p className="text-2xs text-muted-foreground">
              Copia BOM × Matriz de Cores, Graduação de Medidas, BOP, Aplicações, Etiquetagem ABNT e
              Mark-up Divisor em 1 clique.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicate}>Criar Ficha Derivada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Explosão de SKUs & Ordem de Produção UseCloud (sem cliente obrigatório) */}
      <Dialog open={erpOpen} onOpenChange={setErpOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Explosão de SKUs ({skuExplosion.length}) &amp; Simulador OP UseCloud ({activeRef})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 text-xs max-h-[68vh] overflow-y-auto">
            <div className="rounded-lg border border-teal-500/35 bg-teal-500/10 p-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-foreground">
                  Modalidade OP:{" "}
                  <span className="font-mono text-teal-700 dark:text-teal-300">
                    {opPreview.tipoOp}
                  </span>
                </p>
                <p className="text-2xs text-muted-foreground">
                  Permite emitir OP para Estoque Próprio de coleção sem obrigar vínculo de cliente.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <Label className="text-[10px]">Qtd/Tam</Label>
                  <Input
                    type="number"
                    value={opQtyPerSize}
                    onChange={(e) => setOpQtyPerSize(Math.max(1, Number(e.target.value) || 1))}
                    className="h-7 w-20 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Cliente (opcional)</Label>
                  <Input
                    placeholder="Estoque Próprio"
                    value={opCustomer}
                    onChange={(e) => setOpCustomer(e.target.value)}
                    className="h-7 w-36 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Necessidade Explosão de MP p/ Lote ({opPreview.totalQuantity} peças)
              </h4>
              <div className="rounded border border-border overflow-hidden">
                <table className="w-full text-2xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="py-1.5 px-2 text-left">Material</th>
                      <th className="py-1.5 px-2 text-right">Qtd c/ Quebra</th>
                      <th className="py-1.5 px-2 text-right">Custo Previsto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {opPreview.materiaisNecessarios.map((m, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-2 font-medium">{m.material}</td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {m.consumoTotalComPerda} {m.unidade}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">
                          {brl(m.custoPrevistoTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Grade de SKUs Gerada ({skuExplosion.length} SKUs: Cor × Tamanho)
              </h4>
              <div className="rounded border border-border max-h-44 overflow-y-auto">
                <table className="w-full text-2xs">
                  <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2 text-left">SKU</th>
                      <th className="py-1.5 px-2 text-left">Variante / Tam</th>
                      <th className="py-1.5 px-2 text-left">NCM</th>
                      <th className="py-1.5 px-2 text-right">Custo Ind.</th>
                      <th className="py-1.5 px-2 text-right">PV Sugerido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {skuExplosion.map((s) => (
                      <tr key={s.sku}>
                        <td className="py-1 px-2 font-mono font-semibold">{s.sku}</td>
                        <td className="py-1 px-2">
                          {s.colorName} · <strong>{s.size}</strong>
                        </td>
                        <td className="py-1 px-2 font-mono">{s.ncm}</td>
                        <td className="py-1 px-2 text-right font-mono">{brl(s.custoIndustrial)}</td>
                        <td className="py-1 px-2 text-right font-mono font-semibold text-teal-600 dark:text-teal-300">
                          {brl(s.precoSugerido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(
                    JSON.stringify({ skus: skuExplosion, op: opPreview }, null, 2),
                  );
                  toast.success("Payload JSON UseCloud (SKUs + OP) copiado!");
                }
              }}
            >
              <GitCompare className="w-3.5 h-3.5 mr-1" /> Copiar Payload JSON
            </Button>
            <Button size="sm" onClick={() => setErpOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Publicar no Catálogo Técnico (/catalog) */}
      <Dialog open={pubOpen} onOpenChange={setPubOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publicar {activeRef} no Catálogo Comercial</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Sincroniza de forma idempotente <code>catalog_products</code>,{" "}
              <code>catalog_option_groups</code> e <code>catalog_options</code> para liberar a
              emissão de pedidos comerciais com explosão automática de BOM, BOP e Aplicações:
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 font-mono text-2xs">
              <div className="flex justify-between">
                <span>Referência / Código:</span>
                <strong>{activeRef}</strong>
              </div>
              <div className="flex justify-between">
                <span>Materiais + Aplicações:</span>
                <strong>{doc.bom.length + doc.aplicacoes.length} itens</strong>
              </div>
              <div className="flex justify-between">
                <span>Operações (BOP):</span>
                <strong>{doc.bop.length} etapas</strong>
              </div>
              <div className="flex justify-between">
                <span>Cores na Cartela:</span>
                <strong>{colorways.length} variante(s)</strong>
              </div>
              <div className="flex justify-between">
                <span>Custo Ind. / PV Sugerido:</span>
                <strong>
                  {brl(pricing.industrial)} → {brl(pricing.precoSugerido)}
                </strong>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={pubAutoValidate}
                onChange={(e) => setPubAutoValidate(e.target.checked)}
                className="rounded border-border"
              />
              <span>Marcar produto como Validado para venda imediata em Pedidos</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPubOpen(false)} disabled={publishing}>
              Cancelar
            </Button>
            <Button onClick={() => void handlePublishCatalog()} disabled={publishing}>
              {publishing ? "Publicando..." : "Confirmar Publicação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
