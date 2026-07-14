// Doc 06.2 · Almoxarifado — dialog para criar reservas contra pcp_lot / piloto / op.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createReservation } from "@/lib/inventory/inventory.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "@/components/ui/field-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StockItem } from "@/hooks/use-stock";

interface Warehouse { id: string; code: string; name: string }
interface RefRow { id: string; label: string }

type RefType = "pcp_lot" | "piloto" | "op";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: StockItem[];
  onDone?: () => void;
}

export function ReservationDialog({ open, onOpenChange, items, onDone }: Props) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [refs, setRefs] = useState<RefRow[]>([]);
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [refType, setRefType] = useState<RefType>("pcp_lot");
  const [refId, setRefId] = useState("");
  const [qty, setQty] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{
    itemId?: string;
    warehouseId?: string;
    refId?: string;
    qty?: string;
  }>({});

  useEffect(() => {
    if (!open) return;
    supabase
      .from("warehouse" as never)
      .select("id, code, name")
      .eq("is_active", true)
      .order("code")
      .then(({ data }) => {
        const list = (data ?? []) as unknown as Warehouse[];
        setWarehouses(list);
        if (list.length > 0) setWarehouseId((prev) => prev || list[0].id);
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setRefId("");
    const table = refType === "pcp_lot" ? "pcp_lots" : refType === "piloto" ? "pilotos" : null;
    if (!table) {
      setRefs([]);
      return;
    }
    const cols = refType === "pcp_lot" ? "id, codigo" : "id, reference_id, rodada";
    supabase
      .from(table as never)
      .select(cols)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const list = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id),
          label:
            refType === "pcp_lot"
              ? `Lote ${String(r.codigo ?? r.id).slice(0, 12)}`
              : `Piloto ${String(r.reference_id ?? "").slice(0, 8)} · R${String(r.rodada ?? "")}`,
        }));
        setRefs(list);
      });
  }, [open, refType]);

  const handleSubmit = async () => {
    const next: typeof errors = {};
    if (!itemId) next.itemId = "Selecione um insumo.";
    if (!warehouseId) next.warehouseId = "Selecione o armazém.";
    if (!refId) next.refId = "Selecione uma referência.";
    const q = Number(qty);
    if (!(q > 0)) next.qty = "Quantidade deve ser maior que 0.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    setBusy(true);
    const res = await createReservation({
      data: {
        item_id: itemId,
        warehouse_id: warehouseId,
        qty: q,
        ref_type: refType,
        ref_id: refId,
        notes: notes.trim() || undefined,
      },
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.reason);
    toast.success("Reserva criada.");
    setQty("0");
    setNotes("");
    setRefId("");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-lg p-6 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-tight">Nova reserva</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="space-y-2">
            <Label required>Insumo</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger aria-invalid={!!errors.itemId}><SelectValue placeholder="Selecione o insumo" /></SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10 text-white max-h-72">
                {items.map((it) => (
                  <SelectItem key={it.id} value={it.id}>{it.code} — {it.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.itemId && <FieldMessage variant="error">{errors.itemId}</FieldMessage>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label required>Armazém</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger aria-invalid={!!errors.warehouseId}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10 text-white">
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.warehouseId && <FieldMessage variant="error">{errors.warehouseId}</FieldMessage>}
            </div>
            <div className="space-y-2">
              <Label required>Quantidade</Label>
              <Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="0" step="0.01" aria-invalid={!!errors.qty} />
              {errors.qty && <FieldMessage variant="error">{errors.qty}</FieldMessage>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={refType} onValueChange={(v) => setRefType(v as RefType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10 text-white">
                  <SelectItem value="pcp_lot">Lote PCP</SelectItem>
                  <SelectItem value="piloto">Piloto</SelectItem>
                  <SelectItem value="op">OP livre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label required>Referência</Label>
              {refType === "op" ? (
                <Input value={refId} onChange={(e) => setRefId(e.target.value)} placeholder="UUID da OP" aria-invalid={!!errors.refId} />
              ) : (
                <Select value={refId} onValueChange={setRefId}>
                  <SelectTrigger aria-invalid={!!errors.refId}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-black/95 border-white/10 text-white max-h-72">
                    {refs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                    {refs.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum registro.</div>
                    )}
                  </SelectContent>
                </Select>
              )}
              {errors.refId && <FieldMessage variant="error">{errors.refId}</FieldMessage>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="" />
          </div>
        </div>
        <DialogFooter className="gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[10px]">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={busy} className="text-[10px]">Reservar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
