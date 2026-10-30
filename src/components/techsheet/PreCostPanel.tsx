// Painel de Engenharia de Custo, Encaixe CAD e Precificação por Mark-up Divisor Brasileiro.
// Corrige a omissão histórica das aplicações no pré-custo e adiciona decomposição
// fiscal/comercial completa (Simples Nacional, Lucro Presumido, Lucro Real).
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Scissors,
  Target,
  TrendingUp,
} from "lucide-react";
import { defaultEncaixeCadFor, useTechSheetStore } from "@/lib/techsheet/store";
import { normalizeTechSheetDoc } from "@/lib/techsheet/server";
import {
  computeFullTechSheetPricing,
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

  const cad = data.encaixeCad ?? defaultEncaixeCadFor();
  const divisorParams = resolveDivisorParams(data.preCost.divisor);
  const totals = useMemo(() => computeFullTechSheetPricing(data), [data]);

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
  };

  return (
    <Card id="sec-custo" className="glass-card rounded-xl p-5 space-y-6 border-border/70">
      {/* Encaixe CAD & Risco */}
      <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Scissors className="w-3.5 h-3.5 text-primary" /> Encaixe CAD, Risco &amp; Encolhimento
          </h4>
          <span className="text-2xs font-mono px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
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
              onChange={(e) => setEncaixeCad(refAtual, { ...cad, arquivoMolde: e.target.value })}
              className="h-8 text-xs font-mono mt-1"
            />
          </div>
        </div>
      </div>

      {/* Cabeçalho Custeio + Seletor de Método */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Engenharia de Custo &amp; Mark-up
            Divisor · {refAtual}
          </h3>
          <p className="text-2xs text-muted-foreground mt-0.5">
            Soma real: Materiais (BOM) + Costura (BOP) + Aplicações (Bordado/Silk) + Setup diluído
            na tiragem.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={totals.pricingMode === "divisor" ? "default" : "outline"}
            className="h-7 text-2xs"
            onClick={() => updatePreCost(refAtual, { pricingMode: "divisor" })}
          >
            Mark-up Divisor (Fiscal BR)
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

      {/* Composição do Custo Industrial e Final */}
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
        <Metric label={`Overhead (${data.preCost.overheadPct}%)`} value={brl(totals.overhead)} />
        <Metric
          label="Custo Final Peça"
          value={brl(totals.custoFinal)}
          icon={<Target className="w-3.5 h-3.5" />}
        />
      </div>

      {/* Parâmetros Base */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/60">
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

      {/* Bloco Mark-up Divisor Brasileiro vs Multiplicador */}
      {totals.pricingMode === "divisor" ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
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
                  className="h-6 text-[11px] px-2"
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-primary/20">
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

      {/* Alertas Inteligentes */}
      {(totals.acimaTarget || totals.precoAcimaAlvo || totals.divisorInvalido) && (
        <div className="flex items-start gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            {totals.divisorInvalido && (
              <div>
                A soma das deduções + margem ({totals.somaDeducoesPct}%) atingiu ou superou 99% do
                preço de venda, tornando o divisor matematicamente inviável.
              </div>
            )}
            {totals.acimaTarget && (
              <div>
                Custo industrial <strong>{brl(totals.industrial)}</strong> está{" "}
                <strong>{totals.desvioMetaPct.toFixed(1)}%</strong> acima da meta (
                {brl(data.preCost.targetCusto)}). Revise gramatura, encaixe CAD ou tempo de costura.
              </div>
            )}
            {totals.precoAcimaAlvo && data.preCost.targetPreco && (
              <div>
                PV calculado <strong>{brl(totals.precoSugerido)}</strong> supera a meta comercial de{" "}
                <strong>{brl(data.preCost.targetPreco)}</strong> (margem líquida real no preço-alvo:{" "}
                <strong>{totals.margemLiquidaRealPct.toFixed(1)}%</strong>).
              </div>
            )}
          </div>
        </div>
      )}

      {!totals.acimaTarget && !totals.precoAcimaAlvo && !totals.divisorInvalido && (
        <div className="flex items-center gap-2 text-2xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Engenharia dentro da meta industrial e margem
          líquida preservada.
        </div>
      )}
    </Card>
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
          ? "border-destructive/40 bg-destructive/10"
          : accent
            ? "border-primary/40 bg-primary/10"
            : "border-border/70 bg-background/50"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-sm font-bold text-foreground mt-1 truncate">{value}</div>
    </div>
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
        onChange={(e) => onChange(Math.max(0, Number.parseFloat(e.target.value) || 0))}
        className="h-8 text-xs font-mono mt-1"
      />
    </div>
  );
}
