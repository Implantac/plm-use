import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Factory,
  Gauge,
  Timer,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { computeLineBalancing } from "@/lib/techsheet/line-balancing";
import { useTechSheetStore } from "@/lib/techsheet/store";

export function OperationSequencePanel({ refAtual }: { refAtual: string }) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const docFromStore = useTechSheetStore((s) => s.data[refAtual]);
  const doc = docFromStore ?? ensure(refAtual);

  useEffect(() => {
    if (!docFromStore) ensure(refAtual);
  }, [docFromStore, ensure, refAtual]);

  const [expanded, setExpanded] = useState(true);
  const [costureiras, setCostureiras] = useState(8);
  const [eficienciaPct, setEficienciaPct] = useState(78);
  const [cotacaoFaccaoInput, setCotacaoFaccaoInput] = useState<string>("");

  const lotePlanejado = Math.max(1, doc.preCost.tiragemPlanejada || 600);

  const balancing = useMemo(() => {
    const parsedFaccao =
      cotacaoFaccaoInput.trim() !== "" ? Number(cotacaoFaccaoInput.replace(",", ".")) : undefined;
    return computeLineBalancing(doc.bop, {
      costureiras,
      jornadaMin: 480,
      eficienciaPct,
      lotePlanejado,
      cotacaoFaccaoPeca:
        parsedFaccao != null && Number.isFinite(parsedFaccao) ? parsedFaccao : undefined,
    });
  }, [doc.bop, costureiras, eficienciaPct, lotePlanejado, cotacaoFaccaoInput]);

  if (doc.bop.length === 0) return null;

  const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <section
      aria-label="Cronoanálise e Balanceamento de Célula"
      className="rounded-lg border border-border bg-card overflow-hidden shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          <Timer className="h-4 w-4 text-[#2A6F7D] dark:text-[#6AD8FA]" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Cronoanálise, Balanceamento de Célula & Make-or-Buy (Facção)
            </h3>
            <p className="text-2xs text-muted-foreground">
              SAM · Pitch Time · Alocação de máquinas · Célula própria vs Facção externa
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
          )}
        </button>

        <div className="flex flex-wrap items-center gap-1.5 text-2xs">
          <span className="rounded border border-border bg-background/80 px-2 py-0.5 font-mono text-foreground">
            SAM <strong>{balancing.samTotal.toFixed(1)} min</strong>
          </span>
          <span className="rounded border border-[#2C6478]/40 bg-[#2C6478]/10 px-2 py-0.5 font-mono text-[#1E5568] dark:text-[#7AD4F0]">
            Cap. <strong>{balancing.capacidadePecasDia} pçs/dia</strong> (
            {balancing.diasParaConcluirLote.toFixed(1)}d p/ {lotePlanejado} pçs)
          </span>
          <span
            className={`rounded border px-2 py-0.5 font-semibold ${
              balancing.eficienciaBalanceamentoPct >= 75
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}
          >
            Balanc. {balancing.eficienciaBalanceamentoPct.toFixed(0)}%
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3.5">
          {/* Controles interativos da célula + Make-or-Buy */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="rounded-md border border-border bg-muted/25 p-2.5">
              <label
                htmlFor="cell-operators-input"
                className="flex items-center gap-1 text-2xs uppercase tracking-wider text-muted-foreground"
              >
                <Users className="h-3 w-3 text-[#2A6F7D] dark:text-[#6AD8FA]" /> Costureiras
              </label>
              <Input
                id="cell-operators-input"
                type="number"
                min={1}
                max={80}
                value={costureiras}
                onChange={(e) =>
                  setCostureiras(Math.max(1, Math.min(80, Number(e.target.value) || 1)))
                }
                className="mt-1 h-7 font-mono text-xs bg-background"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {balancing.postosAlocadosTotal} postos sugeridos
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/25 p-2.5">
              <label
                htmlFor="cell-eff-input"
                className="flex items-center gap-1 text-2xs uppercase tracking-wider text-muted-foreground"
              >
                <Gauge className="h-3 w-3 text-[#2A6F7D] dark:text-[#6AD8FA]" /> Eficiência (%)
              </label>
              <Input
                id="cell-eff-input"
                type="number"
                min={35}
                max={100}
                value={eficienciaPct}
                onChange={(e) =>
                  setEficienciaPct(Math.max(35, Math.min(100, Number(e.target.value) || 75)))
                }
                className="mt-1 h-7 font-mono text-xs bg-background"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Pitch: {balancing.pitchTimeMin.toFixed(2)} min/pç
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/25 p-2.5">
              <p className="flex items-center gap-1 text-2xs uppercase tracking-wider text-muted-foreground">
                <Factory className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Costura
                Interna
              </p>
              <p className="mt-1 text-sm font-bold font-mono text-foreground">
                {fmtBrl(balancing.custoInternoPeca)}
                <span className="text-2xs font-normal text-muted-foreground">/pç</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Custo-min: {fmtBrl(balancing.custoMinutoMedio)}/min
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/25 p-2.5">
              <label
                htmlFor="cell-faccao-quote-input"
                className="flex items-center gap-1 text-2xs uppercase tracking-wider text-muted-foreground"
              >
                <Building2 className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Cotação Facção
              </label>
              <Input
                id="cell-faccao-quote-input"
                type="number"
                min={0}
                step={0.1}
                placeholder={balancing.makeOrBuy.cotacaoFaccaoPeca.toFixed(2)}
                value={cotacaoFaccaoInput}
                onChange={(e) => setCotacaoFaccaoInput(e.target.value)}
                className="mt-1 h-7 font-mono text-xs bg-background"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">R$/pç facção externa</p>
            </div>

            <div
              className={`rounded-md border p-2.5 ${
                balancing.makeOrBuy.recomendacao === "interno"
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : balancing.makeOrBuy.recomendacao === "faccao"
                    ? "border-[#2C6478]/50 bg-[#2C6478]/15"
                    : "border-border bg-muted/25"
              }`}
            >
              <p className="flex items-center gap-1 text-2xs uppercase tracking-wider text-muted-foreground">
                <Activity className="h-3 w-3" /> Decisão Make-or-Buy
              </p>
              <p className="mt-1 text-xs font-bold uppercase text-foreground">
                {balancing.makeOrBuy.recomendacao === "interno"
                  ? "Produzir Interno"
                  : balancing.makeOrBuy.recomendacao === "faccao"
                    ? "Enviar p/ Facção"
                    : "Custo Equivalente"}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                {balancing.makeOrBuy.diferencaPorPeca >= 0
                  ? `Interno poupa ${fmtBrl(balancing.makeOrBuy.diferencaNoLote)} no lote`
                  : `Facção poupa ${fmtBrl(Math.abs(balancing.makeOrBuy.diferencaNoLote))} no lote`}
              </p>
            </div>
          </div>

          {/* Gráfico horizontal de balanceamento por operação vs Pitch Time */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-muted-foreground">
              <span className="uppercase tracking-wider font-semibold">
                Balanceamento de Postos por Operação (Pitch {balancing.pitchTimeMin.toFixed(2)} min)
              </span>
              {balancing.gargalo && (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Gargalo: {balancing.gargalo.etapa} ({balancing.gargalo.maquina} ·{" "}
                  {balancing.gargalo.tempoMin.toFixed(1)} min)
                </span>
              )}
            </div>

            {balancing.stations.map((st) => {
              const isGargalo = balancing.gargalo?.etapa === st.etapa;
              const barPct = Math.min(
                100,
                Math.max(8, Math.round((st.ocupacaoPostoPct / 120) * 100)),
              );
              return (
                <div
                  key={st.id}
                  className="grid grid-cols-12 items-center gap-2 rounded border border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs"
                >
                  <div className="col-span-5 sm:col-span-4 truncate">
                    <span className="font-mono text-2xs text-muted-foreground mr-1.5">
                      #{st.seq}
                    </span>
                    <span
                      className={
                        isGargalo
                          ? "font-semibold text-amber-700 dark:text-amber-300"
                          : "text-foreground"
                      }
                    >
                      {st.etapa}
                    </span>
                    <span className="ml-1.5 text-2xs text-muted-foreground">· {st.maquina}</span>
                  </div>

                  <div className="col-span-4 sm:col-span-5">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          st.acimaDoPitch ? "bg-amber-500" : "bg-[#3B6376] dark:bg-[#48CAFA]"
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="col-span-3 flex items-center justify-end gap-1.5 font-mono text-2xs">
                    <span className="rounded bg-background border border-border px-1.5 py-0.5 text-foreground">
                      {st.postosAlocados}p
                    </span>
                    <span className="text-muted-foreground">{st.tempoMin.toFixed(1)}m</span>
                    <span
                      className={
                        st.acimaDoPitch
                          ? "text-amber-700 dark:text-amber-300 font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {st.ocupacaoPostoPct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
