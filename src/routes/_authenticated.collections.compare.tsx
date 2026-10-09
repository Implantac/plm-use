// H1-03 · Comparador de coleções (inspirado em Collection Moda / Centric).
// Side-by-side de 2 coleções com métricas de mix, financeiro, showroom, custo e sell-through.
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowUpRight,
  CircleDollarSign,
  Clock,
  Layers3,
  PackageCheck,
  Percent,
  Target,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ModuleTabs } from "@/components/nav/ModuleTabs";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useCollections, type Collection } from "@/lib/collections/store";

export const Route = createFileRoute("/_authenticated/collections/compare")({
  head: () => ({
    meta: [
      { title: "Comparar coleções · USE MODA PLM" },
      {
        name: "description",
        content:
          "Comparativo lado a lado de duas coleções: mix, meta financeira, aprovação de showroom, custo, margem e sell-through.",
      },
    ],
  }),
  component: CompareCollectionsPage,
});

type MetricRow = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fmt: (c: Collection) => string;
  num: (c: Collection) => number;
  higherIsBetter: boolean;
  suffix?: string;
};

const METRIC_ROWS: MetricRow[] = [
  {
    key: "plannedMix",
    label: "Mix planejado (refs)",
    icon: Layers3,
    fmt: (c) => c.plannedMix.toString(),
    num: (c) => c.plannedMix,
    higherIsBetter: true,
  },
  {
    key: "realizedMix",
    label: "Mix realizado (refs)",
    icon: PackageCheck,
    fmt: (c) => c.realizedMix.toString(),
    num: (c) => c.realizedMix,
    higherIsBetter: true,
  },
  {
    key: "progress",
    label: "Ciclo da coleção",
    icon: Percent,
    fmt: (c) => `${c.progress}%`,
    num: (c) => c.progress,
    higherIsBetter: true,
  },
  {
    key: "targetRevenue",
    label: "Meta financeira",
    icon: CircleDollarSign,
    fmt: (c) => c.targetRevenue,
    num: () => 0,
    higherIsBetter: true,
  },
  {
    key: "targetMargin",
    label: "Margem alvo",
    icon: TrendingUp,
    fmt: (c) => c.targetMargin,
    num: (c) => parseInt(c.targetMargin, 10) || 0,
    higherIsBetter: true,
  },
  {
    key: "avgCost",
    label: "Custo médio (R$)",
    icon: CircleDollarSign,
    fmt: (c) => (c.avgCost == null ? "—" : `R$ ${c.avgCost.toFixed(2)}`),
    num: (c) => c.avgCost ?? 0,
    higherIsBetter: false,
  },
  {
    key: "avgPrice",
    label: "Preço médio (R$)",
    icon: Target,
    fmt: (c) => (c.avgPrice == null ? "—" : `R$ ${c.avgPrice.toFixed(2)}`),
    num: (c) => c.avgPrice ?? 0,
    higherIsBetter: true,
  },
  {
    key: "showroomApproval",
    label: "Aprovação showroom",
    icon: ThumbsUp,
    fmt: (c) => (c.showroomApproval == null ? "—" : `${c.showroomApproval}%`),
    num: (c) => c.showroomApproval ?? 0,
    higherIsBetter: true,
  },
  {
    key: "sellThrough",
    label: "Sell-through",
    icon: TrendingUp,
    fmt: (c) => (c.sellThrough == null ? "—" : `${c.sellThrough}%`),
    num: (c) => c.sellThrough ?? 0,
    higherIsBetter: true,
  },
  {
    key: "leadTimeDias",
    label: "Lead time (dias)",
    icon: Clock,
    fmt: (c) => (c.leadTimeDias == null ? "—" : `${c.leadTimeDias} d`),
    num: (c) => c.leadTimeDias ?? 0,
    higherIsBetter: false,
  },
  {
    key: "roi",
    label: "ROI",
    icon: ArrowUpRight,
    fmt: (c) => c.roi,
    num: (c) => parseFloat(c.roi) || 0,
    higherIsBetter: true,
  },
];

