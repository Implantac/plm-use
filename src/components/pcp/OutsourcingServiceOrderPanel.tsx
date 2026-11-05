import { useMemo, useState } from "react";
import { AlertTriangle, Download, Factory, FileText, Plus, QrCode, Trash2 } from "lucide-react";
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
import { resolveReferenceTechSheet } from "@/lib/techsheet/dpp-expedition";
import {
  buildBlindServiceOrderHtml,
  buildRemessaNfeXml400,
  computeServiceOrderMetrics,
  useOutsourcingStore,
  type ExternalServiceOrder,
  type ExternalServiceType,
} from "@/lib/techsheet/outsourcing-os";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { useOperationalRefs } from "@/lib/techsheet/use-operational-refs";

const STATUS_BADGE: Record<string, string> = {
  Concluída: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  "Retorno Parcial": "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-300",
  "Em Terceiro": "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300",
  "Alerta Quebra": "border-rose-500/40 bg-rose-500/15 text-rose-500",
};

export function OutsourcingServiceOrderPanel() {
  const { sheetsMap, codes: refOptions } = useOperationalRefs();
  const partners = useOutsourcingStore((s) => s.partners);
  const serviceOrders = useOutsourcingStore((s) => s.serviceOrders);
  const addServiceOrder = useOutsourcingStore((s) => s.addServiceOrder);
  const updateOrderReturns = useOutsourcingStore((s) => s.updateOrderReturns);
  const deleteServiceOrder = useOutsourcingStore((s) => s.deleteServiceOrder);

  const [isNewOpen, setIsNewOpen] = useState(false);
  const [qrZoom, setQrZoom] = useState<{ src: string; title: string; subtitle: string } | null>(
    null,
  );

  const servicePartners = useMemo(
    () =>
      partners.filter(
        (p) =>
          p.category === "Facção Costura" ||
          p.category === "Lavanderia & Beneficiamento" ||
          p.category === "Estamparia & Bordado",
      ),
    [partners],
  );

  const [draft, setDraft] = useState<{
    opNumber: string;
    refCode: string;
    partnerId: string;
    serviceType: ExternalServiceType;
    processRecipe: string;
    unitLaborBrl: string;
    lossTolerancePct: string;
    qtySent: string;
    dueDate: string;
  }>({
    opNumber: "OP-2026-120",
    refCode: "",
    partnerId: "11111111-1111-4111-8111-111111111111",
    serviceType: "Costura Externa",
    processRecipe: "Fechamento completo conforme BOP e peça-piloto lacrada; inspeção AQL 2.5.",
    unitLaborBrl: "6.50",
    lossTolerancePct: "1.5",
    qtySent: "360",
    dueDate: "2026-11-14",
  });

  const enrichedOrders = useMemo(() => {
    return serviceOrders.map((os) => {
      const partner = partners.find((p) => p.id === os.partnerId) ?? partners[0]!;
      const ref = resolveReferenceTechSheet(os.refCode, sheetsMap);
      const { doc } = ref;
      const metrics = computeServiceOrderMetrics(os, partner, doc);
      return { os, partner, doc, metrics, emitivel: ref.emitivel };
    });
  }, [serviceOrders, partners, sheetsMap]);

  const totals = useMemo(() => {
    return enrichedOrders.reduce(
      (acc, row) => {
        acc.piecesInThirdParty += row.metrics.balanceInThirdParty;
        acc.minutesAllocated += row.metrics.totalMinutesAllocated;
        acc.netPayableBrl += row.metrics.netPayableBrl;
        acc.glosaTotalBrl += row.metrics.penaltyGlosaBrl;
        return acc;
      },
      { piecesInThirdParty: 0, minutesAllocated: 0, netPayableBrl: 0, glosaTotalBrl: 0 },
    );
  }, [enrichedOrders]);

  const fmtBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  function handleCreateOs() {
    const qty = Math.max(1, Math.round(Number(draft.qtySent) || 0));
    if (!draft.refCode || !refOptions.includes(draft.refCode)) {
      toast.error("Selecione uma ficha técnica salva antes de emitir a Ordem de Serviço.");
      return;
    }
    const partnerId = draft.partnerId || servicePartners[0]?.id || partners[0]?.id || "";
    if (!partnerId) {
      toast.error("Cadastre ao menos uma facção ou lavanderia antes de emitir a OS.");
      return;
    }
    const nextNum = 44 + serviceOrders.length;
    const newOs: ExternalServiceOrder = {
      id: `os-${Date.now()}`,
      osNumber: `OS-2026-0${nextNum}`,
      opNumber: draft.opNumber.trim() || "OP-2026-120",
      refCode: draft.refCode,
      partnerId,
      serviceType: draft.serviceType,
      processRecipe: draft.processRecipe.trim() || "Conforme ficha técnica aprovada.",
      unitLaborBrl: Math.max(0.5, Number(draft.unitLaborBrl) || 5),
      lossTolerancePct: Math.max(0, Number(draft.lossTolerancePct) || 1.5),
      qtySent: qty,
      qtyReturnedFirst: 0,
      qtyReturnedSecond: 0,
      qtyLost: 0,
      issuedAt: "2026-11-03",
      dueDate: draft.dueDate || "2026-11-14",
    };
    addServiceOrder(newOs);
    setIsNewOpen(false);
    toast.success(`Ordem de Serviço ${newOs.osNumber} emitida e saldo remetido ao terceiro!`);
  }

  // Documento não sai sobre ficha não salva: o XML de remessa leva NCM e valor,
  // e a OS cega leva consumo e BOM.
  function bloqueiaDocumento(row: (typeof enrichedOrders)[number]): boolean {
    if (row.emitivel) return false;
    toast.error(
      `A referência ${row.os.refCode} não tem ficha salva — o documento sairia com dados de demonstração. Salve a ficha primeiro.`,
    );
    return true;
  }

  function exportRemessaXml(row: (typeof enrichedOrders)[number]) {
    if (bloqueiaDocumento(row)) return;
    const xml = buildRemessaNfeXml400(row.os, row.partner, row.doc);
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remessa-ind-${row.os.osNumber.toLowerCase()}-cfop-${row.metrics.cfopRemessa}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `XML NFe 4.00 de Remessa (CFOP ${row.metrics.cfopRemessa} · CST 50 Suspensão ICMS) exportado!`,
    );
  }

  function printBlindOs(row: (typeof enrichedOrders)[number]) {
    if (bloqueiaDocumento(row)) return;
    const html = buildBlindServiceOrderHtml(row.os, row.partner, row.doc);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir a Guia OS Cega A4.");
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
              <Factory className="h-4 w-4 text-primary" />
              Kardex de Terceirização · OS de Facção, Lavanderia & Remessa Fiscal (CFOP
              5901/5902/5124)
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Controle de peças remetidas vs. retornadas (1ª/2ª qualidade), apuração automática de
              glosa por quebra excedente, Guia OS Cega A4 e XML NFe 4.00 com suspensão de ICMS.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsNewOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Emitir OS Externa
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground block">
              Saldo em Terceiros
            </span>
            <strong className="font-mono text-base text-foreground">
              {totals.piecesInThirdParty.toLocaleString("pt-BR")} peças
            </strong>
            <span className="text-2xs text-muted-foreground block">fardos em industrialização</span>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground block">
              Carga SAM Alocada
            </span>
            <strong className="font-mono text-base text-primary">
              {Math.round(totals.minutesAllocated).toLocaleString("pt-BR")} min
            </strong>
            <span className="text-2xs text-muted-foreground block">capacidade externa tomada</span>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground block">
              Líquido Facções (1ª Qual.)
            </span>
            <strong className="font-mono text-base text-emerald-600 dark:text-emerald-400">
              {fmtBrl(totals.netPayableBrl)}
            </strong>
            <span className="text-2xs text-muted-foreground block">CFOP 5124 / 6124 apurado</span>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <span className="text-2xs uppercase text-muted-foreground block">
              Glosa Quebra Acima Franquia
            </span>
            <strong className="font-mono text-base text-rose-500">
              {fmtBrl(totals.glosaTotalBrl)}
            </strong>
            <span className="text-2xs text-muted-foreground block">desconto matéria-prima</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left">OS / OP / QR</th>
                <th className="p-2.5 text-left">Terceiro & Serviço</th>
                <th className="p-2.5 text-left">CFOP Fiscal</th>
                <th className="p-2.5 text-right">Remetido</th>
                <th className="p-2.5 text-right">Ret. 1ª Qual.</th>
                <th className="p-2.5 text-right">2ª Qual.</th>
                <th className="p-2.5 text-right">Perda</th>
                <th className="p-2.5 text-right">Saldo</th>
                <th className="p-2.5 text-right">Líquido / Glosa</th>
                <th className="p-2.5 text-right">Documentos</th>
              </tr>
            </thead>
            <tbody>
              {enrichedOrders.map((row) => {
                const { os, partner, doc, metrics } = row;
                return (
                  <tr key={os.id} className="border-t border-border/60 align-middle">
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setQrZoom({
                              src: metrics.qrSvgDataUrl,
                              title: `QR Rastreio Facção · ${os.osNumber}`,
                              subtitle: `${partner.name} · ${os.refCode} · CFOP ${metrics.cfopRemessa}/${metrics.cfopRetorno}`,
                            })
                          }
                          title="Ampliar QR da Ordem de Serviço"
                          className="h-9 w-9 shrink-0 rounded border border-border bg-white p-0.5 cursor-zoom-in hover:border-primary"
                        >
                          <img
                            src={metrics.qrSvgDataUrl}
                            alt={`QR ${os.osNumber}`}
                            className="h-full w-full object-contain"
                          />
                        </button>
                        <div>
                          <div className="font-mono font-bold text-primary">{os.osNumber}</div>
                          <div className="text-2xs text-muted-foreground font-mono">
                            {os.opNumber} · {os.refCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 max-w-[230px]">
                      <div className="font-semibold text-foreground truncate">{partner.name}</div>
                      <div className="text-2xs text-muted-foreground truncate">
                        {os.serviceType} · {doc.meta?.name || os.refCode}
                      </div>
                      <Badge
                        variant="outline"
                        className={`mt-1 text-[10px] ${STATUS_BADGE[metrics.status] ?? ""}`}
                      >
                        {metrics.status === "Alerta Quebra" && (
                          <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                        )}
                        {metrics.status}
                      </Badge>
                    </td>
                    <td className="p-2.5 font-mono text-2xs">
                      <div>Rem: {metrics.cfopRemessa}</div>
                      <div className="text-muted-foreground">
                        Ret: {metrics.cfopRetorno} / MO: {metrics.cfopCobranca}
                      </div>
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold">{os.qtySent}</td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        max={os.qtySent}
                        aria-label={`Retorno 1a qualidade ${os.osNumber}`}
                        value={os.qtyReturnedFirst}
                        onChange={(e) =>
                          updateOrderReturns(os.id, {
                            qtyReturnedFirst: Math.max(0, Math.round(Number(e.target.value) || 0)),
                            qtyReturnedSecond: os.qtyReturnedSecond,
                            qtyLost: os.qtyLost,
                          })
                        }
                        className="h-7 w-16 rounded border border-border bg-background px-1.5 text-right font-mono text-xs text-foreground"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Retorno 2a qualidade ${os.osNumber}`}
                        value={os.qtyReturnedSecond}
                        onChange={(e) =>
                          updateOrderReturns(os.id, {
                            qtyReturnedFirst: os.qtyReturnedFirst,
                            qtyReturnedSecond: Math.max(0, Math.round(Number(e.target.value) || 0)),
                            qtyLost: os.qtyLost,
                          })
                        }
                        className="h-7 w-14 rounded border border-border bg-background px-1.5 text-right font-mono text-xs text-foreground"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        aria-label={`Perda faccao ${os.osNumber}`}
                        value={os.qtyLost}
                        onChange={(e) =>
                          updateOrderReturns(os.id, {
                            qtyReturnedFirst: os.qtyReturnedFirst,
                            qtyReturnedSecond: os.qtyReturnedSecond,
                            qtyLost: Math.max(0, Math.round(Number(e.target.value) || 0)),
                          })
                        }
                        className="h-7 w-14 rounded border border-border bg-background px-1.5 text-right font-mono text-xs text-foreground"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-foreground">
                      {metrics.balanceInThirdParty} pç
                    </td>
                    <td className="p-2.5 text-right font-mono">
                      <div className="font-semibold text-foreground">
                        {fmtBrl(metrics.netPayableBrl)}
                      </div>
                      {metrics.penaltyGlosaBrl > 0 && (
                        <div className="text-[10px] text-rose-500">
                          Glosa -{fmtBrl(metrics.penaltyGlosaBrl)}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => printBlindOs(row)}
                          title="Imprimir Guia de OS Cega de Preço Comercial (A4)"
                          className="h-7 px-2 text-2xs gap-1"
                        >
                          <FileText className="h-3 w-3 text-primary" /> OS Cega
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => exportRemessaXml(row)}
                          title="Exportar XML NFe 4.00 de Remessa para Industrialização"
                          className="h-7 px-2 text-2xs gap-1"
                        >
                          <Download className="h-3 w-3 text-emerald-500" /> XML{" "}
                          {metrics.cfopRemessa}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            deleteServiceOrder(os.id);
                            toast.info(`OS ${os.osNumber} arquivada.`);
                          }}
                          title="Remover OS"
                          className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-4 w-4 text-primary" />
              Emitir Nova Ordem de Serviço Externa (Facção / Lavanderia)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Referência SKU</Label>
                <select
                  value={draft.refCode}
                  onChange={(e) => setDraft({ ...draft, refCode: e.target.value })}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                >
                  <option value="">Selecione uma ficha salva</option>
                  {refOptions.map((r) => (
                    <option key={r} value={r}>
                      {r} — {sheetsMap[r]?.meta?.name || r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">OP de Origem</Label>
                <Input
                  value={draft.opNumber}
                  onChange={(e) => setDraft({ ...draft, opNumber: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">
                  Terceiro Homologado
                </Label>
                <select
                  value={draft.partnerId}
                  onChange={(e) => setDraft({ ...draft, partnerId: e.target.value })}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.uf}) — {p.category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Tipo de Serviço</Label>
                <select
                  value={draft.serviceType}
                  onChange={(e) =>
                    setDraft({ ...draft, serviceType: e.target.value as ExternalServiceType })
                  }
                  className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
                >
                  <option value="Costura Externa">Costura Externa</option>
                  <option value="Lavanderia & Beneficiamento">Lavanderia & Beneficiamento</option>
                  <option value="Bordado & Estamparia">Bordado & Estamparia</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-2xs uppercase text-muted-foreground">
                Receita de Lavanderia / Instrução Operacional de Facção
              </Label>
              <Input
                value={draft.processRecipe}
                onChange={(e) => setDraft({ ...draft, processRecipe: e.target.value })}
                className="mt-1 h-9"
              />
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Qtd. Peças</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.qtySent}
                  onChange={(e) => setDraft({ ...draft, qtySent: e.target.value })}
                  className="mt-1 h-9 font-mono"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">M.O. R$/pç</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={draft.unitLaborBrl}
                  onChange={(e) => setDraft({ ...draft, unitLaborBrl: e.target.value })}
                  className="mt-1 h-9 font-mono"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Franquia %</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={draft.lossTolerancePct}
                  onChange={(e) => setDraft({ ...draft, lossTolerancePct: e.target.value })}
                  className="mt-1 h-9 font-mono"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground">Prazo</Label>
                <Input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                  className="mt-1 h-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOs}>Emitir OS & Gerar Remessa</Button>
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
              exportBaseName: "qr-ordem-servico-faccao",
            },
          ]}
        />
      )}
    </Card>
  );
}
