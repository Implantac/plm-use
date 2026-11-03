import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, FileSpreadsheet, FileText, Layers, PackageCheck, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildCutOrderPrintableHtml, computeLayAndCutPlan } from "@/lib/techsheet/cut-order";
import { defaultColorwaysFor, seedFor, useTechSheetStore } from "@/lib/techsheet/store";

export function CuttingRoomPlanPanel() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const availableRefs = useMemo(() => {
    const base = ["DEV000006", "V24-001", "U25-014", "I25-088"];
    for (const k of Object.keys(sheetsMap)) {
      if (!base.includes(k)) base.push(k);
    }
    return base;
  }, [sheetsMap]);

  const [selectedRef, setSelectedRef] = useState("DEV000006");
  const doc = sheetsMap[selectedRef] ?? seedFor(selectedRef);
  const cws = doc.colorways?.length ? doc.colorways : defaultColorwaysFor();
  const [colorName, setColorName] = useState(cws[0]?.name ?? "Verde Brasil");
  const [totalPlies, setTotalPlies] = useState(140);
  const [maxPlies, setMaxPlies] = useState(60);
  const [endLossCm, setEndLossCm] = useState(4);
  const [ratio, setRatio] = useState<Record<string, number>>({
    PP: 0,
    P: 1,
    M: 2,
    G: 2,
    GG: 1,
  });

  const plan = useMemo(
    () =>
      computeLayAndCutPlan(doc, {
        markerRatio: ratio,
        totalPlies,
        maxPliesPerSpread: maxPlies,
        endLossCm,
        colorName,
      }),
    [doc, ratio, totalPlies, maxPlies, endLossCm, colorName],
  );

  function printCutOrder() {
    const html = buildCutOrderPrintableHtml(
      selectedRef,
      doc.meta?.name || selectedRef,
      colorName,
      plan,
    );
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para emitir a Ordem de Corte A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                  Ficha Técnica / Risco CAD
                </Label>
                <select
                  aria-label="Selecionar referência para plano de enfesto"
                  value={selectedRef}
                  onChange={(e) => {
                    const nextRef = e.target.value;
                    setSelectedRef(nextRef);
                    const nextDoc = sheetsMap[nextRef] ?? seedFor(nextRef);
                    setColorName(nextDoc.colorways?.[0]?.name ?? "Verde Brasil");
                  }}
                  className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground"
                >
                  {availableRefs.map((r) => (
                    <option key={r} value={r}>
                      {r} — {(sheetsMap[r] ?? seedFor(r)).meta?.name ?? r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                  Cor do Enfesto
                </Label>
                <Input
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  className="h-9 w-40 text-xs"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                  Folhas Totais
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={2000}
                  value={totalPlies}
                  onChange={(e) => setTotalPlies(Math.max(1, Number(e.target.value) || 60))}
                  className="h-9 w-24 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                  Máx. Folhas/Mesa
                </Label>
                <Input
                  type="number"
                  min={10}
                  max={250}
                  value={maxPlies}
                  onChange={(e) => setMaxPlies(Math.max(10, Number(e.target.value) || 60))}
                  className="h-9 w-28 font-mono text-xs"
                />
              </div>
              <div>
                <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                  Pontas (cm)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={endLossCm}
                  onChange={(e) => setEndLossCm(Math.max(0, Number(e.target.value) || 0))}
                  className="h-9 w-20 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                <Link to="/tech-sheet" search={{ ref: selectedRef } as never}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Ficha {selectedRef}
                </Link>
              </Button>
              <Button type="button" size="sm" onClick={printCutOrder} className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> Emitir Ordem de Corte A4
              </Button>
            </div>
          </div>

          {/* Proporção do Risco (Grade no Encaixe) */}
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">
                Proporção no Risco ({plan.pecasPorFolha} pçs/folha):
              </span>
              {Object.keys(ratio).map((sz) => (
                <label key={sz} className="flex items-center gap-1 text-xs">
                  <span className="font-mono font-semibold text-foreground">{sz}:</span>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    aria-label={`Proporção ${sz}`}
                    value={ratio[sz] ?? 0}
                    onChange={(e) =>
                      setRatio((prev) => ({
                        ...prev,
                        [sz]: Math.max(0, Math.round(Number(e.target.value) || 0)),
                      }))
                    }
                    className="h-7 w-12 rounded border border-border bg-background px-1.5 text-center font-mono text-xs text-foreground"
                  />
                </label>
              ))}
            </div>
            {plan.descansoMalhaHoras > 0 && (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-2xs gap-1"
              >
                <Clock className="h-3 w-3" /> Descanso Obrigatório Elastano:{" "}
                {plan.descansoMalhaHoras}h antes do enfesto
              </Badge>
            )}
          </div>

          {/* KPIs Sala de Corte */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <span className="text-2xs uppercase text-muted-foreground">
                Mesa (Risco + Pontas)
              </span>
              <strong className="font-mono text-base text-foreground block mt-0.5">
                {plan.comprimentoMesaM.toFixed(2)} m × {plan.larguraEnfestoM.toFixed(2)} m
              </strong>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <span className="text-2xs uppercase text-muted-foreground">Mesas de Enfesto</span>
              <strong className="font-mono text-base text-primary block mt-0.5">
                {plan.spreads.length} mesas ({plan.totalFolhas} folhas)
              </strong>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <span className="text-2xs uppercase text-muted-foreground">Peças Cortadas</span>
              <strong className="font-mono text-base text-foreground block mt-0.5">
                {plan.totalPecasCortadas} pçs
              </strong>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <span className="text-2xs uppercase text-muted-foreground">Consumo Linear Total</span>
              <strong className="font-mono text-base text-foreground block mt-0.5">
                {plan.metragemLinearTotalM.toFixed(1)} m
              </strong>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
              <span className="text-2xs uppercase text-primary">Malha Requerida (kg)</span>
              <strong className="font-mono text-base text-primary block mt-0.5">
                {plan.pesoTotalMalhaKg.toFixed(2)} kg
              </strong>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <Card className="border-border bg-card p-4 space-y-3 h-fit">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Divisão Física de Mesas / Enfestos
          </h3>
          <div className="space-y-2">
            {plan.spreads.map((s) => (
              <div
                key={s.spreadNumber}
                className="flex items-center justify-between rounded-md border border-border/70 bg-muted/30 p-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    Mesa / Enfesto #{s.spreadNumber} ({s.plies} folhas)
                  </p>
                  <p className="text-2xs text-muted-foreground font-mono">
                    {s.linearMeters.toFixed(1)} m · {s.weightKg.toFixed(2)} kg
                  </p>
                </div>
                <Badge variant="outline" className="font-mono">
                  {s.piecesCut} pçs
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border/70 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" />
              Mapa de Pacotes / Fardos Numerados p/ Costura ({plan.bundles.length} fardos)
            </span>
            <span className="text-2xs text-muted-foreground flex items-center gap-1">
              <Scissors className="h-3 w-3" /> Rastreabilidade anti-mistura de folhas
            </span>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground sticky top-0">
                <tr>
                  <th className="p-2.5 text-left">Código Fardo</th>
                  <th className="p-2.5 text-left">Origem</th>
                  <th className="p-2.5 text-left">Tamanho</th>
                  <th className="p-2.5 text-left">Cor</th>
                  <th className="p-2.5 text-left">Sequência Folhas</th>
                  <th className="p-2.5 text-right">Peças</th>
                </tr>
              </thead>
              <tbody>
                {plan.bundles.map((b) => (
                  <tr key={b.bundleCode} className="border-t border-border/60">
                    <td className="p-2.5 font-mono font-semibold text-primary">{b.bundleCode}</td>
                    <td className="p-2.5 text-muted-foreground">Enfesto #{b.spreadNumber}</td>
                    <td className="p-2.5 font-bold text-foreground">{b.size}</td>
                    <td className="p-2.5 text-muted-foreground">{b.colorName}</td>
                    <td className="p-2.5 font-mono text-xs">Folhas {b.plyRange}</td>
                    <td className="p-2.5 text-right font-mono font-semibold">{b.qtyPieces} pçs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
