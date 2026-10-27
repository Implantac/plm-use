import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getTechnicalSheet } from "@/lib/sales/api";
import { TechnicalSheetItemView, type SheetItem } from "./TechnicalSheetDialog";

/** A OP consulta a ficha sem custo do pedido de origem, sem duplicar instruções. */
export function OrderProductionDetails({ orderId }: { orderId: string }) {
  const [items, setItems] = useState<SheetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void getTechnicalSheet(orderId).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.error) {
        setError(res.error.message);
        return;
      }
      const value = res.data as { items?: SheetItem[] } | null;
      setItems(Array.isArray(value?.items) ? value.items : []);
    });
    return () => {
      alive = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando detalhes do pedido…
      </p>
    );
  }
  if (error)
    return (
      <p role="alert" className="text-sm text-status-rejected">
        Não foi possível carregar a ficha: {error}
      </p>
    );
  if (!items.length)
    return <p className="text-sm text-muted-foreground">O pedido de origem não possui itens.</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Instruções por item do pedido de origem. Esta visualização não traz valores de custo.
      </p>
      {items.map((item) => (
        <TechnicalSheetItemView key={item.item_id} item={item} />
      ))}
    </div>
  );
}
