import { useMemo, useState } from "react";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Droplets,
  FileSpreadsheet,
  Leaf,
  Printer,
  QrCode,
  Recycle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import {
  buildDppPrintableHtml,
  computeDigitalProductPassport,
  dppRequirements,
  DPP_PENDENCIA_LABEL,
  resolveReferenceTechSheet,
  type DigitalProductPassport,
} from "@/lib/techsheet/dpp-expedition";
import { useTechSheetStore } from "@/lib/techsheet/store";

const GRADE_STYLE: Record<"A" | "B" | "C" | "D", string> = {
  A: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  B: "border-teal-500/40 bg-teal-500/15 text-teal-600 dark:text-teal-300",
  C: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300",
  D: "border-rose-500/40 bg-rose-500/15 text-rose-500",
};

export function DppPassportPanel() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const [qrZoom, setQrZoom] = useState<{ src: string; title: string; subtitle: string } | null>(
    null,
  );

  // Só ficha salva vira passaporte. Antes, a lista plantava quatro referências
  // de demonstração e emitia DPP sobre elas — NCM, composição e pegada de
  // carbono inventados num documento que vai ao consumidor.
  const { emitidos, naoEmitidos } = useMemo(() => {
    const em: DigitalProductPassport[] = [];
    const nao: { refCode: string; motivo: string }[] = [];
    for (const refCode of Object.keys(sheetsMap)) {
      const ref = resolveReferenceTechSheet(refCode, sheetsMap);
      const dpp = computeDigitalProductPassport(ref);
      if (dpp) em.push(dpp);
      else {
        const pendencias = dppRequirements(ref).pendencias;
        nao.push({
          refCode,
          // Antes dizia só "modelo"/"demonstração" mesmo quando a ficha estava
          // salva e faltava NCM ou composição. Agora diz exatamente o que falta.
          motivo: pendencias.map((x) => DPP_PENDENCIA_LABEL[x]).join(" · "),
        });
      }
    }
    return { emitidos: em, naoEmitidos: nao };
  }, [sheetsMap]);

  function printDpp(p: DigitalProductPassport) {
    const html = buildDppPrintableHtml(p);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o Certificado DPP A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <Card className="border-border bg-card mb-6">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-500" />
              Passaporte Digital do Produto (DPP · ESG Têxtil & QR Rastreabilidade)
            </h3>
            <p className="text-2xs text-muted-foreground mt-0.5">
              Pegada de carbono (kg CO₂e), consumo hídrico, circularidade de fibras ABNT e QR
              vetorial por referência.
            </p>
          </div>
          <Badge variant="outline" className="text-2xs gap-1">
            <QrCode className="h-3 w-3 text-primary" /> Norma EU ESPR / ABNT 2026
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {emitidos.map((p) => (
            <div
              key={p.refCode}
              className="rounded-lg border border-border/80 bg-muted/30 p-3 flex flex-col justify-between gap-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-2xs text-primary">
                    {p.refCode} · {p.version}
                  </span>
                  <h4 className="text-xs font-semibold text-foreground truncate">{p.refName}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{p.compositionText}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setQrZoom({
                      src: p.qrSvgDataUrl,
                      title: `QR Passaporte Digital · ${p.refCode}`,
                      subtitle: `${p.traceabilityUri} · Rating ESG ${p.esgGrade}`,
                    })
                  }
                  title="Clique para ampliar QR Code DPP"
                  className="h-12 w-12 shrink-0 rounded border border-border bg-white p-0.5 cursor-zoom-in hover:border-primary transition"
                >
                  <img
                    src={p.qrSvgDataUrl}
                    alt={`QR DPP ${p.refCode}`}
                    className="h-full w-full object-contain"
                  />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <div className="rounded bg-background/80 border border-border/60 p-1.5">
                  <span className="text-[9px] uppercase text-muted-foreground block">CO₂e/pç</span>
                  <strong className="font-mono text-foreground">{p.carbonKgCo2e} kg</strong>
                </div>
                <div className="rounded bg-background/80 border border-border/60 p-1.5">
                  <span className="text-[9px] uppercase text-muted-foreground flex items-center gap-0.5">
                    <Droplets className="h-2.5 w-2.5 text-sky-400" /> Água
                  </span>
                  <strong className="font-mono text-foreground">{p.waterLiters} L</strong>
                </div>
                <div className="rounded bg-background/80 border border-border/60 p-1.5">
                  <span className="text-[9px] uppercase text-muted-foreground flex items-center gap-0.5">
                    <Recycle className="h-2.5 w-2.5 text-emerald-400" /> Circ.
                  </span>
                  <strong className="font-mono text-foreground">{p.circularityScore}/100</strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <Badge variant="outline" className={`text-[10px] ${GRADE_STYLE[p.esgGrade]}`}>
                  ESG {p.esgGrade} · {p.pieceWeightGrams}g
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => printDpp(p)}
                    title={`Imprimir Certificado DPP A4 (${p.refCode})`}
                    className="h-6 px-1.5 text-2xs gap-1"
                  >
                    <Printer className="h-3 w-3 text-emerald-500" /> DPP A4
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    asChild
                    className="h-6 px-2 text-2xs gap-1"
                  >
                    <Link to="/tech-sheet" search={{ ref: p.refCode } as never}>
                      <FileSpreadsheet className="h-3 w-3 text-primary" /> Ficha
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {emitidos.length === 0 && (
            <div
              data-testid="dpp-sem-ficha"
              className="md:col-span-2 xl:col-span-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300"
            >
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Nenhum passaporte a emitir
              </p>
              <p className="mt-1 leading-snug">
                O DPP declara composição, NCM e métricas ESG ao consumidor. Só uma ficha
                <strong className="font-semibold"> salva por você</strong> pode gerar o documento —
                o modelo de demonstração não assina nada. Abra a Ficha Técnica, preencha a
                etiquetagem (NCM e composição ABNT) e salve.
              </p>
              <CtaProximoPasso passo="ficha" label="Abrir Referências" testId="cta-dpp-sem-ficha" />
            </div>
          )}
        </div>

        {naoEmitidos.length > 0 && (
          <p
            data-testid="dpp-nao-emitidos"
            className="mt-3 text-2xs text-muted-foreground leading-snug"
          >
            Fora do passaporte ({naoEmitidos.length}):{" "}
            {naoEmitidos
              .map((n) => `${n.refCode} (${n.motivo})`)
              .slice(0, 8)
              .join(" · ")}
            {naoEmitidos.length > 8 ? " …" : ""}
          </p>
        )}
      </CardContent>

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
              exportBaseName: "qr-dpp-passaporte",
            },
          ]}
        />
      )}
    </Card>
  );
}
