import { useMemo } from "react";
import { AlertTriangle, Copy, FileText, Tag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataProvenanceBadge } from "@/components/common/DataProvenanceBadge";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";
import {
  buildSeedingBonusDispatchHtml,
  linhasSeedingOperacionais,
  podeEmitirGuiaBonificacao,
  SEEDING_DEMO_BLOQUEIO,
  type CreatorAttributionRow,
} from "@/lib/influencers/seeding-attribution";
import { useInfluencersStore } from "@/lib/influencers/store";
import { brl } from "@/lib/sales/types";

export function SeedingAttributionPanel({ onRegistrar }: { onRegistrar: () => void }) {
  const influencers = useInfluencersStore((s) => s.influencers);

  // Onda 59: a vitrine não produz linha, número, cupom, CFOP nem guia A4.
  const rows = useMemo(
    () => linhasSeedingOperacionais(influencers, 199.9, 42.5, "SC"),
    [influencers],
  );
  const soVitrine = rows.length === 0;

  function printBonusDispatch(row: CreatorAttributionRow) {
    if (!podeEmitirGuiaBonificacao(row.influencer)) {
      toast.error(SEEDING_DEMO_BLOQUEIO);
      return;
    }
    const html = buildSeedingBonusDispatchHtml(row);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir a Guia de Bonificação CFOP 5910/6910.");
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
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Atribuição de Seeding (Cupom / UTM), ROAS Líquido & Remessa Bonificação CFOP 5910/6910
          </h3>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Apura ROAS descontando cachê + CMV industrial das peças enviadas e emite guia fiscal de
            bonificação/mostruário A4.
          </p>
          <div className="mt-1.5">
            <DataProvenanceBadge
              source={soVitrine ? "demonstracao" : "local"}
              detail={
                soVitrine
                  ? "só há creators de demonstração; nenhum número é apurado"
                  : "cachê e CMV vêm de campos do creator salvo"
              }
              data-testid="seeding-provenance"
            />
          </div>
        </div>

        {soVitrine && (
          <div
            data-testid="seeding-so-vitrine"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-muted-foreground"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p>
                <strong className="text-foreground">Atribuição de seeding não apurável.</strong> Só
                há creators de demonstração na vitrine: custo total, receita atribuída, ROAS, CAC e
                CFOP ficam em <strong className="text-foreground">—</strong>, e a Guia de Remessa
                Bonificação não é emitida. {SEEDING_DEMO_BLOQUEIO}
                <CtaProximoPasso
                  passo="campanha"
                  onAcao={onRegistrar}
                  label="Registrar creator real"
                  testId="cta-seeding-registrar-creator"
                />
              </p>
            </div>
          </div>
        )}

        {soVitrine ? (
          <p
            data-testid="seeding-sem-numero"
            className="rounded-lg border border-border/60 bg-background/60 p-4 text-center text-sm font-semibold text-muted-foreground"
          >
            — <span className="text-2xs font-normal">nenhuma linha apurável</span>
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/60">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-2xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2.5 text-left">Creator / UF</th>
                  <th className="p-2.5 text-left">Cupom & CFOP</th>
                  <th className="p-2.5 text-right">Custo Total (Fee + CMV)</th>
                  <th className="p-2.5 text-right">Receita Atribuída</th>
                  <th className="p-2.5 text-right">ROAS / CAC</th>
                  <th className="p-2.5 text-right">Expedição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((r) => {
                  const emitivel = podeEmitirGuiaBonificacao(r.influencer);
                  return (
                    <tr key={r.influencer.id}>
                      <td className="p-2.5">
                        <span className="font-semibold text-foreground block">
                          {r.influencer.nome}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {r.influencer.handle} · {r.influencer.uf}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="font-mono text-[10px] mr-1">
                          {r.couponCode}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          CFOP {r.cfopRemessa}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono">{brl(r.totalFeeAndCogsBrl)}</td>
                      <td className="p-2.5 text-right font-mono text-primary font-semibold">
                        {brl(r.attributedRevenueBrl)}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {r.roas.toFixed(2)}x
                        </span>{" "}
                        <span className="text-[10px] text-muted-foreground">
                          (CAC {brl(r.cacBrl)})
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              void navigator.clipboard?.writeText(r.utmLink);
                              toast.success(`Link UTM copiado: ${r.couponCode}`);
                            }}
                            className="h-7 px-2 text-2xs"
                            title="Copiar Link UTM"
                            aria-label={`Copiar link UTM de ${r.influencer.nome}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => printBonusDispatch(r)}
                            disabled={!emitivel}
                            title={emitivel ? "Imprimir guia A4" : SEEDING_DEMO_BLOQUEIO}
                            data-testid={`guia-seeding-${r.influencer.id}`}
                            className="h-7 text-2xs gap-1"
                          >
                            <FileText className="h-3 w-3 text-emerald-500" /> Guia {r.cfopRemessa}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
