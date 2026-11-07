import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Copy,
  Factory,
  FileText,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  NOMINAL_SIZES,
  buildBlindOrderProductionSheetHtml,
  evaluateOrderCosting,
  parseNominalRosterPaste,
  usePrivateLabelQueueStore,
  type PrivateLabelOrder,
} from "@/lib/sales/private-label-queue";
import { brl } from "@/lib/sales/types";

const STATUS_STYLE: Record<string, string> = {
  "Aguardando Custo": "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300",
  "Em Detalhamento": "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-300",
  "Custo Aprovado":
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "Liberado PCP": "border-primary/40 bg-primary/15 text-primary",
};

export function CostQueueNominalPanel() {
  const orders = usePrivateLabelQueueStore((s) => s.orders);
  const cloneOrder = usePrivateLabelQueueStore((s) => s.cloneOrder);
  const updateOrderPricing = usePrivateLabelQueueStore((s) => s.updateOrderPricing);
  const updateOperationFields = usePrivateLabelQueueStore((s) => s.updateOperationFields);
  const setNominalRosterAndSyncGrade = usePrivateLabelQueueStore(
    (s) => s.setNominalRosterAndSyncGrade,
  );
  const setOrderStatus = usePrivateLabelQueueStore((s) => s.setOrderStatus);

  const [queueFilter, setQueueFilter] = useState<"todos" | "pendentes" | "aprovados">("todos");
  const [rosterOrder, setRosterOrder] = useState<PrivateLabelOrder | null>(null);
  const [rosterPaste, setRosterPaste] = useState("");
  const [qrZoom, setQrZoom] = useState<{ src: string; title: string; subtitle: string } | null>(
    null,
  );

  const enriched = useMemo(() => {
    return orders
      .filter((o) => {
        if (queueFilter === "pendentes") {
          return o.status === "Aguardando Custo" || o.status === "Em Detalhamento";
        }
        if (queueFilter === "aprovados") {
          return o.status === "Custo Aprovado" || o.status === "Liberado PCP";
        }
        return true;
      })
      .map((o) => ({ order: o, evalRes: evaluateOrderCosting(o) }));
  }, [orders, queueFilter]);

  function openRosterEditor(o: PrivateLabelOrder) {
    setRosterOrder(o);
    setRosterPaste(
      o.nominalRoster.map((r) => `${r.recipientName}\t${r.badgeOrNumber}\t${r.size}`).join("\n"),
    );
  }

  function handleSaveRoster() {
    if (!rosterOrder) return;
    const parsed = parseNominalRosterPaste(rosterPaste);
    if (parsed.length === 0) {
      toast.error("Informe ao menos 1 linha no formato: Nome ; Número/Cargo ; Tamanho");
      return;
    }
    setNominalRosterAndSyncGrade(rosterOrder.id, parsed);
    setRosterOrder(null);
    toast.success(
      `Lista Nominal salva (${parsed.length} peças) e grade consolidada automaticamente!`,
    );
  }

  function printBlindSheet(o: PrivateLabelOrder) {
    const html = buildBlindOrderProductionSheetHtml(o);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir a Ficha de Produção Cega A4.");
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
              <Calculator className="h-4 w-4 text-primary" />
              Fila de Custos Private Label · Clonagem B2B, Lista Nominal & Ficha Cega A4
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Amortização real de setup por lote, ajuste inline de drivers (peça, mil pontos, m²),
              lista nominal individual e impressão cega de custo para fábrica.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {(
              [
                ["todos", "Toda a Fila"],
                ["pendentes", "Pendentes Custo"],
                ["aprovados", "Aprovados / PCP"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={queueFilter === id ? "default" : "outline"}
                onClick={() => setQueueFilter(id)}
                className="h-7 text-2xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {enriched.map(({ order: o, evalRes }) => (
            <div
              key={o.id}
              className="rounded-xl border border-border/80 bg-muted/25 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setQrZoom({
                        src: evalRes.qrSvgDataUrl,
                        title: `QR Rastreio Pedido · ${o.orderNumber}`,
                        subtitle: `${o.customerName} · ${evalRes.totalPieces} peças`,
                      })
                    }
                    title="Ampliar QR do Pedido"
                    className="h-11 w-11 shrink-0 rounded border border-border bg-white p-0.5 cursor-zoom-in hover:border-primary"
                  >
                    <img
                      src={evalRes.qrSvgDataUrl}
                      alt={`QR ${o.orderNumber}`}
                      className="h-full w-full object-contain"
                    />
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {o.orderNumber}
                      </span>
                      <span className="text-sm font-bold text-foreground">{o.productName}</span>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_STYLE[o.status]}`}>
                        {o.status}
                      </Badge>
                      {o.demo && (
                        <Badge
                          variant="outline"
                          title="Pedido de demonstração — não entra em número operacional"
                          className="text-[10px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        >
                          Demonstração
                        </Badge>
                      )}
                    </div>
                    <p className="text-2xs text-muted-foreground mt-0.5">
                      Cliente: <strong className="text-foreground">{o.customerName}</strong> (CNPJ{" "}
                      {o.customerCnpj}) · Ref. {o.refCode} · Cor {o.colorName} · Entrega {o.dueDate}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openRosterEditor(o)}
                    className="h-7 text-2xs gap-1"
                  >
                    <Users className="h-3 w-3 text-primary" />
                    Lista Nominal ({o.nominalRoster.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const cloned = cloneOrder(o.id);
                      if (cloned) {
                        toast.success(`Pedido clonado como ${cloned.orderNumber} (Recompra B2B)!`);
                      }
                    }}
                    className="h-7 text-2xs gap-1"
                  >
                    <Copy className="h-3 w-3 text-primary" /> Clonar Pedido
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => printBlindSheet(o)}
                    className="h-7 text-2xs gap-1"
                  >
                    <FileText className="h-3 w-3 text-emerald-500" /> Ficha Cega A4
                  </Button>
                  {o.status !== "Custo Aprovado" && o.status !== "Liberado PCP" ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setOrderStatus(o.id, "Custo Aprovado");
                        toast.success(`Custo do pedido ${o.orderNumber} aprovado pela engenharia!`);
                      }}
                      className="h-7 text-2xs gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Aprovar Custo
                    </Button>
                  ) : (
                    o.status === "Custo Aprovado" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setOrderStatus(o.id, "Liberado PCP");
                          toast.success(
                            `Pedido ${o.orderNumber} liberado para programação no PCP!`,
                          );
                        }}
                        className="h-7 text-2xs gap-1"
                      >
                        <Factory className="h-3 w-3" /> Liberar p/ PCP
                      </Button>
                    )
                  )}
                </div>
              </div>

              {/* Grade + KPIs de Custo e Margem */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="rounded-lg border border-border/70 bg-background/80 p-2.5 lg:col-span-2">
                  <span className="text-[10px] uppercase text-muted-foreground block">
                    Grade Consolidada ({evalRes.totalPieces} pçs)
                  </span>
                  <div className="flex items-center gap-2 font-mono text-2xs mt-1 text-foreground">
                    {NOMINAL_SIZES.map((sz) => (
                      <span key={sz}>
                        {sz}:<strong>{o.grade[sz] || 0}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
                  <span className="text-[10px] uppercase text-muted-foreground block">
                    Custo Unit. (c/ Setup)
                  </span>
                  <strong className="font-mono text-foreground">
                    {brl(evalRes.totals.unitCost)}
                  </strong>
                  <span className="text-[10px] text-muted-foreground block">
                    Setup {brl(evalRes.setupPerPieceBrl)}/pç
                  </span>
                </div>

                <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
                  <span className="text-[10px] uppercase text-muted-foreground block">
                    Preço Venda Unit.
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-2xs text-muted-foreground">R$</span>
                    <input
                      type="number"
                      step="0.5"
                      aria-label={`Preço unitário ${o.orderNumber}`}
                      value={o.unitSellingPriceBrl}
                      onChange={(e) =>
                        updateOrderPricing(o.id, Math.max(1, Number(e.target.value) || 0))
                      }
                      className="h-6 w-20 rounded border border-border bg-background px-1.5 font-mono text-xs text-foreground"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
                  <span className="text-[10px] uppercase text-muted-foreground block">
                    Margem Real (Meta {o.minMarginPct}%)
                  </span>
                  <strong
                    className={`font-mono flex items-center gap-1 ${
                      evalRes.marginHealthy
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-500"
                    }`}
                  >
                    {!evalRes.marginHealthy && <AlertTriangle className="h-3 w-3" />}
                    {evalRes.realMarginPct !== null ? `${evalRes.realMarginPct.toFixed(1)}%` : "—"}
                  </strong>
                  {!evalRes.marginHealthy && (
                    <span className="text-[10px] text-rose-500 block">
                      Sugerido ≥ {brl(evalRes.suggestedMinPriceBrl)}
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
                  <span className="text-[10px] uppercase text-muted-foreground block">
                    Faturamento Pedido
                  </span>
                  <strong className="font-mono text-primary">{brl(evalRes.grossRevenueBrl)}</strong>
                  <span className="text-[10px] text-muted-foreground block">
                    Ind. {brl(evalRes.totals.industrialCost)}
                  </span>
                </div>
              </div>

              {/* Operações editáveis inline pela Engenharia de Custos */}
              <div className="overflow-x-auto rounded-lg border border-border/70 bg-background/60">
                <table className="w-full text-2xs">
                  <thead className="bg-muted/40 uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Setor / Operação</th>
                      <th className="p-2 text-left">Driver</th>
                      <th className="p-2 text-right">Qtd. Driver</th>
                      <th className="p-2 text-right">Custo Driver (R$)</th>
                      <th className="p-2 text-right">Setup Fixo Lote (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.operations.map((op) => (
                      <tr key={op.id} className="border-t border-border/50">
                        <td className="p-2">
                          <span className="font-semibold text-foreground">{op.sector}</span> ·{" "}
                          {op.operation}
                        </td>
                        <td className="p-2 font-mono text-muted-foreground">{op.driver}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={op.driverQty}
                            onChange={(e) =>
                              updateOperationFields(o.id, op.id, {
                                driverQty: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="h-6 w-16 rounded border border-border bg-background px-1 text-right font-mono text-foreground"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.05"
                            min={0}
                            value={op.unitCost}
                            onChange={(e) =>
                              updateOperationFields(o.id, op.id, {
                                unitCost: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="h-6 w-16 rounded border border-border bg-background px-1 text-right font-mono text-foreground"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="5"
                            min={0}
                            value={op.setupCost}
                            onChange={(e) =>
                              updateOperationFields(o.id, op.id, {
                                setupCost: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="h-6 w-16 rounded border border-border bg-background px-1 text-right font-mono text-foreground"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={Boolean(rosterOrder)} onOpenChange={(next) => !next && setRosterOrder(null)}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>
              Lista Nominal por Peça · {rosterOrder?.orderNumber} ({rosterOrder?.productName})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <Label className="text-2xs uppercase text-muted-foreground">
              Cole do Excel ou edite (1 peça por linha: Nome [TAB ou ;] Número/Cargo [TAB ou ;]
              Tamanho PP/P/M/G/GG/3G)
            </Label>
            <Textarea
              rows={9}
              value={rosterPaste}
              onChange={(e) => setRosterPaste(e.target.value)}
              className="font-mono text-xs"
              placeholder={"LUCAS FERREIRA;10 CAPITÃO;M\nRAFAEL COSTA;07 ATACANTE;G"}
            />
            <p className="text-2xs text-muted-foreground">
              Ao salvar, a grade consolidada (PP..3G) e o recálculo de amortização de setup do
              pedido são atualizados automaticamente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRosterOrder(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRoster}>Salvar Lista & Recalcular Grade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {qrZoom && (
        <ImageLightbox
          open={Boolean(qrZoom)}
          onOpenChange={(next) => {
            if (!next) setQrZoom(null);
          }}
          items={[
            {
              src: qrZoom.src,
              alt: qrZoom.title,
              title: qrZoom.title,
              subtitle: qrZoom.subtitle,
              exportBaseName: "qr-pedido-producao",
            },
          ]}
        />
      )}
    </Card>
  );
}
