import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, Layers } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildMrpCsv,
  buildMrpPurchaseRequisitionHtml,
  computeMrpNetExplosion,
} from "@/lib/inventory/mrp-explosion";
import { usePrivateLabelQueueStore } from "@/lib/sales/private-label-queue";
import { brl } from "@/lib/sales/types";
import { useTechSheetStore } from "@/lib/techsheet/store";

interface MrpNetExplosionPanelProps {
  cloudBalancesByName?: Record<string, number>;
}

export function MrpNetExplosionPanel({ cloudBalancesByName }: MrpNetExplosionPanelProps) {
  const orders = usePrivateLabelQueueStore((s) => s.orders);
  const sheets = useTechSheetStore((s) => s.data);

  const summary = useMemo(
    () => computeMrpNetExplosion({ orders, sheets, cloudBalancesByName }),
    [orders, sheets, cloudBalancesByName],
  );

  function handleExportCsv() {
    const csv = buildMrpCsv(summary);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mrp-ressuprimento-liquido.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Mapa MRP de Ressuprimento Líquido exportado em CSV!");
  }

  function handlePrintRequisition() {
    const html = buildMrpPurchaseRequisitionHtml(summary);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir a Requisição de Compras MRP A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <Card className="border-border bg-card rounded-xl mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              MRP I · Explosão Líquida de Materiais × Pedidos em Carteira
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Cruza {orders.length} pedidos ativos com o BOM + quebra técnica e desconta o estoque
              livre ({summary.shortageCount} insumos com compra líquida sugerida · Orçamento{" "}
              <strong className="text-foreground">{brl(summary.totalPurchaseBudgetBrl)}</strong>).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> CSV Compras ERP
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrintRequisition}
              className="h-8 text-xs gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500" /> Requisição MRP A4
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/60">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-2xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left">Insumo / Fornecedor</th>
                <th className="p-2.5 text-right">Nec. Bruta</th>
                <th className="p-2.5 text-right">Saldo Livre</th>
                <th className="p-2.5 text-right">Compra Líquida</th>
                <th className="p-2.5 text-right">Orçamento</th>
                <th className="p-2.5 text-left">Status Suprimentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {summary.rows.slice(0, 8).map((r) => (
                <tr key={r.materialKey}>
                  <td className="p-2.5">
                    <span className="font-semibold text-foreground block">{r.materialName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {r.supplier} · Refs: {r.sourceRefs.join(", ")}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-mono">
                    {r.grossRequirement.toFixed(2)} {r.unit}
                  </td>
                  <td className="p-2.5 text-right font-mono text-muted-foreground">
                    {r.availableStock.toFixed(2)} {r.unit}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-primary">
                    {r.netPurchaseQty.toFixed(2)} {r.unit}
                  </td>
                  <td className="p-2.5 text-right font-mono text-foreground">
                    {brl(r.purchaseBudgetBrl)}
                  </td>
                  <td className="p-2.5">
                    {r.status === "RUPTURA_COMPRA" ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300 gap-1 text-[10px]"
                      >
                        <AlertTriangle className="h-3 w-3" /> Emitir OC
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 gap-1 text-[10px]"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Coberto
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
