import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CircleDot,
  ClipboardCheck,
  Layers3,
  PackageOpen,
  Scissors,
  Sparkles,
} from "lucide-react";

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
  { status: "IDEIA", color: "bg-sky-400" },
  { status: "CROQUI", color: "bg-cyan-300" },
  { status: "MODELAGEM", color: "bg-primary" },
  { status: "PILOTO", color: "bg-amber-300" },
  { status: "AJUSTE", color: "bg-orange-300" },
  { status: "APROVACAO", color: "bg-emerald-300" },
  { status: "ENGENHARIA", color: "bg-teal-300" },
  { status: "PRODUCAO", color: "bg-blue-300" },
];

function Dashboard() {
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
      tone: "text-amber-300",
    },
    {
      label: "Em aprovação",
      value: statusCounts.get("APROVACAO") ?? 0,
      icon: ClipboardCheck,
      tone: "text-emerald-300",
    },
    { label: "Coleções vinculadas", value: collectionCount, icon: Layers3, tone: "text-sky-300" },
  ];

  return (
    <div className="space-y-6 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase text-primary">USE MODA PLM</p>
          <h1 className="text-3xl font-semibold text-white">Da ideia ao produto industrial.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Acompanhe o desenvolvimento, identifique o próximo passo e abra o produto que precisa de
            atenção.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/references">
              <PackageOpen className="mr-2 h-4 w-4" />
              Abrir referências
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/flow">
              Ver fluxo do produto <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-rose-400/30 bg-rose-400/5 p-4 text-sm"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
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
          <CardHeader className="border-b border-white/5 p-5">
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
                  <div
                    key={status}
                    className="rounded-md border border-white/10 bg-white/[0.025] p-3"
                  >
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
          <CardHeader className="border-b border-white/5 p-5">
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
            <div className="rounded-md border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs font-medium text-white">Indicadores de ERP</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aguardando dados sincronizados de produção, custos e mercado.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-card rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 p-5">
            <CardTitle className="text-sm font-semibold text-white">Referências recentes</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/references">
                Ver todas <ArrowRight className="ml-2 h-4 w-4" />
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
              <div className="divide-y divide-white/5">
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
                    className="flex w-full items-center gap-3 rounded-sm p-3 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded border border-white/10 bg-white/[0.04]">
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
          <CardHeader className="border-b border-white/5 p-5">
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
      className="flex items-center gap-3 rounded-md border border-white/10 p-3 transition-colors hover:border-primary/30 hover:bg-white/[0.03]"
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
