// Produção do Dia — visão operacional simplificada por setor.
// PLM-only: lê o store de lotes e mostra "o que produzir hoje" em cada setor.
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Zap } from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { usePCPStore } from "@/lib/pcp/store";
import {
  SETORES_PCP,
  diasParaPrazo,
  pendenteReferencia,
  percentualReferencia,
  type SetorPCP,
} from "@/types/pcp";

export const Route = createFileRoute("/_authenticated/production/today")({
  component: ProductionTodayPage,
});

function ProductionTodayPage() {
  const lotes = usePCPStore((s) => s.lotes);
  const [setor, setSetor] = useState<SetorPCP>("Costura");

  const fila = useMemo(() => {
    type Item = {
      loteNumero: string;
      grupo: string;
      colecao?: string;
      responsavel: string;
      prazo: string;
      diasPrazo: number;
      ref: string;
      nome: string;
      pendente: number;
      progresso: number;
      prioridadeScore: number;
    };
    const items: Item[] = [];
    for (const l of lotes) {
      for (const r of l.referencias) {
        if (r.setor_atual !== setor) continue;
        const pend = pendenteReferencia(r);
        if (pend <= 0) continue;
        const dias = diasParaPrazo(l);
        const prio =
          (l.prioridade === "Urgente"
            ? 100
            : l.prioridade === "Alta"
              ? 70
              : l.prioridade === "Média"
                ? 40
                : 20) + (dias < 0 ? 50 : dias <= 3 ? 30 : dias <= 7 ? 15 : 0);
        items.push({
          loteNumero: l.numero,
          grupo: l.grupo,
          colecao: l.colecao,
          responsavel: l.responsavel,
          prazo: l.data_prevista,
          diasPrazo: dias,
          ref: r.ref,
          nome: r.nome,
          pendente: pend,
          progresso: percentualReferencia(r),
          prioridadeScore: prio,
        });
      }
    }
    return items.sort((a, b) => b.prioridadeScore - a.prioridadeScore);
  }, [lotes, setor]);

  const totalPecas = fila.reduce((a, i) => a + i.pendente, 0);

  return (
    <ModuleLayout
      title="Produção do Dia"
      subtitle="Fila operacional priorizada por setor — o que produzir agora."
      version="PCP Today v1.0"
      metrics={[
        { label: "Setor", value: setor, detail: "ativo" },
        { label: "Itens", value: String(fila.length), detail: "na fila" },
        { label: "Peças", value: String(totalPecas), detail: "pendentes" },
        {
          label: "Urgentes",
          value: String(fila.filter((i) => i.diasPrazo < 3).length),
          detail: "≤ 3 dias",
        },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button asChild variant="outline" size="sm" >
            <Link to="/production">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Voltar ao Kanban
            </Link>
          </Button>
          <div className="flex flex-wrap gap-1.5">
            {SETORES_PCP.map((s) => (
              <button
                key={s}
                onClick={() => setSetor(s)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition border ${
                  setor === s
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {fila.length === 0 ? (
          <Card className="glass-card rounded-lg">
            <CardContent className="p-10 text-center">
              <Zap className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-white">
                Nenhuma peça pendente em {setor}.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Fila vazia — setor disponível para novos lotes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {fila.map((i, idx) => (
              <Card
                key={`${i.loteNumero}-${i.ref}`}
                className={`glass-card rounded-lg ${
                  i.diasPrazo < 0
                    ? "border-rose-400/30"
                    : i.diasPrazo <= 3
                      ? "border-amber-400/30"
                      : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl font-black text-primary/40 w-10 text-center leading-none pt-1">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                            {i.loteNumero} • {i.ref}
                          </p>
                          <p className="text-sm font-bold text-white">{i.nome}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {i.grupo} • {i.colecao} • {i.responsavel}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              i.diasPrazo < 0
                                ? "border-rose-400/40 text-rose-300"
                                : i.diasPrazo <= 3
                                  ? "border-amber-400/40 text-amber-200"
                                  : "border-white/20"
                            }`}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {i.diasPrazo < 0
                              ? `${Math.abs(i.diasPrazo)}d atrasado`
                              : `${i.diasPrazo}d`}
                          </Badge>
                          <p className="text-lg font-bold text-white">
                            {i.pendente} <span className="text-[10px] text-muted-foreground">pç</span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress
                          value={i.progresso}
                          className="h-1 bg-white/5 flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground w-10 text-right">
                          {i.progresso}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
