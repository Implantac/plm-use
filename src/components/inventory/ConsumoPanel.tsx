// Painel de Consumo Previsto × Real × Desvio por material.
// Deriva planejado da BOM (mock) e usa "reservado" como real consumido.
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp, Minus, ArrowDownUp } from "lucide-react";

export type ConsumoItem = {
  ref: string;
  name: string;
  unit: string;
  previsto: number;
  real: number;
};

export function ConsumoPanel({ items }: { items: ConsumoItem[] }) {
  const totalPrev = items.reduce((a, i) => a + i.previsto, 0);
  const totalReal = items.reduce((a, i) => a + i.real, 0);
  const desvioGeral = totalPrev > 0 ? ((totalReal - totalPrev) / totalPrev) * 100 : 0;

  return (
    <Card className="glass-card rounded-lg">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-primary flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4" /> Consumo previsto × real
          </p>
          <span
            className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
              Math.abs(desvioGeral) < 5
                ? "bg-status-approved/10 text-status-approved"
                : desvioGeral > 0
                  ? "bg-status-rejected/10 text-status-rejected"
                  : "bg-status-progress/10 text-status-progress"
            }`}
          >
            Desvio geral {desvioGeral > 0 ? "+" : ""}
            {desvioGeral.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Previsto" value={totalPrev} />
          <Metric label="Real" value={totalReal} />
          <Metric label="Δ" value={totalReal - totalPrev} signed />
        </div>

        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {items.map((i) => {
            const desvioAbs = i.real - i.previsto;
            const desvioPct = i.previsto > 0 ? (desvioAbs / i.previsto) * 100 : 0;
            const usagePct = i.previsto > 0 ? Math.min(120, (i.real / i.previsto) * 100) : 0;
            const cor =
              Math.abs(desvioPct) < 5
                ? "text-status-approved"
                : desvioPct > 0
                  ? "text-status-rejected"
                  : "text-status-progress";
            const Icon =
              Math.abs(desvioPct) < 5 ? Minus : desvioPct > 0 ? TrendingUp : TrendingDown;
            return (
              <div
                key={i.ref}
                className="rounded-md border border-white/10 bg-black/20 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{i.name}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {i.ref}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 text-[11px] font-bold ${cor}`}>
                    <Icon className="h-3 w-3" />
                    {desvioPct > 0 ? "+" : ""}
                    {desvioPct.toFixed(1)}%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <span className="text-muted-foreground">
                    Prev{" "}
                    <span className="text-white font-bold">
                      {i.previsto}
                      {i.unit}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Real{" "}
                    <span className="text-white font-bold">
                      {i.real}
                      {i.unit}
                    </span>
                  </span>
                  <span className={`font-bold text-right ${cor}`}>
                    {desvioAbs > 0 ? "+" : ""}
                    {desvioAbs}
                    {i.unit}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, usagePct)}
                  className={`h-1 ${usagePct > 105 ? "bg-status-rejected/15" : "bg-white/10"}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  const display = signed ? `${value > 0 ? "+" : ""}${value}` : value;
  const cor = signed
    ? Math.abs(value) < 5
      ? "text-status-approved"
      : value > 0
        ? "text-status-rejected"
        : "text-status-progress"
    : "text-white";
  return (
    <div className="rounded-md bg-white/[0.03] border border-white/10 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${cor}`}>{display}</p>
    </div>
  );
}
