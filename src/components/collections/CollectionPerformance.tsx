import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, BarChart3, TrendingUp } from "lucide-react";

type PerfCollection = {
  id: number;
  name: string;
  plannedMix: number;
  realizedMix: number;
  progress: number;
};

function parseAbc(abc: string) {
  // "A: 28% / B: 44% / C: 28%"
  const m = abc.match(/A:\s*(\d+)%[^B]*B:\s*(\d+)%[^C]*C:\s*(\d+)%/i);
  if (!m) return { a: 33, b: 34, c: 33 };
  return { a: +m[1], b: +m[2], c: +m[3] };
}

export function CollectionPerformance({
  collections,
}: {
  collections: Array<PerfCollection & { abc: string }>;
}) {
  const totals = useMemo(() => {
    const planned = collections.reduce((a, c) => a + c.plannedMix, 0);
    const realized = collections.reduce((a, c) => a + c.realizedMix, 0);
    const sellThrough = planned > 0 ? (realized / planned) * 100 : 0;
    const abcAvg = collections.reduce(
      (acc, c) => {
        const p = parseAbc(c.abc);
        acc.a += p.a;
        acc.b += p.b;
        acc.c += p.c;
        return acc;
      },
      { a: 0, b: 0, c: 0 },
    );
    const n = Math.max(collections.length, 1);
    return {
      planned,
      realized,
      sellThrough,
      a: abcAvg.a / n,
      b: abcAvg.b / n,
      c: abcAvg.c / n,
    };
  }, [collections]);

  return (
    <Card className="glass-card rounded-lg">
      <CardHeader className="p-5 border-b border-white/5">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-primary" /> Meta × Realizado
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Plan." value={totals.planned} />
          <Metric label="Real." value={totals.realized} tone="emerald" />
          <Metric label="Sell-Th." value={`${totals.sellThrough.toFixed(0)}%`} tone="primary" />
        </div>

        <div className="space-y-3">
          {collections.map((c) => {
            const st = c.plannedMix > 0 ? (c.realizedMix / c.plannedMix) * 100 : 0;
            const tone = st >= 85 ? "bg-emerald-400" : st >= 60 ? "bg-primary" : "bg-amber-400";
            return (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-white/85 truncate pr-2">{c.name}</span>
                  <span className="font-bold text-white tabular-nums">
                    {c.realizedMix}/{c.plannedMix} · {st.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full ${tone}`} style={{ width: `${Math.min(st, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary" /> Curva ABC (média)
            </span>
            <span className="text-white">
              {totals.a.toFixed(0)} / {totals.b.toFixed(0)} / {totals.c.toFixed(0)}
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="bg-emerald-400"
              style={{ width: `${totals.a}%` }}
              title={`A ${totals.a.toFixed(0)}%`}
            />
            <div
              className="bg-primary"
              style={{ width: `${totals.b}%` }}
              title={`B ${totals.b.toFixed(0)}%`}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${totals.c}%` }}
              title={`C ${totals.c.toFixed(0)}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>A · top giro</span>
            <span>B · médio</span>
            <span>C · cauda</span>
          </div>
        </div>

        <div className="rounded-md border border-emerald-300/20 bg-emerald-300/[0.06] p-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-300" />
          <p className="text-[10px] text-white/85 leading-snug">
            Sell-through combinado de{" "}
            <span className="font-bold text-emerald-300">{totals.sellThrough.toFixed(0)}%</span>{" "}
            sobre o mix planejado.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "emerald" | "primary";
}) {
  const color =
    tone === "emerald" ? "text-emerald-400" : tone === "primary" ? "text-primary" : "text-white";
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-2.5 text-center">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-base font-bold ${color} tabular-nums`}>{value}</p>
    </div>
  );
}
