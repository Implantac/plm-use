import { useMemo } from "react";
import { Activity, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataProvenanceBadge } from "@/components/common/DataProvenanceBadge";
import { buildExecutiveSopReportHtml, computeLiveSopSnapshot } from "@/lib/analytics/live-sop";
import { usePrivateLabelQueueStore } from "@/lib/sales/private-label-queue";
import { brl } from "@/lib/sales/types";
import { useOutsourcingStore } from "@/lib/techsheet/outsourcing-os";
import { useResearchGtmStore } from "@/lib/techsheet/research-gtm";

export function LiveSopBoard() {
  const orders = usePrivateLabelQueueStore((s) => s.orders);
  const campaigns = useResearchGtmStore((s) => s.campaigns);
  const serviceOrders = useOutsourcingStore((s) => s.serviceOrders);

  const snap = useMemo(
    () => computeLiveSopSnapshot({ orders, campaigns, serviceOrders }),
    [orders, campaigns, serviceOrders],
  );

  function handlePrintSop() {
    const html = buildExecutiveSopReportHtml(snap);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o Book Executivo S&OP A4.");
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
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Torre Executiva S&OP · Telemetria 100% Automática (Sem Digitação Manual)
              </h3>
              <p className="text-2xs text-muted-foreground">
                Derivado ao vivo da Fila B2B (/orders), Drops GTM (/marketing), CRP (/planner) e
                Facções (/suppliers).
              </p>
              <div className="mt-1.5">
                <DataProvenanceBadge source="local" data-testid="sop-provenance" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-2xs">
              Live Stores Sync
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrintSop}
              className="h-8 text-xs gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500" /> Book S&OP A4
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 text-xs">
          <div className="rounded-lg border border-border/80 bg-muted/25 p-3">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Carteira B2B Ativa
            </span>
            <strong className="font-mono text-sm text-primary">
              {brl(snap.b2bOrderRevenueBrl)}
            </strong>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/25 p-3">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Margem Pond. Real
            </span>
            <strong className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
              {snap.b2bWeightedMarginPct.toFixed(1)}%
            </strong>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/25 p-3">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Volume Carteira
            </span>
            <strong className="font-mono text-sm text-foreground">
              {snap.totalActivePiecesB2b} pçs
            </strong>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/25 p-3">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Receita Drops GTM
            </span>
            <strong className="font-mono text-sm text-foreground">
              {brl(snap.gtmAttributedSalesBrl)}
            </strong>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/25 p-3">
            <span className="text-[10px] uppercase text-muted-foreground block">
              ROAS Blended Real
            </span>
            <strong className="font-mono text-sm text-primary">
              {snap.gtmBlendedRoas.toFixed(2)}x
            </strong>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/25 p-3">
            <span className="text-[10px] uppercase text-muted-foreground block">
              Ocupação Costura / Facção
            </span>
            <strong className="font-mono text-sm text-foreground">
              {snap.sewingUtilizationPct}% · {snap.outsourcedPiecesInFlight} pçs
            </strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
