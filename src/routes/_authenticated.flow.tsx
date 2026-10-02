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

type PhaseId =
  | "criar"
  | "desenvolver"
  | "industrializar"
  | "aprovar"
  | "produzir"
  | "lancar"
  | "aprender";

const PHASES: Record<PhaseId, { label: string; hint: string }> = {
  criar: { label: "01 · Criar", hint: "Briefing, moodboard, conceito e croqui" },
  desenvolver: { label: "02 · Desenvolver", hint: "Design, modelagem, medidas e protótipo" },
  industrializar: { label: "03 · Industrializar", hint: "Ficha técnica, BOM, operações e custo" },
  aprovar: { label: "04 · Aprovar", hint: "Revisão, aprovação e liberação" },
  produzir: { label: "05 · Produzir", hint: "ERP, PCP, OP, facção e qualidade" },
  lancar: { label: "06 · Lançar", hint: "Showroom, marketing e comercial" },
  aprender: { label: "07 · Aprender", hint: "Vendas, margem, giro e feedback" },
};

interface StageDef {
  status: ReferenceStatus;
  phase: PhaseId;
  owner: string;
  action: string;
  href: string;
  hrefLabel: string;
  next?: ReferenceStatus;
}

const STAGES: StageDef[] = [
  {
    status: "IDEIA",
    phase: "criar",
    owner: "Estilo",
    action: "Detalhar briefing e moodboard",
    href: "/research",
    hrefLabel: "Pesquisa & Moodboard",
    next: "CROQUI",
  },
  {
    status: "CROQUI",
    phase: "criar",
    owner: "Estilo",
    action: "Desenhar croqui e definir cartela",
    href: "/development",
    hrefLabel: "Desenvolvimento",
    next: "MODELAGEM",
  },
  {
    status: "MODELAGEM",
    phase: "desenvolver",
    owner: "Modelagem",
    action: "Interpretar molde e grade",
    href: "/cad",
    hrefLabel: "CAD & Modelagem",
    next: "PILOTO",
  },
  {
    status: "PILOTO",
    phase: "desenvolver",
    owner: "Pilotagem",
    action: "Costurar e avaliar peça-piloto",
    href: "/prototypes",
    hrefLabel: "Protótipos",
    next: "APROVACAO",
  },
  {
    status: "AJUSTE",
    phase: "desenvolver",
    owner: "Modelagem",
    action: "Aplicar correções da prova",
    href: "/measurements",
    hrefLabel: "Tabela de Medidas",
    next: "PILOTO",
  },
  {
    status: "APROVACAO",
    phase: "aprovar",
    owner: "Produto",
    action: "Aprovar piloto e liberar engenharia",
    href: "/prototypes",
    hrefLabel: "Protótipos",
    next: "ENGENHARIA",
  },
  {
    status: "ENGENHARIA",
    phase: "industrializar",
    owner: "Engenharia",
    action: "Fechar ficha técnica, BOM e custo",
    href: "/tech-sheet",
    hrefLabel: "Ficha Técnica",
    next: "PRODUCAO",
  },
  {
    status: "PRODUCAO",
    phase: "produzir",
    owner: "PCP",
    action: "Gerar OP e acompanhar facção",
    href: "/production",
    hrefLabel: "Produção",
    next: "FINALIZADA",
  },
  {
    status: "FINALIZADA",
    phase: "lancar",
    owner: "Comercial",
    action: "Lançar, vender e medir margem",
    href: "/launch",
    hrefLabel: "Lançamento",
  },
  {
    status: "ARQUIVADA",
    phase: "aprender",
    owner: "Produto",
    action: "Consultar histórico e registrar aprendizados",
    href: "/collections",
    hrefLabel: "Coleções",
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
  const { items, loading, error, nextStatuses, transition } = useReferences();
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

  const active = useMemo(
    () => items.filter((r) => r.status !== "FINALIZADA" && r.status !== "ARQUIVADA"),
    [items],
  );

  const stageOf = (status: ReferenceStatus) => STAGES.find((s) => s.status === status);

  const oldestUpdates = useMemo(
    () =>
      active
        .map((r) => ({ ref: r, days: daysSince(r.updated_at), stage: stageOf(r.status) }))
        .sort((a, b) => b.days - a.days)
        .slice(0, 6),
    [active],
  );

  const awaitingApproval = items.filter((r) => r.status === "APROVACAO").length;
  const readyForPcp = items.filter((r) => r.status === "ENGENHARIA");
  const finished = items.filter((r) => r.status === "FINALIZADA").length;
  const progress = items.length ? Math.round((finished / items.length) * 100) : 0;
  const valueState = loading || error ? "—" : undefined;

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
      toast.success(`${ref.code} avançou para ${REFERENCE_STATUS_LABEL[target]}.`);
    } else {
      toast.error("Não foi possível avançar a referência.");
    }
  };

  const selectedStage = stageOf(selected);
  const selectedItems = byStatus.get(selected) ?? [];

  return (
    <div className="space-y-6 pb-12">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-rose-400/30 bg-rose-400/5 p-4 text-sm text-muted-foreground"
        >
          Não foi possível carregar as referências. Verifique sua conexão e tente novamente mais
          tarde.
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col gap-3 rounded-md border border-dashed border-white/15 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Sem referências disponíveis. Crie um produto para iniciar o ciclo.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/references">Criar referência</Link>
          </Button>
        </div>
      )}
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
          Acompanhe o produto da criação ao aprendizado. Cada etapa mostra o que está em andamento e
          a próxima ação disponível.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric
            label="Referências ativas"
            value={valueState ?? String(active.length)}
            icon={Gauge}
          />
          <Metric
            label="Aguardando aprovação"
            value={valueState ?? String(awaitingApproval)}
            icon={ShieldCheck}
            tone="text-sky-300"
          />
          <Metric
            label="Prontas para o PCP"
            value={valueState ?? String(readyForPcp.length)}
            icon={Factory}
            tone="text-emerald-300"
          />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-2xs uppercase tracking-[0.18em] text-muted-foreground">
            <span>Referências finalizadas</span>
            <span>{valueState ?? (items.length ? `${progress}%` : "Sem dados")}</span>
          </div>
          <Progress value={loading || error ? 0 : progress} />
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
                      <span className="text-lg font-bold tabular-nums">
                        {valueState ?? String(list.length)}
                      </span>
                    </div>
                    <p className="mt-1 text-2xs uppercase tracking-[0.16em] text-muted-foreground">
                      {stage.owner}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{stage.action}</p>
                  </button>
                );
              })}
              {phase === "aprender" && (
                <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 sm:col-span-2 lg:col-span-4">
                  <p className="text-sm font-medium">Desempenho de mercado</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vendas, margem, giro e feedback serão exibidos quando houver dados confiáveis
                    integrados.
                  </p>
                  <Button asChild variant="link" size="sm" className="mt-2 h-auto p-0">
                    <Link to="/analytics">
                      Abrir indicadores <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Etapa selecionada */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {REFERENCE_STATUS_LABEL[selected]} ·{" "}
              {valueState ?? `${selectedItems.length} referência(s)`}
            </CardTitle>
            {selectedStage && (
              <p className="mt-1 text-xs text-muted-foreground">
                Área responsável: {selectedStage.owner} · Próxima ação: {selectedStage.action}
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
          {error && (
            <p role="alert" className="py-6 text-center text-xs text-muted-foreground">
              Não foi possível carregar as referências desta etapa.
            </p>
          )}
          {!loading && !error && selectedItems.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhuma referência nesta etapa.
            </p>
          )}
          {selectedItems.map((ref) => {
            const days = daysSince(ref.updated_at);
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

      {/* Atualização mais recente das referências em andamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Referências há mais tempo sem atualização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="py-4 text-xs text-muted-foreground">Carregando referências…</p>
          ) : error ? (
            <p className="py-4 text-xs text-muted-foreground">
              Não foi possível calcular a atividade recente.
            </p>
          ) : oldestUpdates.length === 0 ? (
            <p className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Nenhuma referência ativa para exibir.
            </p>
          ) : (
            oldestUpdates.map(({ ref, days, stage }) => (
              <button
                key={ref.id}
                type="button"
                onClick={() => setSelected(ref.status)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.02] p-3 text-left hover:border-primary/30"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {ref.code} · {ref.name}
                  </span>
                  <span className="mt-0.5 block text-2xs uppercase tracking-[0.16em] text-muted-foreground">
                    {REFERENCE_STATUS_LABEL[ref.status]} · {stage?.owner}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  Atualizada há {days}d
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
