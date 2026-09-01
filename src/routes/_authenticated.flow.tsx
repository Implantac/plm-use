// Fluxo funcional do PLM — visão única do ciclo de vida do produto.
// Referências internacionais (Centric, FlexPLM, Kubix Link, Audaces): pipeline por etapa,
// "my tasks", gargalos por tempo parado e handoff formal PLM → PCP.
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Factory,
  Gauge,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { IniciarPCPDialog } from "@/components/pcp/IniciarPCPDialog";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import {
  GATES,
  GATE_STATUS_LABEL,
  useReferenceGates,
  type GateStatus,
} from "@/hooks/use-reference-gates";
import {
  REFERENCE_STATUSES,
  REFERENCE_STATUS_LABEL,
  useReferences,
  type ReferenceRow,
  type ReferenceStatus,
} from "@/hooks/use-references";

export const Route = createFileRoute("/_authenticated/flow")({
  component: FlowPage,
  head: () => ({
    meta: [
      { title: "Fluxo do Produto · USE MODA PLM" },
      {
        name: "description",
        content:
          "Fluxo guiado do ciclo de vida do produto de moda: da ideia à produção, com gargalos, próximas ações e handoff para o PCP.",
      },
      { property: "og:title", content: "Fluxo do Produto · USE MODA PLM" },
      {
        property: "og:description",
        content:
          "Pipeline de referências por etapa, tarefas do dia e passagem formal do PLM para o PCP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type PhaseId = "desenvolver" | "industrializar" | "produzir" | "encerrar";

const PHASES: Record<PhaseId, { label: string; hint: string }> = {
  desenvolver: { label: "1 · Desenvolver", hint: "Da ideia ao croqui aprovado" },
  industrializar: { label: "2 · Industrializar", hint: "Modelagem, piloto e engenharia" },
  produzir: { label: "3 · Produzir", hint: "PCP, facção e qualidade" },
  encerrar: { label: "4 · Encerrar", hint: "Lançamento e pós-venda" },
};

interface StageDef {
  status: ReferenceStatus;
  phase: PhaseId;
  owner: string;
  action: string;
  href: string;
  hrefLabel: string;
  next?: ReferenceStatus;
  slaDays: number;
}

const STAGES: StageDef[] = [
  {
    status: "IDEIA",
    phase: "desenvolver",
    owner: "Estilo",
    action: "Detalhar briefing e moodboard",
    href: "/research",
    hrefLabel: "Pesquisa & Moodboard",
    next: "CROQUI",
    slaDays: 5,
  },
  {
    status: "CROQUI",
    phase: "desenvolver",
    owner: "Estilo",
    action: "Desenhar croqui e definir cartela",
    href: "/development",
    hrefLabel: "Desenvolvimento",
    next: "MODELAGEM",
    slaDays: 5,
  },
  {
    status: "MODELAGEM",
    phase: "industrializar",
    owner: "Modelagem",
    action: "Interpretar molde e grade",
    href: "/cad",
    hrefLabel: "CAD & Modelagem",
    next: "PILOTO",
    slaDays: 7,
  },
  {
    status: "PILOTO",
    phase: "industrializar",
    owner: "Pilotagem",
    action: "Costurar e avaliar peça-piloto",
    href: "/prototypes",
    hrefLabel: "Protótipos",
    next: "APROVACAO",
    slaDays: 7,
  },
  {
    status: "AJUSTE",
    phase: "industrializar",
    owner: "Modelagem",
    action: "Aplicar correções da prova",
    href: "/measurements",
    hrefLabel: "Tabela de Medidas",
    next: "PILOTO",
    slaDays: 4,
  },
  {
    status: "APROVACAO",
    phase: "industrializar",
    owner: "Produto",
    action: "Aprovar piloto e liberar engenharia",
    href: "/prototypes",
    hrefLabel: "Protótipos",
    next: "ENGENHARIA",
    slaDays: 3,
  },
  {
    status: "ENGENHARIA",
    phase: "industrializar",
    owner: "Engenharia",
    action: "Fechar ficha técnica, BOM e custo",
    href: "/tech-sheet",
    hrefLabel: "Ficha Técnica",
    next: "PRODUCAO",
    slaDays: 5,
  },
  {
    status: "PRODUCAO",
    phase: "produzir",
    owner: "PCP",
    action: "Gerar OP e acompanhar facção",
    href: "/production",
    hrefLabel: "Produção",
    next: "FINALIZADA",
    slaDays: 20,
  },
  {
    status: "FINALIZADA",
    phase: "encerrar",
    owner: "Comercial",
    action: "Lançar, vender e medir margem",
    href: "/launch",
    hrefLabel: "Lançamento",
    slaDays: 30,
  },
  {
    status: "ARQUIVADA",
    phase: "encerrar",
    owner: "Produto",
    action: "Histórico para próximas coleções",
    href: "/collections",
    hrefLabel: "Coleções",
    slaDays: 0,
  },
];

const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

const GATE_TONE: Record<GateStatus, string> = {
  pendente: "border-amber-400/40 text-amber-300",
  aprovado: "border-emerald-400/40 text-emerald-300",
  reprovado: "border-destructive/40 text-destructive",
  dispensado: "border-white/15 text-muted-foreground",
};

const PRIORITY_TONE: Record<string, string> = {
  URGENTE: "border-destructive/40 text-destructive",
  ALTA: "border-amber-400/40 text-amber-300",
  MEDIA: "border-primary/30 text-primary",
  BAIXA: "border-white/15 text-muted-foreground",
};

function FlowPage() {
  const { items, loading, nextStatuses, transition } = useReferences();
  const { items: gates, openGate } = useReferenceGates();
  const { openEntity } = useEntityDrawer();
  const [selected, setSelected] = useState<ReferenceStatus>("IDEIA");
  const [pcpRef, setPcpRef] = useState<ReferenceRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const map = new Map<ReferenceStatus, ReferenceRow[]>();
    for (const s of REFERENCE_STATUSES) map.set(s, []);
    for (const r of items) map.get(r.status)?.push(r);
    return map;
  }, [items]);

  const gateByKey = useMemo(() => {
    const m = new Map<string, (typeof gates)[number]>();
    for (const g of gates) m.set(`${g.reference_id}:${g.gate}`, g);
    return m;
  }, [gates]);

  const gateFor = (ref: ReferenceRow) => {
    const def = GATES.find((g) => g.status === ref.status);
    if (!def) return null;
    return { def, row: gateByKey.get(`${ref.id}:${def.id}`) ?? null };
  };

  const handleOpenGate = async (ref: ReferenceRow, gateId: string) => {
    setBusyId(ref.id);
    const ok = await openGate(ref.id, gateId);
    setBusyId(null);
    if (ok) toast.success(`Gate aberto para ${ref.code}.`);
    else toast.error("Não foi possível abrir o gate.");
  };

  const active = items.filter(
    (r) => r.status !== "FINALIZADA" && r.status !== "ARQUIVADA",
  );

  const stageOf = (status: ReferenceStatus) =>
    STAGES.find((s) => s.status === status);

  const bottlenecks = useMemo(
    () =>
      active
        .map((r) => ({ ref: r, days: daysSince(r.updated_at), stage: stageOf(r.status) }))
        .filter((x) => x.stage && x.days > x.stage.slaDays)
        .sort((a, b) => b.days - a.days)
        .slice(0, 6),
    [active],
  );

  const readyForPcp = items.filter((r) => r.status === "ENGENHARIA");
  const finished = items.filter((r) => r.status === "FINALIZADA").length;
  const progress = items.length ? Math.round((finished / items.length) * 100) : 0;

  const advance = async (ref: ReferenceRow) => {
    const stage = stageOf(ref.status);
    const target =
      stage?.next && nextStatuses(ref.status).includes(stage.next)
        ? stage.next
        : nextStatuses(ref.status)[0];
    if (!target) {
      toast.error("Nenhuma transição disponível para esta etapa.");
      return;
    }
    setBusyId(ref.id);
    const ok = await transition(ref, target, "Avanço pelo Fluxo do Produto");
    setBusyId(null);
    if (ok) {
      toast.success(
        `${ref.code} avançou para ${REFERENCE_STATUS_LABEL[target]}.`,
      );
    } else {
      toast.error("Não foi possível avançar a referência.");
    }
  };

  const selectedStage = stageOf(selected);
  const selectedItems = byStatus.get(selected) ?? [];

  return (
    <div className="space-y-6 pb-12">
      <header className="rounded-lg border border-white/10 bg-white/[0.025] p-5 md:p-6">
        <div className="flex items-center gap-2 text-primary">
          <Workflow className="h-4 w-4" />
          <span className="text-[9px] font-bold uppercase tracking-[0.22em]">
            Fluxo guiado · ciclo de vida
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold uppercase leading-none tracking-tight md:text-4xl">
          Fluxo do Produto
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Uma linha só, da ideia à peça vendida. Cada etapa mostra o que está
          parado, quem é o dono e qual é a próxima ação — sem procurar módulo.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric label="Referências ativas" value={String(active.length)} icon={Gauge} />
          <Metric
            label="Atrasadas (fora do SLA)"
            value={String(bottlenecks.length)}
            icon={AlertTriangle}
            tone="text-amber-300"
          />
          <Metric
            label="Prontas para o PCP"
            value={String(readyForPcp.length)}
            icon={Factory}
            tone="text-emerald-300"
          />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-2xs uppercase tracking-[0.18em] text-muted-foreground">
            <span>Coleção concluída</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <Button asChild variant="outline" size="sm" className="mt-5">
          <Link to="/approvals">
            <ShieldCheck className="mr-2 h-3.5 w-3.5" />
            Módulo de Aprovações
          </Link>
        </Button>
      </header>

      {/* Pipeline por fase */}
      <section className="space-y-4">
        {(Object.keys(PHASES) as PhaseId[]).map((phase) => (
          <div key={phase}>
            <div className="mb-2 flex items-baseline gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
                {PHASES[phase].label}
              </h2>
              <span className="text-2xs text-muted-foreground">{PHASES[phase].hint}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STAGES.filter((s) => s.phase === phase).map((stage) => {
                const list = byStatus.get(stage.status) ?? [];
                const late = list.filter(
                  (r) => daysSince(r.updated_at) > stage.slaDays,
                ).length;
                const isSelected = selected === stage.status;
                return (
                  <button
                    key={stage.status}
                    type="button"
                    onClick={() => setSelected(stage.status)}
                    aria-pressed={isSelected}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/10 bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {REFERENCE_STATUS_LABEL[stage.status]}
                      </span>
                      <span className="text-lg font-bold tabular-nums">{list.length}</span>
                    </div>
                    <p className="mt-1 text-2xs uppercase tracking-[0.16em] text-muted-foreground">
                      {stage.owner}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{stage.action}</p>
                    {late > 0 && (
                      <Badge variant="outline" className="mt-3 border-amber-400/40 text-amber-300">
                        <Clock className="mr-1 h-3 w-3" />
                        {late} fora do SLA
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Etapa selecionada */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {REFERENCE_STATUS_LABEL[selected]} · {selectedItems.length} referência(s)
            </CardTitle>
            {selectedStage && (
              <p className="mt-1 text-xs text-muted-foreground">
                Dono: {selectedStage.owner} · Próxima ação: {selectedStage.action}
              </p>
            )}
          </div>
          {selectedStage && (
            <Button asChild variant="outline" size="sm">
              <Link to={selectedStage.href}>
                Abrir {selectedStage.hrefLabel}
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <p className="py-6 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Carregando fluxo...
            </p>
          )}
          {!loading && selectedItems.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhuma referência nesta etapa.
            </p>
          )}
          {selectedItems.map((ref) => {
            const days = daysSince(ref.updated_at);
            const late = selectedStage ? days > selectedStage.slaDays : false;
            return (
              <div
                key={ref.id}
                className="flex flex-col gap-3 rounded-md border border-white/10 bg-white/[0.02] p-3 md:flex-row md:items-center"
              >
                <button
                  type="button"
                  onClick={() => openEntity({ type: "reference", id: ref.id })}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold">
                    {ref.code} · {ref.name}
                  </p>
                  <p className="mt-0.5 text-2xs uppercase tracking-[0.16em] text-muted-foreground">
                    {ref.line ?? "sem linha"} · atualizada há {days}d
                  </p>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={PRIORITY_TONE[ref.priority] ?? PRIORITY_TONE.BAIXA}
                  >
                    {ref.priority}
                  </Badge>
                  {late && (
                    <Badge variant="outline" className="border-amber-400/40 text-amber-300">
                      atrasada
                    </Badge>
                  )}
                  {(() => {
                    const g = gateFor(ref);
                    if (!g) return null;
                    if (!g.row)
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleOpenGate(ref, g.def.id)}
                          disabled={busyId === ref.id}
                        >
                          <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                          Abrir gate
                        </Button>
                      );
                    const st = g.row.status as GateStatus;
                    return (
                      <Link to="/approvals">
                        <Badge variant="outline" className={GATE_TONE[st]}>
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          {GATE_STATUS_LABEL[st]}
                          {g.row.decided_at
                            ? ` · ${new Date(g.row.decided_at).toLocaleDateString("pt-BR")}`
                            : ""}
                        </Badge>
                      </Link>
                    );
                  })()}
                  {ref.status === "ENGENHARIA" && (
                    <Button size="sm" variant="outline" onClick={() => setPcpRef(ref)}>
                      <Factory className="mr-2 h-3.5 w-3.5" />
                      Iniciar PCP
                    </Button>
                  )}
                  {nextStatuses(ref.status).length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => void advance(ref)}
                      aria-busy={busyId === ref.id}
                      disabled={busyId === ref.id}
                    >
                      Avançar etapa
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Gargalos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            Gargalos do fluxo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {bottlenecks.length === 0 ? (
            <p className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Nenhuma referência fora do SLA. Fluxo saudável.
            </p>
          ) : (
            bottlenecks.map(({ ref, days, stage }) => (
              <button
                key={ref.id}
                type="button"
                onClick={() => setSelected(ref.status)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-amber-400/20 bg-amber-400/5 p-3 text-left hover:border-amber-400/40"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {ref.code} · {ref.name}
                  </span>
                  <span className="mt-0.5 block text-2xs uppercase tracking-[0.16em] text-muted-foreground">
                    {REFERENCE_STATUS_LABEL[ref.status]} · {stage?.owner}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-amber-300">
                  {days}d parada
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {pcpRef && (
        <IniciarPCPDialog
          open={Boolean(pcpRef)}
          onOpenChange={(o) => !o && setPcpRef(null)}
          referenciaRef={pcpRef.code}
          referenciaNome={pcpRef.name}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "text-primary",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
      <div className={`flex items-center gap-2 ${tone}`}>
        <Icon className="h-4 w-4" />
        <span className="text-2xs font-bold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
