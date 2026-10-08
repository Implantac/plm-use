import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertOctagon, Clock, Package, TrendingDown, TrendingUp } from "lucide-react";
import {
  diasParaPrazo,
  ocorrenciasAbertasLote,
  percentualLote,
  saldoReferencia,
  type Lote,
  type Prioridade,
  type SetorPCP,
} from "@/types/pcp";

const prioridadeColor: Record<Prioridade, string> = {
  Baixa: "bg-slate-400/10 text-slate-300 border-slate-300/20",
  Média: "bg-sky-400/10 text-sky-300 border-sky-300/20",
  Alta: "bg-amber-300/10 text-amber-300 border-amber-300/20",
  Urgente: "bg-rose-400/10 text-rose-300 border-rose-300/20",
};

interface Props {
  lote: Lote;
  setor: SetorPCP;
  onClick(): void;
}

export function LoteCard({ lote, setor, onClick }: Props) {
  const refsNoSetor = lote.referencias.filter((r) => r.setor_atual === setor);
  const totalProgramado = refsNoSetor.reduce((acc, r) => acc + saldoReferencia(r), 0);
  const totalProduzido = refsNoSetor.reduce((acc, r) => acc + r.qtd_produzida, 0);
  const saldoPendente = Math.max(0, totalProgramado - totalProduzido);
  const pct = percentualLote(lote);
  const dias = diasParaPrazo(lote);
  const atraso = dias < 0;
  const ocorrencias = ocorrenciasAbertasLote(lote);
  const ocorrenciasPos = lote.referencias.reduce(
    (a, r) => a + r.ocorrencias.filter((o) => o.tipo === "positiva").length,
    0,
  );
  const ocorrenciasNeg = lote.referencias.reduce(
    (a, r) => a + r.ocorrencias.filter((o) => o.tipo === "negativa").length,
    0,
  );

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-primary/40 hover:bg-white/[0.06]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            {lote.numero}
          </p>
          <p className="mt-0.5 text-sm font-bold text-white leading-tight">{lote.grupo}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{lote.colecao}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-[9px] font-bold uppercase tracking-[0.12em] ${prioridadeColor[lote.prioridade]}`}
        >
          {lote.prioridade}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-black/30 py-1.5">
          <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Prog.</p>
          <p className="text-xs font-bold text-white">{totalProgramado}</p>
        </div>
        <div className="rounded bg-black/30 py-1.5">
          <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Feito</p>
          <p className="text-xs font-bold text-emerald-300">{totalProduzido}</p>
        </div>
        <div className="rounded bg-black/30 py-1.5">
          <p className="text-[8px] uppercase tracking-wider text-muted-foreground">Saldo</p>
          <p className="text-xs font-bold text-amber-300">{saldoPendente}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>Concluído</span>
          <span className="font-bold text-white">{pct}%</span>
        </div>
        <Progress value={pct} className="mt-1 h-1.5 bg-white/10" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[9px]">
        <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-muted-foreground">
          <Package className="h-3 w-3" /> {refsNoSetor.length} ref
          {refsNoSetor.length > 1 ? "s" : ""}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-1 ${atraso ? "bg-rose-400/10 text-rose-300" : "bg-white/5 text-muted-foreground"}`}
        >
          <Clock className="h-3 w-3" />
          {atraso ? `${Math.abs(dias)}d atraso` : `${dias}d`}
        </span>
        {ocorrenciasPos > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-400/10 px-2 py-1 text-emerald-300">
            <TrendingUp className="h-3 w-3" /> {ocorrenciasPos}
          </span>
        )}
        {ocorrenciasNeg > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-rose-400/10 px-2 py-1 text-rose-300">
            <TrendingDown className="h-3 w-3" /> {ocorrenciasNeg}
          </span>
        )}
        {ocorrencias > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-300/10 px-2 py-1 text-amber-300">
            <AlertOctagon className="h-3 w-3" /> {ocorrencias}
          </span>
        )}
      </div>
    </Card>
  );
}
