// Smart Production Planner — sugere lotes a abrir baseando-se em estoque/giro.
// PLM-only: leitura de mocks + criação de lote no usePCPStore (sem ERP).
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { usePCPStore } from "@/lib/pcp/store";

export const Route = createFileRoute("/_authenticated/planner")({
  component: PlannerPage,
});

type Sugestao = {
  ref: string;
  nome: string;
  grupo: string;
  colecao: string;
  estoque: number;
  giroSemanal: number;
  coberturaSemanas: number;
  grade: Record<string, number>;
  score: number;
  motivo: string;
};

// Mock baseado em padrões reais de coleção (substituível por dados de inventory/analytics).
const BASE: Omit<Sugestao, "score" | "motivo" | "coberturaSemanas">[] = [
  { ref: "CM704", nome: "Camisa Linho Amalfi", grupo: "Camisaria Masculina", colecao: "Alto Verão 2026", estoque: 42, giroSemanal: 120, grade: { P: 50, M: 100, G: 100, GG: 50 } },
  { ref: "VT302", nome: "Vestido Midi Toscana", grupo: "Vestidos", colecao: "Alto Verão 2026", estoque: 18, giroSemanal: 95, grade: { PP: 20, P: 60, M: 80, G: 60, GG: 30 } },
  { ref: "BL220", nome: "Blusa Bordado Manual", grupo: "Blusaria Feminina", colecao: "Pré-Verão 2026", estoque: 8, giroSemanal: 45, grade: { P: 30, M: 50, G: 40, GG: 20 } },
  { ref: "CL110", nome: "Calça Alfaiataria", grupo: "Calças", colecao: "Alto Verão 2026", estoque: 210, giroSemanal: 60, grade: { 38: 40, 40: 80, 42: 80, 44: 50, 46: 30 } },
  { ref: "SA180", nome: "Saia Plissada Capri", grupo: "Saias", colecao: "Alto Verão 2026", estoque: 4, giroSemanal: 38, grade: { P: 30, M: 50, G: 40 } },
  { ref: "CM709", nome: "Camisa Oxford", grupo: "Camisaria Masculina", colecao: "Alto Verão 2026", estoque: 130, giroSemanal: 70, grade: { P: 40, M: 60, G: 60, GG: 40 } },
];

function calcular(): Sugestao[] {
  return BASE.map((b) => {
    const cobertura = b.giroSemanal > 0 ? b.estoque / b.giroSemanal : 99;
    // score: cobertura baixa + giro alto = alta prioridade
    const baseScore = Math.max(0, 100 - cobertura * 15);
    const giroBoost = Math.min(30, b.giroSemanal / 4);
    const score = Math.min(100, Math.round(baseScore + giroBoost));
    const motivo =
      cobertura < 1
        ? "Ruptura iminente — repor agora"
        : cobertura < 3
          ? "Estoque baixo para o giro"
          : cobertura < 6
            ? "Atenção: cobertura curta"
            : "Cobertura saudável";
    return { ...b, coberturaSemanas: Math.round(cobertura * 10) / 10, score, motivo };
  }).sort((a, b) => b.score - a.score);
}

