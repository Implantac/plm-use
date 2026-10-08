import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { percentualLote, type Lote } from "@/types/pcp";

/**
 * Gantt SVG puro de lotes: data_abertura → data_prevista.
 * Cor pela prioridade, barra interna pelo % concluído.
 * Não destrutivo: apenas leitura do PCP store.
 */
export function LotesGantt({
  lotes,
  onSelectLote,
}: {
  lotes: Lote[];
  onSelectLote?: (l: Lote) => void;
}) {
  const { rows, start, end, totalDays, today } = useMemo(() => {
    const now = Date.now();
    const starts = lotes.map((l) => new Date(l.data_abertura).getTime());
    const ends = lotes.map((l) => new Date(l.data_prevista).getTime());
    const start = Math.min(...starts, now);
    const end = Math.max(...ends, now);
    const totalDays = Math.max(1, Math.ceil((end - start) / 86400000));
    const rows = lotes
      .map((l) => {
        const s = new Date(l.data_abertura).getTime();
        const e = new Date(l.data_prevista).getTime();
        return { lote: l, s, e };
      })
      .sort((a, b) => a.s - b.s);
    return { rows, start, end, totalDays, today: now };
  }, [lotes]);

  if (lotes.length === 0) {
    return (
      <Card className="glass-card rounded-lg p-6">
        <p className="text-[11px] text-muted-foreground">Sem lotes para exibir.</p>
      </Card>
    );
  }

  const W = 1000;
  const ROW_H = 32;
  const LABEL_W = 180;
  const chartW = W - LABEL_W;
  const H = rows.length * ROW_H + 40;

  const xOf = (ts: number) => LABEL_W + ((ts - start) / (end - start || 1)) * chartW;

  // marcas mensais
  const months: { x: number; label: string }[] = [];
  const d = new Date(start);
  d.setDate(1);
  while (d.getTime() <= end) {
    months.push({
      x: xOf(d.getTime()),
      label: d.toLocaleDateString("pt-BR", { month: "short" }),
    });
    d.setMonth(d.getMonth() + 1);
  }

  const colorByPrio: Record<string, string> = {
    Urgente: "#f43f5e",
    Alta: "#fb923c",
    Média: "#3b82f6",
    Baixa: "#64748b",
  };

  return (
    <Card className="glass-card rounded-lg p-5 overflow-x-auto">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2 mb-4">
        <Calendar className="w-3.5 h-3.5 text-primary" /> Gantt · {totalDays} dias · {rows.length}{" "}
        lotes
      </h4>
      <svg width={W} height={H} className="min-w-[800px]">
        {/* grid mensal */}
        {months.map((m, i) => (
          <g key={i}>
            <line x1={m.x} x2={m.x} y1={20} y2={H} stroke="rgba(255,255,255,0.05)" />
            <text
              x={m.x + 4}
              y={14}
              fill="rgba(255,255,255,0.4)"
              fontSize="9"
              style={{ textTransform: "uppercase" }}
            >
              {m.label}
            </text>
          </g>
        ))}
        {/* hoje */}
        <line
          x1={xOf(today)}
          x2={xOf(today)}
          y1={20}
          y2={H}
          stroke="rgba(59,130,246,0.6)"
          strokeDasharray="3 3"
        />
        <text x={xOf(today) + 4} y={H - 4} fill="rgba(59,130,246,0.8)" fontSize="9">
          hoje
        </text>

        {rows.map((r, i) => {
          const y = 30 + i * ROW_H;
          const x = xOf(r.s);
          const w = Math.max(8, xOf(r.e) - x);
          const pct = percentualLote(r.lote);
          const color = colorByPrio[r.lote.prioridade] ?? "#3b82f6";
          const atrasado = r.e < today && pct < 100;
          return (
            <g
              key={r.lote.numero}
              className="cursor-pointer"
              onClick={() => onSelectLote?.(r.lote)}
            >
              <text x={0} y={y + 16} fill="white" fontSize="10" fontWeight={600}>
                {r.lote.numero}
              </text>
              <text x={0} y={y + 28} fill="rgba(255,255,255,0.5)" fontSize="8">
                {r.lote.grupo.slice(0, 28)}
              </text>
              {/* trilho */}
              <rect
                x={x}
                y={y + 6}
                width={w}
                height={18}
                rx={4}
                fill="rgba(255,255,255,0.05)"
                stroke={atrasado ? "#f43f5e" : "transparent"}
              />
              {/* progresso */}
              <rect
                x={x}
                y={y + 6}
                width={(w * pct) / 100}
                height={18}
                rx={4}
                fill={color}
                opacity={0.85}
              />
              <text x={x + 6} y={y + 19} fill="white" fontSize="9" fontWeight={700}>
                {pct}%
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex items-center gap-3 text-[9px] text-muted-foreground">
        {Object.entries(colorByPrio).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: v }} /> {k}
          </span>
        ))}
        <span className="flex items-center gap-1 ml-auto">
          <span className="w-2.5 h-2.5 rounded-sm border border-rose-500" /> atrasado
        </span>
      </div>
    </Card>
  );
}
