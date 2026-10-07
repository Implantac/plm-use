// Kanban por OP / Rota — coluna = setor da etapa; cartão = OP com quantidade em cada etapa.
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Route as RouteIcon, Search } from "lucide-react";
import { useProductionOrders, useProductionRoutes, type ProductionOrder } from "@/hooks/use-production-orders";
import { OpWorkspace } from "./OpWorkspace";
import { NovaOpDialog } from "./NovaOpDialog";
import { useAuth, useUserRoles } from "@/hooks/use-auth";
import { opPermissions } from "@/lib/pcp/op-permissions";

const SECTOR_ORDER = ["Compras", "CAD", "Corte", "Silk", "Costura", "Terceirizados", "Acabamento", "Expedição"];

export function opProgress(o: ProductionOrder) {
  const planned = o.items.reduce((a, i) => a + i.quantity_planned, 0);
  const done = o.items.reduce((a, i) => a + i.quantity_produced + i.quantity_lost, 0);
  return planned ? Math.round((done / planned) * 100) : 0;
}

function isLate(o: ProductionOrder) {
  return !!o.planned_end && new Date(o.planned_end + "T23:59") < new Date() && opProgress(o) < 100;
}

export function OpKanban() {
  const { data: orders = [], isLoading, error } = useProductionOrders();
  const { canPlan } = opPermissions(useUserRoles(useAuth().user?.id).roles);
  const { data: routes = [] } = useProductionRoutes();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [routeF, setRouteF] = useState("all");
  const [onlyLate, setOnlyLate] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const stepSector = useMemo(() => {
    const m = new Map<string, string>();
    routes.forEach((r) => r.steps.forEach((s) => m.set(s.id, s.sector)));
    return m;
  }, [routes]);

  const filtered = orders.filter((o) => {
    const t = q.trim().toLowerCase();
    if (statusF !== "all" && o.status !== statusF) return false;
    if (routeF !== "all" && !o.items.some((i) => i.route_id === routeF)) return false;
    if (onlyLate && !isLate(o)) return false;
    if (!t) return true;
    return o.number.toLowerCase().includes(t) || o.items.some((i) => i.reference_code.toLowerCase().includes(t));
  });

  const columns = useMemo(() => {
    const cols = new Map<string, { order: ProductionOrder; qty: number }[]>();
    for (const o of filtered) {
      const per = new Map<string, number>();
      for (const i of o.items) for (const b of i.balances) {
        const s = stepSector.get(b.step_id) ?? "?";
        per.set(s, (per.get(s) ?? 0) + b.quantity);
      }
      if (!per.size) per.set("Concluídas", 0);
      per.forEach((qty, s) => {
        if (!cols.has(s)) cols.set(s, []);
        cols.get(s)!.push({ order: o, qty });
      });
    }
    return [...cols.entries()].sort(
      (a, b) => (SECTOR_ORDER.indexOf(a[0]) + 1 || 99) - (SECTOR_ORDER.indexOf(b[0]) + 1 || 99),
    );
  }, [filtered, stepSector]);

  const open = orders.find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar OP ou referência" placeholder="Buscar OP ou referência" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
        </div>
        <select aria-label="Filtrar por status" value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">Todos os status</option>
          {[...new Set(orders.map((o) => o.status))].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select aria-label="Filtrar por rota" value={routeF} onChange={(e) => setRouteF(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="all">Todas as rotas</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
        </select>
        <Button size="sm" variant={onlyLate ? "default" : "outline"} onClick={() => setOnlyLate((v) => !v)}>Só atrasadas</Button>
        {canPlan && <NovaOpDialog orders={orders} routes={routes} />}
        <Button asChild size="sm" variant="outline">
          <Link to="/route-engineering"><RouteIcon className="h-3.5 w-3.5 mr-1" />Engenharia de Rotas</Link>
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">Não foi possível carregar as OPs.</p>}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando ordens de produção…</p>
      ) : (
        <Card className="glass-card rounded-lg">
          <CardContent className="p-4 overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-2">
              {columns.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma OP encontrada.</p>}
              {columns.map(([sector, cards]) => (
                <div key={sector} className="w-64 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider">{sector}</h3>
                    <Badge variant="outline" className="text-[10px]">{cards.reduce((a, c) => a + c.qty, 0)} pç</Badge>
                  </div>
                  {cards.map(({ order, qty }) => {
                    const late = isLate(order);
                    return (
                      <button key={order.id} onClick={() => setOpenId(order.id)} className="w-full text-left rounded-md border border-border bg-card/50 p-3 hover:border-primary/50 transition">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold">{order.number}</p>
                          <Badge variant={late ? "destructive" : "secondary"} className="text-[10px]">{late ? "Atrasada" : order.priority}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{order.items.length} itens · {qty} pç nesta etapa</p>
                        {order.planned_end && <p className="text-[10px] text-muted-foreground">Prazo {new Date(order.planned_end + "T00:00").toLocaleDateString("pt-BR")}</p>}
                        <Progress value={opProgress(order)} className="h-1 mt-2" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <OpWorkspace order={open} routes={routes} onClose={() => setOpenId(null)} />
    </div>
  );
}
