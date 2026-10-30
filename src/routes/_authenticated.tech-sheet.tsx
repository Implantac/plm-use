// Cockpit Fluido de Engenharia do Produto (PLM 2.0):
// Elimina o cabeçalho estático legado ("Blusa Linho Amalfi") e a tabela local
// duplicada, unificando Croqui Técnico + Colorways + Etiquetagem ABNT/INMETRO +
// BOM × Matriz de Cores + Medidas com Graduação Automática + Aplicações +
// Mark-up Divisor + PDF Cego p/ Facção + Publicação direta no Catálogo Técnico.
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
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
  CheckCircle2,
  CloudUpload,
  Copy,
  FileDown,
  FileSpreadsheet,
  GitCompare,
  Layers,
  Link2,
  Plus,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  defaultColorwaysFor,
  LIFECYCLE_STAGES,
  useTechSheetStore,
  type TechSheetLifecycleStage,
} from "@/lib/techsheet/store";
import { buildTechSheetPrintHtml, openPrintWindow } from "@/lib/techsheet/print";
import { computeFullTechSheetPricing } from "@/lib/techsheet/pricing";
import { publishTechSheetToCatalog } from "@/lib/techsheet/publish-catalog";
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

type WorkspaceTab = "fluido" | "bom" | "medidas" | "aplicacoes" | "custo" | "versoes";

