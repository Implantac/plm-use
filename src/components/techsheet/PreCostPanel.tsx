// Pré-custo antes do piloto: BOM + BOP + overhead → custo final, markup → preço sugerido.
// Alertas quando custo industrial > meta, ou preço sugerido > preço-alvo.
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  useTechSheetStore,
  custoTotalBOM,
  custoTotalBOP,
} from "@/lib/techsheet/store";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export function PreCostPanel({ refAtual }: { refAtual: string }) {
  const ensure = useTechSheetStore((s) => s.ensure);
  const data = useTechSheetStore((s) => s.data[refAtual] ?? ensure(refAtual));
  const updatePreCost = useTechSheetStore((s) => s.updatePreCost);

  const totals = useMemo(() => {
    const bom = custoTotalBOM(data.bom);
    const bop = custoTotalBOP(data.bop);
    const industrial = bom + bop;
    const overhead = industrial * (data.preCost.overheadPct / 100);
    const custoFinal = industrial + overhead;
    const precoSugerido = custoFinal * (1 + data.preCost.markupPct / 100);
    const desvioMetaPct = data.preCost.targetCusto > 0
      ? ((industrial - data.preCost.targetCusto) / data.preCost.targetCusto) * 100
      : 0;
    const acimaTarget = industrial > data.preCost.targetCusto;
    const precoAcimaAlvo = !!data.preCost.targetPreco && precoSugerido > data.preCost.targetPreco;
    return { bom, bop, industrial, overhead, custoFinal, precoSugerido, desvioMetaPct, acimaTarget, precoAcimaAlvo };
  }, [data]);

  return (
    <Card className="glass-card rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <DollarSign className="w-4 h-4 text-primary" /> Pré-custo · Referência {refAtual}
        </h3>
        <StatusBadge acima={totals.acimaTarget} desvio={totals.desvioMetaPct} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric label="BOM (materiais)" value={brl(totals.bom)} />
        <Metric label="BOP (mão de obra)" value={brl(totals.bop)} />
        <Metric label="Overhead" value={brl(totals.overhead)} muted />
        <Metric label="Custo industrial" value={brl(totals.industrial)} accent={!totals.acimaTarget} danger={totals.acimaTarget} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-white/10">
        <FieldNumber
          label="Meta de custo (R$)"
          value={data.preCost.targetCusto}
          onChange={(v) => updatePreCost(refAtual, { targetCusto: v })}
        />
        <FieldNumber
          label="Overhead (%)"
          value={data.preCost.overheadPct}
          onChange={(v) => updatePreCost(refAtual, { overheadPct: v })}
        />
        <FieldNumber
          label="Markup (%)"
          value={data.preCost.markupPct}
          onChange={(v) => updatePreCost(refAtual, { markupPct: v })}
        />
        <FieldNumber
          label="Preço-alvo venda (R$)"
          value={data.preCost.targetPreco ?? 0}
          onChange={(v) => updatePreCost(refAtual, { targetPreco: v })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/10">
        <Metric label="Custo final (com overhead)" value={brl(totals.custoFinal)} icon={<Target className="w-3.5 h-3.5" />} />
        <Metric
          label="Preço sugerido"
          value={brl(totals.precoSugerido)}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          accent={!totals.precoAcimaAlvo}
          danger={totals.precoAcimaAlvo}
        />
      </div>

      {(totals.acimaTarget || totals.precoAcimaAlvo) && (
        <div className="flex items-start gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1">
            {totals.acimaTarget && (
              <div>
                Custo industrial <strong>{brl(totals.industrial)}</strong> está{" "}
                <strong>{totals.desvioMetaPct.toFixed(1)}%</strong> acima da meta ({brl(data.preCost.targetCusto)}).
                Reveja BOM/BOP antes de liberar o piloto.
              </div>
            )}
            {totals.precoAcimaAlvo && data.preCost.targetPreco && (
              <div>
                Preço sugerido <strong>{brl(totals.precoSugerido)}</strong> ultrapassa o preço-alvo ({brl(data.preCost.targetPreco)}).
                Ajuste markup, overhead ou negocie fornecedores.
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function StatusBadge({ acima, desvio }: { acima: boolean; desvio: number }) {
  if (acima) {
    return (
      <span className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-[10px] font-bold uppercase tracking-[0.18em]">
        <AlertTriangle className="w-3.5 h-3.5" /> {desvio.toFixed(1)}% acima da meta
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/30 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.18em]">
      <CheckCircle2 className="w-3.5 h-3.5" /> Dentro da meta
    </span>
  );
}

function Metric({
  label,
  value,
  accent,
  danger,
  muted,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
  muted?: boolean;
  icon?: React.ReactNode;
}) {
  const tone = danger
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : accent
    ? "border-primary/30 bg-primary/10 text-primary"
    : muted
    ? "border-white/10 bg-white/5 text-muted-foreground"
    : "border-white/10 bg-white/5 text-white";
  return (
    <div className={`px-3 py-2 rounded-md border ${tone}`}>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-base font-bold mt-1">{value}</div>
    </div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        step={0.1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-sm"
      />
    </div>
  );
}
