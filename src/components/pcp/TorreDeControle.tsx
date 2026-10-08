// Torre de Controle — visão analítica do PCP em tempo real.
// PLM-only: leitura/agregação sobre o store de lotes, sem novas regras de ERP.
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, Factory, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import {
  SETORES_PCP,
  diasParaPrazo,
  ocorrenciasAbertasLote,
  pendenteReferencia,
  percentualLote,
  saldoReferencia,
  type Lote,
  type SetorPCP,
} from "@/types/pcp";

interface Props {
  lotes: Lote[];
  onSelectLote?: (lote: Lote) => void;
}

export function TorreDeControle({ lotes, onSelectLote }: Props) {
  const atrasados = useMemo(
    () =>
      lotes
        .filter((l) => diasParaPrazo(l) < 0 && percentualLote(l) < 100)
        .sort((a, b) => diasParaPrazo(a) - diasParaPrazo(b)),
    [lotes],
  );

  const noPrazoRisco = useMemo(
    () =>
      lotes.filter((l) => diasParaPrazo(l) >= 0 && diasParaPrazo(l) <= 7 && percentualLote(l) < 80),
    [lotes],
  );

  const cargaPorSetor = useMemo(() => {
    const map = Object.fromEntries(
      SETORES_PCP.map((s) => [s, { lotes: 0, pecasPendentes: 0, ocorrencias: 0 }]),
    ) as Record<SetorPCP, { lotes: number; pecasPendentes: number; ocorrencias: number }>;
    for (const l of lotes) {
      for (const r of l.referencias) {
        map[r.setor_atual].pecasPendentes += pendenteReferencia(r);
        map[r.setor_atual].ocorrencias += r.ocorrencias.filter((o) => o.tipo === "negativa").length;
      }
      const setores = new Set(l.referencias.map((r) => r.setor_atual));
      for (const s of setores) map[s].lotes += 1;
    }
    return map;
  }, [lotes]);

  const gargalo = useMemo(() => {
    let pior: { setor: SetorPCP; pecas: number } | null = null;
    for (const s of SETORES_PCP) {
      const p = cargaPorSetor[s].pecasPendentes;
      if (!pior || p > pior.pecas) pior = { setor: s, pecas: p };
    }
    return pior;
  }, [cargaPorSetor]);

  const totais = useMemo(() => {
    const peProd = lotes
      .flatMap((l) => l.referencias)
      .reduce((a, r) => a + pendenteReferencia(r), 0);
    const perdas = lotes.flatMap((l) => l.referencias).reduce((a, r) => a + r.qtd_perdida, 0);
    const programado = lotes
      .flatMap((l) => l.referencias)
      .reduce((a, r) => a + saldoReferencia(r), 0);
    const eficiencia =
      programado > 0 ? Math.round(((programado - perdas) / programado) * 100) : 100;
    const ocorrTotal = lotes.reduce((a, l) => a + ocorrenciasAbertasLote(l), 0);
    return { peProd, perdas, eficiencia, ocorrTotal };
  }, [lotes]);

  return (
    <div className="space-y-4">
      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          icon={<Clock className="h-4 w-4" />}
          label="Lotes atrasados"
          value={String(atrasados.length)}
          tone={atrasados.length ? "neg" : "pos"}
          hint={atrasados.length ? "exigem ação" : "no prazo"}
        />
        <KPI
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Risco de atraso"
          value={String(noPrazoRisco.length)}
          tone={noPrazoRisco.length ? "warn" : "pos"}
          hint="≤ 7d e < 80%"
        />
        <KPI
          icon={<Gauge className="h-4 w-4" />}
          label="Eficiência"
          value={`${totais.eficiencia}%`}
          tone={totais.eficiencia >= 95 ? "pos" : totais.eficiencia >= 85 ? "warn" : "neg"}
          hint="aproveitamento"
        />
        <KPI
          icon={<Factory className="h-4 w-4" />}
          label="Peças pendentes"
          value={String(totais.peProd)}
          hint={`${totais.ocorrTotal} ocorrências`}
        />
      </div>

      {/* Gargalo */}
      {gargalo && gargalo.pecas > 0 && (
        <Card className="glass-card rounded-lg border-amber-400/30">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-amber-300" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-amber-300/80">
                Gargalo identificado
              </p>
              <p className="text-sm font-bold text-white">
                {gargalo.setor} — {gargalo.pecas} peças pendentes
              </p>
            </div>
            <Badge variant="outline" className="border-amber-400/40 text-amber-200 text-[10px]">
              Priorizar
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lotes atrasados */}
        <Card className="glass-card rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Lotes atrasados
              </h3>
              <Badge variant="outline" className="border-rose-400/40 text-rose-200 text-[10px]">
                {atrasados.length}
              </Badge>
            </div>
            {atrasados.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Nenhum lote atrasado. Produção fluindo no prazo.
              </p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {atrasados.map((l) => (
                  <button
                    key={l.numero}
                    onClick={() => onSelectLote?.(l)}
                    className="w-full text-left rounded-md border border-rose-400/20 bg-rose-500/5 p-3 hover:border-rose-400/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-300">
                          {l.numero}
                        </p>
                        <p className="text-sm font-bold text-white">{l.grupo}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {l.colecao} • {l.responsavel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-rose-300">
                          {Math.abs(diasParaPrazo(l))}d atrasado
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {percentualLote(l)}% pronto
                        </p>
                      </div>
                    </div>
                    <Progress value={percentualLote(l)} className="h-1 bg-white/5 mt-2" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Carga por setor */}
        <Card className="glass-card rounded-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Carga por setor
              </h3>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              {SETORES_PCP.map((s) => {
                const c = cargaPorSetor[s];
                const max = Math.max(...SETORES_PCP.map((x) => cargaPorSetor[x].pecasPendentes), 1);
                const pct = Math.round((c.pecasPendentes / max) * 100);
                return (
                  <div key={s} className="flex items-center gap-3 text-[11px]">
                    <span className="w-24 truncate text-muted-foreground">{s}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/60 to-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-bold text-white">
                      {c.pecasPendentes} pç
                    </span>
                    <span className="w-12 text-right text-muted-foreground">{c.lotes} lt</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "pos" | "neg" | "warn";
}) {
  const color =
    tone === "pos"
      ? "text-emerald-300"
      : tone === "neg"
        ? "text-rose-300"
        : tone === "warn"
          ? "text-amber-300"
          : "text-white";
  return (
    <Card className="glass-card rounded-lg">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider">
          {icon}
          {label}
        </div>
        <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
