import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, Layers } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MRP_SEM_APURACAO,
  buildMrpCsv,
  buildMrpPurchaseRequisitionHtml,
  computeMrpNetExplosion,
  podeEmitirMrp,
} from "@/lib/inventory/mrp-explosion";
import { useStockBalancesByName } from "@/hooks/use-stock";
import { pedidosOperacionais, usePrivateLabelQueueStore } from "@/lib/sales/private-label-queue";
import { brl } from "@/lib/sales/types";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";

interface MrpNetExplosionPanelProps {
  cloudBalancesByName?: Record<string, number>;
}

export function MrpNetExplosionPanel({ cloudBalancesByName }: MrpNetExplosionPanelProps) {
  const orders = pedidosOperacionais(usePrivateLabelQueueStore((s) => s.orders));
  const sheets = useTechSheetStore((s) => s.data);
  // Saldo real do almoxarifado (`stock_balance`, já líquido de reservas ativas).
  // Sem isso o motor caía em saldos de referência do BOM e o painel apresentava
  // números de ficha como se fossem estoque físico.
  const { balances: saldoAlmoxarifado, loading: carregandoSaldo } = useStockBalancesByName();

  const mergedBalances = cloudBalancesByName ?? saldoAlmoxarifado;

  const summary = useMemo(
    () => computeMrpNetExplosion({ orders, sheets, cloudBalancesByName: mergedBalances }),
    [orders, sheets, mergedBalances],
  );

  const semSaldoReal = summary.provenance.realStockLines === 0;
  // Onda 50: sem pedido com ficha salva não há explosão — `rows` vazio não é
  // "orçamento R$ 0,00", é ausência de apuração.
  const emissao = useMemo(() => podeEmitirMrp(summary), [summary]);

  function handleExportCsv() {
    if (!emissao.pode) {
      toast.error(emissao.motivo);
      return;
    }
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
    if (!emissao.pode) {
      toast.error(emissao.motivo);
      return;
    }
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
              {emissao.pode ? (
                <>
                  Cruza {orders.length} pedidos ativos com o BOM + quebra técnica e desconta o
                  estoque livre ({summary.shortageCount} insumos com compra líquida sugerida ·
                  Orçamento{" "}
                  <strong className="text-foreground">{brl(summary.totalPurchaseBudgetBrl)}</strong>
                  ).
                </>
              ) : (
                <>
                  Sem pedido com ficha salva na carteira: insumos com compra líquida{" "}
                  <strong className="text-foreground">—</strong> · Orçamento{" "}
                  <strong className="text-foreground">—</strong>.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              disabled={!emissao.pode}
              title={emissao.pode ? undefined : MRP_SEM_APURACAO}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> CSV Compras ERP
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePrintRequisition}
              disabled={!emissao.pode}
              title={emissao.pode ? undefined : MRP_SEM_APURACAO}
              className="h-8 text-xs gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-500" /> Requisição MRP A4
            </Button>
          </div>
        </div>

        <div
          data-testid="mrp-provenance"
          className={
            semSaldoReal
              ? "flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
              : "flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
          }
        >
          {semSaldoReal ? (
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {!emissao.pode ? (
              <>
                <strong className="text-foreground">Sem explosão apurável.</strong> Nenhum pedido
                com ficha salva gerou necessidade de material; os indicadores são travessões, não
                zero apurado.
              </>
            ) : carregandoSaldo ? (
              "Lendo o saldo do almoxarifado…"
            ) : semSaldoReal ? (
              <>
                <strong className="text-foreground">
                  Sem saldo de almoxarifado para estes insumos.
                </strong>{" "}
                A coluna “Saldo Livre” mostra a <em>referência do BOM/ficha</em>, não estoque físico
                — trate os números como estimativa até cadastrar os itens em Almoxarifado.
              </>
            ) : (
              <>
                <strong className="text-foreground">
                  {summary.provenance.realStockLines} de {summary.totalGrossItems} insumos com saldo
                  real do almoxarifado
                </strong>
                {summary.provenance.referenceLines > 0 && (
                  <>
                    ; os outros {summary.provenance.referenceLines} usam referência do BOM (marcados
                    na linha)
                  </>
                )}
                . O saldo já desconta reservas ativas.
              </>
            )}
          </p>
        </div>

        {summary.pedidosSemFicha.length > 0 && (
          <div
            data-testid="mrp-pedidos-sem-ficha"
            className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3"
          >
            <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground">
                {summary.pedidosSemFicha.length} pedido(s) fora da explosão por falta de ficha
                salva:
              </strong>{" "}
              {summary.pedidosSemFicha.join(", ")}. Antes, essas referências explodiam o BOM do
              modelo de demonstração e a compra saía com material de um produto que não existe.
            </p>
          </div>
        )}

        {!emissao.pode && (
          <div
            data-testid="mrp-sem-apuracao"
            className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground">MRP não apurável.</strong> {MRP_SEM_APURACAO}{" "}
              Cadastre um pedido com ficha técnica salva para apurar necessidade bruta, ruptura e
              orçamento — só então o CSV e a Requisição A4 serão liberados.
              <CtaProximoPasso
                passo="pedido"
                label="Cadastrar pedido com ficha salva"
                testId="cta-mrp-sem-pedido"
              />
            </p>
          </div>
        )}

        {emissao.pode && (
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
                      {r.stockSource === "bom_referencia" && (
                        <span
                          className="block text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400"
                          title="Não há item correspondente no almoxarifado: valor de referência do BOM, não estoque físico."
                        >
                          referência BOM
                        </span>
                      )}
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
        )}
      </CardContent>
    </Card>
  );
}
