import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, Megaphone, Target } from "lucide-react";
import { usePCPStore } from "@/lib/pcp/store";
import { useInfluencersStore } from "@/lib/influencers/store";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Investimento de marketing simulado por coleção (consome bases existentes).
const INVEST_BASE: Record<string, number> = {
  "Alto Verão 2026": 185000,
  "Pré-Verão 2026": 92000,
};

export function CollectionROI() {
  const lotes = usePCPStore((s) => s.lotes);
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
      const investInfluencer = influencers.reduce((a, i) => a + i.envios.filter((e) => d.refs.has(e.ref)).length * i.custoMedio, 0);
      const investTotal = invest + investInfluencer;
      const lucro = receita - custoIndustrial - investTotal;
      const roi = investTotal > 0 ? (lucro / investTotal) * 100 : 0;
      const roas = investTotal > 0 ? receita / investTotal : 0;
      return { colecao, ...d, receita, custoIndustrial, invest, investInfluencer, investTotal, lucro, roi, roas };
    });
  }, [lotes, influencers]);

  return (
    <Card className="glass-card rounded-lg p-6 space-y-5 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <Target className="w-4 h-4 text-primary" /> ROI por Coleção · valeu a pena investir?
        </h3>
        <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Cruza PCP × Marketing × Influencers</span>
      </div>
      <div className="rounded-lg border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Coleção</th><th className="px-4 py-3">Refs</th>
              <th className="px-4 py-3">Produzidas</th><th className="px-4 py-3">Receita</th>
              <th className="px-4 py-3">Investimento</th><th className="px-4 py-3">Lucro</th>
              <th className="px-4 py-3">ROI</th><th className="px-4 py-3">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px] text-white">
            {rows.map((r) => (
              <tr key={r.colecao} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-bold">{r.colecao}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.refs.size}</td>
                <td className="px-4 py-3">{r.produzidas.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3 text-emerald-400">{brl(r.receita)}</td>
                <td className="px-4 py-3 text-amber-300" title={`Marketing ${brl(r.invest)} · Influencers ${brl(r.investInfluencer)}`}>{brl(r.investTotal)}</td>
                <td className={`px-4 py-3 font-bold ${r.lucro >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{brl(r.lucro)}</td>
                <td className={`px-4 py-3 font-bold ${r.roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.roi.toFixed(0)}%</td>
                <td className="px-4 py-3 text-primary font-bold">{r.roas.toFixed(2)}×</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/5">
        <KpiTile icon={<DollarSign />} label="Receita total" value={brl(rows.reduce((a, r) => a + r.receita, 0))} />
        <KpiTile icon={<Megaphone />} label="Investido" value={brl(rows.reduce((a, r) => a + r.investTotal, 0))} accent />
        <KpiTile icon={<TrendingUp />} label="Lucro acumulado" value={brl(rows.reduce((a, r) => a + r.lucro, 0))} positive />
      </div>
    </Card>
  );
}

function KpiTile({ icon, label, value, accent, positive }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; positive?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-md border p-3 ${accent ? "border-amber-500/30 bg-amber-500/5" : positive ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]"}`}>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center ${accent ? "bg-amber-500/10 text-amber-300" : positive ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"}`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
