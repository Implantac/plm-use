import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { routesKey, useProductionRoutes, type ProdRoute } from "@/hooks/use-production-orders";
import { SETORES_PCP } from "@/types/pcp";

export const Route = createFileRoute("/_authenticated/route-engineering")({
  head: () => ({
    meta: [
      { title: "Engenharia de Rotas | USE MODA PLM" },
      {
        name: "description",
        content: "Cadastre rotas produtivas e a sequência de etapas de cada uma.",
      },
      { property: "og:title", content: "Engenharia de Rotas | USE MODA PLM" },
      { property: "og:description", content: "Rotas produtivas e etapas por setor e operação." },
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
    const { error } = await p;
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
      title="Engenharia de Rotas"
      subtitle="Rotas produtivas e sequência de etapas"
      version="PCP"
    >
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
            <Input id="rn" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
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
    </ModuleLayout>
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
    // troca de sequência em 3 passos para respeitar a unicidade
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
                  <Badge variant="outline" className="ml-2 text-[10px]">
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
