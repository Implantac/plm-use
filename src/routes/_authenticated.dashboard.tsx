import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  Calculator,
  CircleDot,
  ChevronDown,
  ClipboardCheck,
  Factory,
  Layers3,
  PackageOpen,
  Scissors,
  Send,
  Sparkles,
} from "lucide-react";

import { ORDER_FLOW_STEPS, ORDER_STATUS } from "@/lib/sales/types";
import { computeCollectionDreSummary } from "@/lib/techsheet/cfo-dre";
import { DataProvenanceBadge } from "@/components/common/DataProvenanceBadge";
import { ComecePorAqui } from "@/components/onboarding/ComecePorAqui";
import { sheetProvenance } from "@/lib/techsheet/provenance";
import {
  computeDigitalProductPassport,
  dppRequirements,
  DPP_PENDENCIA_LABEL,
  resolveReferenceTechSheet,
} from "@/lib/techsheet/dpp-expedition";
import { seedFor, useTechSheetStore } from "@/lib/techsheet/store";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import { ReferenceJourney } from "@/components/reference/ReferenceJourney";
import {
  REFERENCE_STATUS_LABEL,
  useReferences,
  type ReferenceStatus,
} from "@/hooks/use-references";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const PIPELINE_STAGES: { status: ReferenceStatus; color: string }[] = [
  { status: "IDEIA", color: "bg-status-review" },
  { status: "CROQUI", color: "bg-cyan-300" },
  { status: "MODELAGEM", color: "bg-primary" },
  { status: "PILOTO", color: "bg-status-progress" },
  { status: "AJUSTE", color: "bg-status-progress" },
  { status: "APROVACAO", color: "bg-status-approved" },
  { status: "ENGENHARIA", color: "bg-teal-300" },
  { status: "PRODUCAO", color: "bg-blue-300" },
];

