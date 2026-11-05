// Doc 06.2 · Almoxarifado — painel de reservas ativas.
//
// Desde a migration 20261104120000 a reserva tem ciclo de vida automático:
// a saída física de estoque (stock_movement kind='out') consome em FIFO e a OP
// concluída/cancelada libera o que sobrou. Os botões daqui continuam existindo
// para o caso manual (ajuste de contagem, material devolvido), não como único
// caminho — antes eram.
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateReservationStatus } from "@/lib/inventory/inventory.functions";
import { MENSAGEM_MIGRACAO_PENDENTE, useStockLifecycle } from "@/lib/inventory/stock-lifecycle";
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
  // A automação depende de migration. Quando ela não está lá, o texto antigo
  // prometia consumo automático que não acontece — e o operador esperava.
  const ciclo = useStockLifecycle();
  const [rows, setRows] = useState<Reservation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [opMeta, setOpMeta] = useState<Record<string, { id: string; number: string }>>({});

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("stock_reservation" as never)
      .select("id, item_id, warehouse_id, qty, ref_type, ref_id, status, created_at")
      .eq("status", "ativa")
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = (data ?? []) as unknown as Reservation[];
    setRows(rows);
    // ref_id de reserva 'op' é uuid pelado na tela; resolvemos para o número
    // da OP com link ao kanban. Falha de leitura não quebra o painel.
    const opIds = [...new Set(rows.filter((r) => r.ref_type === "op").map((r) => r.ref_id))];
    if (opIds.length) {
      const { data: pos } = await supabase
        .from("production_orders")
        .select("id, number")
        .in("id", opIds);
      const map: Record<string, { id: string; number: string }> = {};
      for (const p of (pos ?? []) as { id: string; number: string }[]) map[p.id] = p;
      setOpMeta(map);
    } else {
      setOpMeta({});
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const nameOf = (id: string) => items.find((i) => i.id === id)?.name ?? id.slice(0, 8);

  /** Dias desde a criação. Reserva antiga em 'ativa' é sinal de que a saída não
   *  foi registrada — vale olhar antes de confiar no saldo disponível. */
  const diasAtiva = (iso: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

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
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.04em] text-primary">
          Reservas ativas ({rows.length})
        </CardTitle>
        <p className="text-[10px] text-muted-foreground mt-1">
          Consumo e liberação são automáticos: a saída de estoque consome a reserva e a OP concluída
          ou cancelada libera o que sobrar. Os botões abaixo são para ajuste manual.
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">Sem reservas ativas.</p>}
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/50 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{nameOf(r.item_id)}</p>
              <p className="text-2xs uppercase tracking-[0.04em] text-muted-foreground">
                {diasAtiva(r.created_at) > 30 && (
                  <span className="mr-1 rounded-sm bg-amber-500/20 px-1 text-amber-700 dark:text-amber-300">
                    {diasAtiva(r.created_at)}d parada
                  </span>
                )}
                {r.qty} · {r.ref_type} ·{" "}
                {r.ref_type === "op" && opMeta[r.ref_id] ? (
                  <Link
                    to="/production"
                    search={{ pcpOp: r.ref_id }}
                    className="text-primary hover:underline"
                  >
                    {opMeta[r.ref_id].number}
                  </Link>
                ) : (
                  r.ref_id.slice(0, 8)
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === r.id}
                onClick={() => act(r.id, "consumida")}
                className="text-status-approved hover:text-status-approved"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === r.id}
                onClick={() => act(r.id, "cancelada")}
                className="text-status-rejected hover:text-status-rejected"
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
