import { useMemo, useState } from "react";
import { AlertTriangle, Cpu, FileText, Gauge, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DEFAULT_FACTORY_SECTORS,
  buildFiniteCapacityScheduleHtml,
  evaluateFiniteSectorCapacity,
  sequenceOrdersEdd,
  type SchedulableOrderInput,
} from "@/lib/pcp/finite-capacity-planner";
import {
  pedidosOperacionais,
  sumNominalGrade,
  usePrivateLabelQueueStore,
} from "@/lib/sales/private-label-queue";

interface FiniteCapacityPanelProps {
  cloudOrders: Array<{
    id: string;
    number: string;
    priority: string;
    plannedEnd: string;
    pieces: number;
  }>;
}

export function FiniteCapacityPanel({ cloudOrders }: FiniteCapacityPanelProps) {
  const plOrders = pedidosOperacionais(usePrivateLabelQueueStore((s) => s.orders));
  const [sewingOperators, setSewingOperators] = useState(12);

  const combinedOrders = useMemo<SchedulableOrderInput[]>(() => {
    const fromCloud: SchedulableOrderInput[] = cloudOrders.map((c) => ({
      id: c.id,
      orderNumber: c.number,
      refCode: "OP-CLOUD",
      productName: `Ordem de Produção ${c.number}`,
      pieces: Math.max(1, c.pieces),
      dueDate: c.plannedEnd || "2026-11-20",
      priority: c.priority === "alta" || c.priority === "baixa" ? c.priority : "media",
      hasCustomApplication: false,
    }));

    const fromQueue: SchedulableOrderInput[] = plOrders.map((p) => ({
      id: p.id,
      orderNumber: p.orderNumber,
      refCode: p.refCode,
      productName: p.productName,
      pieces: Math.max(1, sumNominalGrade(p.grade)),
      dueDate: p.dueDate,
      priority: p.status === "Liberado PCP" ? "alta" : "media",
      hasCustomApplication: p.operations.some((o) => o.sector !== "Costura"),
    }));

    return [...fromCloud, ...fromQueue];
  }, [cloudOrders, plOrders]);

  const sectors = useMemo(
    () =>
      DEFAULT_FACTORY_SECTORS.map((s) =>
        s.sectorId === "costura" ? { ...s, operators: sewingOperators } : s,
      ),
    [sewingOperators],
  );

  const loads = useMemo(
    () => evaluateFiniteSectorCapacity(combinedOrders, sectors),
    [combinedOrders, sectors],
  );

  const slots = useMemo(
    () => sequenceOrdersEdd(combinedOrders, "2026-11-04", sewingOperators),
    [combinedOrders, sewingOperators],
  );

  function handlePrintSchedule() {
    const html = buildFiniteCapacityScheduleHtml(loads, slots);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o Mapa Semanal de Carga-Capacidade A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <Card className="border-border bg-card rounded-xl mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Planejamento Finito de Capacidade (CRP) & Sequenciamento EDD
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Consolida OPs do banco + pedidos Private Label, calcula ocupação útil por setor e
              sequencia pela data de entrega (Earliest Due Date).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-2xs text-muted-foreground rounded-md border border-border bg-muted/40 px-2.5 py-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              Costureiras Internas:
              <input
                type="number"
                min={2}
                max={60}
                value={sewingOperators}
                onChange={(e) => setSewingOperators(Math.max(2, Number(e.target.value) || 2))}
                className="w-12 rounded border border-border bg-background px-1 text-center font-mono text-xs text-foreground"
              />
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrintSchedule}
              className="h-8 text-xs gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500" /> Mapa CRP A4
            </Button>
          </div>
        </div>

        {/* Grade dos 4 setores */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {loads.map((l) => (
            <div
              key={l.sector.sectorId}
              className={`rounded-lg border p-3 space-y-2 ${
                l.overloaded ? "border-rose-500/40 bg-rose-500/10" : "border-border/80 bg-muted/25"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">{l.sector.label}</span>
                <Badge
                  variant="outline"
                  className={
                    l.overloaded
                      ? "border-rose-500/50 text-rose-500 font-mono text-2xs"
                      : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono text-2xs"
                  }
                >
                  {l.utilizationPct}%
                </Badge>
              </div>
              <Progress value={Math.min(100, l.utilizationPct)} className="h-1.5" />
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>Carga: {l.requiredMinutesWeek} min</span>
                <span>Cap.: {l.availableMinutesWeek} min</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug flex items-start gap-1">
                {l.overloaded && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                <span>{l.recommendation}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Fila Sequenciada EDD */}
        <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/60">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-2xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left">Seq. EDD</th>
                <th className="p-2.5 text-left">Ordem / Pedido</th>
                <th className="p-2.5 text-left">Produto</th>
                <th className="p-2.5 text-right">Peças</th>
                <th className="p-2.5 text-right">Tempo Padrão</th>
                <th className="p-2.5 text-left">Janela Sugerida</th>
                <th className="p-2.5 text-left">Status Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {slots.map((s) => (
                <tr key={s.order.id}>
                  <td className="p-2.5 font-mono font-bold text-primary">{s.rank}º</td>
                  <td className="p-2.5 font-mono font-semibold text-foreground">
                    {s.order.orderNumber}
                  </td>
                  <td className="p-2.5 text-foreground">{s.order.productName}</td>
                  <td className="p-2.5 text-right font-mono">{s.order.pieces}</td>
                  <td className="p-2.5 text-right font-mono text-muted-foreground">
                    {s.totalStandardMinutes} min
                  </td>
                  <td className="p-2.5 font-mono text-2xs">
                    {s.suggestedStartIso} → {s.suggestedEndIso}
                  </td>
                  <td className="p-2.5">
                    <Badge
                      variant="outline"
                      className={
                        s.onTime
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[10px]"
                          : "border-rose-500/40 text-rose-500 text-[10px]"
                      }
                    >
                      <Cpu className="h-3 w-3 mr-1" />
                      {s.onTime ? `No prazo (${s.order.dueDate})` : `Atenção (${s.order.dueDate})`}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
