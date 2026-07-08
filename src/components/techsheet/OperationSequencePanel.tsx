import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Clock, Users, Gauge, TrendingUp } from "lucide-react";
import { useTechSheetStore } from "@/lib/techsheet/store";

// SAM (Standard Allowed Minutes) por peça = soma dos tempos de todas as operações.
// Cronoanálise deriva capacidade diária e custo/min a partir do SAM.
const JORNADA_MIN = 480;    // 8h úteis
const EFICIENCIA = 0.75;    // 75% de eficiência real de fábrica
const COSTUREIRAS_DEFAULT = 8;

export function OperationSequencePanel({ refAtual }: { refAtual: string }) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const sheet = ensure(refAtual);

  const stats = useMemo(() => {
    const sam = sheet.bop.reduce((sum, s) => sum + (s.tempoMin || 0), 0);
    const custoOperacional = sheet.bop.reduce((sum, s) => sum + (s.custo || 0), 0);
    const capacidadeDiariaPorCosturera = sam > 0 ? (JORNADA_MIN * EFICIENCIA) / sam : 0;
    const capacidadeLinha = capacidadeDiariaPorCosturera * COSTUREIRAS_DEFAULT;
    const custoMin = sam > 0 ? custoOperacional / sam : 0;
    const gargalo = sheet.bop.reduce<{ etapa: string; tempoMin: number } | null>(
      (max, s) => (!max || s.tempoMin > max.tempoMin ? { etapa: s.etapa, tempoMin: s.tempoMin } : max),
      null,
    );
    return { sam, custoOperacional, capacidadeDiariaPorCosturera, capacidadeLinha, custoMin, gargalo };
  }, [sheet.bop]);

  const cards = [
    {
      icon: Clock,
      label: "SAM (min/peça)",
      value: stats.sam.toFixed(2),
      detail: `${sheet.bop.length} operações`,
    },
    {
      icon: TrendingUp,
      label: "Custo/min",
      value: `R$ ${stats.custoMin.toFixed(2)}`,
      detail: `Total: R$ ${stats.custoOperacional.toFixed(2)}`,
    },
    {
      icon: Users,
      label: "Capacidade linha/dia",
      value: Math.floor(stats.capacidadeLinha).toString(),
      detail: `${COSTUREIRAS_DEFAULT} costureiras · ${Math.round(EFICIENCIA * 100)}% eficiência`,
    },
    {
      icon: Gauge,
      label: "Gargalo",
      value: stats.gargalo ? `${stats.gargalo.tempoMin} min` : "—",
      detail: stats.gargalo?.etapa ?? "sem operações",
    },
  ];

  return (
    <Card className="glass-card rounded-lg p-6 space-y-4 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <Clock className="w-4 h-4 text-primary" /> Cronoanálise · SAM & Capacidade
        </h3>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
          Jornada {JORNADA_MIN}min · Efic. {Math.round(EFICIENCIA * 100)}%
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="p-4 rounded-md border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <c.icon className="w-3.5 h-3.5" />
              <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
                {c.label}
              </span>
            </div>
            <p className="text-lg font-bold text-white">{c.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{c.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
