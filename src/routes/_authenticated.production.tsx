import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GanttChart, History, LayoutGrid, Radar, Zap } from "lucide-react";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { KanbanColumn } from "@/components/pcp/KanbanColumn";
import { ReferenciaDrawer } from "@/components/pcp/ReferenciaDrawer";
import { TorreDeControle } from "@/components/pcp/TorreDeControle";
import { CapacityPanel } from "@/components/pcp/CapacityPanel";
import { LotesGantt } from "@/components/pcp/LotesGantt";
import { LoteTimeline } from "@/components/pcp/LoteTimeline";
import { ExportMenu } from "@/components/export/ExportMenu";
import { lotesPorSetor, usePCPStore } from "@/lib/pcp/store";
import {
  SETORES_PCP,
  ocorrenciasAbertasLote,
  percentualLote,
  saldoReferencia,
  type Lote,
  type ReferenciaLote,
  type SetorPCP,
} from "@/types/pcp";

export const Route = createFileRoute("/_authenticated/production")({
  component: ProductionPage,
});

function ProductionPage() {
  const lotes = usePCPStore((s) => s.lotes);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView] = useState<"kanban" | "torre" | "gantt">("kanban");
  const [selRef, setSelRef] = useState<{
    loteNumero: string;
    ref: ReferenciaLote;
  } | null>(null);
  const [loteSelecionado, setLoteSelecionado] = useState<{
    lote: Lote;
    setor: SetorPCP;
  } | null>(null);

  const colunas = useMemo(() => lotesPorSetor(lotes), [lotes]);

  const totalLotes = lotes.length;
  const totalRefs = lotes.reduce((a, l) => a + l.referencias.length, 0);
  const ocorrTotais = lotes.reduce(
    (a, l) => a + ocorrenciasAbertasLote(l),
    0,
  );
  const lotesAtrasados = lotes.filter(
    (l) => new Date(l.data_prevista).getTime() < Date.now(),
  ).length;

  // re-bind selRef ao store após mutações
  const selRefAtual = useMemo(() => {
    if (!selRef) return null;
    const l = lotes.find((x) => x.numero === selRef.loteNumero);
    const r = l?.referencias.find((x) => x.ref === selRef.ref.ref);
    return r && l
      ? { loteNumero: selRef.loteNumero, ref: r, grupo: l.grupo, colecao: l.colecao }
      : null;
  }, [selRef, lotes]);

  const loteSelecionadoAtual = useMemo(() => {
    if (!loteSelecionado) return null;
    const l = lotes.find((x) => x.numero === loteSelecionado.lote.numero);
    return l ? { lote: l, setor: loteSelecionado.setor } : null;
  }, [loteSelecionado, lotes]);

  return (
    <ModuleLayout
      title="PCP — Lotes & Passagens"
      subtitle="Kanban por setor, lotes com múltiplas referências, passagens parciais/integrais e ocorrências auditáveis."
      version="PCP Lotes v1.0"
      searchPlaceholder="Buscar lote, referência, grupo..."
      metrics={[
        { label: "Lotes ativos", value: String(totalLotes), detail: "em produção" },
        { label: "Referências", value: String(totalRefs), detail: "rastreáveis" },
        { label: "Ocorrências", value: String(ocorrTotais), detail: "abertas" },
        { label: "Atrasados", value: String(lotesAtrasados), detail: "fora do prazo" },
      ]}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                view === "kanban"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setView("torre")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                view === "torre"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Radar className="h-3.5 w-3.5" />
              Torre de Controle
            </button>
            <button
              onClick={() => setView("gantt")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
                view === "gantt"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <GanttChart className="h-3.5 w-3.5" />
              Gantt
            </button>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              title="PCP — Lotes & Referências"
              filename={`pcp-lotes-${new Date().toISOString().slice(0, 10)}`}
              rows={lotes.flatMap((l) =>
                l.referencias.map((r) => ({
                  Lote: l.numero,
                  Grupo: l.grupo,
                  Colecao: l.colecao,
                  Prioridade: l.prioridade,
                  Responsavel: l.responsavel,
                  Prazo: new Date(l.data_prevista).toLocaleDateString("pt-BR"),
                  Ref: r.ref,
                  Nome: r.nome,
                  Setor: r.setor_atual,
                  Status: r.status,
                  Programada: r.qtd_programada,
                  Produzida: r.qtd_produzida,
                  Perdida: r.qtd_perdida,
                  Saldo: saldoReferencia(r),
                  "% concluído": Math.round((r.qtd_produzida / Math.max(r.qtd_programada, 1)) * 100),
                })),
              )}
              columns={["Lote","Grupo","Colecao","Prioridade","Responsavel","Prazo","Ref","Nome","Setor","Status","Programada","Produzida","Perdida","Saldo","% concluído"]}
            />
            <Button asChild size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
              <Link to="/production/today">
                <Zap className="h-3.5 w-3.5 mr-1" />
                Produção do Dia
              </Link>
            </Button>
          </div>
        </div>

        {view === "kanban" ? (
          <Card className="glass-card rounded-lg">
            <CardContent className="p-4 overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-2">
                {SETORES_PCP.map((s) => (
                  <KanbanColumn
                    key={s}
                    setor={s}
                    lotes={colunas[s]}
                    onSelectLote={(lote, setor) =>
                      setLoteSelecionado({ lote, setor })
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : view === "torre" ? (
          <TorreDeControle
            lotes={lotes}
            onSelectLote={(l) =>
              setLoteSelecionado({ lote: l, setor: l.referencias[0]?.setor_atual ?? "Costura" })
            }
          />
        ) : (
          <LotesGantt
            lotes={lotes}
            onSelectLote={(l) =>
              setLoteSelecionado({ lote: l, setor: l.referencias[0]?.setor_atual ?? "Costura" })
            }
          />
        )}
      </div>

      {/* Dialog do lote: lista referências e abre o drawer */}
      <Dialog
        open={!!loteSelecionadoAtual}
        onOpenChange={(o) => !o && setLoteSelecionado(null)}
      >
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white max-w-3xl">
          {loteSelecionadoAtual && (
            <>
              <DialogHeader>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  {loteSelecionadoAtual.lote.numero} •{" "}
                  {loteSelecionadoAtual.setor}
                </p>
                <DialogTitle className="text-xl">
                  {loteSelecionadoAtual.lote.grupo}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {loteSelecionadoAtual.lote.colecao} • Responsável{" "}
                  {loteSelecionadoAtual.lote.responsavel} • Prazo{" "}
                  {new Date(
                    loteSelecionadoAtual.lote.data_prevista,
                  ).toLocaleDateString()}
                </p>
              </DialogHeader>

              <div className="mt-2 flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] p-3 text-[11px]">
                <span className="text-muted-foreground">
                  Conclusão geral do lote
                </span>
                <div className="flex-1 mx-3">
                  <Progress
                    value={percentualLote(loteSelecionadoAtual.lote)}
                    className="h-1.5 bg-white/10"
                  />
                </div>
                <span className="font-bold">
                  {percentualLote(loteSelecionadoAtual.lote)}%
                </span>
              </div>

              <Tabs defaultValue="refs" className="mt-4">
                <TabsList className="bg-white/[0.04] border border-white/10">
                  <TabsTrigger value="refs" className="text-[10px] gap-1">
                    <LayoutGrid className="h-3 w-3" /> Referências
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-[10px] gap-1">
                    <History className="h-3 w-3" /> Timeline
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="refs" className="mt-3">
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Referências neste setor
                    </p>
                    {loteSelecionadoAtual.lote.referencias
                      .filter(
                        (r) => r.setor_atual === loteSelecionadoAtual.setor,
                      )
                      .map((r) => (
                        <button
                          key={r.ref}
                          onClick={() => {
                            setSelRef({
                              loteNumero: loteSelecionadoAtual.lote.numero,
                              ref: r,
                            });
                            setDrawerOpen(true);
                          }}
                          className="w-full text-left rounded-md border border-white/10 bg-white/[0.04] p-3 hover:border-primary/40 hover:bg-white/[0.07] transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                                {r.ref}
                              </p>
                              <p className="text-sm font-bold text-white">
                                {r.nome}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                r.status === "Concluído"
                                  ? "border-emerald-400/40 text-emerald-300"
                                  : r.status === "Ocorrência"
                                    ? "border-rose-400/40 text-rose-300"
                                    : "border-white/20"
                              }`}
                            >
                              {r.status}
                            </Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px]">
                            <Mini label="Prog" v={r.qtd_programada} />
                            <Mini
                              label="Saldo"
                              v={saldoReferencia(r)}
                              tone="primary"
                            />
                            <Mini label="Feito" v={r.qtd_produzida} tone="pos" />
                            <Mini
                              label="Perda"
                              v={r.qtd_perdida}
                              tone={r.qtd_perdida ? "neg" : undefined}
                            />
                          </div>
                        </button>
                      ))}

                    {loteSelecionadoAtual.lote.referencias.filter(
                      (r) => r.setor_atual !== loteSelecionadoAtual.setor,
                    ).length > 0 && (
                      <>
                        <p className="pt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Outras referências do lote (em outros setores)
                        </p>
                        {loteSelecionadoAtual.lote.referencias
                          .filter(
                            (r) =>
                              r.setor_atual !== loteSelecionadoAtual.setor,
                          )
                          .map((r) => (
                            <div
                              key={r.ref}
                              className="rounded-md border border-white/5 bg-white/[0.02] p-3 text-[11px] flex justify-between"
                            >
                              <span>
                                <span className="text-primary font-bold">
                                  {r.ref}
                                </span>{" "}
                                — {r.nome}
                              </span>
                              <span className="text-muted-foreground">
                                {r.setor_atual}
                              </span>
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-3">
                  <div className="max-h-[460px] overflow-y-auto pr-1">
                    <LoteTimeline lote={loteSelecionadoAtual.lote} />
                  </div>
                </TabsContent>
              </Tabs>

            </>
          )}
        </DialogContent>
      </Dialog>

      <ReferenciaDrawer
        loteNumero={selRefAtual?.loteNumero ?? ""}
        grupo={selRefAtual?.grupo}
        colecao={selRefAtual?.colecao}
        referencia={selRefAtual?.ref ?? null}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <CapacityPanel />
    </ModuleLayout>
  );
}

function Mini({
  label,
  v,
  tone,
}: {
  label: string;
  v: number;
  tone?: "pos" | "neg" | "primary";
}) {
  const c =
    tone === "pos"
      ? "text-emerald-300"
      : tone === "neg"
        ? "text-rose-300"
        : tone === "primary"
          ? "text-primary"
          : "text-white";
  return (
    <div className="rounded bg-black/30 py-1.5">
      <p className="text-[8px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`text-xs font-bold ${c}`}>{v}</p>
    </div>
  );
}
