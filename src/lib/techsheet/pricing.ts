// Motor de Custeio Industrial + Precificação por Mark-up Divisor Brasileiro.
// Corrige duas lacunas históricas da ficha técnica:
//  1) Inclui aplicações (bordado/silk/sublimação/transfer) e setup amortizado
//     pela tiragem planejada no custo industrial;
//  2) Suporta o Mark-up Divisor tributário real de confecção brasileira
//     (Impostos + Comissão + Taxa Financeira + Frete + Inadimplência + Margem
//     Líquida Alvo), mantendo retrocompatibilidade 100% com o markupPct legado.
import { custoAplicacoesPecasTotal, setupTotal, type Aplicacao } from "./aplicacoes";
import { bomItemCustoEfetivo, round2, round4, type BomCalculable } from "./textile";

export type TaxRegimePresetId =
  | "SIMPLES_CONFECCAO"
  | "LUCRO_PRESUMIDO"
  | "LUCRO_REAL"
  | "PRIVATE_LABEL_ATACADO"
  | "PERSONALIZADO";

export type MarkupDivisorParams = {
  regime?: TaxRegimePresetId;
  impostosPct: number; // Simples / ICMS + PIS + COFINS
  comissaoPct: number; // Representante comercial
  taxaFinanceiraPct: number; // Antecipação / cartão / boleto
  fretePct: number; // Frete CIF médio
  inadimplenciaPct: number; // Reserva de perda / devolução
  margemLiquidaAlvoPct: number; // Lucro líquido desejado sobre o PV
};

export const TAX_REGIME_PRESETS: Record<
  Exclude<TaxRegimePresetId, "PERSONALIZADO">,
  { label: string; hint: string; values: Omit<MarkupDivisorParams, "regime"> }
> = {
  SIMPLES_CONFECCAO: {
    label: "Simples Nacional (Anexo II Indústria)",
    hint: "Confecção própria faturando até R$ 4,8M/ano",
    values: {
      impostosPct: 8.5,
      comissaoPct: 7.0,
      taxaFinanceiraPct: 2.5,
      fretePct: 2.0,
      inadimplenciaPct: 1.0,
      margemLiquidaAlvoPct: 20.0,
    },
  },
  LUCRO_PRESUMIDO: {
    label: "Lucro Presumido (Indústria Têxtil)",
    hint: "ICMS médio + PIS/COFINS cumulativo + IRPJ/CSLL",
    values: {
      impostosPct: 14.33,
      comissaoPct: 7.0,
      taxaFinanceiraPct: 2.5,
      fretePct: 2.5,
      inadimplenciaPct: 1.0,
      margemLiquidaAlvoPct: 18.0,
    },
  },
  LUCRO_REAL: {
    label: "Lucro Real (Varejo / Marca Própria)",
    hint: "PIS/COFINS não-cumulativo + ICMS cheio",
    values: {
      impostosPct: 18.25,
      comissaoPct: 8.0,
      taxaFinanceiraPct: 3.0,
      fretePct: 3.0,
      inadimplenciaPct: 1.25,
      margemLiquidaAlvoPct: 18.0,
    },
  },
  PRIVATE_LABEL_ATACADO: {
    label: "Private Label / Uniformes Corporativos",
    hint: "Lotes fechados sob encomenda com menor comissão/frete",
    values: {
      impostosPct: 11.5,
      comissaoPct: 5.0,
      taxaFinanceiraPct: 1.5,
      fretePct: 1.5,
      inadimplenciaPct: 0.5,
      margemLiquidaAlvoPct: 22.0,
    },
  },
};

export const DEFAULT_DIVISOR_PARAMS: MarkupDivisorParams = {
  regime: "SIMPLES_CONFECCAO",
  ...TAX_REGIME_PRESETS.SIMPLES_CONFECCAO.values,
};

export type PricingInput = {
  bom: BomCalculable[];
  bop: Array<{ custo: number; tempoMin: number }>;
  aplicacoes?: Aplicacao[];
  preCost: {
    targetCusto: number;
    overheadPct: number;
    markupPct: number;
    targetPreco?: number;
    pricingMode?: "markup" | "divisor";
    tiragemPlanejada?: number;
    divisor?: Partial<MarkupDivisorParams>;
  };
};

export type PricingBreakdown = {
  bom: number;
  bop: number;
  tempoBopMin: number;
  aplicacoesPeca: number;
  setupTotal: number;
  tiragemPlanejada: number;
  setupPorPeca: number;
  industrial: number;
  overhead: number;
  custoFinal: number;
  pricingMode: "markup" | "divisor";
  deducoesSemLucroPct: number;
  margemLiquidaAlvoPct: number;
  somaDeducoesPct: number;
  markupDivisor: number;
  markupMultiplicadorEquiv: number;
  divisorInvalido: boolean;
  precoSugerido: number;
  pontoEquilibrioPreco: number;
  precoReferenciaMargem: number;
  margemLiquidaRealPct: number;
  lucroLiquidoPeca: number;
  desvioMetaPct: number;
  acimaTarget: boolean;
  precoAcimaAlvo: boolean;
};

