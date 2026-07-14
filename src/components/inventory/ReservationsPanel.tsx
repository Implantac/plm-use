// Doc 06.2 · Almoxarifado — painel de reservas ativas (consumir/cancelar).
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateReservationStatus } from "@/lib/inventory/inventory.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StockItem } from "@/hooks/use-stock";

interface Reservation {
  id: string;
  item_id: string;
  warehouse_id: string;
  qty: number;
  ref_type: string;
  ref_id: string;
  status: "ativa" | "consumida" | "cancelada";
  created_at: string;
}

export function ReservationsPanel({ items }: { items: StockItem[] }) {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("stock_reservation" as never)
      .select("id, item_id, warehouse_id, qty, ref_type, ref_id, status, created_at")
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(20);
    setRows(((data ?? []) as unknown as Reservation[]));
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const nameOf = (id: string) => items.find((i) => i.id === id)?.name ?? id.slice(0, 8);

  const act = async (id: string, status: "consumida" | "cancelada") => {
    setBusyId(id);
    const res = await updateReservationStatus({ data: { id, status } });
    setBusyId(null);
    if (!res.ok) return toast.error(res.reason);
    toast.success(status === "consumida" ? "Reserva consumida" : "Reserva cancelada");
    void refetch();
  };

  return (
    <Card className="glass-card rounded-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Reservas ativas ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground">Sem reservas ativas.</p>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{nameOf(r.item_id)}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {r.qty} · {r.ref_type} · {r.ref_id.slice(0, 8)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
 size="sm"
 variant="ghost"
 disabled={busyId === r.id}
 onClick={() => act(r.id, "consumida")}
                className="h-8 px-2 text-emerald-300 hover:text-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
 size="sm"
 variant="ghost"
 disabled={busyId === r.id}
 onClick={() => act(r.id, "cancelada")}
                className="h-8 px-2 text-rose-300 hover:text-rose-200"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
