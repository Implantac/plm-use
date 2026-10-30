// Painel Industrial de Engenharia de Custo, Waterfall 100% do PV, Target Costing Reverso
// e Comparativo Tributário Brasileiro (Simples Nacional, Lucro Presumido, Lucro Real).
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Scale,
  Scissors,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { defaultEncaixeCadFor, useTechSheetStore } from "@/lib/techsheet/store";
import { normalizeTechSheetDoc } from "@/lib/techsheet/server";
import {
  compareTaxRegimes,
  computeFullTechSheetPricing,
  computeReverseTargetCost,
  resolveDivisorParams,
  TAX_REGIME_PRESETS,
  type MarkupDivisorParams,
  type TaxRegimePresetId,
} from "@/lib/techsheet/pricing";

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export function PreCostPanel({ refAtual }: { refAtual: string }) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const raw = useTechSheetStore((s) => s.data[refAtual] ?? ensure(refAtual));
  const data = normalizeTechSheetDoc(raw);
  const updatePreCost = useTechSheetStore((s) => s.updatePreCost);
  const setEncaixeCad = useTechSheetStore((s) => s.setEncaixeCad);

  const [collapsed, setCollapsed] = useState(false);
  const [showCompareRegimes, setShowCompareRegimes] = useState(false);

  const cad = data.encaixeCad ?? defaultEncaixeCadFor();
  const divisorParams = resolveDivisorParams(data.preCost.divisor);
  const totals = useMemo(() => computeFullTechSheetPricing(data), [data]);
  const reverseTarget = useMemo(() => computeReverseTargetCost(data), [data]);
  const regimeComparison = useMemo(() => compareTaxRegimes(data), [data]);

  const patchDivisor = (patch: Partial<MarkupDivisorParams>) => {
    updatePreCost(refAtual, {
      pricingMode: "divisor",
      divisor: {
        ...divisorParams,
        regime: "PERSONALIZADO",
        ...patch,
      },
    });
  };

  const applyPreset = (presetId: Exclude<TaxRegimePresetId, "PERSONALIZADO">) => {
    updatePreCost(refAtual, {
      pricingMode: "divisor",
      divisor: {
        regime: presetId,
        ...TAX_REGIME_PRESETS[presetId].values,
      },
    });
    toast.success(`Regime aplicado: ${TAX_REGIME_PRESETS[presetId].label}`);
  };

  // Decomposição percentual de 100% do Preço de Referência (Waterfall)
  const pvRef = Math.max(0.01, totals.precoReferenciaMargem || totals.precoSugerido || 1);
  const pctMp = Math.min(100, Math.max(0, (totals.bom / pvRef) * 100));
  const pctMo = Math.min(100, Math.max(0, (totals.bop / pvRef) * 100));
  const pctAplicOh = Math.min(
    100,
    Math.max(0, ((totals.aplicacoesPeca + totals.setupPorPeca + totals.overhead) / pvRef) * 100),
  );
  const pctImpostos = Math.min(100, Math.max(0, divisorParams.impostosPct));
  const pctComerc = Math.min(
    100,
    Math.max(0, totals.deducoesSemLucroPct - divisorParams.impostosPct),
  );
  const pctLucro = Math.max(0, totals.margemLiquidaRealPct);

  return (
    <Card className="glass-card rounded-xl p-4 lg:p-5 space-y-5 border-border/80">
      {/* Cabeçalho Colapsável no padrão do Cockpit Fluido 2.0 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-teal-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-teal-500" />
          )}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-500" /> Engenharia de Custo, Mark-up Divisor
              &amp; Target Costing
              <span className="rounded bg-teal-500/15 border border-teal-500/35 px-1.5 py-0.5 text-[10px] font-mono text-teal-700 dark:text-teal-300">
                PV {brl(totals.precoSugerido)}
              </span>
            </h3>
            {!collapsed && (
              <p className="text-2xs text-muted-foreground mt-0.5">
                BOM + Costura (SAM) + Aplicações + Setup diluído na tiragem + Impostos por dentro
                (Divisor Fiscal BR).
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-2xs gap-1"
            onClick={() => setShowCompareRegimes((v) => !v)}
          >
            <Scale className="w-3 h-3 text-teal-500" /> Comparar Regimes
          </Button>
          <Button
            size="sm"
            variant={totals.pricingMode === "divisor" ? "default" : "outline"}
            className={`h-7 text-2xs ${
              totals.pricingMode === "divisor" ? "bg-teal-600 hover:bg-teal-500 text-white" : ""
            }`}
            onClick={() => updatePreCost(refAtual, { pricingMode: "divisor" })}
          >
            Mark-up Divisor (BR)
          </Button>
          <Button
            size="sm"
            variant={totals.pricingMode === "markup" ? "default" : "outline"}
            className="h-7 text-2xs"
            onClick={() => updatePreCost(refAtual, { pricingMode: "markup" })}
          >
            Multiplicador Simples
          </Button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* 1. Barra Visual Waterfall — Decomposição de 100% do Preço de Venda */}
          <div className="rounded-lg border border-border/80 bg-muted/25 p-3 space-y-2">
            <div className="flex items-center justify-between text-2xs flex-wrap gap-2">
              <span className="font-semibold text-foreground">
                Raio-X de 100% do Preço ({brl(pvRef)}/peça)
              </span>
              <span className="font-mono text-muted-foreground">
                Ponto de Equilíbrio (Lucro R$ 0):{" "}
                <strong className="text-foreground">{brl(totals.pontoEquilibrioPreco)}</strong>
              </span>
            </div>

            <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted border border-border/60">
              <div
                style={{ width: `${pctMp}%` }}
                className="bg-sky-500 transition-all"
                title={`Matéria-Prima (BOM): ${pctMp.toFixed(1)}%`}
              />
              <div
                style={{ width: `${pctMo}%` }}
                className="bg-teal-500 transition-all"
                title={`Mão de Obra Costura (BOP): ${pctMo.toFixed(1)}%`}
              />
              <div
                style={{ width: `${pctAplicOh}%` }}
                className="bg-indigo-500 transition-all"
                title={`Aplicações + Setup + Overhead: ${pctAplicOh.toFixed(1)}%`}
              />
              <div
                style={{ width: `${pctImpostos}%` }}
                className="bg-amber-500 transition-all"
                title={`Impostos NF: ${pctImpostos.toFixed(1)}%`}
              />
              <div
                style={{ width: `${pctComerc}%` }}
                className="bg-orange-500 transition-all"
                title={`Comissão + Taxa Financ. + Frete + Inadimpl.: ${pctComerc.toFixed(1)}%`}
              />
              <div
                style={{ width: `${pctLucro}%` }}
                className="bg-emerald-500 transition-all"
                title={`Lucro Líquido Real: ${pctLucro.toFixed(1)}%`}
              />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-muted-foreground">
              <LegendDot color="bg-sky-500" label={`MP ${pctMp.toFixed(1)}%`} />
              <LegendDot color="bg-teal-500" label={`MO ${pctMo.toFixed(1)}%`} />
              <LegendDot color="bg-indigo-500" label={`Aplic+OH ${pctAplicOh.toFixed(1)}%`} />
              <LegendDot color="bg-amber-500" label={`Impostos ${pctImpostos.toFixed(1)}%`} />
              <LegendDot color="bg-orange-500" label={`Comerc. ${pctComerc.toFixed(1)}%`} />
              <LegendDot
                color="bg-emerald-500"
                label={`Margem Líq. ${totals.margemLiquidaRealPct.toFixed(1)}%`}
              />
            </div>
          </div>

          {/* 2. Comparativo Instantâneo de Regimes Tributários (expansível) */}
          {showCompareRegimes && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {regimeComparison.map((item) => {
                const isCurrent = divisorParams.regime === item.regime;
                return (
                  <div
                    key={item.regime}
                    className={`rounded-lg border p-3 space-y-1.5 transition ${
                      isCurrent
                        ? "border-teal-500/70 bg-teal-500/10"
                        : "border-border/80 bg-background/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{item.label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Div {item.divisor.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between font-mono">
                      <span className="text-2xs text-muted-foreground">
                        Imp. {item.impostosPct}% · Ded. {item.deducoesSemLucroPct}%
                      </span>
                      <strong className="text-sm text-teal-600 dark:text-teal-300">
                        {brl(item.precoSugerido)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        Lucro: {brl(item.lucroLiquidoPeca)}/pç
                      </span>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => applyPreset(item.regime)}
                          className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          Usar regime
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. Composição do Custo Industrial e Final */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
            <Metric label="BOM (MP)" value={brl(totals.bom)} />
            <Metric label="BOP (Costura)" value={brl(totals.bop)} />
            <Metric
              label="Aplicações + Setup"
              value={brl(totals.aplicacoesPeca + totals.setupPorPeca)}
            />
            <Metric
              label="Custo Industrial"
              value={brl(totals.industrial)}
              accent={!totals.acimaTarget}
              danger={totals.acimaTarget}
            />
            <Metric
              label={`Overhead (${data.preCost.overheadPct}%)`}
              value={brl(totals.overhead)}
            />
            <Metric
              label="Custo Final Peça"
              value={brl(totals.custoFinal)}
              icon={<Target className="w-3.5 h-3.5" />}
            />
          </div>

          {/* 4. Engenharia Reversa de Preço Alvo (Target Costing de Coleção) */}
          <div className="rounded-lg border border-teal-500/35 bg-teal-500/6 p-3.5 flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-teal-500" /> Target Costing Reverso (Meta PV{" "}
                <span className="font-mono">{brl(reverseTarget.precoAlvo)}</span> c/{" "}
                {totals.margemLiquidaAlvoPct}% de margem líquida)
              </p>
              <p className="text-2xs text-muted-foreground">
                Teto máximo permitido de Custo Industrial:{" "}
                <strong className="font-mono text-foreground">
                  {brl(reverseTarget.custoIndustrialMaximo)}
                </strong>{" "}
                · Custo atual:{" "}
                <strong className="font-mono text-foreground">
                  {brl(reverseTarget.custoIndustrialAtual)}
                </strong>{" "}
                ·{" "}
                <strong
                  className={`font-mono ${
                    reverseTarget.viavel
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {reverseTarget.folgaCustoIndustrial >= 0
                    ? `Folga de +${brl(reverseTarget.folgaCustoIndustrial)}/pç`
                    : `Enxugar ${brl(Math.abs(reverseTarget.folgaCustoIndustrial))}/pç na engenharia`}
                </strong>
              </p>
            </div>
            {reverseTarget.custoIndustrialMaximo > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-2xs"
                onClick={() => {
                  updatePreCost(refAtual, { targetCusto: reverseTarget.custoIndustrialMaximo });
                  toast.success(
                    `Meta de Custo Industrial alinhada ao Target Costing (${brl(reverseTarget.custoIndustrialMaximo)}).`,
                  );
                }}
              >
                Adotar Teto como Meta Custo
              </Button>
            )}
          </div>

          {/* 5. Parâmetros Base */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-border/60">
            <FieldNum
              label="Meta Custo Ind. (R$)"
              value={data.preCost.targetCusto}
              onChange={(v) => updatePreCost(refAtual, { targetCusto: v })}
            />
            <FieldNum
              label="Overhead Indireto (%)"
              value={data.preCost.overheadPct}
              onChange={(v) => updatePreCost(refAtual, { overheadPct: v })}
            />
            <FieldNum
              label="Tiragem Padrão (peças)"
              value={data.preCost.tiragemPlanejada ?? 200}
              step={10}
              onChange={(v) =>
                updatePreCost(refAtual, { tiragemPlanejada: Math.max(1, Math.round(v)) })
              }
            />
            <FieldNum
              label="Preço-Alvo Comercial (R$)"
              value={data.preCost.targetPreco ?? 0}
              onChange={(v) => updatePreCost(refAtual, { targetPreco: v > 0 ? v : undefined })}
            />
          </div>

          {/* 6. Bloco Mark-up Divisor Brasileiro vs Multiplicador */}
          {totals.pricingMode === "divisor" ? (
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-foreground">
                  Regime Tributário &amp; Deduções sobre Preço de Venda (PV = Custo Final ÷ Divisor)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    Object.keys(TAX_REGIME_PRESETS) as Array<
                      Exclude<TaxRegimePresetId, "PERSONALIZADO">
                    >
                  ).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={divisorParams.regime === k ? "default" : "outline"}
                      className={`h-6 text-[11px] px-2 ${
                        divisorParams.regime === k ? "bg-teal-600 hover:bg-teal-500 text-white" : ""
                      }`}
                      title={TAX_REGIME_PRESETS[k].hint}
                      onClick={() => applyPreset(k)}
                    >
                      {TAX_REGIME_PRESETS[k].label.split(" (")[0]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
                <FieldNum
                  label="Impostos NF (%)"
                  value={divisorParams.impostosPct}
                  step={0.25}
                  onChange={(v) => patchDivisor({ impostosPct: v })}
                />
                <FieldNum
                  label="Comissão Rep. (%)"
                  value={divisorParams.comissaoPct}
                  step={0.5}
                  onChange={(v) => patchDivisor({ comissaoPct: v })}
                />
                <FieldNum
                  label="Taxa Financ. (%)"
                  value={divisorParams.taxaFinanceiraPct}
                  step={0.25}
                  onChange={(v) => patchDivisor({ taxaFinanceiraPct: v })}
                />
                <FieldNum
                  label="Frete CIF (%)"
                  value={divisorParams.fretePct}
                  step={0.25}
                  onChange={(v) => patchDivisor({ fretePct: v })}
                />
                <FieldNum
                  label="Inadimplência (%)"
                  value={divisorParams.inadimplenciaPct}
                  step={0.25}
                  onChange={(v) => patchDivisor({ inadimplenciaPct: v })}
                />
                <FieldNum
                  label="Margem Líq. Alvo (%)"
                  value={divisorParams.margemLiquidaAlvoPct}
                  step={0.5}
                  onChange={(v) => patchDivisor({ margemLiquidaAlvoPct: v })}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-teal-500/20">
                <Metric
                  label="Mark-up Divisor"
                  value={
                    totals.divisorInvalido
                      ? "Inválido (≥99%)"
                      : `${totals.markupDivisor.toFixed(4)} (${totals.markupMultiplicadorEquiv.toFixed(2)}×)`
                  }
                />
                <Metric label="Ponto de Equilíbrio" value={brl(totals.pontoEquilibrioPreco)} />
                <Metric
                  label="PV Calculado (Sugerido)"
                  value={brl(totals.precoSugerido)}
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  accent={!totals.precoAcimaAlvo && !totals.divisorInvalido}
                  danger={totals.precoAcimaAlvo || totals.divisorInvalido}
                />
                <Metric
                  label="Margem Líquida Real"
                  value={`${totals.margemLiquidaRealPct.toFixed(1)}% (${brl(totals.lucroLiquidoPeca)})`}
                  accent={totals.margemLiquidaRealPct >= totals.margemLiquidaAlvoPct - 0.5}
                  danger={totals.margemLiquidaRealPct < 0}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <FieldNum
                label="Markup Multiplicador sobre Custo (%)"
                value={data.preCost.markupPct}
                step={5}
                onChange={(v) => updatePreCost(refAtual, { markupPct: v })}
              />
              <Metric label="Ponto de Equilíbrio Fiscal" value={brl(totals.pontoEquilibrioPreco)} />
              <Metric
                label="Preço Sugerido (Multiplicador)"
                value={brl(totals.precoSugerido)}
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                accent={!totals.precoAcimaAlvo}
                danger={totals.precoAcimaAlvo}
              />
            </div>
          )}

          {/* 7. Encaixe CAD & Risco */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5 text-teal-500" /> Encaixe CAD, Risco &amp;
                Encolhimento
              </h4>
              <span className="text-2xs font-mono px-2 py-0.5 rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                Aproveitamento: {cad.eficienciaPct}%
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              <FieldNum
                label="Eficiência Risco (%)"
                value={cad.eficienciaPct}
                onChange={(v) => setEncaixeCad(refAtual, { ...cad, eficienciaPct: v })}
              />
              <FieldNum
                label="Largura Enfesto (m)"
                value={cad.larguraEnfestoM}
                step={0.01}
                onChange={(v) => setEncaixeCad(refAtual, { ...cad, larguraEnfestoM: v })}
              />
              <FieldNum
                label="Encolhim. Urdume (%)"
                value={cad.encolhimentoUrdumePct ?? 0}
                step={0.5}
                onChange={(v) => setEncaixeCad(refAtual, { ...cad, encolhimentoUrdumePct: v })}
              />
              <FieldNum
                label="Encolhim. Trama (%)"
                value={cad.encolhimentoTramaPct ?? 0}
                step={0.5}
                onChange={(v) => setEncaixeCad(refAtual, { ...cad, encolhimentoTramaPct: v })}
              />
              <div className="col-span-2 md:col-span-1">
                <Label className="text-2xs text-muted-foreground">Arquivo Molde CAD</Label>
                <Input
                  value={cad.arquivoMolde ?? ""}
                  placeholder="REF_v1.ADS"
                  onChange={(e) =>
                    setEncaixeCad(refAtual, { ...cad, arquivoMolde: e.target.value })
                  }
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
            </div>
          </div>

          {/* 8. Alertas Inteligentes */}
          {(totals.acimaTarget || totals.precoAcimaAlvo || totals.divisorInvalido) && (
            <div className="flex items-start gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                {totals.divisorInvalido && (
                  <div>
                    A soma das deduções + margem ({totals.somaDeducoesPct}%) atingiu ou superou 99%
                    do preço de venda, tornando o divisor matematicamente inviável.
                  </div>
                )}
                {totals.acimaTarget && (
                  <div>
                    Custo industrial ({brl(totals.industrial)}) está{" "}
                    <strong>+{totals.desvioMetaPct}%</strong> acima da meta de{" "}
                    {brl(data.preCost.targetCusto)}.
                  </div>
                )}
                {totals.precoAcimaAlvo && (
                  <div>
                    Preço sugerido ({brl(totals.precoSugerido)}) ultrapassa o preço-alvo comercial (
                    {brl(data.preCost.targetPreco ?? 0)}). Margem líquida real no preço-alvo:{" "}
                    <strong>{totals.margemLiquidaRealPct}%</strong>.
                  </div>
                )}
              </div>
            </div>
          )}

          {!totals.acimaTarget && !totals.precoAcimaAlvo && !totals.divisorInvalido && (
            <div className="flex items-center gap-2 text-2xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Engenharia saudável: custo industrial dentro
              da meta e margem líquida preservada ({totals.margemLiquidaRealPct.toFixed(1)}%).
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </span>
  );
}

function FieldNum({
  label,
  value,
  step = 0.5,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <Label className="text-2xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-8 text-xs font-mono mt-1"
      />
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  accent,
  danger,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        danger
          ? "border-destructive/40 bg-destructive/8"
          : accent
            ? "border-emerald-500/35 bg-emerald-500/8"
            : "border-border/70 bg-background/50"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div
        className={`text-xs font-bold font-mono mt-1 ${
          danger
            ? "text-destructive"
            : accent
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
