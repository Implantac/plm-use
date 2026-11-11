// Esteira Integrada de Desenvolvimento & Engenharia do Produto (7 Estágios PLM 2.0):
// Conecta o Kanban de Desenvolvimento diretamente ao store persistente da Ficha
// Técnica (`useTechSheetStore`), exibindo variantes de cor, Custo Industrial,
// PV por Mark-up Divisor, Margem Líquida, Encaixe CAD e atalho 1-clique ao Cockpit.
import { useMemo, useState, type DragEvent } from "react";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileWarning,
  Hourglass,
  Layers,
  LayoutDashboard,
  Plus,
  Scissors,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ModuleActionMenu, ModuleLayout } from "@/components/modules/ModuleLayout";
import { ReferenceJourney } from "@/components/reference/ReferenceJourney";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { filtrarLifecycles, useReferenceStore, type DevFilter } from "@/lib/reference/store";
import { percentualLifecycle, stageAtual, type ReferenceLifecycle } from "@/types/reference";
import { useReferences } from "@/hooks/use-references";
import {
  LIFECYCLE_STAGES,
  tempoTotalBOP,
  useTechSheetStore,
  type TechSheetLifecycleStage,
} from "@/lib/techsheet/store";
import { computeFullTechSheetPricing } from "@/lib/techsheet/pricing";
import {
  averageKanbanMargin,
  buildKanbanRefItems,
  canAdvanceStage,
  type KanbanRefItem,
} from "@/lib/techsheet/kanban-items";

export const Route = createFileRoute("/_authenticated/development")({
  component: DevelopmentPage,
});

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

