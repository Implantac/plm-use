// H9-10 · Lançamento — página com abas Waves / Itens / Handoffs / Performance.
// Escritas passam por server functions (RLS + validação Zod).
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { statusToast } from "@/components/ui/status-presets";
import { Rocket, Send, CheckCircle2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import {
  useLaunch,
  WAVE_STATUS_LABEL, ITEM_STATUS_LABEL,
  WAVE_NEXT, ITEM_NEXT,
  type LaunchWaveStatus, type LaunchItemStatus,
} from "@/hooks/use-launch";
import {
  createLaunchWave, promoteShowroomDecisions, sendLaunchHandoff, transitionLaunch,
} from "@/lib/launch/launch.functions";
import { useShowroom } from "@/hooks/use-showroom";

export const Route = createFileRoute("/_authenticated/launch")({
  component: LaunchPage,
});

function LaunchPage() {
  const { openEntity } = useEntityDrawer();
  const { waves, items, handoffs, itemsByWave, handoffsByWave, loading } = useLaunch();
  const { decisions } = useShowroom();

  const create = useServerFn(createLaunchWave);
  const promote = useServerFn(promoteShowroomDecisions);
  const transition = useServerFn(transitionLaunch);
  const handoff = useServerFn(sendLaunchHandoff);

  const [form, setForm] = useState({
    codigo: "", colecao: "", janela_inicio: "", janela_fim: "", notas: "",
  });
  const [selectedWave, setSelectedWave] = useState<string | null>(null);
  const [pickedDecisions, setPickedDecisions] = useState<string[]>([]);

  const approvedDecisions = useMemo(
    () => decisions.filter((d) => d.decision === "aprovada"),
    [decisions],
  );

  const metrics = useMemo(() => [
    { label: "Waves", value: waves.length.toString() },
    { label: "Publicadas", value: waves.filter((w) => w.status === "publicada").length.toString() },
    { label: "Itens", value: items.length.toString() },
    { label: "Handoffs confirmados", value: handoffs.filter((h) => h.synced_at).length.toString() },
  ], [waves, items, handoffs]);

  async function handleCreateWave() {
    if (!form.codigo || !form.colecao || !form.janela_inicio || !form.janela_fim) {
      statusToast.error("Preencha código, coleção e janela");
      return;
    }
    const res = await create({ data: form });
    if (!res.ok) return statusToast.error(res.reason ?? "Falha ao criar wave");
    statusToast.success(`Wave ${form.codigo} criada`);
    setForm({ codigo: "", colecao: "", janela_inicio: "", janela_fim: "", notas: "" });
  }

  async function handlePromote() {
    if (!selectedWave || pickedDecisions.length === 0) {
      statusToast.error("Escolha uma wave e ao menos 1 decisão");
      return;
    }
    const res = await promote({ data: { wave_id: selectedWave, decision_ids: pickedDecisions } });
    if (!res.ok) return statusToast.error(res.reason ?? "Falha ao promover");
    statusToast.success(`${res.created} item(ns) adicionado(s)`);
    setPickedDecisions([]);
  }

  async function handleTransitionWave(id: string, from: LaunchWaveStatus, to: LaunchWaveStatus) {
    const res = await transition({
      data: { entity_type: "launch_wave", entity_id: id, from_status: from, to_status: to },
    });
    if (!res.ok) return statusToast.error(res.reason ?? "Transição negada");
    statusToast.success(`Wave → ${WAVE_STATUS_LABEL[to]}`);
  }

  async function handleTransitionItem(id: string, from: LaunchItemStatus, to: LaunchItemStatus) {
    const res = await transition({
      data: { entity_type: "launch_item", entity_id: id, from_status: from, to_status: to },
    });
    if (!res.ok) return statusToast.error(res.reason ?? "Transição negada");
    statusToast.success(`Item → ${ITEM_STATUS_LABEL[to]}`);
  }

  async function handleHandoff(wave_id: string, destino: "pcp" | "comercial") {
    const res = await handoff({ data: { wave_id, destino } });
    if (!res.ok) return statusToast.error(res.reason ?? "Handoff falhou");
    if ("deduped" in res && res.deduped) toast.info("Handoff já enviado (idempotente)");
    else statusToast.success(`Handoff ${destino} enviado`);
  }

  return (
    <ModuleLayout
      title="Lançamento"
      subtitle="Waves comerciais, handoff idempotente ao ERP e performance pós-lançamento"
      version="v0.1 · H9-10"
      metrics={metrics}
    >
      <Tabs defaultValue="waves">
        <TabsList>
          <TabsTrigger value="waves">Waves</TabsTrigger>
          <TabsTrigger value="promote">Promover decisões</TabsTrigger>
          <TabsTrigger value="handoffs">Handoffs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* --- WAVES ------------------------------------------------------ */}
        <TabsContent value="waves" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Nova wave</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div>
                <Label>Código</Label>
                <Input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="W-2026-01" />
              </div>
              <div>
                <Label>Coleção</Label>
                <Input value={form.colecao} onChange={(e) => setForm((f) => ({ ...f, colecao: e.target.value }))} placeholder="Verão 26" />
              </div>
              <div>
                <Label>Início janela</Label>
                <Input type="date" value={form.janela_inicio} onChange={(e) => setForm((f) => ({ ...f, janela_inicio: e.target.value }))} />
              </div>
              <div>
                <Label>Fim janela</Label>
                <Input type="date" value={form.janela_fim} onChange={(e) => setForm((f) => ({ ...f, janela_fim: e.target.value }))} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateWave} className="w-full">
                  <Rocket className="h-4 w-4 mr-1" /> Criar
                </Button>
              </div>
              <div className="md:col-span-5">
                <Label>Notas</Label>
                <Textarea rows={2} value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />
              </div>
            </CardContent>
          </Card>

          {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!loading && waves.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma wave ainda. Crie a primeira acima.</p>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {waves.map((w) => {
              const status = w.status as LaunchWaveStatus;
              const waveItems = itemsByWave.get(w.id) ?? [];
              const hs = handoffsByWave.get(w.id) ?? [];
              return (
                <Card key={w.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{w.codigo} · {w.colecao}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {w.janela_inicio} → {w.janela_fim}
                      </p>
                    </div>
                    <Badge variant="secondary">{WAVE_STATUS_LABEL[status]}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-muted px-2 py-0.5">{waveItems.length} itens</span>
                      <span className="rounded bg-muted px-2 py-0.5">{hs.length} handoffs</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {WAVE_NEXT[status].map((to) => (
                        <Button key={to} size="sm" variant="outline" onClick={() => handleTransitionWave(w.id, status, to)}>
                          <ArrowRight className="h-3 w-3 mr-1" /> {WAVE_STATUS_LABEL[to]}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => openEntity({ type: "launch_wave", id: w.id, title: w.codigo })}>
                        Timeline
                      </Button>
                    </div>

                    {waveItems.length > 0 && (
                      <div className="border-t pt-2 space-y-1">
                        {waveItems.map((it) => {
                          const is = it.status as LaunchItemStatus;
                          return (
                            <div key={it.id} className="flex items-center justify-between text-xs">
                              <span className="truncate max-w-[50%]">{it.reference_id.slice(0, 8)} · meta {it.meta_unidades}</span>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px]">{ITEM_STATUS_LABEL[is]}</Badge>
                                {ITEM_NEXT[is].slice(0, 1).map((to) => (
                                  <Button key={to} size="sm" variant="ghost" className="h-6 text-[11px]"
 onClick={() => handleTransitionItem(it.id, is, to)}>
                                    → {ITEM_STATUS_LABEL[to]}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* --- PROMOTE ---------------------------------------------------- */}
        <TabsContent value="promote" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Promover decisões aprovadas do mostruário → wave</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Wave destino</Label>
                <Select value={selectedWave ?? ""} onValueChange={setSelectedWave}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma wave" /></SelectTrigger>
                  <SelectContent>
                    {waves.filter((w) => ["rascunho", "em_revisao"].includes(w.status)).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.codigo} · {w.colecao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {approvedDecisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma decisão aprovada disponível. Aprove no módulo de Mostruário primeiro.
                </p>
              ) : (
                <div className="border rounded p-2 max-h-64 overflow-auto space-y-1">
                  {approvedDecisions.map((d) => {
                    const checked = pickedDecisions.includes(d.id);
                    return (
                      <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setPickedDecisions((prev) =>
                              e.target.checked ? [...prev, d.id] : prev.filter((x) => x !== d.id),
                            );
                          }}
                        />
                        <span className="font-mono text-xs">{d.reference_id.slice(0, 8)}</span>
                        <span className="text-muted-foreground truncate">{d.justificativa}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <Button onClick={handlePromote} disabled={!selectedWave || pickedDecisions.length === 0}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Promover {pickedDecisions.length} item(ns)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- HANDOFFS --------------------------------------------------- */}
        <TabsContent value="handoffs" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Enviar handoff ao ERP</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Wave precisa estar em <code>aprovada</code>, <code>publicada</code> ou <code>em_producao</code>.
                Chave idempotente: <code>wave:&lt;id&gt;:destino:&lt;pcp|comercial&gt;:v1</code>.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {waves.filter((w) => ["aprovada", "publicada", "em_producao"].includes(w.status)).map((w) => (
                  <Card key={w.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{w.codigo}</span>
                        <Badge variant="secondary">{WAVE_STATUS_LABEL[w.status as LaunchWaveStatus]}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleHandoff(w.id, "pcp")}>
                          <Send className="h-3 w-3 mr-1" /> PCP
                        </Button>
                        <Button size="sm" onClick={() => handleHandoff(w.id, "comercial")}>
                          <Send className="h-3 w-3 mr-1" /> Comercial
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Histórico de handoffs</CardTitle></CardHeader>
            <CardContent>
              {handoffs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum handoff enviado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {handoffs.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-xs border rounded p-2">
                      <div className="space-y-0.5">
                        <div>
                          <Badge variant="outline">{h.destino}</Badge>{" "}
                          <span className="font-mono">{h.idempotency_key}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {h.erp_id ?? "aguardando ERP"} · {h.synced_at ? new Date(h.synced_at).toLocaleString() : "pendente"}
                        </div>
                      </div>
                      {h.synced_at
                        ? <Badge className="bg-emerald-600">confirmado</Badge>
                        : <Badge variant="secondary">pendente</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PERFORMANCE (placeholder até cron rodar) -------------------- */}
        <TabsContent value="performance">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              KPIs derivados de <code>entity_events</code>: <code>time_to_launch</code>,
              <code> handoff_success_rate</code>, <code>sell_through_D30</code>. O cron
              <code> /api/public/cron/launch-performance</code> alimenta esta aba diariamente.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}
