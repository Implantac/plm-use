import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Clock,
  AlertTriangle,
  Repeat,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { useReferenceStore, filtrarLifecycles } from "@/lib/reference/store";
import {
  percentualLifecycle,
  stageAtual,
  type ReferenceLifecycle,
} from "@/types/reference";

export const Route = createFileRoute("/_authenticated/pieces-report")({
  component: PiecesReportPage,
});

type SortMode = "atrasadas" | "lentas" | "repilotadas" | "recentes";

function diasEmEtapa(lc: ReferenceLifecycle): number {
  const stage = stageAtual(lc);
  if (!stage?.startedAt) return 0;
  const ms = Date.now() - new Date(stage.startedAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function repilotagens(lc: ReferenceLifecycle): number {
  // Reconta pilotos pela fase "Piloto" — se houver mais de 1 execução, é repiloto.
  const piloto = lc.stages?.find((s) => /piloto/i.test(s.label));
  return Math.max(0, (piloto?.iterations ?? 1) - 1);
}

function PiecesReportPage() {
  const lifecycles = useReferenceStore((s) => s.lifecycles);
  const [sort, setSort] = useState<SortMode>("atrasadas");
  const [query, setQuery] = useState("");

  const enriched = useMemo(() => {
    const q = query.toLowerCase();
    return lifecycles
      .filter((lc) => {
        if (!q) return true;
        return (
          lc.ref.toLowerCase().includes(q) ||
          lc.nome.toLowerCase().includes(q) ||
          (lc.colecao ?? "").toLowerCase().includes(q) ||
          (lc.designer ?? "").toLowerCase().includes(q)
        );
      })
      .map((lc) => {
        const pct = percentualLifecycle(lc);
        const stage = stageAtual(lc);
        const dias = diasEmEtapa(lc);
        const rep = repilotagens(lc);
        const atrasada =
          !!lc.prazo && pct < 100 && new Date(lc.prazo).getTime() < Date.now();
        return { lc, pct, stage, dias, rep, atrasada };
      });
  }, [lifecycles, query]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    switch (sort) {
      case "atrasadas":
        return arr.sort(
          (a, b) => Number(b.atrasada) - Number(a.atrasada) || b.dias - a.dias,
        );
      case "lentas":
        return arr.sort((a, b) => b.dias - a.dias);
      case "repilotadas":
        return arr.sort((a, b) => b.rep - a.rep);
      case "recentes":
        return arr.sort(
          (a, b) =>
            new Date(b.lc.atualizadoEm ?? 0).getTime() -
            new Date(a.lc.atualizadoEm ?? 0).getTime(),
        );
    }
  }, [enriched, sort]);

  const metrics = useMemo(() => {
    const atrasadas = enriched.filter((e) => e.atrasada).length;
    const emPiloto = filtrarLifecycles(lifecycles, "pilotos_pendentes").length;
    const totalRep = enriched.reduce((s, e) => s + e.rep, 0);
    const concluidas = enriched.filter((e) => e.pct >= 100).length;
    return { atrasadas, emPiloto, totalRep, concluidas };
  }, [enriched, lifecycles]);

  const SORT_OPTIONS: { id: SortMode; label: string; icon: typeof Clock }[] = [
    { id: "atrasadas", label: "Atrasadas", icon: AlertTriangle },
    { id: "lentas", label: "Mais tempo na etapa", icon: Clock },
    { id: "repilotadas", label: "Mais repilotadas", icon: Repeat },
    { id: "recentes", label: "Atualizadas recentemente", icon: TrendingUp },
  ];

  return (
    <ModuleLayout
      title="Relatório de Peças"
      subtitle="Progresso peça-a-peça da coleção: tempo em cada etapa, atrasos, repilotagens e conclusão do desenvolvimento."
      version="Engineering v3.0"
      searchPlaceholder="Buscar referência, coleção ou designer"
      onSearch={setQuery}
      metrics={[
        {
          label: "Peças em desenvolvimento",
          value: String(enriched.length),
          detail: "no radar",
        },
        {
          label: "Atrasadas",
          value: String(metrics.atrasadas),
          detail: "prazo estourado",
        },
        {
          label: "Em piloto",
          value: String(metrics.emPiloto),
          detail: "aguardando avaliação",
        },
        {
          label: "Repilotagens",
          value: String(metrics.totalRep),
          detail: "somadas na coleção",
        },
      ]}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {SORT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = sort === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setSort(opt.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition ${
                active
                  ? "border-primary/60 bg-primary/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-white"
              }`}
            >
              <Icon className="h-3 w-3" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <Card className="glass-card border-white/10 rounded-2xl">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-white/[0.03] uppercase tracking-widest text-[9px] text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Referência</th>
                <th className="p-3 text-left">Coleção · Designer</th>
                <th className="p-3 text-left">Etapa atual</th>
                <th className="p-3 text-right">Dias na etapa</th>
                <th className="p-3 text-right">Repilotos</th>
                <th className="p-3 text-right">Progresso</th>
                <th className="p-3 text-right">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground italic">
                    Nenhuma peça encontrada.
                  </td>
                </tr>
              ) : (
                sorted.map(({ lc, pct, stage, dias, rep, atrasada }) => (
                  <tr key={lc.ref} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3">
                      <Link
                        to="/tech-sheet"
                        search={{ ref: lc.ref }}
                        className="block hover:text-primary transition"
                      >
                        <span className="text-[9px] uppercase tracking-[0.2em] text-primary">
                          {lc.ref}
                        </span>
                        <p className="text-sm font-bold text-white">{lc.nome}</p>
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {lc.colecao ?? "—"}
                      <div className="text-[9px] uppercase tracking-wider opacity-70">
                        {lc.designer ?? "—"}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className="border-white/15 text-[9px] uppercase text-white"
                      >
                        {stage?.label ?? "—"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      <span
                        className={
                          dias > 14
                            ? "text-rose-300 font-bold"
                            : dias > 7
                              ? "text-amber-300"
                              : "text-muted-foreground"
                        }
                      >
                        {dias}d
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {rep > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-300">
                          <Repeat className="w-3 h-3" /> {rep}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full ${
                              pct >= 100
                                ? "bg-emerald-400"
                                : "bg-gradient-to-r from-primary/60 to-primary"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-white w-10 text-right">
                          {pct}%
                        </span>
                        {pct >= 100 && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right text-[10px]">
                      {lc.prazo ? (
                        <span
                          className={
                            atrasada
                              ? "text-rose-300 font-bold"
                              : "text-muted-foreground"
                          }
                        >
                          {lc.prazo}
                          {atrasada && (
                            <AlertTriangle className="inline w-3 h-3 ml-1" />
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <BarChart3 className="w-3 h-3" />
        {sorted.length} peças · ordenadas por {SORT_OPTIONS.find((o) => o.id === sort)?.label}
      </p>
    </ModuleLayout>
  );
}