export function resolveDivisorParams(raw?: Partial<MarkupDivisorParams>): MarkupDivisorParams {
  return {
    regime: raw?.regime ?? DEFAULT_DIVISOR_PARAMS.regime,
    impostosPct: Math.max(0, Number(raw?.impostosPct ?? DEFAULT_DIVISOR_PARAMS.impostosPct) || 0),
    comissaoPct: Math.max(0, Number(raw?.comissaoPct ?? DEFAULT_DIVISOR_PARAMS.comissaoPct) || 0),
    taxaFinanceiraPct: Math.max(
      0,
      Number(raw?.taxaFinanceiraPct ?? DEFAULT_DIVISOR_PARAMS.taxaFinanceiraPct) || 0,
    ),
    fretePct: Math.max(0, Number(raw?.fretePct ?? DEFAULT_DIVISOR_PARAMS.fretePct) || 0),
    inadimplenciaPct: Math.max(
      0,
      Number(raw?.inadimplenciaPct ?? DEFAULT_DIVISOR_PARAMS.inadimplenciaPct) || 0,
    ),
    margemLiquidaAlvoPct: Math.max(
      0,
      Number(raw?.margemLiquidaAlvoPct ?? DEFAULT_DIVISOR_PARAMS.margemLiquidaAlvoPct) || 0,
    ),
  };
}

export function computeFullTechSheetPricing(input: PricingInput): PricingBreakdown {
  const bom = round2(input.bom.reduce((acc, item) => acc + bomItemCustoEfetivo(item), 0));
  const bop = round2(input.bop.reduce((acc, step) => acc + (Number(step.custo) || 0), 0));
  const tempoBopMin = round2(
    input.bop.reduce((acc, step) => acc + (Number(step.tempoMin) || 0), 0),
  );
  const apps = input.aplicacoes ?? [];
  const aplicacoesPeca = custoAplicacoesPecasTotal(apps);
  const setup = setupTotal(apps);
  const tiragemPlanejada = Math.max(0, Math.floor(Number(input.preCost.tiragemPlanejada) || 0));
  const setupPorPeca = tiragemPlanejada > 0 && setup > 0 ? round2(setup / tiragemPlanejada) : 0;

  // Agora aplicações e setup amortizado entram de verdade no Custo Industrial!
  const industrial = round2(bom + bop + aplicacoesPeca + setupPorPeca);
  const overheadPct = Math.max(0, Number(input.preCost.overheadPct) || 0);
  const overhead = round2(industrial * (overheadPct / 100));
  const custoFinal = round2(industrial + overhead);

  const div = resolveDivisorParams(input.preCost.divisor);
  const deducoesSemLucroPct = round2(
    div.impostosPct + div.comissaoPct + div.taxaFinanceiraPct + div.fretePct + div.inadimplenciaPct,
  );
  const margemLiquidaAlvoPct = round2(div.margemLiquidaAlvoPct);
  const somaDeducoesPct = round2(deducoesSemLucroPct + margemLiquidaAlvoPct);

  const divisorInvalido = somaDeducoesPct >= 99;
  const markupDivisor = divisorInvalido ? 0 : round4(1 - somaDeducoesPct / 100);
  const markupMultiplicadorEquiv = markupDivisor > 0 ? round4(1 / markupDivisor) : 0;

  const pricingMode = input.preCost.pricingMode ?? "markup";
  const precoSugerido =
    pricingMode === "divisor"
      ? markupDivisor > 0
        ? round2(custoFinal / markupDivisor)
        : 0
      : round2(custoFinal * (1 + (Number(input.preCost.markupPct) || 0) / 100));

  const pontoEquilibrioPreco =
    deducoesSemLucroPct < 99 ? round2(custoFinal / (1 - deducoesSemLucroPct / 100)) : 0;

  // Se o comercial definiu um Preço-Alvo (targetPreco), medimos a margem líquida
  // real naquele preço; caso contrário medimos sobre o próprio preço sugerido.
  const precoReferenciaMargem =
    input.preCost.targetPreco && input.preCost.targetPreco > 0
      ? input.preCost.targetPreco
      : precoSugerido;

  const receitaLiquidaAposImpostos = precoReferenciaMargem * (1 - deducoesSemLucroPct / 100);
  const lucroLiquidoPeca = round2(receitaLiquidaAposImpostos - custoFinal);
  const margemLiquidaRealPct =
    precoReferenciaMargem > 0 ? round2((lucroLiquidoPeca / precoReferenciaMargem) * 100) : 0;

  const targetCusto = Number(input.preCost.targetCusto) || 0;
  const desvioMetaPct =
    targetCusto > 0 ? round2(((industrial - targetCusto) / targetCusto) * 100) : 0;
  const acimaTarget = targetCusto > 0 && industrial > targetCusto;
  const precoAcimaAlvo =
    !!input.preCost.targetPreco &&
    input.preCost.targetPreco > 0 &&
    precoSugerido > input.preCost.targetPreco;

  return {
    bom,
    bop,
    tempoBopMin,
    aplicacoesPeca,
    setupTotal: setup,
    tiragemPlanejada,
    setupPorPeca,
    industrial,
    overhead,
    custoFinal,
    pricingMode,
    deducoesSemLucroPct,
    margemLiquidaAlvoPct,
    somaDeducoesPct,
    markupDivisor,
    markupMultiplicadorEquiv,
    divisorInvalido,
    precoSugerido,
    pontoEquilibrioPreco,
    precoReferenciaMargem,
    margemLiquidaRealPct,
    lucroLiquidoPeca,
    desvioMetaPct,
    acimaTarget,
    precoAcimaAlvo,
  };
}
