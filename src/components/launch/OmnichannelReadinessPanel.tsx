import { useMemo } from "react";
import { CheckCircle2, Download, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildLaunchGoNoGoHtml,
  buildOmnichannelCatalogCsv,
  evaluateOmnichannelReadiness,
} from "@/lib/launch/omnichannel-readiness";
import { seedFor, useTechSheetStore } from "@/lib/techsheet/store";

export function OmnichannelReadinessPanel() {
  const sheets = useTechSheetStore((s) => s.data);

  const items = useMemo(() => {
    const merged =
      Object.keys(sheets).length > 0
        ? sheets
        : {
            "V24-001": seedFor("V24-001"),
            DEV000006: seedFor("DEV000006"),
          };
    return evaluateOmnichannelReadiness(merged);
  }, [sheets]);

  const readyCount = items.filter((i) => i.goNoGoStatus === "APTO_GO_LIVE").length;

  function handleExportCatalog() {
    const csv = buildOmnichannelCatalogCsv(items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalogo-omnichannel-gtin-dpp.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Feed Omnichannel (GTIN/EAN-13, NCM, ABNT e Passaporte DPP) exportado!");
  }

  function handlePrintChecklist() {
    const html = buildLaunchGoNoGoHtml(items);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o Checklist Go/No-Go A4.");
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
              <ShieldCheck className="h-4 w-4 text-primary" />
              Gate Go/No-Go de Prontidão Industrial & Feed Omnichannel (VTEX / Shopify / B2B)
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Audita BOM, medidas ABNT, etiquetagem INMETRO, roteiro BOP e preço-alvo das fichas
              reais ({readyCount}/{items.length} aptas p/ Go-Live).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCatalog}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> Exportar Feed CSV (GTIN/NCM)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrintChecklist}
              className="h-8 text-xs gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500" /> Checklist Go/No-Go A4
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/60">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-2xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left">Referência / EAN-13</th>
                <th className="p-2.5 text-left">Produto</th>
                <th className="p-2.5 text-left">Composição ABNT · NCM</th>
                <th className="p-2.5 text-right">Preço Alvo</th>
                <th className="p-2.5 text-center">Prontidão</th>
                <th className="p-2.5 text-left">Gate Go-Live</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((it) => (
                <tr key={it.ref}>
                  <td className="p-2.5">
                    <span className="font-mono font-bold text-primary block">{it.ref}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{it.ean13}</span>
                  </td>
                  <td className="p-2.5 font-semibold text-foreground">{it.productName}</td>
                  <td className="p-2.5 text-2xs text-muted-foreground">
                    {it.abntComposition} · <span className="font-mono">NCM {it.ncmFiscal}</span>
                  </td>
                  <td className="p-2.5 text-right font-mono text-foreground">
                    R$ {it.suggestedRetailPriceBrl.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-center font-mono font-bold">{it.readinessScorePct}%</td>
                  <td className="p-2.5">
                    {it.goNoGoStatus === "APTO_GO_LIVE" ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 gap-1 text-[10px]"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Apto Go-Live
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300 gap-1 text-[10px]"
                      >
                        <AlertTriangle className="h-3 w-3" /> Revisar Engenharia
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
