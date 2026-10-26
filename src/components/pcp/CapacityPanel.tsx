import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Gauge, BarChart3, CalendarRange } from "lucide-react";
import { usePCPStore } from "@/lib/pcp/store";
import { SETORES_PCP, pendenteReferencia, type Lote, type SetorPCP } from "@/types/pcp";

// Capacidade diária mock (pç/dia) por setor.
const CAPACIDADE: Record<SetorPCP, number> = {
  Compras: 999_999,
  CAD: 400,
  Corte: 800,
  Silk: 350,
  Costura: 600,
  Bordado: 250,
  Sublimação: 320,
  Acabamento: 700,
  Expedição: 1200,
  Terceirizados: 250,
};

/**
 * `lotes` é injetado pela página quando existem OPs reais no banco. Sem ele, cai
 * no store de demonstração — a capacidade (pç/dia) continua mock e declarada.
 */
export function CapacityPanel({ lotes: injected }: { lotes?: Lote[] } = {}) {
  const storeLotes = usePCPStore((s) => s.lotes);
  const lotes = injected ?? storeLotes;

  const data = useMemo(() => {
    const fila = Object.fromEntries(SETORES_PCP.map((s) => [s, 0])) as Record<SetorPCP, number>;
    for (const l of lotes)
      for (const r of l.referencias) fila[r.setor_atual] += pendenteReferencia(r);
    return SETORES_PCP.filter((s) => s !== "Compras").map((s) => {
      const demanda = fila[s];
      const capDia = CAPACIDADE[s];
      const diasNecessarios = Math.ceil(demanda / Math.max(capDia, 1));
      const ocupacao = Math.min(100, Math.round((demanda / Math.max(capDia, 1)) * 100));
      return { setor: s, demanda, capDia, diasNecessarios, ocupacao };
    });
  }, [lotes]);

  const gantt = useMemo(() => {
    const hoje = new Date();
    return lotes.map((l) => {
      const ini = new Date(l.data_abertura);
      const fim = new Date(l.data_prevista);
      const totalDias = Math.max(1, Math.round((fim.getTime() - ini.getTime()) / 86400000));
      const decorrido = Math.max(0, Math.round((hoje.getTime() - ini.getTime()) / 86400000));
      const progresso = Math.min(100, (decorrido / totalDias) * 100);
      const produzido = l.referencias.reduce((a, r) => a + r.qtd_produzida, 0);
      const programado = l.referencias.reduce((a, r) => a + r.qtd_programada, 0);
      const real = programado > 0 ? (produzido / programado) * 100 : 0;
      const atraso = real < progresso - 10;
      return {
        lote: l.numero,
        grupo: l.grupo,
        ini: l.data_abertura,
        fim: l.data_prevista,
        progresso,
        real,
        atraso,
      };
    });
  }, [lotes]);

  return (
    <Card className="glass-card rounded-lg p-6 space-y-6 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-white flex items-center gap-3">
          <Gauge className="w-4 h-4 text-primary" /> Capacidade vs Demanda + Gantt
        </h3>
        <span className="text-[11px] uppercase text-muted-foreground tracking-widest">
          Simulação · pç/dia
        </span>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.05em] text-white flex items-center gap-2 mb-3">
          <BarChart3 className="w-3.5 h-3.5 text-primary" /> Ocupação por setor
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((d) => (
            <div key={d.setor} className="p-3 rounded-md border border-white/10 bg-white/[0.02]">
              <div className="flex justify-between text-[11px] mb-2">
                <span className="text-white font-bold uppercase tracking-widest">{d.setor}</span>
                <span
                  className={`font-bold ${d.ocupacao > 100 ? "text-status-rejected" : d.ocupacao > 80 ? "text-status-progress" : "text-status-approved"}`}
                >
                  {d.ocupacao}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full ${d.ocupacao > 100 ? "bg-status-rejected/70" : d.ocupacao > 80 ? "bg-status-progress/70" : "bg-status-approved/70"}`}
                  style={{ width: `${Math.min(d.ocupacao, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground uppercase tracking-widest">
                {d.demanda} pç · {d.capDia}/dia · {d.diasNecessarios}d
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.05em] text-white flex items-center gap-2 mb-3">
          <CalendarRange className="w-3.5 h-3.5 text-primary" /> Gantt · planejado vs real
        </h4>
        <div className="space-y-2">
          {gantt.map((g) => (
            <div key={g.lote} className="p-3 rounded-md border border-white/5 bg-white/[0.02]">
              <div className="flex justify-between text-[11px] mb-2">
                <span className="text-white font-bold">
                  {g.lote} <span className="text-muted-foreground font-normal">· {g.grupo}</span>
                </span>
                <span className="text-muted-foreground">
                  {g.ini} → {g.fim}
                </span>
              </div>
              <div className="relative h-3 rounded-md bg-white/5 overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-white/10"
                  style={{ width: `${g.progresso}%` }}
                />
                <div
                  className={`absolute inset-y-0 ${g.atraso ? "bg-status-rejected/60" : "bg-primary/70"}`}
                  style={{ width: `${g.real}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] mt-1 uppercase tracking-widest">
                <span className="text-muted-foreground">Tempo: {g.progresso.toFixed(0)}%</span>
                <span
                  className={g.atraso ? "text-status-rejected font-bold" : "text-primary font-bold"}
                >
                  Real: {g.real.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
