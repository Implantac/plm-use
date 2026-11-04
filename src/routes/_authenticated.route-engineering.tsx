import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  FileText,
  Gauge,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useProductionRoutes, type ProdRoute } from "@/hooks/use-production-orders";
import { buildLineBalancingPrintableHtml, computeCellGsdBalancing } from "@/lib/techsheet/cfo-dre";
import { seedFor, useTechSheetStore } from "@/lib/techsheet/store";
import { resolveSheet } from "@/lib/techsheet/provenance";
import { SheetProvenanceNote } from "@/components/techsheet/SheetProvenanceNote";
import { SETORES_PCP } from "@/types/pcp";

export const Route = createFileRoute("/_authenticated/route-engineering")({
  head: () => ({
    meta: [
      { title: "Engenharia de Rotas & Balanceamento GSD | USE MODA PLM" },
      {
        name: "description",
        content:
          "Cronoanálise SAM/GSD, Takt Time, balanceamento de célula de costura e rotas produtivas PCP.",
      },
      { property: "og:title", content: "Engenharia de Rotas & Balanceamento GSD | USE MODA PLM" },
      {
        property: "og:description",
        content: "Cronoanálise, gargalos de costura, pool de máquinas e rotas produtivas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RouteEngineering,
});

function RouteEngineering() {
  const { data: routes = [], isLoading } = useProductionRoutes();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["pcp-op"] });

  const run = async (p: PromiseLike<{ error: { message: string } | null }>, ok?: string) => {
    const { error } = p ? await p : { error: null };
    if (error) toast.error(error.message);
    else {
      if (ok) toast.success(ok);
      await refresh();
    }
  };

  const createRoute = async () => {
    if (!code.trim() || !name.trim()) return toast.error("Informe código e nome da rota.");
    await run(
      supabase.from("production_routes").insert({ code: code.trim(), name: name.trim() }),
      "Rota criada.",
    );
    setCode("");
    setName("");
  };

  return (
    <ModuleLayout
      title="Engenharia de Rotas & Balanceamento GSD"
      subtitle="Cronoanálise SAM, Takt Time, balanceamento de célula de costura (Yamazumi), pool de máquinas e rotas PCP."
      version="Engenharia Industrial v2.0"
    >
      <Tabs defaultValue="gsd-balancing" className="space-y-4">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="gsd-balancing">Balanceamento de Célula & GSD (BOP)</TabsTrigger>
          <TabsTrigger value="pcp-routes">Rotas Produtivas (PCP)</TabsTrigger>
        </TabsList>

        <TabsContent value="gsd-balancing">
          <CellBalancingTab />
        </TabsContent>

        <TabsContent value="pcp-routes" className="space-y-4">
          <Card className="glass-card rounded-lg">
            <CardContent className="p-4 flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label htmlFor="rc">Código</Label>
                <Input
                  id="rc"
                  value={code}
                  maxLength={20}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-28"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-48">
                <Label htmlFor="rn">Nome</Label>
                <Input
                  id="rn"
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button onClick={createRoute}>
                <Plus className="h-4 w-4 mr-1" />
                Nova rota
              </Button>
            </CardContent>
          </Card>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            {routes.map((r) => (
              <RouteCard key={r.id} route={r} run={run} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}

function CellBalancingTab() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const ensure = useTechSheetStore((s) => s.ensure);
  const updateBopStep = useTechSheetStore((s) => s.updateBopStep);

  const availableRefs = useMemo(() => {
    const base = ["DEV000006", "V24-001", "U25-014", "I25-088"];
    for (const k of Object.keys(sheetsMap)) {
      if (!base.includes(k)) base.push(k);
    }
    return base;
  }, [sheetsMap]);

  const [selectedRef, setSelectedRef] = useState("DEV000006");
  const [jornadaMin, setJornadaMin] = useState(480);
  const [eficienciaPct, setEficienciaPct] = useState(85);
  const [metaDia, setMetaDia] = useState(420);
  const [custoMinuto, setCustoMinuto] = useState(1.18);

  const { doc, provenance } = resolveSheet(sheetsMap, selectedRef, seedFor);
  const res = useMemo(
    () =>
      computeCellGsdBalancing(doc, {
        jornadaMinutosDia: jornadaMin,
        eficienciaOperacionalPct: eficienciaPct,
        metaPecasDia: metaDia,
        custoMinutoIndustrial: custoMinuto,
      }),
    [doc, jornadaMin, eficienciaPct, metaDia, custoMinuto],
  );

  function syncMinuteCostToTechSheet() {
    ensure(selectedRef);
    for (const st of res.stations) {
      if (!st.terceirizada) {
        updateBopStep(selectedRef, st.stepId, {
          custo: st.custoCalculadoPeca,
          maquina: st.maquina,
        });
      }
    }
    toast.success(
      `Custo minuto (R$ ${custoMinuto.toFixed(2)}/min → R$ ${res.custoMaoObraInternaSugerido.toFixed(2)}/peça) sincronizado no BOP de ${selectedRef}!`,
    );
  }

  function printBalancingSheet() {
    const html = buildLineBalancingPrintableHtml(selectedRef, doc.meta?.name || selectedRef, res);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir a Folha de Balanceamento A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div className="space-y-4">
      {provenance === "referencia" && (
        <SheetProvenanceNote provenance={provenance} code={selectedRef} compact />
      )}
      <Card className="p-4 border-border bg-card space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                Ficha Técnica (BOP)
              </Label>
              <select
                aria-label="Selecionar Ficha Técnica para balanceamento"
                value={selectedRef}
                onChange={(e) => setSelectedRef(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground"
              >
                {availableRefs.map((r) => (
                  <option key={r} value={r}>
                    {r} — {(sheetsMap[r] ?? seedFor(r)).meta?.name ?? r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                Jornada (min/dia)
              </Label>
              <Input
                type="number"
                min={120}
                max={960}
                value={jornadaMin}
                onChange={(e) => setJornadaMin(Math.max(120, Number(e.target.value) || 480))}
                className="h-9 w-28 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                Eficiência (%)
              </Label>
              <Input
                type="number"
                min={40}
                max={100}
                value={eficienciaPct}
                onChange={(e) =>
                  setEficienciaPct(Math.min(100, Math.max(40, Number(e.target.value) || 85)))
                }
                className="h-9 w-24 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                Meta Diária (pçs)
              </Label>
              <Input
                type="number"
                min={20}
                step={20}
                value={metaDia}
                onChange={(e) => setMetaDia(Math.max(20, Number(e.target.value) || 400))}
                className="h-9 w-28 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                Custo Minuto (R$)
              </Label>
              <Input
                type="number"
                step="0.05"
                min="0.2"
                value={custoMinuto}
                onChange={(e) => setCustoMinuto(Math.max(0.2, Number(e.target.value) || 1.18))}
                className="h-9 w-28 font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={syncMinuteCostToTechSheet}
              className="gap-1.5 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Sincronizar Custo Minuto na
              Ficha
            </Button>
            <Button type="button" size="sm" variant="outline" asChild className="gap-1.5 text-xs">
              <Link to="/tech-sheet" search={{ ref: selectedRef } as never}>
                <FileSpreadsheet className="h-3.5 w-3.5" /> Abrir Ficha
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={printBalancingSheet}
              className="gap-1.5 text-xs"
            >
              <FileText className="h-3.5 w-3.5" /> Folha de Célula A4
            </Button>
          </div>
        </div>

        {/* KPIs de Cronoanálise & Takt Time */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3 text-primary" /> SAM Interno
            </span>
            <strong className="font-mono text-base text-foreground block mt-0.5">
              {res.samInternoTotalMin.toFixed(2)} min
            </strong>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground">Takt Exigido</span>
            <strong className="font-mono text-base text-primary block mt-0.5">
              {res.taktTimeExigidoMin.toFixed(2)} min/pç
            </strong>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground">Postos / Costureiras</span>
            <strong className="font-mono text-base text-foreground block mt-0.5">
              {res.totalPostosAlocados} op. ({res.operadoresTeoricosTotais.toFixed(1)} teór.)
            </strong>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground">Capacidade Real</span>
            <strong
              className={`font-mono text-base block mt-0.5 ${
                res.capacidadeRealPecasDia >= metaDia
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-500"
              }`}
            >
              {res.capacidadeRealPecasDia} pçs/dia
            </strong>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3 w-3 text-primary" /> Efic. Balanceamento
            </span>
            <strong className="font-mono text-base text-foreground block mt-0.5">
              {res.eficienciaBalanceamentoPct.toFixed(1)}%
            </strong>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <span className="text-2xs uppercase text-primary">M.O.D. Calculada</span>
            <strong className="font-mono text-base text-primary block mt-0.5">
              R$ {res.custoMaoObraInternaSugerido.toFixed(2)}/pç
            </strong>
          </div>
        </div>
      </Card>

      {/* Pool de Máquinas + Matriz Yamazumi de Operações */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <Card className="border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border/70 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Matriz Yamazumi · Ocupação por Posto e Identificação de Gargalo
            </span>
            <Badge
              variant="outline"
              className="border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-2xs gap-1"
            >
              <AlertTriangle className="h-3 w-3" /> Gargalo: {res.gargaloEtapa} (
              {res.gargaloCicloMin.toFixed(2)} min)
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-2.5 text-left">Seq</th>
                  <th className="p-2.5 text-left">Operação</th>
                  <th className="p-2.5 text-left">Máquina</th>
                  <th className="p-2.5 text-right">SAM (min)</th>
                  <th className="p-2.5 text-right">Operadores</th>
                  <th className="p-2.5 text-right">Ciclo Posto</th>
                  <th className="p-2.5 text-left w-36">Carga Posto</th>
                </tr>
              </thead>
              <tbody>
                {res.stations.map((s) => (
                  <tr
                    key={s.stepId}
                    className={`border-t border-border/60 ${
                      s.isBottleneck ? "bg-rose-500/10" : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="p-2.5 font-mono text-muted-foreground">{s.seq}</td>
                    <td className="p-2.5 font-medium text-foreground">
                      {s.etapa}
                      {s.isBottleneck && (
                        <Badge className="ml-2 bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40 text-[10px]">
                          GARGALO
                        </Badge>
                      )}
                    </td>
                    <td className="p-2.5 text-muted-foreground">{s.maquina}</td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        step="0.1"
                        min="0.05"
                        aria-label={`SAM ${s.etapa}`}
                        value={s.samMin}
                        onChange={(e) => {
                          ensure(selectedRef);
                          updateBopStep(selectedRef, s.stepId, {
                            tempoMin: Math.max(0.05, Number(e.target.value) || 0.2),
                          });
                        }}
                        className="h-7 w-16 rounded border border-border bg-background px-1.5 text-right font-mono text-xs text-foreground"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold">
                      {s.terceirizada ? "Facção Ext." : `${s.postosAlocados} op.`}
                    </td>
                    <td className="p-2.5 text-right font-mono">
                      {s.terceirizada ? "—" : `${s.tempoCicloPostoMin.toFixed(2)}m`}
                    </td>
                    <td className="p-2.5">
                      {s.terceirizada ? (
                        <span className="text-2xs text-muted-foreground">Externo</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                s.isBottleneck ? "bg-rose-500" : "bg-primary"
                              }`}
                              style={{ width: `${Math.min(100, s.ocupacaoPct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-2xs w-9 text-right">
                            {s.ocupacaoPct.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card h-fit space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Pool de Máquinas da Célula
          </h3>
          <div className="space-y-2">
            {res.poolMaquinas.map((m) => (
              <div
                key={m.maquina}
                className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 p-2.5 text-xs"
              >
                <span className="text-foreground truncate pr-2">{m.maquina}</span>
                <Badge variant="outline" className="font-mono shrink-0">
                  {m.postos} máq.
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RouteCard({
  route,
  run,
}: {
  route: ProdRoute;
  run: (p: PromiseLike<{ error: { message: string } | null }>, ok?: string) => Promise<void>;
}) {
  const [sector, setSector] = useState<string>(SETORES_PCP[2]);
  const [operation, setOperation] = useState("");
  const [outsourced, setOutsourced] = useState(false);

  const addStep = async () => {
    if (!operation.trim()) return toast.error("Informe a operação.");
    const seq = (route.steps.at(-1)?.sequence ?? 0) + 1;
    await run(
      supabase.from("production_route_steps").insert({
        route_id: route.id,
        sequence: seq,
        sector,
        operation: operation.trim(),
        outsourced,
      }),
    );
    setOperation("");
    setOutsourced(false);
  };

  const swap = async (i: number, j: number) => {
    const a = route.steps[i],
      b = route.steps[j];
    if (!a || !b) return;
    await run(supabase.from("production_route_steps").update({ sequence: -1 }).eq("id", a.id));
    await run(
      supabase.from("production_route_steps").update({ sequence: a.sequence }).eq("id", b.id),
    );
    await run(
      supabase.from("production_route_steps").update({ sequence: b.sequence }).eq("id", a.id),
    );
  };

  return (
    <Card className="glass-card rounded-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{route.code}</p>
            <p className="font-bold">{route.name}</p>
          </div>
          <Badge variant={route.active ? "default" : "outline"}>
            {route.active ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        <ol className="space-y-1">
          {route.steps.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-2 text-sm rounded-md border border-border px-2 py-1"
            >
              <span className="w-5 text-muted-foreground">{s.sequence}</span>
              <span className="flex-1">
                {s.operation} <span className="text-muted-foreground">· {s.sector}</span>
                {s.outsourced && (
                  <Badge variant="outline" className="ml-2 text-2xs">
                    Terceirizado
                  </Badge>
                )}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Subir etapa"
                disabled={i === 0}
                onClick={() => swap(i, i - 1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Descer etapa"
                disabled={i === route.steps.length - 1}
                onClick={() => swap(i, i + 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remover etapa"
                onClick={() =>
                  run(
                    supabase.from("production_route_steps").delete().eq("id", s.id),
                    "Etapa removida.",
                  )
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            aria-label="Setor"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {SETORES_PCP.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <Input
            aria-label="Operação"
            placeholder="Operação (ex.: Bordado)"
            value={operation}
            maxLength={60}
            onChange={(e) => setOperation(e.target.value)}
            className="flex-1 min-w-32 h-9"
          />
          <label className="flex items-center gap-1 text-xs">
            <Checkbox checked={outsourced} onCheckedChange={(c) => setOutsourced(!!c)} />
            Terceirizado
          </label>
          <Button size="sm" variant="outline" onClick={addStep}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Etapa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
