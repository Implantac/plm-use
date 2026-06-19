import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Flame } from "lucide-react";
import type { DefectRow } from "@/lib/quality/store";

/**
 * Heatmap setor × motivo. Cor proporcional à quantidade de peças defeituosas.
 * Não destrutivo: apenas leitura dos defeitos já derivados do PCP.
 */
export function DefectHeatmap({ defeitos }: { defeitos: DefectRow[] }) {
  const { setores, motivos, matrix, max } = useMemo(() => {
    const setores = Array.from(new Set(defeitos.map((d) => d.setor))).sort();
    const motivos = Array.from(new Set(defeitos.map((d) => d.motivo))).sort();
    const matrix = new Map<string, number>();
    let max = 0;
    for (const d of defeitos) {
      const k = `${d.setor}::${d.motivo}`;
      const v = (matrix.get(k) ?? 0) + d.qtd;
      matrix.set(k, v);
      if (v > max) max = v;
    }
    return { setores, motivos, matrix, max: max || 1 };
  }, [defeitos]);

  if (defeitos.length === 0) {
    return (
      <Card className="glass-card rounded-lg p-5">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2 mb-3">
          <Flame className="w-3.5 h-3.5 text-amber-400" /> Heatmap setor × motivo
        </h4>
        <p className="text-[10px] text-muted-foreground">Sem defeitos registrados.</p>
      </Card>
    );
  }

  return (
    <Card className="glass-card rounded-lg p-5 overflow-x-auto">
      <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2 mb-4">
        <Flame className="w-3.5 h-3.5 text-amber-400" /> Heatmap setor × motivo
      </h4>
      <table className="text-[10px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th />
            {motivos.map((m) => (
              <th key={m} className="text-left text-muted-foreground font-medium px-1 whitespace-nowrap">
                <div className="-rotate-12 origin-bottom-left max-w-[80px] truncate">{m}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {setores.map((s) => (
            <tr key={s}>
              <td className="pr-2 text-white font-medium whitespace-nowrap">{s}</td>
              {motivos.map((m) => {
                const v = matrix.get(`${s}::${m}`) ?? 0;
                const ratio = v / max;
                const bg = v === 0
                  ? "rgba(255,255,255,0.03)"
                  : `rgba(244, 63, 94, ${0.15 + ratio * 0.75})`;
                return (
                  <td key={m} className="p-0">
                    <div
                      className="w-10 h-8 rounded flex items-center justify-center text-[10px] text-white font-bold"
                      style={{ background: bg }}
                      title={`${s} · ${m}: ${v} pç`}
                    >
                      {v > 0 ? v : ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