function TechSheetPage() {
  const { ref: refParam } = Route.useSearch();
  const navigate = useNavigate();
  const { items: dbRefs } = useReferences();

  const ensure = useTechSheetStore((s) => s.ensure);
  const allDocs = useTechSheetStore((s) => s.data);
  const dirtyMap = useTechSheetStore((s) => s.dirty);
  const updateMeta = useTechSheetStore((s) => s.updateMeta);
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

  const productName =
    linkedDbRef?.name ?? doc.meta?.name ?? `Camiseta Esportiva Dry Pro (${activeRef})`;
  const productCategory = doc.meta?.category ?? "Esportivo / Malharia";
  const productCollection = linkedDbRef?.collection_id ?? doc.meta?.collection ?? "Verão 2027";
  const currentStage: TechSheetLifecycleStage = doc.meta?.stage ?? 3;

  const colorways = doc.colorways?.length ? doc.colorways : defaultColorwaysFor();
  const [activeCwId, setActiveCwId] = useState<string>(colorways[0]?.id ?? "cw-1");
  const [tab, setTab] = useState<WorkspaceTab>("fluido");

  const [dupOpen, setDupOpen] = useState(false);
  const [dupCode, setDupCode] = useState("");
  const [dupName, setDupName] = useState("");

  const [pubOpen, setPubOpen] = useState(false);
  const [pubAutoValidate, setPubAutoValidate] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const pricing = useMemo(() => computeFullTechSheetPricing(doc), [doc]);

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
        return;
      }
      toast.success(
        `Publicado no Catálogo Técnico (${res.code}) com ${res.optionsSynced ?? 0} opção(ões) de engenharia!`,
      );
      setPubOpen(false);
    } finally {
      setPublishing(false);
    }
  };

  const focusSection = (id: string) => {
    setTab("fluido");
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const isDirty = !!dirtyMap[activeRef];

  return (
    <div className="space-y-5 pb-12">
      {/* Top Action Cockpit Header (inspirado diretamente em 2_tela_ideal_plm_fluido.png) */}
      <Card className="glass-card rounded-xl p-4 border-border/70 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Identidade + Seletor Rápido de Referência */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <select
              aria-label="Selecionar referência da ficha técnica"
              value={activeRef}
              onChange={(e) => switchRef(e.target.value)}
              className="h-9 rounded-lg border border-primary/40 bg-primary/10 px-3 text-xs font-mono font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {availableRefs.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={productName}
                  onChange={(e) => updateMeta(activeRef, { name: e.target.value })}
                  aria-label="Nome do produto"
                  className="bg-transparent text-base md:text-lg font-semibold text-foreground border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-0.5"
                />
                <Badge variant="outline" className="text-2xs">
                  {doc.versoes[0]?.versao ?? "v1.0"}
                </Badge>
                {refParam && (
                  <span className="inline-flex items-center gap-1 text-2xs text-primary">
                    <Link2 className="w-3 h-3" /> Link direto
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-2xs text-muted-foreground mt-0.5">
                <input
                  value={productCategory}
                  onChange={(e) => updateMeta(activeRef, { category: e.target.value })}
                  className="bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-36"
                />
                <span>·</span>
                <span>Coleção</span>
                <input
                  value={productCollection}
                  onChange={(e) => updateMeta(activeRef, { collection: e.target.value })}
                  className="bg-transparent font-medium text-foreground border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-28"
                />
              </div>
            </div>
          </div>

          {/* Ações Executivas do Cockpit */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs ${
                isDirty
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {isDirty ? (
                <>
                  <CloudUpload className="w-3 h-3" /> Salvo local · sincronizando
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Salvo automaticamente
                </>
              )}
            </span>

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
              <Copy className="w-3.5 h-3.5" /> Duplicar Base
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-2xs gap-1.5"
              onClick={() => exportPdf(true)}
              title="Gera A4 limpo para oficina/facção omitindo 100% de custos, margens e valores R$"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> PDF Facção (Sem Custo)
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-8 text-2xs gap-1.5"
              onClick={() => exportPdf(false)}
            >
              <FileDown className="w-3.5 h-3.5" /> PDF Engenharia
            </Button>

            <Button size="sm" className="h-8 text-2xs gap-1.5" onClick={() => setPubOpen(true)}>
              <Send className="w-3.5 h-3.5" /> Publicar no Catálogo
            </Button>
          </div>
        </div>

        {/* Esteira Horizontal de 7 Etapas (Proposta → Custo & Preço) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border/50 pb-1">
          {LIFECYCLE_STAGES.map((st) => {
            const active = st.stage === currentStage;
            const done = st.stage < currentStage;
            return (
              <button
                key={st.stage}
                type="button"
                onClick={() => {
                  updateMeta(activeRef, { stage: st.stage });
                  if (st.stage === 4) focusSection("sec-medidas");
                  if (st.stage === 7) focusSection("sec-custo");
                }}
                className={`px-3 py-1.5 rounded-md text-2xs font-medium whitespace-nowrap border transition ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : done
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Split-Pane Fluido: Esquerda Visual/Financeiro/ABNT (4 cols) × Direita Engenharia (8 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        <div className="xl:col-span-4 xl:sticky xl:top-4 space-y-4">
          <GarmentSketchStudio
            refAtual={activeRef}
            activeColorwayId={activeCwId}
            onSelectColorway={setActiveCwId}
            onFocusSection={focusSection}
          />
        </div>

        <div className="xl:col-span-8 space-y-5">
          {/* Sub-abas rápidas da bancada direita (Visão Fluida contínua por padrão) */}
          <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg border border-border/70 bg-muted/20 p-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              {(
                [
                  { id: "fluido", label: "Visão Fluida Completa", icon: Layers },
                  { id: "bom", label: `BOM × Matriz (${doc.bom.length})` },
                  {
                    id: "medidas",
                    label: `Medidas & Graduação (${doc.medidas?.pontos.length ?? 4})`,
                  },
                  { id: "aplicacoes", label: `Aplicações (${doc.aplicacoes.length})` },
                  { id: "custo", label: "Mark-up Divisor & CAD" },
                  { id: "versoes", label: `Versões (${doc.versoes.length})`, icon: GitCompare },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-2.5 py-1.5 rounded text-2xs font-medium transition ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {(tab === "fluido" || tab === "bom") && <BomBopPanel refAtual={activeRef} />}

          {(tab === "fluido" || tab === "medidas") && (
            <GradedMeasurementsPanel refAtual={activeRef} />
          )}

          {(tab === "fluido" || tab === "aplicacoes") && (
            <div className="space-y-5">
              <AplicacoesPanel refAtual={activeRef} />
              <OperationSequencePanel refAtual={activeRef} />
            </div>
          )}

          {(tab === "fluido" || tab === "custo") && <PreCostPanel refAtual={activeRef} />}

          {(tab === "fluido" || tab === "versoes") && (
            <div id="ts-versoes">
              <TechSheetVersions refAtual={activeRef} />
            </div>
          )}
        </div>
      </div>

      {/* Dialog: Duplicar Base */}
      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar Engenharia Base ({activeRef})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Clona integralmente BOM, Matriz de Cores, Tabela de Medidas Graduada, Roteiro de
              Costura, Aplicações e parâmetros fiscais para uma nova referência.
            </p>
            <div>
              <Label className="text-xs">Novo Código de Referência</Label>
              <Input
                value={dupCode}
                onChange={(e) => setDupCode(e.target.value.toUpperCase())}
                placeholder="Ex.: DEV000007"
                className="font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Nome do Novo Produto</Label>
              <Input
                value={dupName}
                onChange={(e) => setDupName(e.target.value)}
                placeholder="Ex.: Camiseta Dry Pro Manga Longa"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicate}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Criar Ficha Clonada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Publicar / Sincronizar no Catálogo Técnico */}
      <Dialog open={pubOpen} onOpenChange={setPubOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publicar Ficha no Catálogo Técnico ({activeRef})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Sincroniza esta Ficha Técnica diretamente com <code>catalog_products</code>,{" "}
              <code>catalog_option_groups</code> e <code>catalog_options</code> para emissão de
              pedidos em <strong>/orders</strong> sem recadastro manual:
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Código / Referência:</span>
                <strong className="font-mono">{activeRef}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grade publicada:</span>
                <strong className="font-mono">
                  {(doc.medidas?.tamanhos ?? ["P", "M", "G", "GG"]).join(" · ")}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens de BOM explodidos:</span>
                <strong>{doc.bom.length} insumo(s)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aplicações por driver:</span>
                <strong>{doc.aplicacoes.length} posição(ões)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço Base sugerido:</span>
                <strong className="text-primary">
                  {(doc.preCost.targetPreco && doc.preCost.targetPreco > 0
                    ? doc.preCost.targetPreco
                    : pricing.precoSugerido
                  ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </strong>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={pubAutoValidate}
                onChange={(e) => setPubAutoValidate(e.target.checked)}
                className="rounded border-border"
              />
              <span>
                Marcar como <strong>Validado</strong> no catálogo (já liberado para entrar em
                pedidos comerciais)
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPubOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePublishCatalog} disabled={publishing}>
              {publishing ? "Sincronizando..." : "Publicar no Catálogo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
