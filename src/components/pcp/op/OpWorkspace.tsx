// Workspace da OP: itens, rota de cada item, saldo por etapa, passagem em bloco e histórico.
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldMessage } from "@/components/ui/field-message";
import {
  nextStep,
  usePassages,
  useRegisterPassages,
  useChangeItemRoute,
  type PassageMove,
  type ProdRoute,
  type ProductionOrder,
} from "@/hooks/use-production-orders";

interface Row { key: string; itemId: string; label: string; stepId: string; available: number; route?: ProdRoute }

const TYPE_LABEL: Record<string, string> = { total: "Total", parcial: "Parcial", retorno: "Retorno", perda: "Perda", desvio: "Desvio", ajuste: "Ajuste" };

export function OpWorkspace({ order, routes, onClose }: { order: ProductionOrder | null; routes: ProdRoute[]; onClose: () => void }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"total" | "parcial" | "perda">("total");
  const [qty, setQty] = useState<Record<string, string>>({});
  const [obs, setObs] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const register = useRegisterPassages();
  const { data: passages = [] } = usePassages(order?.id ?? null);

  const routeById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);
  const stepById = useMemo(() => {
    const m = new Map<string, { sector: string; operation: string }>();
    routes.forEach((r) => r.steps.forEach((s) => m.set(s.id, s)));
    return m;
  }, [routes]);

  const rows: Row[] = useMemo(() => {
    if (!order) return [];
    return order.items.flatMap((i) =>
      i.balances.map((b) => ({
        key: `${i.id}:${b.step_id}`,
        itemId: i.id,
        label: `${i.reference_code}${i.color ? " · " + i.color : ""}`,
        stepId: b.step_id,
        available: b.quantity,
        route: routeById.get(i.route_id),
      })),
    );
  }, [order, routeById]);

  const chosen = rows.filter((r) => selected[r.key]);

  const reset = () => { setSelected({}); setQty({}); setObs(""); setErrorMsg(null); };

  const submit = async () => {
    setErrorMsg(null);
    if (!chosen.length) return setErrorMsg("Selecione ao menos um item.");
    const moves: PassageMove[] = [];
    for (const r of chosen) {
      const n = mode === "total" ? r.available : Number(qty[r.key]);
      if (!Number.isInteger(n) || n <= 0) return setErrorMsg(`Informe uma quantidade válida para ${r.label}.`);
      if (n > r.available) return setErrorMsg(`${r.label}: passar (${n}) é maior que o disponível (${r.available}).`);
      moves.push({ item_id: r.itemId, origin_step_id: r.stepId, quantity: n, type: mode === "total" ? "total" : mode });
    }
    if (mode === "perda" && !obs.trim()) return setErrorMsg("Informe o motivo da perda.");
    try {
      await register.mutateAsync({ moves, observation: obs.trim() || undefined });
      toast.success(`${moves.length} movimento(s) registrado(s).`);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar passagem.");
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-4xl max-h-[90dvh] overflow-y-auto">
        {order && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {order.number}
                <Badge variant="outline">{order.status}</Badge>
                {order.erp_op_id && <Badge variant="secondary">ERP {order.erp_op_id}</Badge>}
              </DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="itens">
              <TabsList>
                <TabsTrigger value="itens">Itens e passagem</TabsTrigger>
                <TabsTrigger value="rotas">Rotas</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="itens" className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {order.items.map((i) => (
                    <div key={i.id} className="rounded-md border border-border p-2">
                      <p className="font-bold">{i.reference_code} {i.color && `· ${i.color}`}</p>
                      <p className="text-muted-foreground">{routeById.get(i.route_id)?.name}</p>
                      <p>{i.quantity_produced}/{i.quantity_planned} prontas · {i.quantity_lost} perdas</p>
                    </div>
                  ))}
                </div>

                <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem value="total" id="m-total" /><Label htmlFor="m-total">Total disponível</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="parcial" id="m-parcial" /><Label htmlFor="m-parcial">Parcial</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="perda" id="m-perda" /><Label htmlFor="m-perda">Perda</Label></div>
                </RadioGroup>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase text-muted-foreground">
                      <tr><th className="p-2 text-left" /><th className="p-2 text-left">Item</th><th className="p-2 text-left">Etapa atual</th><th className="p-2 text-left">Próxima etapa</th><th className="p-2 text-right">Disponível</th><th className="p-2 text-right">Passar</th></tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Todos os itens foram concluídos.</td></tr>}
                      {rows.map((r) => {
                        const cur = stepById.get(r.stepId);
                        const nx = nextStep(r.route, r.stepId);
                        return (
                          <tr key={r.key} className="border-t border-border">
                            <td className="p-2"><Checkbox aria-label={`Selecionar ${r.label}`} checked={!!selected[r.key]} onCheckedChange={(c) => setSelected((s) => ({ ...s, [r.key]: !!c }))} /></td>
                            <td className="p-2 font-medium">{r.label}</td>
                            <td className="p-2">{cur ? `${cur.sector} · ${cur.operation}` : "—"}</td>
                            <td className="p-2 text-muted-foreground">{mode === "perda" ? "Baixa por perda" : nx ? `${nx.sector} · ${nx.operation}` : "Finalizar (produzido)"}</td>
                            <td className="p-2 text-right">{r.available}</td>
                            <td className="p-2 text-right">
                              {mode === "total" ? r.available : (
                                <Input aria-label={`Quantidade para ${r.label}`} type="number" min={1} max={r.available} className="h-8 w-24 ml-auto text-right" value={qty[r.key] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [r.key]: e.target.value }))} disabled={!selected[r.key]} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="op-obs">Observação {mode === "perda" && "(motivo obrigatório)"}</Label>
                  <Textarea id="op-obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} rows={2} />
                </div>
                {errorMsg && <FieldMessage variant="error">{errorMsg}</FieldMessage>}
                <Button onClick={submit} disabled={register.isPending || !chosen.length}>
                  {register.isPending ? "Registrando…" : `Passar ${chosen.length} item(ns) selecionado(s)`}
                </Button>
              </TabsContent>

              <TabsContent value="rotas" className="space-y-3">
                {order.items.map((i) => {
                  const r = routeById.get(i.route_id);
                  const at = new Map(i.balances.map((b) => [b.step_id, b.quantity]));
                  return (
                    <div key={i.id} className="space-y-1">
                      <p className="text-sm font-bold">{i.reference_code} {i.color && `· ${i.color}`} — {r?.name}</p>
                      <div className="flex flex-wrap gap-1 items-center">
                        {r?.steps.map((s, idx) => (
                          <span key={s.id} className="flex items-center gap-1">
                            <Badge variant={at.get(s.id) ? "default" : "outline"} className="text-[10px]">
                              {s.sequence}. {s.operation}{at.get(s.id) ? ` · ${at.get(s.id)}` : ""}{s.outsourced ? " (terc.)" : ""}
                            </Badge>
                            {idx < r.steps.length - 1 && <span className="text-muted-foreground">→</span>}
                          </span>
                        ))}
                      </div>
                      {!passages.some((p) => p.production_order_item_id === i.id && p.type !== "desvio") && (
                        <AltRouteForm itemId={i.id} currentRouteId={i.route_id} routes={routes} />
                      )}
                    </div>
                  );
                })}
              </TabsContent>

              <TabsContent value="historico">
                {passages.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p> : (
                  <ul className="space-y-2 text-xs">
                    {passages.map((p) => {
                      const item = order.items.find((i) => i.id === p.production_order_item_id);
                      const o = p.origin_step_id ? stepById.get(p.origin_step_id) : null;
                      const d = p.destination_step_id ? stepById.get(p.destination_step_id) : null;
                      return (
                        <li key={p.id} className="rounded-md border border-border p-2">
                          <span className="font-bold">{item?.reference_code} {item?.color}</span> · {o?.operation ?? "—"} → {d?.operation ?? (p.type === "perda" ? "perda" : "concluído")} · {p.quantity} pç · <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[p.type] ?? p.type}</Badge>
                          <div className="text-muted-foreground">{p.responsible_name ?? "—"} · {new Date(p.created_at).toLocaleString("pt-BR")}{p.observation ? ` · ${p.observation}` : ""}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AltRouteForm({ itemId, currentRouteId, routes }: { itemId: string; currentRouteId: string; routes: { id: string; code: string; name: string }[] }) {
  const change = useChangeItemRoute();
  const [open, setOpen] = useState(false);
  const [routeId, setRouteId] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  if (!open) return <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(true)}>Usar rota alternativa</Button>;
  const submit = () => {
    if (!routeId) return setErr("Escolha a rota alternativa.");
    if (reason.trim().length < 5) return setErr("Escreva a justificativa (mínimo 5 caracteres).");
    setErr(null);
    change.mutate({ itemId, routeId, reason: reason.trim() }, {
      onSuccess: () => { toast.success("Rota alternativa aplicada."); setOpen(false); setReason(""); setRouteId(""); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível trocar a rota."),
    });
  };
  return (
    <div className="rounded-md border border-border p-2 space-y-2">
      <select aria-label="Rota alternativa" value={routeId} onChange={(e) => setRouteId(e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
        <option value="">Escolha a rota alternativa</option>
        {routes.filter((r) => r.id !== currentRouteId).map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
      </select>
      <Textarea aria-label="Justificativa" placeholder="Justificativa da troca de rota" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      {err && <FieldMessage tone="error">{err}</FieldMessage>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={change.isPending}>Aplicar rota</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </div>
  );
}
