import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ShieldCheck, Clock, DollarSign, Star, Gauge } from "lucide-react";
import { computePartnerMetrics, useOutsourcingStore } from "@/lib/techsheet/outsourcing-os";
import { useTechSheetStore } from "@/lib/techsheet/store";

const tierStyle = (tier: "A+" | "A" | "B" | "C") =>
  tier === "A+"
    ? "text-status-approved border-status-approved/40 bg-status-approved/10"
    : tier === "A"
      ? "text-primary border-primary/40 bg-primary/10"
      : tier === "B"
        ? "text-status-progress border-status-progress/40 bg-status-progress/10"
        : "text-status-rejected border-status-rejected/40 bg-status-rejected/10";

export function SupplierScoreboard() {
  const partners = useOutsourcingStore((s) => s.partners);
  const serviceOrders = useOutsourcingStore((s) => s.serviceOrders);
  const sheetsMap = useTechSheetStore((s) => s.data);

  const rows = useMemo(() => {
    return partners
      .map((p) => ({
        partner: p,
        metrics: computePartnerMetrics(p, serviceOrders, sheetsMap),
      }))
      .sort((a, b) => b.metrics.overallScore - a.metrics.overallScore);
  }, [partners, serviceOrders, sheetsMap]);

  return (
    <Card className="glass-card rounded-xl p-6 space-y-5 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-3">
          <Trophy className="w-4 h-4 text-primary" /> Ranking Homologado ABVTEX · Qualidade AQL ·
          OTIF · Capacidade Tomada
        </h3>
        <Badge variant="outline" className="text-2xs font-mono">
          {rows.length} parceiros auditados
        </Badge>
      </div>
      <div className="rounded-lg border border-border/60 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-border/60 bg-muted/50 text-2xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Parceiro Industrial</th>
              <th className="px-4 py-3">Especialidade</th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Qualidade AQL
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> OTIF
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Custo
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Ocupação SAM
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" /> Confiab.
                </span>
              </th>
              <th className="px-4 py-3 text-right">Score / Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 text-xs text-foreground">
            {rows.map(({ partner: r, metrics: m }) => (
              <tr key={r.id} className="hover:bg-accent/50">
                <td className="px-4 py-3">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-2xs text-muted-foreground font-mono">
                    {r.city}/{r.uf} · {r.compliance}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                <td className="px-4 py-3 font-mono">{r.qualityScore}%</td>
                <td className="px-4 py-3 font-mono">{r.otifScore}%</td>
                <td className="px-4 py-3 font-mono">{r.costScore}%</td>
                <td className="px-4 py-3 font-mono">
                  {r.category === "Tecelagem & Malharia" || r.category === "Aviamentos"
                    ? "Insumo"
                    : `${m.capacityUtilizationPct}% (${m.piecesInPossession} pç)`}
                </td>
                <td className="px-4 py-3 font-mono">{r.reliabilityScore}%</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold border ${tierStyle(m.tier)}`}
                  >
                    {m.overallScore} · {m.tier}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