function PlannerPage() {
  const lotes = usePCPStore((s) => s.lotes);
  const [sugestoes] = useState<Sugestao[]>(() => calcular());
  const [criados, setCriados] = useState<Set<string>>(new Set());

  const refsEmLote = useMemo(() => {
    const set = new Set<string>();
    for (const l of lotes) for (const r of l.referencias) set.add(r.ref);
    return set;
  }, [lotes]);

  const urgentes = sugestoes.filter((s) => s.score >= 75).length;
  const totalPecasSug = sugestoes.reduce(
    (a, s) => a + Object.values(s.grade).reduce((x, y) => x + y, 0),
    0,
  );

  function gerarLote(s: Sugestao) {
    const totalPecas = Object.values(s.grade).reduce((a, b) => a + b, 0);
    const res = usePCPStore.getState().criarLote({
      grupo: s.grupo,
      colecao: s.colecao,
      prioridade: s.score >= 75 ? "Urgente" : s.score >= 50 ? "Alta" : "Média",
      responsavel: "Planner AI",
      referencia: {
        ref: s.ref,
        nome: s.nome,
        qtd_programada: totalPecas,
        grade: s.grade,
      },
    });
    if (!res.ok) {
      toast.error(res.erro ?? "Falha ao gerar lote");
      return;
    }
    setCriados((prev) => new Set(prev).add(s.ref));
    toast.success(`${res.numero} criado para ${s.ref}`, {
      description: `${totalPecas} peças enviadas ao Kanban do PCP em Compras.`,
    });
  }

  return (
    <ModuleLayout
      title="Smart Production Planner"
      subtitle="O que produzir em seguida — sugestões baseadas em estoque, giro e cobertura."
      version="Planner v1.0"
      metrics={[
        { label: "Sugestões", value: String(sugestoes.length), detail: "ativas" },
        { label: "Urgentes", value: String(urgentes), detail: "score ≥ 75" },
        { label: "Peças totais", value: String(totalPecasSug), detail: "se aceitar tudo" },
        { label: "Já em PCP", value: String(sugestoes.filter((s) => refsEmLote.has(s.ref)).length), detail: "lotes ativos" },
      ]}
    >
      <div className="space-y-3">
        {sugestoes.map((s) => {
          const totalPecas = Object.values(s.grade).reduce((a, b) => a + b, 0);
          const jaCriado = criados.has(s.ref);
          const jaEmPCP = refsEmLote.has(s.ref);
          const cor =
            s.score >= 75
              ? "border-rose-400/30"
              : s.score >= 50
                ? "border-amber-400/30"
                : "border-white/10";
          return (
            <Card key={s.ref} className={`glass-card rounded-lg ${cor}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          s.score >= 75
                            ? "border-rose-400/40 text-rose-300"
                            : s.score >= 50
                              ? "border-amber-400/40 text-amber-200"
                              : "border-emerald-400/40 text-emerald-300"
                        }`}
                      >
                        Score {s.score}
                      </Badge>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                        {s.ref}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-white mt-1">{s.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.grupo} • {s.colecao}
                    </p>
                    <p className="text-[11px] mt-2 flex items-center gap-1.5 text-white/80">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {s.motivo}
                    </p>
                  </div>

                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" /> Estoque
                      </p>
                      <p className="text-lg font-bold text-white">{s.estoque}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Giro/sem
                      </p>
                      <p className="text-lg font-bold text-white">{s.giroSemanal}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                        Cobertura
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          s.coberturaSemanas < 2
                            ? "text-rose-300"
                            : s.coberturaSemanas < 4
                              ? "text-amber-300"
                              : "text-emerald-300"
                        }`}
                      >
                        {s.coberturaSemanas}s
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 items-center">
                  <div className="md:col-span-2">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                      Grade sugerida ({totalPecas} pç)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(s.grade).map(([tam, qtd]) => (
                        <span
                          key={tam}
                          className="px-2 py-1 rounded bg-white/[0.04] border border-white/10 text-[10px] text-white"
                        >
                          <span className="text-muted-foreground">{tam}</span>{" "}
                          <span className="font-bold">{qtd}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {jaEmPCP && (
                      <Badge variant="outline" className="border-white/15 text-[10px]">
                        Já em PCP
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      onClick={() => gerarLote(s)}
                      disabled={jaCriado}
                      className={
                        jaCriado
                          ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }
                    >
                      {jaCriado ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Enviado
                        </>
                      ) : (
                        <>Gerar Lote</>
                      )}
                    </Button>
                  </div>
                </div>

                <Progress value={s.score} className="h-1 bg-white/5 mt-3" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ModuleLayout>
  );
}
