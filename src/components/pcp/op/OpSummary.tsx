// Resumo das OPs (modo por OP / Rota) para Torre de Controle e Produção do Dia.
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductionOrders, useProductionRoutes } from "@/hooks/use-production-orders";
import { opProgress } from "./OpKanban";

export function OpSummary({ sector }: { sector?: string }) {
  const { data: orders = [] } = useProductionOrders();
  const { data: routes = [] } = useProductionRoutes();
  const data = useMemo(() => {
    const stepSector = new Map<string, string>();
    routes.forEach((r) => r.steps.forEach((s) => stepSector.set(s.id, s.sector)));
    const perSector = new Map<string, number>();
    let planned = 0, produced = 0, lost = 0, late = 0;
    const active = orders.filter((o) => opProgress(o) < 100);
    for (const o of orders) {
      if (o.planned_end && new Date(o.planned_end + "T23:59") < new Date() && opProgress(o) < 100) late++;
      for (const i of o.items) {
        planned += i.quantity_planned; produced += i.quantity_produced; lost += i.quantity_lost;
        for (const b of i.balances) {
          const s = stepSector.get(b.step_id) ?? "?";
          if (b.quantity > 0) perSector.set(s, (perSector.get(s) ?? 0) + b.quantity);
        }
      }
    }
    return { active: active.length, planned, produced, lost, late, perSector: [...perSector.entries()] };
  }, [orders, routes]);

  if (!orders.length) return null;
  const sectorQty = sector ? data.perSector.find(([s]) => s === sector)?.[1] ?? 0 : null;
  const kpis = [
    { label: "OPs ativas", value: data.active },
    { label: "Peças planejadas", value: data.planned },
    { label: "Produzidas", value: data.produced },
    { label: "Perdas", value: data.lost },
    { label: "OPs atrasadas", value: data.late },
    ...(sector ? [{ label: `Em ${sector} (OPs)`, value: sectorQty ?? 0 }] : []),
  ];
  return (
    <Card className="glass-card rounded-lg">
      <CardContent className="p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider">Ordens de produção (por OP / Rota)</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-md border border-border p-2">
              <p className="text-[10px] uppercase text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold">{k.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {data.perSector.map(([s, q]) => <Badge key={s} variant={s === sector ? "default" : "outline"} className="text-[10px]">{s}: {q} pç</Badge>)}
        </div>
      </CardContent>
    </Card>
  );
}
