import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Download, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildLaunchGoNoGoHtml,
  buildOmnichannelCatalogCsv,
  evaluateOmnichannelReadiness,
  resolveOmnichannelInputs,
} from "@/lib/launch/omnichannel-readiness";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { SheetProvenanceNote } from "@/components/techsheet/SheetProvenanceNote";

export function OmnichannelReadinessPanel() {
  const sheets = useTechSheetStore((s) => s.data);
  const materializadas = useTechSheetStore((s) => s.materializadas);

  const { docs, apuravel, provenance, excluidas } = useMemo(
    () => resolveOmnichannelInputs(sheets, materializadas),
    [sheets, materializadas],
  );
  const items = useMemo(
    () => (apuravel ? evaluateOmnichannelReadiness(docs) : []),
    [apuravel, docs],
  );

  const readyCount = items.filter((i) => i.goNoGoStatus === "APTO_GO_LIVE").length;

  function handleExportCatalog() {
    if (!apuravel) {
      toast.error("Sem ficha técnica salva: não há catálogo para exportar.");
      return;
    }
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
    if (!apuravel) {
      toast.error("Sem ficha técnica salva: o checklist Go/No-Go não é apurável.");
      return;
    }
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
              reais (
              {apuravel ? `${readyCount}/${items.length} aptas p/ Go-Live` : "nenhuma ficha salva"}
              ).
            </p>
            {!apuravel && (
              <SheetProvenanceNote
                provenance={provenance}
                compact
                className="mt-1.5"
                data-testid="omnichannel-provenance"
              />
            )}
            {excluidas.length > 0 && (
              <p className="text-2xs text-muted-foreground mt-1">
                Modelos materializados fora do feed: {excluidas.join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCatalog}
              disabled={!apuravel}
              title={apuravel ? undefined : "Salve uma ficha técnica para exportar o feed"}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> Exportar Feed CSV (GTIN/NCM)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrintChecklist}
              disabled={!apuravel}
              title={apuravel ? undefined : "Salve uma ficha técnica para imprimir o checklist"}
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
              {!apuravel && (
                <tr data-testid="omnichannel-sem-ficha">
                  <td colSpan={6} className="p-5 text-center text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">
                      Nenhuma ficha técnica salva — feed e checklist não apuráveis.
                    </p>
                    <p className="mb-2">
                      Os SKUs de demonstração não entram no catálogo. O CSV de GTIN/NCM e o
                      Checklist Go/No-Go A4 só saem com engenharia registrada.
                    </p>
                    <Link to="/tech-sheet" className="text-primary underline">
                      Abrir Ficha Técnica
                    </Link>
                  </td>
                </tr>
              )}
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
