// Esteira Integrada de Desenvolvimento & Engenharia do Produto (7 Estágios PLM 2.0):
// Conecta o Kanban de Desenvolvimento diretamente ao store persistente da Ficha
// Técnica (`useTechSheetStore`), exibindo variantes de cor, Custo Industrial,
// PV por Mark-up Divisor, Margem Líquida, Encaixe CAD e atalho 1-clique ao Cockpit.
import { useMemo, useState, type DragEvent } from "react";
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
  defaultColorwaysFor,
  defaultEncaixeCadFor,
  LIFECYCLE_STAGES,
  seedFor,
  tempoTotalBOP,
  useTechSheetStore,
  type TechSheetData,
  type TechSheetLifecycleStage,
} from "@/lib/techsheet/store";
import { computeFullTechSheetPricing } from "@/lib/techsheet/pricing";

export const Route = createFileRoute("/_authenticated/development")({
  component: DevelopmentPage,
});

interface KanbanRefItem {
  ref: string;
  name: string;
  category: string;
  collection: string;
  stage: TechSheetLifecycleStage;
  doc: TechSheetData;
}

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

function mapPercentToStage(pct: number): TechSheetLifecycleStage {
  if (pct <= 15) return 1;
  if (pct <= 30) return 2;
  if (pct <= 50) return 3;
  if (pct <= 65) return 4;
  if (pct <= 80) return 5;
  if (pct < 100) return 6;
  return 7;
}

function DevelopmentPage() {
  const navigate = useNavigate();
  const { items: dbRefs } = useReferences();
  const lifecycles = useReferenceStore((s) => s.lifecycles);

  const techDocs = useTechSheetStore((s) => s.data);
  const ensure = useTechSheetStore((s) => s.ensure);
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
    cloneFrom: "DEV000006",
  });

  // Consolida referências reais do store de Ficha Técnica + Ciclo de Vida + Supabase
  const items = useMemo<KanbanRefItem[]>(() => {
    const map = new Map<string, KanbanRefItem>();

    // Garante DEV000006 sempre visível na esteira
    const baseSix = techDocs["DEV000006"] ?? seedFor("DEV000006");
    map.set("DEV000006", {
      ref: "DEV000006",
      name: baseSix.meta?.name ?? "Camiseta Esportiva Dry Pro",
      category: baseSix.meta?.category ?? "Esportivo / Malharia",
      collection: baseSix.meta?.collection ?? "Verão 2027",
      stage: baseSix.meta?.stage ?? 3,
      doc: baseSix,
    });

    // Todas as fichas salvas no store persistente
    for (const [key, doc] of Object.entries(techDocs)) {
      const code = key.toUpperCase();
      map.set(code, {
        ref: code,
        name: doc.meta?.name ?? `Produto ${code}`,
        category: doc.meta?.category ?? "Confecção",
        collection: doc.meta?.collection ?? "Verão 2027",
        stage: doc.meta?.stage ?? 3,
        doc,
      });
    }

    // Referências do Centro de Desenvolvimento ainda não abertas no store
    for (const lc of lifecycles) {
      const code = lc.ref.toUpperCase();
      if (!map.has(code)) {
        const fallbackDoc = seedFor(code);
        map.set(code, {
          ref: code,
          name: lc.nome,
          category: "Coleção",
          collection: lc.colecao ?? "Verão 2027",
          stage: mapPercentToStage(percentualLifecycle(lc)),
          doc: fallbackDoc,
        });
      }
    }

    // Referências vindas do banco Supabase
    for (const r of dbRefs) {
      const code = r.code.toUpperCase();
      const existing = map.get(code);
      if (existing) {
        map.set(code, { ...existing, name: r.name || existing.name });
      } else {
        const fallbackDoc = seedFor(code);
        map.set(code, {
          ref: code,
          name: r.name,
          category: "Confecção",
          collection: r.collection_id ?? "Verão 2027",
          stage: 3,
          doc: fallbackDoc,
        });
      }
    }

    const needle = searchQ.trim().toLowerCase();
    const list = Array.from(map.values());
    if (!needle) return list;
    return list.filter(
      (it) =>
        it.ref.toLowerCase().includes(needle) ||
        it.name.toLowerCase().includes(needle) ||
        it.category.toLowerCase().includes(needle) ||
        it.collection.toLowerCase().includes(needle),
    );
  }, [techDocs, lifecycles, dbRefs, searchQ]);

  const moveItemToStage = (refCode: string, nextStage: TechSheetLifecycleStage) => {
    const current = items.find((i) => i.ref === refCode);
    ensure(refCode);
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
      cloneFrom: "DEV000006",
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
      ensure(form.cloneFrom);
      duplicateTechSheet(form.cloneFrom, code, form.name.trim());
    } else {
      ensure(code);
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
  const avgMargin = useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce(
      (acc, it) => acc + computeFullTechSheetPricing(it.doc).margemLiquidaRealPct,
      0,
    );
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

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
        { label: "Margem Líq. Média", value: `${avgMargin}%`, detail: "Mark-up Divisor" },
      ]}
    >
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
                    const pricing = computeFullTechSheetPricing(item.doc);
                    const cws = item.doc.colorways?.length
                      ? item.doc.colorways
                      : defaultColorwaysFor();
                    const cad = item.doc.encaixeCad ?? defaultEncaixeCadFor();
                    const sam = tempoTotalBOP(item.doc.bop);
                    const nextStage =
                      item.stage < 7 ? ((item.stage + 1) as TechSheetLifecycleStage) : null;

                    return (
                      <Card
                        key={item.ref}
                        draggable
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
                              {cad.eficienciaPct}%
                            </span>
                          </div>

                          {/* Mini KPIs Industriais: Custo Ind., PV e Margem */}
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
                                  pricing.margemLiquidaRealPct >= pricing.margemLiquidaAlvoPct - 0.5
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                <TrendingUp className="w-2.5 h-2.5" />
                                {pricing.margemLiquidaRealPct.toFixed(0)}%
                              </div>
                            </div>
                          </div>

                          {/* Rodapé de Ação Rápida: SAM + Abrir Cockpit + Avançar Etapa */}
                          <div className="flex items-center justify-between pt-1 border-t border-border/50 gap-1.5">
                            <span className="text-[10px] font-mono text-muted-foreground inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {sam.toFixed(1)}m
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
                                  title={`Avançar para estágio ${nextStage}`}
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
                  value={form.collection}
                  onChange={(e) => setForm({ ...form, collection: e.target.value })}
                  placeholder="Verão 2027"
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Categoria / Linha</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Esportivo / Malharia"
                  className="text-xs"
                />
              </div>
            </div>
            {!editingRef && (
              <div>
                <Label className="text-xs">Clonar Base de Engenharia (opcional)</Label>
                <Input
                  value={form.cloneFrom}
                  onChange={(e) => setForm({ ...form, cloneFrom: e.target.value.toUpperCase() })}
                  placeholder="DEV000006 (deixe em branco p/ ficha padrão)"
                  className="font-mono text-xs"
                />
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
