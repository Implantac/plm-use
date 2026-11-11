import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, Megaphone, Target, AlertTriangle } from "lucide-react";
import { lotesOperacionais, usePCPStore } from "@/lib/pcp/store";
import { useInfluencersStore } from "@/lib/influencers/store";
import { CtaProximoPasso } from "@/components/onboarding/CtaProximoPasso";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Investimento de marketing simulado por coleção (consome bases existentes).
const INVEST_BASE: Record<string, number> = {
  "Alto Verão 2026": 185000,
  "Pré-Verão 2026": 92000,
};

export function CollectionROI() {
  // Onda 53: os 4 lotes do seed são `demo: true` (Onda 40). Antes este painel
  // lia `s.lotes` direto e apurava receita/ROI/ROAS sobre a vitrine.
  const lotesTodos = usePCPStore((s) => s.lotes);
  const lotes = useMemo(() => lotesOperacionais(lotesTodos), [lotesTodos]);
  const influencers = useInfluencersStore((s) => s.influencers);

  const rows = useMemo(() => {
    const colMap = new Map<string, { peças: number; produzidas: number; refs: Set<string> }>();
    for (const l of lotes) {
      const k = l.colecao ?? "—";
      if (!colMap.has(k)) colMap.set(k, { peças: 0, produzidas: 0, refs: new Set() });
      const c = colMap.get(k)!;
      for (const r of l.referencias) {
        c.peças += r.qtd_programada;
        c.produzidas += r.qtd_produzida;
        c.refs.add(r.ref);
      }
    }

    return [...colMap.entries()].map(([colecao, d]) => {
      const ticketMedio = 320;
      const receita = d.produzidas * ticketMedio;
      const custoIndustrial = d.produzidas * 84;
      const invest = INVEST_BASE[colecao] ?? 50000;
      const investInfluencer = influencers.reduce(
        (a, i) => a + i.envios.filter((e) => d.refs.has(e.ref)).length * i.custoMedio,
        0,
      );
      const investTotal = invest + investInfluencer;
      const lucro = receita - custoIndustrial - investTotal;
      const roi = investTotal > 0 ? (lucro / investTotal) * 100 : 0;
      const roas = investTotal > 0 ? receita / investTotal : 0;
      return {
        colecao,
        ...d,
        receita,
        custoIndustrial,
        invest,
        investInfluencer,
        investTotal,
        lucro,
        roi,
        roas,
      };
    });
  }, [lotes, influencers]);

  const apuravel = rows.length > 0;

  return (
    <Card className="glass-card rounded-lg p-6 space-y-5 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-white flex items-center gap-3">
          <Target className="w-4 h-4 text-primary" /> ROI por Coleção · valeu a pena investir?
        </h3>
        <span className="text-2xs text-muted-foreground uppercase tracking-widest">
          Cruza PCP × Marketing × Influencers
        </span>
      </div>
      <p className="text-2xs text-muted-foreground leading-snug">
        Estimativa sobre lotes salvos: receita a ticket médio de referência R$ 320, custo industrial
        R$ 84/peça e investimento de marketing de referência. Não é dado de BI nem apuração fiscal.
      </p>
      {!apuravel && (
        <div
          data-testid="roi-sem-lote"
          className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
        >
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            <strong className="text-foreground">ROI por coleção não apurável.</strong> Só há lotes
            de demonstração na vitrine: produzidas, receita, investimento, lucro, ROI e ROAS ficam
            em <strong className="text-foreground">—</strong>, não em números de fábrica. Registre
            um lote/OP real para apurar.
            <CtaProximoPasso
              passo="pedido"
              label="Ir para pedidos e OPs"
              testId="cta-roi-sem-lote"
            />
          </p>
        </div>
      )}
      {apuravel && (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-border/60 bg-muted/50 text-2xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Coleção</th>
                <th className="px-4 py-3">Refs</th>
                <th className="px-4 py-3">Produzidas</th>
                <th className="px-4 py-3">Receita</th>
                <th className="px-4 py-3">Investimento</th>
                <th className="px-4 py-3">Lucro</th>
                <th className="px-4 py-3">ROI</th>
                <th className="px-4 py-3">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 text-xs text-white">
              {rows.map((r) => (
                <tr key={r.colecao} className="hover:bg-accent/50">
                  <td className="px-4 py-3 font-semibold">{r.colecao}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.refs.size}</td>
                  <td className="px-4 py-3">{r.produzidas.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-3 text-status-approved">{brl(r.receita)}</td>
                  <td
                    className="px-4 py-3 text-status-progress"
                    title={`Marketing ${brl(r.invest)} · Influencers ${brl(r.investInfluencer)}`}
                  >
                    {brl(r.investTotal)}
                  </td>
                  <td
                    className={`px-4 py-3 font-semibold ${r.lucro >= 0 ? "text-status-approved" : "text-status-rejected"}`}
                  >
                    {brl(r.lucro)}
                  </td>
                  <td
                    className={`px-4 py-3 font-semibold ${r.roi >= 0 ? "text-status-approved" : "text-status-rejected"}`}
                  >
                    {r.roi.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-primary font-bold">{r.roas.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border/60">
        <KpiTile
          icon={<DollarSign />}
          label="Receita total"
          value={apuravel ? brl(rows.reduce((a, r) => a + r.receita, 0)) : "—"}
        />
        <KpiTile
          icon={<Megaphone />}
          label="Investido"
          value={apuravel ? brl(rows.reduce((a, r) => a + r.investTotal, 0)) : "—"}
          accent
        />
        <KpiTile
          icon={<TrendingUp />}
          label="Lucro acumulado"
          value={apuravel ? brl(rows.reduce((a, r) => a + r.lucro, 0)) : "—"}
          positive
        />
      </div>
    </Card>
  );
}

function KpiTile({
  icon,
  label,
  value,
  accent,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border p-3 ${accent ? "border-status-progress/30 bg-status-progress/5" : positive ? "border-status-approved/30 bg-status-approved/5" : "border-border bg-muted/40"}`}
    >
      <div
        className={`w-9 h-9 rounded-md flex items-center justify-center ${accent ? "bg-status-progress/10 text-status-progress" : positive ? "bg-status-approved/10 text-status-approved" : "bg-primary/10 text-primary"}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xs uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
