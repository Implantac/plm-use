// Doc 06.2 · Painel ABC + Cobertura — resumo da curva e itens abaixo do PP.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { StockItem, StockBalance } from "@/hooks/use-stock";
import { summarizeAbc } from "@/hooks/use-stock";
import { TrendingUp } from "lucide-react";

interface Props {
  items: StockItem[];
  balances: Record<string, StockBalance>;
}

const classColors: Record<string, string> = {
  A: "text-amber-300 bg-amber-300/10 border-amber-300/20",
  B: "text-sky-300 bg-sky-300/10 border-sky-300/20",
  C: "text-slate-300 bg-slate-300/10 border-slate-300/20",
};

export function AbcCoveragePanel({ items, balances }: Props) {
  const summary = summarizeAbc(items);
  const total = summary.total_revenue || 1;

  const belowReorder = items.filter((it) => {
    const bal = balances[it.id];
    const onHand = Number(bal?.qty_on_hand ?? 0);
    return it.reorder_point > 0 && onHand <= it.reorder_point;
  });

  const fmtBRL = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  return (
    <>
      <Card className="glass-card rounded-lg">
        <CardHeader className="p-5 border-b border-white/5">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Curva ABC
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {(["A", "B", "C"] as const).map((cls) => {
            const bucket = summary[cls];
            const pct = Math.round((bucket.revenue / total) * 100);
            return (
              <div key={cls} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`inline-flex items-center gap-2 rounded-md border px-2 py-0.5 font-bold uppercase tracking-[0.14em] ${classColors[cls]}`}
                  >
                    Classe {cls}
                  </span>
                  <span className="text-white font-bold">{bucket.count} itens</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{fmtBRL(bucket.revenue)}</span>
                  <span>{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5 bg-white/10" />
              </div>
            );
          })}
          {summary.unclassified.count > 0 && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] text-muted-foreground">
                {summary.unclassified.count} itens sem classificação — rode &quot;Classificar ABC&quot;
              </p>
            </div>
          )}
          <div className="pt-3 border-t border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Faturamento anual total
            </p>
            <p className="text-lg font-bold text-white mt-1">{fmtBRL(total)}</p>
          </div>
        </CardContent>
      </Card>

      {belowReorder.length > 0 && (
        <Card className="glass-card rounded-lg border-amber-300/20 bg-amber-300/[0.035]">
          <CardHeader className="p-5 border-b border-white/5">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Reposição sugerida ({belowReorder.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {belowReorder.slice(0, 6).map((it) => {
              const bal = balances[it.id];
              const onHand = Number(bal?.qty_on_hand ?? 0);
              return (
                <div key={it.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-white truncate">{it.name}</p>
                    {it.abc_class && (
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0 text-[9px] font-bold ${classColors[it.abc_class]}`}
                      >
                        {it.abc_class}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-amber-300">
                    saldo {onHand.toFixed(0)}{it.unit} · PP {Number(it.reorder_point).toFixed(0)}
                    {it.unit} · LEC {Number(it.eoq).toFixed(0)}
                    {it.unit}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
}
