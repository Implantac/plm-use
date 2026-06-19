// Widget de operação ao vivo do PCP — consumido no Dashboard.
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, ArrowRight, Clock, Factory } from "lucide-react";
import { usePCPStore } from "@/lib/pcp/store";
import {
  diasParaPrazo,
  ocorrenciasAbertasLote,
  pendenteReferencia,
  percentualLote,
} from "@/types/pcp";

export function LivePCPWidget() {
  const lotes = usePCPStore((s) => s.lotes);

  const stats = useMemo(() => {
    const atrasados = lotes.filter(
      (l) => diasParaPrazo(l) < 0 && percentualLote(l) < 100,
    ).length;
    const pendentes = lotes
      .flatMap((l) => l.referencias)
      .reduce((a, r) => a + pendenteReferencia(r), 0);
    const ocorr = lotes.reduce((a, l) => a + ocorrenciasAbertasLote(l), 0);
    const conclMedia = lotes.length
      ? Math.round(lotes.reduce((a, l) => a + percentualLote(l), 0) / lotes.length)
      : 0;
    const urgentes = [...lotes]
      .sort((a, b) => diasParaPrazo(a) - diasParaPrazo(b))
      .slice(0, 3);
    return { atrasados, pendentes, ocorr, conclMedia, urgentes };
  }, [lotes]);

  return (
    <Card className="glass-card rounded-lg border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Operação ao vivo · PCP
            </p>
          </div>
          <Link
            to="/production"
            className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
          >
            Abrir PCP <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Mini label="Lotes" value={String(lotes.length)} tone="text-white" />
          <Mini
            label="Atrasados"
            value={String(stats.atrasados)}
            tone={stats.atrasados ? "text-rose-300" : "text-emerald-300"}
          />
          <Mini label="Peças pendentes" value={String(stats.pendentes)} tone="text-amber-300" />
          <Mini label="Ocorrências" value={String(stats.ocorr)} tone="text-primary" />
        </div>

        <div className="space-y-2">
          {stats.urgentes.map((l) => {
            const dias = diasParaPrazo(l);
            return (
              <div
                key={l.numero}
                className="rounded-md border border-white/10 bg-white/[0.03] p-2.5 flex items-center gap-3"
              >
                <Factory className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">
                    {l.numero} • {l.grupo}
                  </p>
                  <Progress value={percentualLote(l)} className="h-1 bg-white/5 mt-1" />
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] shrink-0 ${
                    dias < 0
                      ? "border-rose-400/40 text-rose-300"
                      : dias <= 7
                        ? "border-amber-400/40 text-amber-200"
                        : "border-white/20"
                  }`}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {dias < 0 ? `${Math.abs(dias)}d atraso` : `${dias}d`}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-md bg-white/[0.03] border border-white/10 p-2.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