function DevelopmentPage() {
  const navigate = useNavigate();
  const { items: dbRefs } = useReferences();
  const lifecycles = useReferenceStore((s) => s.lifecycles);

  const techDocs = useTechSheetStore((s) => s.data);
  const criarFicha = useTechSheetStore((s) => s.criarFicha);
  const updateMeta = useTechSheetStore((s) => s.updateMeta);
  const duplicateTechSheet = useTechSheetStore((s) => s.duplicateTechSheet);

  const [searchQ, setSearchQ] = useState("");
  const [dragRef, setDragRef] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<TechSheetLifecycleStage | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [form, setForm] = useState({
    refCode: "",
    name: "",
    category: "Esportivo / Malharia",
    collection: "Verão 2027",
    stage: 1 as TechSheetLifecycleStage,
    cloneFrom: "",
  });

  // A esteira mostra o que a empresa está desenvolvendo. Referência que existe
  // no Ciclo de Vida ou no banco mas não tem ficha salva entra **sem números**:
  // até a Onda 29 ela virava `seedFor(code)`, e arrastar o cartão chamava
  // `ensure()` + `updateMeta()`, gravando o modelo no store como "ficha salva".
  // A partir daí RFQ, MRP e showroom operavam sobre engenharia inventada.
  const items = useMemo<KanbanRefItem[]>(() => {
    const all = buildKanbanRefItems({
      techDocs,
      lifecycles: lifecycles.map((lc) => ({
        ref: lc.ref,
        nome: lc.nome,
        colecao: lc.colecao,
        pct: percentualLifecycle(lc),
      })),
      dbRefs: dbRefs.map((r) => ({
        code: r.code,
        name: r.name,
        collection_id: r.collection_id,
      })),
    });
    const needle = searchQ.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (it) =>
        it.ref.toLowerCase().includes(needle) ||
        it.name.toLowerCase().includes(needle) ||
        it.category.toLowerCase().includes(needle) ||
        it.collection.toLowerCase().includes(needle),
    );
  }, [techDocs, lifecycles, dbRefs, searchQ]);

  const moveItemToStage = (refCode: string, nextStage: TechSheetLifecycleStage) => {
    const current = items.find((i) => i.ref === refCode);
    if (!canAdvanceStage(items, refCode)) {
      toast.error(
        `${refCode} não tem ficha técnica salva. Abra o Cockpit e registre a engenharia antes de avançar de estágio.`,
      );
      return;
    }
    updateMeta(refCode, {
      stage: nextStage,
      name: current?.name,
      category: current?.category,
      collection: current?.collection,
    });
    const stLabel = LIFECYCLE_STAGES.find((s) => s.stage === nextStage)?.label ?? String(nextStage);
    toast.success(`${refCode} movido para ${stLabel}.`);
  };

  const onDragStartCard = (refCode: string, e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", refCode);
    setDragRef(refCode);
  };

  const onDropStage = (stage: TechSheetLifecycleStage, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const code = dragRef || e.dataTransfer.getData("text/plain");
    setDragRef(null);
    setDragOverStage(null);
    if (!code) return;
    moveItemToStage(code, stage);
  };

  const openNewDialog = () => {
    setEditingRef(null);
    setForm({
      refCode: `DEV00000${items.length + 6}`,
      name: "",
      category: "Esportivo / Malharia",
      collection: "Verão 2027",
      stage: 1,
      // Não clona mais DEV000006 por padrão: clonar a ficha de demonstração
      // copiava BOM e custos de exemplo para um produto real, sem avisar.
      cloneFrom: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: KanbanRefItem) => {
    setEditingRef(item.ref);
    setForm({
      refCode: item.ref,
      name: item.name,
      category: item.category,
      collection: item.collection,
      stage: item.stage,
      cloneFrom: "",
    });
    setDialogOpen(true);
  };

  const handleSaveDialog = () => {
    const code = form.refCode.trim().toUpperCase();
    if (!code || !form.name.trim()) {
      toast.error("Informe o código da referência e o nome técnico do produto.");
      return;
    }
    if (!editingRef && form.cloneFrom) {
      // Clonar uma referência que não existe não pode fabricar o modelo como
      // origem: `ensure()` faria isso e a cópia viraria "salva" com custos do
      // DEV000006 (Onda 35).
      if (!techDocs[form.cloneFrom]) {
        toast.error("A referência de origem não tem ficha salva. Escolha outra ou crie do zero.");
        return;
      }
      duplicateTechSheet(form.cloneFrom, code, form.name.trim());
    } else if (!editingRef) {
      criarFicha(code);
    }
    updateMeta(code, {
      name: form.name.trim(),
      category: form.category.trim() || "Confecção",
      collection: form.collection.trim() || "Verão 2027",
      stage: form.stage,
    });
    setDialogOpen(false);
    toast.success(
      editingRef ? `Referência ${code} atualizada!` : `Referência ${code} criada na esteira PLM!`,
    );
  };

  const pilotsStageCount = items.filter((i) => i.stage === 6).length;
  const readyCostCount = items.filter((i) => i.stage === 7).length;
  const avgMargin = useMemo(() => averageKanbanMargin(items), [items]);

  return (
    <ModuleLayout
      title="Esteira de Desenvolvimento & Engenharia (7 Estágios)"
      subtitle="Pipeline persistente conectado em tempo real à Ficha Técnica Fluida: estágios 1 a 7, cartela de cores, Custo Ind., Mark-up Divisor e Encaixe CAD."
      version="PLM 2.0 Fluido"
      onAdd={openNewDialog}
      searchPlaceholder="Filtrar por código DEV, nome, coleção ou categoria"
      onSearch={setSearchQ}
      metrics={[
        { label: "Referências ativas", value: String(items.length), detail: "na esteira PLM" },
        { label: "Em Pilotagem (6)", value: String(pilotsStageCount), detail: "prova de caimento" },
        {
          label: "Custo & Preço (7)",
          value: String(readyCostCount),
          detail: "prontas p/ catálogo",
        },
        {
          label: "Margem Líq. Média",
          value: avgMargin === null ? "—" : `${avgMargin}%`,
          detail: avgMargin === null ? "Sem ficha salva" : "Mark-up Divisor",
        },
      ]}
    >
      {/* Onda 58: 5 siglas medidas no texto desta tela, sem glossário até aqui. */}
      <GlossarioTermos siglas={["SAM", "PV", "BOM", "BOP", "PCP"]} testId="glossario-development" />
      <DevelopmentReferenceJourney />
      <CentroDeDesenvolvimento />

      {/* Kanban Persistente dos 7 Estágios de Engenharia */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-2xs uppercase tracking-[0.05em] text-teal-500 font-bold">
              Pipeline Integrado Ficha Técnica ↔ Engenharia
            </p>
            <h2 className="text-base font-bold text-foreground">
              Esteira Operacional em 7 Estágios (Arraste os cards ou abra o Cockpit Fluido)
            </h2>
          </div>
          <Button
            size="sm"
            className="h-8 text-2xs gap-1.5 bg-teal-600 hover:bg-teal-500 text-[#EEF7FA]"
            onClick={openNewDialog}
          >
            <Plus className="w-3.5 h-3.5" /> Nova Referência PLM
          </Button>
        </div>

        <div className="flex gap-3.5 overflow-x-auto pb-4 min-h-[440px]">
          {LIFECYCLE_STAGES.map((st) => {
            const stageItems = items.filter((it) => it.stage === st.stage);
            const isOver = dragOverStage === st.stage;
            return (
              <div
                key={st.stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(st.stage);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => onDropStage(st.stage, e)}
                className={`min-w-[272px] w-[272px] shrink-0 rounded-xl border p-2.5 flex flex-col gap-2.5 transition ${
                  isOver
                    ? "border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/30"
                    : "border-border/80 bg-card/45"
                }`}
              >
                <div className="flex items-center justify-between px-1 py-0.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    {st.label}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
                    {stageItems.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5">
                  {stageItems.map((item) => {
                    const doc = item.doc;
                    const pricing = doc ? computeFullTechSheetPricing(doc) : null;
                    const cws = doc?.colorways?.length ? doc.colorways : [];
                    const cad = doc?.encaixeCad;
                    const sam = doc ? tempoTotalBOP(doc.bop) : null;
                    const nextStage =
                      item.stage < 7 ? ((item.stage + 1) as TechSheetLifecycleStage) : null;

                    return (
                      <Card
                        key={item.ref}
                        draggable={!!item.doc}
                        onDragStart={(e) => onDragStartCard(item.ref, e)}
                        onDragEnd={() => {
                          setDragRef(null);
                          setDragOverStage(null);
                        }}
                        className="glass-card rounded-lg border-border/80 hover:border-teal-500/60 transition cursor-grab active:cursor-grabbing group"
                      >
                        <CardContent className="p-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-flex items-center gap-1 font-mono text-2xs font-extrabold text-teal-600 dark:text-teal-400">
                                <Layers className="w-3 h-3" /> {item.ref}
                              </span>
                              <h4 className="text-xs font-bold text-foreground mt-0.5 leading-snug">
                                {item.name}
                              </h4>
                              <p className="text-[10px] text-muted-foreground">
                                {item.collection} · {item.category}
                              </p>
                            </div>
                            <ModuleActionMenu
                              onEdit={() => openEditDialog(item)}
                              onView={() =>
                                void navigate({ to: "/tech-sheet", search: { ref: item.ref } })
                              }
                            />
                          </div>

                          {/* Swatches bicolores das variantes */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              {cws.length === 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  Sem variantes de cor
                                </span>
                              )}
                              {cws.slice(0, 4).map((cw) => (
                                <span
                                  key={cw.id}
                                  title={`${cw.code} · ${cw.name}`}
                                  className="inline-flex items-center -space-x-1"
                                >
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-white/60 shadow-2xs"
                                    style={{ backgroundColor: cw.hex }}
                                  />
                                  {cw.secondaryHex && (
                                    <span
                                      className="w-2.5 h-2.5 rounded-full border border-white/60"
                                      style={{ backgroundColor: cw.secondaryHex }}
                                    />
                                  )}
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground inline-flex items-center gap-1">
                              <Scissors className="w-2.5 h-2.5 text-teal-500" /> CAD{" "}
                              {cad ? `${cad.eficienciaPct}%` : "—"}
                            </span>
                          </div>

                          {/* Mini KPIs Industriais: só existem com ficha salva. */}
                          {pricing ? (
                            <div className="grid grid-cols-3 gap-1 rounded-md border border-border/60 bg-background/60 p-1.5 text-center font-mono">
                              <div>
                                <div className="text-[9px] uppercase text-muted-foreground">
                                  Custo
                                </div>
                                <div className="text-[11px] font-bold text-foreground">
                                  {brl(pricing.industrial)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[9px] uppercase text-muted-foreground">PV</div>
                                <div className="text-[11px] font-bold text-teal-600 dark:text-teal-300">
                                  {brl(pricing.precoSugerido)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[9px] uppercase text-muted-foreground">
                                  Margem
                                </div>
                                <div
                                  className={`text-[11px] font-bold inline-flex items-center justify-center gap-0.5 ${
                                    pricing.margemLiquidaRealPct >=
                                    pricing.margemLiquidaAlvoPct - 0.5
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  <TrendingUp className="w-2.5 h-2.5" />
                                  {pricing.margemLiquidaRealPct.toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              data-testid={`kanban-sem-ficha-${item.ref}`}
                              className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 space-y-1"
                            >
                              <div className="text-[10px] text-amber-700 dark:text-amber-300 inline-flex items-center gap-1 font-semibold">
                                <FileWarning className="w-3 h-3" /> Sem ficha técnica salva
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-snug">
                                Custo, PV, margem e SAM não são apurados. Avançar de estágio exige
                                registrar a engenharia do produto.
                              </p>
                              <Link
                                to="/tech-sheet"
                                search={{ ref: item.ref }}
                                className="text-[10px] text-primary underline inline-flex items-center gap-1"
                              >
                                Criar ficha técnica <ArrowRight className="w-2.5 h-2.5" />
                              </Link>
                            </div>
                          )}

                          {/* Rodapé de Ação Rápida: SAM + Abrir Cockpit + Avançar Etapa */}
                          <div className="flex items-center justify-between pt-1 border-t border-border/50 gap-1.5">
                            <span className="text-[10px] font-mono text-muted-foreground inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />{" "}
                              {sam !== null ? `${sam.toFixed(1)}m` : "—"}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] gap-1 border-teal-500/40 hover:border-teal-500"
                                asChild
                              >
                                <Link to="/tech-sheet" search={{ ref: item.ref }}>
                                  <ExternalLink className="w-2.5 h-2.5 text-teal-500" /> Cockpit
                                </Link>
                              </Button>
                              {nextStage && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] gap-0.5"
                                  title={
                                    doc
                                      ? `Avançar para estágio ${nextStage}`
                                      : "Salve a ficha técnica antes de avançar"
                                  }
                                  disabled={!doc}
                                  onClick={() => moveItemToStage(item.ref, nextStage)}
                                >
                                  Etapa {nextStage} <ArrowRight className="w-2.5 h-2.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {stageItems.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-2xs text-muted-foreground">
                      Arraste uma referência para {st.short}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog: Nova / Editar Referência na Esteira PLM */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRef
                ? `Editar Engenharia · ${editingRef}`
                : "Nova Referência na Esteira PLM 2.0"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código da Referência</Label>
                <Input
                  aria-label="Código da Referência"
                  value={form.refCode}
                  disabled={Boolean(editingRef)}
                  onChange={(e) => setForm({ ...form, refCode: e.target.value.toUpperCase() })}
                  placeholder="DEV000007"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Estágio Inicial (1 a 7)</Label>
                <select
                  aria-label="Estágio de engenharia"
                  value={form.stage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stage: Number(e.target.value) as TechSheetLifecycleStage,
                    })
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                >
                  {LIFECYCLE_STAGES.map((s) => (
                    <option key={s.stage} value={s.stage}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Nome Técnico do Produto</Label>
              <Input
                aria-label="Nome Técnico do Produto"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Regata Dry Fit Pro Run"
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Coleção</Label>
                <Input
                  aria-label="Coleção"
                  value={form.collection}
                  onChange={(e) => setForm({ ...form, collection: e.target.value })}
                  placeholder="Verão 2027"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Categoria / Linha</Label>
                <Input
                  aria-label="Categoria / Linha"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Esportivo / Malharia"
                  className="text-xs"
                />
              </div>
            </div>
            {!editingRef && (
              <div className="space-y-1">
                <Label className="text-xs">Clonar Base de Engenharia (opcional)</Label>
                <select
                  value={form.cloneFrom}
                  onChange={(e) => setForm({ ...form, cloneFrom: e.target.value })}
                  aria-label="Clonar base de engenharia"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 font-mono text-xs text-foreground"
                >
                  <option value="">Ficha padrão em branco</option>
                  {Object.keys(techDocs)
                    .sort()
                    .filter((c) => c.toUpperCase() !== form.refCode.trim().toUpperCase())
                    .map((c) => (
                      <option key={c} value={c}>
                        {c} — {techDocs[c]?.meta?.name ?? "sem nome"}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Só fichas salvas aparecem aqui. Clonar copia BOM, BOP, medidas e custos — o
                  produto novo nasce com a engenharia do original já preenchida.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDialog}>Salvar na Esteira</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}

function DevelopmentReferenceJourney() {
  const { items, loading, error } = useReferences();
  const { openEntity } = useEntityDrawer();

  return (
    <ReferenceJourney
      title="Referências do ciclo real"
      references={items}
      loading={loading}
      error={Boolean(error)}
      limit={6}
      onOpen={(reference) =>
        openEntity({
          type: "reference",
          id: reference.id,
          title: reference.name,
          subtitle: reference.code,
        })
      }
    />
  );
}

const FILTERS: { id: DevFilter; label: string; icon: typeof Sparkles }[] = [
  { id: "todos", label: "Todos", icon: LayoutDashboard },
  { id: "pilotos_pendentes", label: "Pilotos pendentes", icon: Hourglass },
  { id: "sem_ficha", label: "Sem ficha técnica", icon: FileWarning },
  { id: "aguardando_aprovacao", label: "Aguardando aprovação", icon: Sparkles },
  { id: "liberados_pcp", label: "Liberados PCP", icon: CheckCircle2 },
  { id: "atrasados", label: "Atrasados", icon: AlertTriangle },
];

function CentroDeDesenvolvimento() {
  const lifecycles = useReferenceStore((s) => s.lifecycles);
  const [filter, setFilter] = useState<DevFilter>("todos");

  const counts = useMemo(() => {
    const out: Record<DevFilter, number> = {
      todos: lifecycles.length,
      pilotos_pendentes: 0,
      sem_ficha: 0,
      aguardando_aprovacao: 0,
      liberados_pcp: 0,
      atrasados: 0,
    };
    for (const f of FILTERS) {
      if (f.id === "todos") continue;
      out[f.id] = filtrarLifecycles(lifecycles, f.id).length;
    }
    return out;
  }, [lifecycles]);

  const filtered = useMemo(() => filtrarLifecycles(lifecycles, filter), [lifecycles, filter]);

  return (
    <section className="mb-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xs uppercase tracking-[0.05em] text-primary">
            Centro de Desenvolvimento
          </p>
          <h2 className="text-lg font-bold text-foreground">Visão única da coleção</h2>
        </div>
        <p className="text-2xs uppercase tracking-[0.05em] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "referência" : "referências"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.id;
          const count = counts[f.id];
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-2xs uppercase tracking-[0.04em] transition ${
                active
                  ? "border-primary/60 bg-primary/15 text-foreground font-semibold"
                  : "border-border bg-muted/50 text-muted-foreground hover:border-border-strong/70 hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {f.label}
              <span
                className={`rounded-full px-1.5 text-2xs ${
                  active ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filter !== "todos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nada neste filtro.</p>
          ) : (
            filtered.map((lc) => <LifecycleCard key={lc.ref} lc={lc} />)
          )}
        </div>
      )}
    </section>
  );
}

function LifecycleCard({ lc }: { lc: ReferenceLifecycle }) {
  const pct = percentualLifecycle(lc);
  const stage = stageAtual(lc);
  const atrasada = !!lc.prazo && pct < 100 && new Date(lc.prazo).getTime() < Date.now();

  return (
    <Link
      to="/tech-sheet"
      search={{ ref: lc.ref }}
      className="block rounded-lg border border-border bg-muted/50 p-4 hover:border-primary/40 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xs uppercase tracking-[0.05em] text-primary">{lc.ref}</p>
          <p className="text-sm font-bold text-foreground mt-0.5">{lc.nome}</p>
          <p className="text-2xs text-muted-foreground mt-1">
            {lc.colecao ?? "—"} · {lc.designer ?? "—"}
          </p>
        </div>
        {atrasada && (
          <span className="text-2xs uppercase tracking-wider px-2 py-0.5 rounded-full border border-status-rejected/40 bg-status-rejected/10 text-status-rejected">
            Atrasada
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-2xs uppercase tracking-wider text-muted-foreground">
          <span>{stage?.label ?? "—"}</span>
          <span className="text-foreground">{pct}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/60 to-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
