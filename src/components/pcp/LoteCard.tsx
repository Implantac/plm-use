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
  Baixa: "bg-muted/60 text-muted-foreground border-border",
  Média: "bg-status-review/10 text-status-review border-status-review/20",
  Alta: "bg-status-progress/10 text-status-progress border-status-progress/20",
  Urgente: "bg-status-rejected/10 text-status-rejected border-status-rejected/20",
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
      className="cursor-pointer rounded-lg border border-border bg-muted/60 p-4 transition hover:border-primary/40 hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-[0.04em] text-primary">
            {lote.numero}
          </p>
          <p className="mt-0.5 text-sm font-bold text-white leading-tight">{lote.grupo}</p>
          <p className="mt-0.5 text-2xs text-muted-foreground">{lote.colecao}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-2xs font-semibold uppercase tracking-[0.04em] ${prioridadeColor[lote.prioridade]}`}
        >
          {lote.prioridade}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded bg-black/30 py-1.5">
          <p className="text-2xs uppercase tracking-wider text-muted-foreground">Prog.</p>
          <p className="text-xs font-bold text-white">{totalProgramado}</p>
        </div>
        <div className="rounded bg-black/30 py-1.5">
          <p className="text-2xs uppercase tracking-wider text-muted-foreground">Feito</p>
          <p className="text-xs font-bold text-status-approved">{totalProduzido}</p>
        </div>
        <div className="rounded bg-black/30 py-1.5">
          <p className="text-2xs uppercase tracking-wider text-muted-foreground">Saldo</p>
          <p className="text-xs font-bold text-status-progress">{saldoPendente}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-2xs uppercase tracking-wider text-muted-foreground">
          <span>Concluído</span>
          <span className="font-bold text-white">{pct}%</span>
        </div>
        <Progress value={pct} className="mt-1 h-1.5 bg-muted" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-2xs">
        <span className="inline-flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-muted-foreground">
          <Package className="h-3 w-3" /> {refsNoSetor.length} ref
          {refsNoSetor.length > 1 ? "s" : ""}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-1 ${atraso ? "bg-status-rejected/10 text-status-rejected" : "bg-muted/50 text-muted-foreground"}`}
        >
          <Clock className="h-3 w-3" />
          {atraso ? `${Math.abs(dias)}d atraso` : `${dias}d`}
        </span>
        {ocorrenciasPos > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-status-approved/10 px-2 py-1 text-status-approved">
            <TrendingUp className="h-3 w-3" /> {ocorrenciasPos}
          </span>
        )}
        {ocorrenciasNeg > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-status-rejected/10 px-2 py-1 text-status-rejected">
            <TrendingDown className="h-3 w-3" /> {ocorrenciasNeg}
          </span>
        )}
        {ocorrencias > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-status-progress/10 px-2 py-1 text-status-progress">
            <AlertOctagon className="h-3 w-3" /> {ocorrencias}
          </span>
        )}
      </div>
    </Card>
  );
}
