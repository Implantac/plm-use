// Programação de OPs — a tela que o PCP usa para fechar a janela de produção.
//
// Substituiu (21/10/2026) o "Smart Production Planner", que era 100% mock: as
// sugestões vinham de um array fixo (`BASE`, "Camisa Linho Amalfi") e "gerar lote"
// gravava só no store do navegador. Nada chegava ao banco. Agora a tela lê as OPs
// reais, mostra o que está sem janela / atrasado e grava a programação em
// `production_orders` (policy `pcp update` decide quem pode).
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CalendarRange, AlertTriangle, Save, Loader2 } from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ExportMenu } from "@/components/export/ExportMenu";
import { useProductionOrders, useUpdateOrderSchedule } from "@/hooks/use-production-orders";
import { useAuth, useUserRoles } from "@/hooks/use-auth";
import { opPermissions } from "@/lib/pcp/op-permissions";

export const Route = createFileRoute("/_authenticated/planner")({
  component: PlannerPage,
});

const PRIORITY_LABEL: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const STATUS_LABEL: Record<string, string> = {
  planejada: "Planejada",
  aguardando: "Aguardando",
  em_producao: "Em produção",
  pausada: "Pausada",
  concluida: "Concluída",
};

const fmtDate = (v?: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");

const today = () => new Date().toISOString().slice(0, 10);

type Row = {
  id: string;
  number: string;
  status: string;
  priority: string;
  plannedStart: string;
  plannedEnd: string;
  pieces: number;
  items: number;
};

function PlannerPage() {
  const { data: orders = [], isLoading } = useProductionOrders();
  const save = useUpdateOrderSchedule();
  const { user } = useAuth();
  const { roles } = useUserRoles(user?.id);
  const { canPlan } = opPermissions(roles);

  const [draft, setDraft] = useState<
    Record<string, { start: string; end: string; priority: string }>
  >({});
  const [saved, setSaved] = useState<Record<string, string>>({});

  const rows: Row[] = useMemo(
    () =>
      orders.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        priority: o.priority ?? "media",
        plannedStart: o.planned_start?.slice(0, 10) ?? "",
        plannedEnd: o.planned_end?.slice(0, 10) ?? "",
        pieces: (o.items ?? []).reduce((acc, i) => acc + (i.quantity_planned ?? 0), 0),
        items: (o.items ?? []).length,
      })),
    [orders],
  );

  const totalPecas = rows.reduce((a, r) => a + r.pieces, 0);
  const semJanela = rows.filter((r) => !r.plannedStart || !r.plannedEnd).length;
  const atrasadas = rows.filter(
    (r) => r.plannedEnd && r.plannedEnd < today() && r.status !== "concluida",
  ).length;

  const value = (r: Row) =>
    draft[r.id] ?? { start: r.plannedStart, end: r.plannedEnd, priority: r.priority };

  const setField = (r: Row, field: "start" | "end" | "priority", v: string) =>
    setDraft((prev) => ({ ...prev, [r.id]: { ...value(r), [field]: v } }));

  async function saveRow(r: Row) {
    const v = value(r);
    try {
      await save.mutateAsync({
        orderId: r.id,
        plannedStart: v.start || null,
        plannedEnd: v.end || null,
        priority: v.priority,
      });
      setSaved((prev) => ({ ...prev, [r.id]: "Programação salva." }));
    } catch (e) {
      setSaved((prev) => ({
        ...prev,
        [r.id]: e instanceof Error ? e.message : "Falha ao salvar.",
      }));
    }
  }

  return (
    <ModuleLayout
      title="Programação de OPs"
      subtitle="Janela de produção e prioridade das ordens que já entraram no PCP. O prazo do pedido entra como fim planejado; o início é decisão do PCP."
      version="Planner v2.0"
      metrics={[
        { label: "OPs", value: String(rows.length), detail: "no PCP" },
        { label: "Peças", value: String(totalPecas), detail: "programadas" },
        { label: "Sem janela", value: String(semJanela), detail: "sem início ou fim" },
        { label: "Atrasadas", value: String(atrasadas), detail: "fim já passou" },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
            <CalendarRange className="w-3.5 h-3.5" />
            Programação grava em <code className="text-[10px]">production_orders</code> — a mesma OP
            que o Kanban e as passagens usam.
          </p>
          <ExportMenu
            title="Programação de OPs"
            filename={`programacao-ops-${today()}`}
            rows={rows.map((r) => ({
              OP: r.number,
              Status: STATUS_LABEL[r.status] ?? r.status,
              Prioridade: PRIORITY_LABEL[r.priority] ?? r.priority,
              "Início planejado": fmtDate(r.plannedStart),
              "Fim planejado": fmtDate(r.plannedEnd),
              Peças: r.pieces,
              Itens: r.items,
            }))}
            columns={[
              "OP",
              "Status",
              "Prioridade",
              "Início planejado",
              "Fim planejado",
              "Peças",
              "Itens",
            ]}
          />
        </div>

        {!canPlan && (
          <div className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] text-muted-foreground">
            Você está em modo leitura: só PCP, gestor e admin alteram a programação.
          </div>
        )}

        {isLoading && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando OPs…
          </p>
        )}

        {!isLoading && rows.length === 0 && (
          <Card className="glass-card rounded-lg border-dashed">
            <CardContent className="p-6 space-y-2">
              <p className="text-sm font-semibold text-white">Nenhuma OP no PCP</p>
              <p className="text-xs text-muted-foreground">
                A programação começa quando um pedido aprovado é liberado: em{" "}
                <strong>Pedidos → Liberar para PCP</strong> o sistema cria a OP, herda a rota da
                configuração e coloca o prazo do pedido como fim planejado.
              </p>
            </CardContent>
          </Card>
        )}

        {rows.map((r) => {
          const v = value(r);
          const invalid = !!v.start && !!v.end && v.start > v.end;
          const late = !!r.plannedEnd && r.plannedEnd < today() && r.status !== "concluida";
          return (
            <Card
              key={r.id}
              className={`glass-card rounded-lg ${late ? "border-rose-400/30" : ""}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white">{r.number}</p>
                  <Badge variant="outline" className="text-[9px]">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {r.items} item(ns) · {r.pieces} pç
                  </span>
                  {late && (
                    <Badge
                      variant="outline"
                      className="text-[9px] border-rose-400/40 text-rose-300 gap-1"
                    >
                      <AlertTriangle className="w-3 h-3" /> atrasada
                    </Badge>
                  )}
                  {(!r.plannedStart || !r.plannedEnd) && !late && (
                    <Badge
                      variant="outline"
                      className="text-[9px] border-amber-400/40 text-amber-200"
                    >
                      sem janela
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <label className="space-y-1 block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Início
                    </span>
                    <Input
                      type="date"
                      value={v.start}
                      disabled={!canPlan}
                      onChange={(e) => setField(r, "start", e.target.value)}
                      className="h-8"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Fim
                    </span>
                    <Input
                      type="date"
                      value={v.end}
                      disabled={!canPlan}
                      onChange={(e) => setField(r, "end", e.target.value)}
                      className="h-8"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Prioridade
                    </span>
                    <select
                      value={v.priority}
                      disabled={!canPlan}
                      onChange={(e) => setField(r, "priority", e.target.value)}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </label>
                  <Button
                    className="h-8 text-[10px] tracking-[0.16em] gap-2"
                    disabled={!canPlan || save.isPending || invalid}
                    onClick={() => void saveRow(r)}
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar
                  </Button>
                </div>

                {invalid && (
                  <p className="text-[11px] text-amber-300">O início não pode ser depois do fim.</p>
                )}
                {saved[r.id] && (
                  <p
                    className={`text-[11px] ${
                      saved[r.id] === "Programação salva." ? "text-emerald-300" : "text-red-400"
                    }`}
                  >
                    {saved[r.id]}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ModuleLayout>
  );
}