function Dashboard() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const materializadas = useTechSheetStore((s) => s.materializadas);
  const dre = useMemo(
    () => computeCollectionDreSummary(sheetsMap, undefined, undefined, materializadas),
    [sheetsMap, materializadas],
  );
  const dppHero = useMemo(
    () => computeDigitalProductPassport(resolveReferenceTechSheet("DEV000006", sheetsMap)),
    [sheetsMap],
  );
  // O passaporte do herói é sempre do DEV000006; se essa ficha não foi editada,
  // o rating ESG exibido é do exemplo, não do produto da empresa.
  const dppReferencia = sheetProvenance(sheetsMap, "DEV000006", materializadas) !== "salva";
  const { items, loading, error } = useReferences();
  const { openEntity } = useEntityDrawer();

  const statusCounts = useMemo(() => {
    const counts = new Map<ReferenceStatus, number>();
    for (const item of items) {
      counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const activeCount = items.filter(
    (item) => item.status !== "FINALIZADA" && item.status !== "ARQUIVADA",
  ).length;
  const urgentCount = items.filter((item) => item.priority === "URGENTE").length;
  const collectionCount = new Set(
    items.map((item) => item.collection_id).filter((id): id is string => id !== null),
  ).size;
  const recentReferences = items.slice(0, 5);
  const nextStepReferences = items.filter(
    (item) => item.status !== "FINALIZADA" && item.status !== "ARQUIVADA",
  );

  const metrics = [
    { label: "Referências ativas", value: activeCount, icon: Scissors, tone: "text-primary" },
    {
      label: "Em piloto",
      value: statusCounts.get("PILOTO") ?? 0,
      icon: Boxes,
      tone: "text-status-progress",
    },
    {
      label: "Em aprovação",
      value: statusCounts.get("APROVACAO") ?? 0,
      icon: ClipboardCheck,
      tone: "text-status-approved",
    },
    {
      label: "Coleções vinculadas",
      value: collectionCount,
      icon: Layers3,
      tone: "text-status-review",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="max-w-2xl space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            USE MODA PLM
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Da ideia ao produto industrial.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Acompanhe o desenvolvimento, identifique o próximo passo e abra o produto que precisa de
            atenção.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/references">
              <PackageOpen className="h-4 w-4" />
              Abrir referências
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/flow">
              Ver fluxo do produto <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.section>

      {/* Onda 43: um unico ponto de entrada explica o "—" e da o proximo passo. */}
      <ComecePorAqui />

      {/* Redesign 26/out — "onde começa e onde termina": o ciclo comercial vira
          trilha numerada na primeira dobra do dashboard. Fonte: ORDER_FLOW_STEPS
          (mesma máquina que o backend executa — docs/FLUXO-OPERACIONAL-PEDIDO.md). */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        aria-label="Fluxo operacional do pedido"
        className="glass-card rounded-lg p-4"
      >
        <details data-testid="fluxo-operacional-detalhes" className="group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <span className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-sm font-semibold">Como funciona o fluxo do pedido</h2>
              <span className="text-xs text-muted-foreground">
                6 etapas · do pedido do vendedor até a OP na régua do PCP
              </span>
            </span>
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-primary">
              Ver etapas
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="mb-3 text-xs text-muted-foreground">
              Começa com o <span className="font-medium text-foreground">vendedor</span> criando o
              pedido; termina quando a{" "}
              <span className="font-medium text-foreground">OP entra na régua do PCP</span>.
            </p>
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {ORDER_FLOW_STEPS.map((step, i) => (
                <li key={step.status}>
                  <Link
                    to={step.status === "liberado_pcp" ? "/production" : "/orders"}
                    className="group flex h-full items-start gap-2.5 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-2xs font-semibold tabular-nums text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        {step.status === "rascunho" && (
                          <Send className="h-3.5 w-3.5 text-primary" />
                        )}
                        {(step.status === "enviado" || step.status === "em_custo") && (
                          <Calculator className="h-3.5 w-3.5 text-primary" />
                        )}
                        {(step.status === "custo_concluido" || step.status === "aprovado") && (
                          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                        )}
                        {step.status === "liberado_pcp" && (
                          <Factory className="h-3.5 w-3.5 text-primary" />
                        )}
                        {ORDER_STATUS[step.status].label}
                      </span>
                      <span className="block text-2xs leading-snug text-muted-foreground">
                        {step.who} · {step.action}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </details>
      </motion.section>

      {/* Torre Executiva 360° — Pulso Industrial PLM Fluido 2.0 */}
      <section
        aria-label="Pulso Industrial PLM 2.0"
        className="rounded-xl border border-primary/25 bg-card p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Torre Executiva PLM 2.0 · Engenharia, Sourcing, Corte, ESG & CFO
            </h2>
          </div>
          <div className="flex flex-wrap gap-1.5 text-2xs">
            <Link
              to="/tech-sheet"
              className="rounded border border-border bg-muted/40 px-2.5 py-1 font-medium text-foreground hover:border-primary/50"
            >
              Ficha Técnica
            </Link>
            <Link
              to="/digital-twin"
              className="rounded border border-border bg-muted/40 px-2.5 py-1 font-medium text-foreground hover:border-primary/50"
            >
              Gêmeo 3D What-If
            </Link>
            <Link
              to="/supplier-portal"
              className="rounded border border-border bg-muted/40 px-2.5 py-1 font-medium text-foreground hover:border-primary/50"
            >
              Sourcing RFQ
            </Link>
            <Link
              to="/route-engineering"
              className="rounded border border-border bg-muted/40 px-2.5 py-1 font-medium text-foreground hover:border-primary/50"
            >
              Cronoanálise GSD
            </Link>
            <Link
              to="/showroom"
              className="rounded border border-border bg-muted/40 px-2.5 py-1 font-medium text-foreground hover:border-primary/50"
            >
              Showroom B2B
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <Link
            to="/financial"
            className="rounded-lg border border-border/70 bg-muted/30 p-3 hover:border-primary/40 transition"
            data-testid="card-ebitda"
          >
            <span className="text-2xs uppercase text-muted-foreground block">
              EBITDA Projetado Coleção
            </span>
            {!dre.apuravel ? (
              <>
                <strong className="font-mono text-base text-muted-foreground">—</strong>
                <span className="text-2xs text-muted-foreground block">
                  {dre.origem.semEngenharia.length > 0
                    ? `${dre.origem.semEngenharia.length} ficha(s) sem engenharia custeada`
                    : "Sem ficha salva: a coleção existe só no modelo"}
                </span>
              </>
            ) : (
              <>
                <strong className="font-mono text-base text-primary">
                  {dre.ebitdaBrl.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </strong>
                <span className="text-2xs text-muted-foreground block">
                  Break-Even {dre.breakEvenPieces.toLocaleString("pt-BR")} pçs
                  {dre.origem.referencias.length > 0 &&
                    ` · ${dre.origem.referencias.length} do modelo fora da conta`}
                  {dre.origem.semEngenharia.length > 0 &&
                    ` · ${dre.origem.semEngenharia.length} sem engenharia fora da conta`}
                </span>
              </>
            )}
          </Link>
          <Link
            to="/production"
            className="rounded-lg border border-border/70 bg-muted/30 p-3 hover:border-primary/40 transition"
          >
            <span className="text-2xs uppercase text-muted-foreground block">
              Volume Industrial Planejado
            </span>
            <strong className="font-mono text-base text-foreground">
              {!dre.apuravel ? "—" : `${dre.totalPieces.toLocaleString("pt-BR")} peças`}
            </strong>
            <span className="text-2xs text-muted-foreground block">
              {!dre.apuravel
                ? dre.origem.semEngenharia.length > 0
                  ? "Sem engenharia custeada para planejar volume"
                  : "Sem ficha salva para planejar volume"
                : "Corte, Enfesto & Fardos ativos"}
            </span>
          </Link>
          <Link
            to="/pieces-report"
            className="rounded-lg border border-border/70 bg-muted/30 p-3 hover:border-primary/40 transition"
          >
            <span className="text-2xs uppercase text-muted-foreground block flex items-center gap-1.5">
              Passaporte Digital ESG (DPP)
              {dppReferencia && (
                <DataProvenanceBadge
                  source="demonstracao"
                  detail="DEV000006"
                  data-testid="dpp-provenance"
                />
              )}
            </span>
            {dppHero ? (
              <>
                <strong className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                  Rating {dppHero.esgGrade} · {dppHero.carbonKgCo2e} kg CO₂e
                </strong>
                <span className="text-2xs text-muted-foreground block">
                  Circularidade {dppHero.circularityScore}/100
                </span>
              </>
            ) : (
              <>
                <strong className="font-mono text-base text-muted-foreground">—</strong>
                <span className="text-2xs text-muted-foreground block">
                  {dppRequirements(resolveReferenceTechSheet("DEV000006", sheetsMap))
                    .pendencias.map((x) => DPP_PENDENCIA_LABEL[x])
                    .join(" · ") || "passaporte não apurável"}
                </span>
              </>
            )}
          </Link>
          <Link
            to="/commercial"
            className="rounded-lg border border-border/70 bg-muted/30 p-3 hover:border-primary/40 transition"
          >
            <span className="text-2xs uppercase text-muted-foreground block">
              Expedição & Pré-NFe 4.00
            </span>
            <strong className="font-mono text-base text-foreground">CFOP 5101 / 6101</strong>
            <span className="text-2xs text-muted-foreground block">
              Packing List & XML SEFAZ prontos
            </span>
          </Link>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-destructive/25 bg-destructive/5 p-4 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-rejected" />
          <div>
            <p className="font-medium text-white">Não foi possível atualizar as referências.</p>
            <p className="mt-1 text-muted-foreground">
              Verifique sua conexão e tente novamente mais tarde.
            </p>
          </div>
        </div>
      )}

      <section
        aria-label="Indicadores do ciclo do produto"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card className="glass-card rounded-lg">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {loading || error ? "—" : metric.value}
                  </p>
                </div>
                <metric.icon className={`h-5 w-5 ${metric.tone}`} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card rounded-lg">
          <CardHeader className="border-b border-border/60 p-5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-white">Ciclo do produto</CardTitle>
              <span className="text-xs text-muted-foreground">
                {loading || error ? "Dados indisponíveis" : `${items.length} referências`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Carregando referências…
              </p>
            ) : error ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                O fluxo será exibido quando a conexão for restabelecida.
              </p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <PackageOpen className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Sem dados disponíveis. Crie a primeira referência para iniciar o ciclo.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/references">Criar referência</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PIPELINE_STAGES.map(({ status, color }) => (
                  <div key={status} className="rounded-md border border-border bg-muted/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      <span className="text-xl font-semibold text-white">
                        {statusCounts.get(status) ?? 0}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {REFERENCE_STATUS_LABEL[status]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-lg">
          <CardHeader className="border-b border-border/60 p-5">
            <CardTitle className="text-sm font-semibold text-white">Próximas decisões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <ActionRow
              icon={<ClipboardCheck className="h-4 w-4" />}
              title="Referências em aprovação"
              detail={
                loading || error
                  ? "Aguardando dados"
                  : `${statusCounts.get("APROVACAO") ?? 0} aguardando decisão`
              }
              to="/approvals"
            />
            <ActionRow
              icon={<CircleDot className="h-4 w-4" />}
              title="Prioridades urgentes"
              detail={
                loading || error ? "Aguardando dados" : `${urgentCount} referências sinalizadas`
              }
              to="/references"
            />
            <ActionRow
              icon={<BadgeCheck className="h-4 w-4" />}
              title="Pilotos em andamento"
              detail={
                loading || error
                  ? "Aguardando dados"
                  : `${statusCounts.get("PILOTO") ?? 0} em pilotagem`
              }
              to="/prototypes"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-5">
            <CardTitle className="text-sm font-semibold text-white">Referências recentes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/references">
                Ver todas <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-3">
            {loading ? (
              <p className="p-5 text-sm text-muted-foreground">Carregando referências…</p>
            ) : error ? (
              <p className="p-5 text-sm text-muted-foreground">
                Não foi possível carregar a lista.
              </p>
            ) : recentReferences.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Sem referências recentes.</p>
            ) : (
              <div className="divide-y divide-border/70">
                {recentReferences.map((reference) => (
                  <button
                    key={reference.id}
                    type="button"
                    onClick={() =>
                      openEntity({
                        type: "reference",
                        id: reference.id,
                        title: reference.name,
                        subtitle: reference.code,
                      })
                    }
                    className="flex w-full items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-accent/70"
                  >
                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded border border-border bg-muted/60">
                      {reference.image_url ? (
                        <OptimizedImage
                          src={reference.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Scissors className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {reference.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {reference.code}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {REFERENCE_STATUS_LABEL[reference.status]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-lg">
          <CardHeader className="border-b border-border/60 p-5">
            <CardTitle className="text-sm font-semibold text-white">
              Próximo passo do produto
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ReferenceJourney
              references={nextStepReferences}
              loading={loading}
              error={Boolean(error)}
              onOpen={(reference) =>
                openEntity({
                  type: "reference",
                  id: reference.id,
                  title: reference.name,
                  subtitle: reference.code,
                })
              }
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ActionRow({
  icon,
  title,
  detail,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/30 hover:bg-accent/60"
    >
      <span className="text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
