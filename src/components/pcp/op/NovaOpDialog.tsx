// Criação de OP: peça, cor, quantidade e rota. Saldo inicial na 1ª etapa vem do trigger init_item_balance.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldMessage } from "@/components/ui/field-message";
import type { ProdRoute, ProductionOrder } from "@/hooks/use-production-orders";

function nextNumber(orders: ProductionOrder[]) {
  const max = orders.reduce((m, o) => Math.max(m, Number(o.number.replace(/\D/g, "")) || 0), 0);
  return `OP-${String(max + 1).padStart(5, "0")}`;
}

export function NovaOpDialog({
  orders,
  routes,
}: {
  orders: ProductionOrder[];
  routes: ProdRoute[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [refId, setRefId] = useState("");
  const [color, setColor] = useState("");
  const [qty, setQty] = useState("");
  const [routeId, setRouteId] = useState("");
  const [priority, setPriority] = useState("media");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: refs = [] } = useQuery({
    queryKey: ["pcp-op", "refs"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("references")
        .select("id, code, name")
        .order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const reset = () => {
    setRefId("");
    setColor("");
    setQty("");
    setRouteId("");
    setPriority("media");
    setDue("");
    setErr(null);
  };

  const submit = async () => {
    setErr(null);
    const ref = refs.find((r) => r.id === refId);
    const n = Number(qty);
    if (!ref) return setErr("Escolha a peça.");
    if (!Number.isInteger(n) || n <= 0) return setErr("Informe uma quantidade válida.");
    if (!routeId) return setErr("Escolha a rota.");
    if (!routes.find((r) => r.id === routeId)?.steps.length)
      return setErr("A rota escolhida não tem etapas.");
    setSaving(true);
    const number = nextNumber(orders);
    const { data: op, error } = await supabase
      .from("production_orders")
      .insert({
        number,
        status: "em_producao",
        priority,
        planned_start: new Date().toISOString().slice(0, 10),
        planned_end: due || null,
      })
      .select("id")
      .single();
    if (error || !op) {
      setSaving(false);
      toast.error(error?.message ?? "Falha ao criar OP.");
      return;
    }
    const { error: e2 } = await supabase.from("production_order_items").insert({
      production_order_id: op.id,
      reference_code: ref.code,
      reference_name: ref.name,
      color: color.trim() || null,
      route_id: routeId,
      quantity_planned: n,
      status: "em_producao",
    });
    setSaving(false);
    if (e2) {
      await supabase.from("production_orders").delete().eq("id", op.id);
      toast.error(e2.message);
      return;
    }
    toast.success(`${number} criada.`);
    await qc.invalidateQueries({ queryKey: ["pcp-op"] });
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nova OP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova ordem de produção</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="op-ref">Peça</Label>
            <Select value={refId} onValueChange={setRefId}>
              <SelectTrigger id="op-ref">
                <SelectValue placeholder="Escolha a referência" />
              </SelectTrigger>
              <SelectContent>
                {refs.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.code} · {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="op-cor">Cor</Label>
              <Input
                id="op-cor"
                value={color}
                maxLength={40}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="op-qtd">Quantidade</Label>
              <Input
                id="op-qtd"
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="op-rota">Rota</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger id="op-rota">
                <SelectValue placeholder="Escolha a rota" />
              </SelectTrigger>
              <SelectContent>
                {routes
                  .filter((r) => r.active)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} · {r.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {routeId && (
              <p className="text-xs text-muted-foreground">
                {routes
                  .find((r) => r.id === routeId)
                  ?.steps.map((s) => s.operation)
                  .join(" → ")}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="op-prio">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="op-prio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="op-prazo">Prazo</Label>
              <Input
                id="op-prazo"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>
          {err && <FieldMessage variant="error">{err}</FieldMessage>}
          <Button className="w-full" onClick={submit} disabled={saving}>
            {saving ? "Criando…" : `Criar ${nextNumber(orders)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
