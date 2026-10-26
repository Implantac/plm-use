// Select opcional "Item de estoque (reserva)": vincula o material do pedido a
// um stock_item para que a liberação ao PCP crie a reserva.
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { listStockItemOptions, type StockItemOption } from "@/lib/sales/api";

let cache: Promise<StockItemOption[]> | null = null;
function loadOptions() {
  if (!cache) cache = listStockItemOptions().then((r) => r.data ?? []);
  return cache;
}

export function StockItemSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [options, setOptions] = useState<StockItemOption[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    let alive = true;
    void loadOptions().then((o) => alive && setOptions(o));
    return () => {
      alive = false;
    };
  }, []);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter(
      (o) => o.id === value || o.code.toLowerCase().includes(t) || o.name.toLowerCase().includes(t),
    );
  }, [options, q, value]);

  return (
    <span className="flex items-center gap-1">
      <Input
        aria-label="Buscar item de estoque"
        className="h-7 w-24 text-xs"
        placeholder="Buscar"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        aria-label="Item de estoque (reserva)"
        className="h-7 max-w-48 rounded border border-input bg-transparent px-2 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Item de estoque (reserva)</option>
        {filtered.map((o) => (
          <option key={o.id} value={o.id}>
            {o.code} · {o.name}
          </option>
        ))}
      </select>
    </span>
  );
}