function CompareCollectionsPage() {
  const collections = useCollections();
  const [leftId, setLeftId] = useState<number>(collections[0]?.id ?? 0);
  const [rightId, setRightId] = useState<number>(collections[1]?.id ?? collections[0]?.id ?? 0);

  const left = useMemo(() => collections.find((c) => c.id === leftId), [collections, leftId]);
  const right = useMemo(() => collections.find((c) => c.id === rightId), [collections, rightId]);

  const swap = () => {
    setLeftId(rightId);
    setRightId(leftId);
  };

  return (
    <ModuleLayout
      title="Comparar coleções"
      subtitle="Escolha duas coleções e compare mix, financeiro, showroom, custo e sell-through lado a lado."
      version="Strategy v2.0"
      searchPlaceholder="Buscar coleção"
      metrics={[
        { label: "Coleções disponíveis", value: String(collections.length), detail: "no catálogo" },
        {
          label: "Comparadas agora",
          value: left && right && left.id !== right.id ? "2" : "1",
          detail: "seleção ativa",
        },
        {
          label: "Métricas avaliadas",
          value: String(METRIC_ROWS.length),
          detail: "por coleção",
        },
        { label: "Fonte", value: "PLM · Showroom · ERP", detail: "agregado" },
      ]}
    >
      <div className="mb-4">
        <ModuleTabs group="collections" />
      </div>
      <div className="mb-6 flex items-end gap-4 flex-wrap">
        <div className="min-w-[240px] flex-1 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Coleção A
          </label>
          <Select value={String(leftId)} onValueChange={(v) => setLeftId(Number(v))}>
            <SelectTrigger className="">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} · {c.season} {c.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={swap}
          variant="ghost"
          className="border"
          aria-label="Inverter coleções"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>

        <div className="min-w-[240px] flex-1 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Coleção B
          </label>
          <Select value={String(rightId)} onValueChange={(v) => setRightId(Number(v))}>
            <SelectTrigger className="">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} · {c.season} {c.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button asChild variant="ghost" className="border text-[10px] tracking-[0.14em]">
          <Link to="/collections">Voltar</Link>
        </Button>
      </div>

      {left && right ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          <CollectionHeaderCard collection={left} />
          <CollectionHeaderCard collection={right} />

          <Card className="glass-card rounded-lg lg:col-span-2">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Comparativo métrica a métrica
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                <div className="grid grid-cols-[1fr_1fr_1fr] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Métrica</span>
                  <span className="text-right">{left.name}</span>
                  <span className="text-right">{right.name}</span>
                </div>
                {METRIC_ROWS.map((row) => {
                  const la = row.num(left);
                  const rb = row.num(right);
                  const leftWins = la !== rb && (row.higherIsBetter ? la > rb : la < rb);
                  const rightWins = la !== rb && (row.higherIsBetter ? rb > la : rb < la);
                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-[1fr_1fr_1fr] items-center px-5 py-3"
                    >
                      <span className="flex items-center gap-2 text-[11px] text-white/80">
                        <row.icon className="h-3.5 w-3.5 text-primary" />
                        {row.label}
                      </span>
                      <span
                        className={`text-right text-sm font-bold ${leftWins ? "text-emerald-300" : "text-white"}`}
                      >
                        {row.fmt(left)}
                      </span>
                      <span
                        className={`text-right text-sm font-bold ${rightWins ? "text-emerald-300" : "text-white"}`}
                      >
                        {row.fmt(right)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg lg:col-span-2 border-primary/20 bg-primary/[0.025]">
            <CardContent className="p-5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Leitura rápida
              </p>
              <p className="text-sm leading-relaxed text-white/85">{readingSummary(left, right)}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="glass-card rounded-lg">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Selecione duas coleções para comparar.
          </CardContent>
        </Card>
      )}
    </ModuleLayout>
  );
}

function CollectionHeaderCard({ collection }: { collection: Collection }) {
  return (
    <Card className="glass-card rounded-lg overflow-hidden">
      <div className="relative h-40">
        <OptimizedImage
          src={collection.image}
          alt={collection.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 to-transparent" />
        <span className="absolute left-4 top-4 rounded-md bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
          {collection.status}
        </span>
      </div>
      <CardContent className="p-5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          {collection.brand} · {collection.season} {collection.year}
        </p>
        <h2 className="text-xl font-bold tracking-tight text-white">{collection.name}</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <span>Ciclo</span>
            <span className="text-white">{collection.progress}%</span>
          </div>
          <Progress value={collection.progress} className="h-2 bg-white/10" />
        </div>
        <p className="text-[11px] text-muted-foreground">{collection.abc}</p>
      </CardContent>
    </Card>
  );
}

function readingSummary(a: Collection, b: Collection): string {
  if (a.id === b.id) return "Selecione coleções diferentes para gerar uma leitura comparativa.";
  const margemA = parseInt(a.targetMargin, 10) || 0;
  const margemB = parseInt(b.targetMargin, 10) || 0;
  const melhorMargem = margemA >= margemB ? a : b;
  const melhorSell = (a.sellThrough ?? 0) >= (b.sellThrough ?? 0) ? a : b;
  const menorLead = (a.leadTimeDias ?? Infinity) <= (b.leadTimeDias ?? Infinity) ? a : b;
  return `${melhorMargem.name} lidera em margem alvo (${melhorMargem.targetMargin}). ${melhorSell.name} tem melhor sell-through (${melhorSell.sellThrough ?? 0}%). ${menorLead.name} entrega mais rápido (${menorLead.leadTimeDias ?? 0} dias). Use estes cortes para calibrar mix da próxima coleção.`;
}
