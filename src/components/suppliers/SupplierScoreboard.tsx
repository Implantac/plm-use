import { Card } from "@/components/ui/card";
import { Trophy, ShieldCheck, Clock, DollarSign, Star } from "lucide-react";

type ScoreRow = {
  fornecedor: string;
  segmento: string;
  qualidade: number; // 0-100
  prazo: number;
  custo: number;
  confiabilidade: number;
};

const ROWS: ScoreRow[] = [
  {
    fornecedor: "Têxtil Camargo",
    segmento: "Tecidos",
    qualidade: 92,
    prazo: 88,
    custo: 78,
    confiabilidade: 90,
  },
  {
    fornecedor: "Aviamentos Real",
    segmento: "Aviamentos",
    qualidade: 95,
    prazo: 82,
    custo: 85,
    confiabilidade: 88,
  },
  {
    fornecedor: "Coats Corrente",
    segmento: "Linhas",
    qualidade: 90,
    prazo: 94,
    custo: 80,
    confiabilidade: 92,
  },
  {
    fornecedor: "EmbalaPlus",
    segmento: "Embalagem",
    qualidade: 84,
    prazo: 90,
    custo: 88,
    confiabilidade: 80,
  },
  {
    fornecedor: "Facção Bordados Vale",
    segmento: "Bordado",
    qualidade: 76,
    prazo: 70,
    custo: 92,
    confiabilidade: 72,
  },
];

const overall = (r: ScoreRow) =>
  Math.round(r.qualidade * 0.35 + r.prazo * 0.3 + r.custo * 0.15 + r.confiabilidade * 0.2);

const tier = (s: number) =>
  s >= 90
    ? { label: "A+", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" }
    : s >= 80
      ? { label: "A", color: "text-primary border-primary/40 bg-primary/10" }
      : s >= 70
        ? { label: "B", color: "text-amber-300 border-amber-500/40 bg-amber-500/10" }
        : { label: "C", color: "text-rose-400 border-rose-500/40 bg-rose-500/10" };

export function SupplierScoreboard() {
  const sorted = [...ROWS].sort((a, b) => overall(b) - overall(a));
  return (
    <Card className="glass-card rounded-lg p-6 space-y-5 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <Trophy className="w-4 h-4 text-primary" /> Score de Fornecedores · qualidade · prazo ·
          custo · confiabilidade
        </h3>
      </div>
      <div className="rounded-lg border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-white/5 bg-white/5 text-[9px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Segmento</th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Qualidade
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Prazo
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Custo
                </span>
              </th>
              <th className="px-4 py-3">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" /> Confiab.
                </span>
              </th>
              <th className="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-[11px] text-white">
            {sorted.map((r) => {
              const s = overall(r);
              const t = tier(s);
              return (
                <tr key={r.fornecedor} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-bold">{r.fornecedor}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.segmento}</td>
                  <td className="px-4 py-3">
                    <Mini value={r.qualidade} />
                  </td>
                  <td className="px-4 py-3">
                    <Mini value={r.prazo} />
                  </td>
                  <td className="px-4 py-3">
                    <Mini value={r.custo} />
                  </td>
                  <td className="px-4 py-3">
                    <Mini value={r.confiabilidade} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border text-[10px] font-bold ${t.color}`}
                    >
                      {t.label} · {s}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Mini({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full ${value >= 85 ? "bg-emerald-500/70" : value >= 75 ? "bg-primary/70" : "bg-amber-500/70"}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] text-white font-bold w-6">{value}</span>
    </div>
  );
}
