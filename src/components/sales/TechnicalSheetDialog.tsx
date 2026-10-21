// Ficha técnica do pedido — a versão SEM CUSTO, para quem fabrica.
//
// Por que existe: até 21/10/2026 o único jeito de ver a ficha era o painel de
// custo (visível só para engenharia_custo). O PCP e a qualidade abriam o pedido
// e não viam o que produzir. A RPC `order_item_technical_sheet` já existia,
// testada justamente por NÃO conter `unit_cost`/`materials_total` — faltava a
// tela. Esta é ela.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTechnicalSheet, type Row } from "@/lib/sales/api";

type SheetOrder = {
  number?: string;
  status?: string;
  due_date?: string | null;
  customer?: string | null;
  released_at?: string | null;
};

type SheetItem = {
  item_id: string;
  description: string;
  color: string | null;
  quantity: number;
  reference_code: string | null;
  grade: Record<string, number>;
  operations: Array<{
    seq?: number;
    sector: string;
    operation: string;
    outsourced?: boolean;
    driver?: string;
    driver_qty?: number;
    per_piece?: number | null;
  }>;
  materials: Array<{
    kind: string;
    material: string;
    unit: string;
    consumption: number;
    waste_pct: number;
    consumption_total?: number;
  }>;
};

const num = (v: number | string | null | undefined) =>
  typeof v === "number" ? v : Number(v ?? 0) || 0;
const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
const fmtDate = (v?: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");

const DRIVER_LABEL: Record<string, string> = {
  peca: "peça",
  minuto: "minuto",
  mil_pontos: "mil pontos",
  m2: "m²",
  lote: "lote do pedido",
};

export function TechnicalSheetDialog({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [sheet, setSheet] = useState<{ order?: SheetOrder; items?: SheetItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
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
      setSheet((res.data ?? null) as { order?: SheetOrder; items?: SheetItem[] } | null);
    });
    return () => {
      alive = false;
    };
  }, [open, orderId]);

  const order = (sheet?.order ?? {}) as SheetOrder;
  const items = (sheet?.items ?? []) as SheetItem[];
  const totalPecas = items.reduce((acc, i) => acc + num(i.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>
              Ficha técnica · {order.number ?? "pedido"}{" "}
              <span className="text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                sem custo
              </span>
            </span>
            <Button
              variant="ghost"
              className="text-[10px] gap-2 text-muted-foreground"
              onClick={() => window.print()}
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando ficha…
          </p>
        )}
        {error && (
          <p className="text-xs text-red-400">Não foi possível carregar a ficha: {error}</p>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              <Field label="Cliente" value={order.customer ?? "—"} />
              <Field label="Prazo" value={fmtDate(order.due_date)} />
              <Field label="Liberado ao PCP" value={fmtDate(order.released_at)} />
              <Field label="Total de peças" value={String(totalPecas)} />
            </div>

            {items.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Pedido sem itens — envie para o custo para gerar a ficha.
              </p>
            )}

            {items.map((item) => (
              <div
                key={item.item_id}
                className="rounded-md border border-border bg-card/40 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="font-semibold text-white">{item.description}</p>
                  <span className="text-[11px] text-muted-foreground">
                    {item.color ?? "sem cor"} · {num(item.quantity)} pç
                    {item.reference_code ? ` · ref. ${item.reference_code}` : ""}
                  </span>
                  <span className="ml-auto flex gap-1">
                    {Object.entries(item.grade ?? {}).map(([size, qty]) => (
                      <span
                        key={size}
                        className="px-1.5 py-0.5 rounded border border-border text-[10px]"
                      >
                        {size} × {qty}
                      </span>
                    ))}
                  </span>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary mb-1">
                    Operações por setor
                  </p>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground text-left">
                        <th className="py-1">Setor</th>
                        <th className="py-1">Operação</th>
                        <th className="py-1">Driver</th>
                        <th className="py-1 text-right">Por peça</th>
                        <th className="py-1 pr-2 text-right">Total do pedido</th>
                        <th className="py-1 pl-3">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.operations ?? []).map((op, idx) => (
                        <tr key={`${op.operation}-${idx}`} className="border-t border-border/50">
                          <td className="py-1">{op.sector}</td>
                          <td className="py-1">{op.operation}</td>
                          <td className="py-1 text-muted-foreground">
                            {DRIVER_LABEL[op.driver ?? ""] ?? op.driver ?? "—"}
                          </td>
                          <td className="py-1 text-right tabular-nums">
                            {op.per_piece == null ? "—" : fmt(num(op.per_piece))}
                          </td>
                          <td className="py-1 text-right tabular-nums font-semibold">
                            {fmt(num(op.driver_qty))}
                          </td>
                          <td className="py-1 pl-3 text-muted-foreground">
                            {op.outsourced ? "terceirizado" : "interno"}
                          </td>
                        </tr>
                      ))}
                      {(item.operations ?? []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-2 text-muted-foreground">
                            Sem operações — item não passou pela explosão do catálogo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary mb-1">
                    Materiais
                  </p>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-muted-foreground text-left">
                        <th className="py-1">Material</th>
                        <th className="py-1 pl-3">Tipo</th>
                        <th className="py-1 text-right">Por peça</th>
                        <th className="py-1 text-right">Perda</th>
                        <th className="py-1 pr-2 text-right">Total do pedido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.materials ?? []).map((m, idx) => (
                        <tr key={`${m.material}-${idx}`} className="border-t border-border/50">
                          <td className="py-1">{m.material}</td>
                          <td className="py-1 text-muted-foreground">{m.kind}</td>
                          <td className="py-1 text-right tabular-nums">
                            {fmt(num(m.consumption))} {m.unit}
                          </td>
                          <td className="py-1 text-right tabular-nums">
                            {num(m.waste_pct) > 0 ? `${fmt(num(m.waste_pct))}%` : "—"}
                          </td>
                          <td className="py-1 text-right tabular-nums font-semibold">
                            {fmt(num(m.consumption_total))} {m.unit}
                          </td>
                        </tr>
                      ))}
                      {(item.materials ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-2 text-muted-foreground">
                            Sem materiais lançados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <p className="text-[10px] text-muted-foreground border-t border-border pt-2">
              Esta ficha não carrega custo, preço nem margem — é a versão que circula em produção.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}

// Exportado para o teste de contrato: a ficha nunca deve exibir custo.
export const COST_KEYS = [
  "unit_cost",
  "materials_total",
  "operations_total",
  "setup_total",
] as const;
export type { Row };
