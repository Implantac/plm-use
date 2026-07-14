// Doc 06.2 · Almoxarifado — dialog de movimentação (entrada/saída/ajuste/transferência).
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerMovement } from "@/lib/inventory/inventory.functions";
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

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

type Kind = "in" | "out" | "adjust" | "transfer_in" | "transfer_out" | "count";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: StockItem[];
  preselectItemId?: string;
  onDone?: () => void;
}

export function MovementDialog({ open, onOpenChange, items, preselectItemId, onDone }: Props) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [itemId, setItemId] = useState(preselectItemId ?? "");
  const [warehouseId, setWarehouseId] = useState("");
  const [kind, setKind] = useState<Kind>("in");
  const [qty, setQty] = useState("0");
  const [lotCode, setLotCode] = useState("");
  const [justification, setJustification] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ itemId?: string; warehouseId?: string; qty?: string; justification?: string }>({});

  useEffect(() => {
    if (!open) return;
    setItemId(preselectItemId ?? "");
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
  }, [open, preselectItemId]);

  const handleSubmit = async () => {
    const next: typeof errors = {};
    if (!itemId) next.itemId = "Selecione o insumo.";
    if (!warehouseId) next.warehouseId = "Selecione o armazém.";
    const q = Number(qty);
    if (!(q > 0)) next.qty = "Quantidade deve ser maior que 0.";
    if (kind === "adjust" && justification.trim().length < 3)
      next.justification = "Ajuste requer justificativa com no mínimo 3 caracteres.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});


    setBusy(true);
    const res = await registerMovement({
      data: {
        item_id: itemId,
        warehouse_id: warehouseId,
        kind,
        qty: q,
        lot_code: lotCode.trim() || undefined,
        justification: justification.trim() || undefined,
      },
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.reason);
    toast.success("Movimentação registrada.");
    setQty("0");
    setLotCode("");
    setJustification("");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-lg p-6 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-tight">
            Nova movimentação
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4">
          <div className="space-y-2">
            <Label required>Insumo</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger aria-invalid={!!errors.itemId}>
                <SelectValue placeholder="Selecione o insumo" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10 text-white max-h-72">
                {items.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.code} — {it.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.itemId && <FieldMessage variant="error">{errors.itemId}</FieldMessage>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label required>Armazém</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger aria-invalid={!!errors.warehouseId}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10 text-white">
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.warehouseId && <FieldMessage variant="error">{errors.warehouseId}</FieldMessage>}
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/10 text-white">
                  <SelectItem value="in">Entrada</SelectItem>
                  <SelectItem value="out">Saída</SelectItem>
                  <SelectItem value="transfer_in">Transf. entrada</SelectItem>
                  <SelectItem value="transfer_out">Transf. saída</SelectItem>
                  <SelectItem value="adjust">Ajuste</SelectItem>
                  <SelectItem value="count">Contagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label required>Quantidade</Label>
              <Input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                aria-invalid={!!errors.qty}
              />
              {errors.qty && <FieldMessage variant="error">{errors.qty}</FieldMessage>}
            </div>
            <div className="space-y-2">
              <Label>Lote (opcional)</Label>
              <Input
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
                placeholder="LOTE-2601"
              />
            </div>
          </div>

          {kind === "adjust" && (
            <div className="space-y-2">
              <Label required>Justificativa</Label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                aria-invalid={!!errors.justification || !justification.trim()}
              />
              <FieldMessage variant={errors.justification || !justification.trim() ? "error" : "helper"}>
                {errors.justification
                  ?? (justification.trim()
                    ? "Explique brevemente o motivo do ajuste de estoque."
                    : "Justificativa obrigatória para ajustes de estoque.")}
              </FieldMessage>
            </div>
          )}
        </div>
        <DialogFooter className="gap-3">
          <Button
 variant="ghost"
 onClick={() => onOpenChange(false)}
            className="text-[10px]"
          >
            Cancelar
          </Button>
          <Button
 onClick={handleSubmit}
 disabled={busy}
 className="text-[10px]"
 >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
