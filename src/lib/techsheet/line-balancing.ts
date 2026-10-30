// Motor puro de Cronoanálise, Balanceamento de Célula de Costura (Takt / Pitch Time)
// e Decisão Make-or-Buy (Costura Interna vs Facção Externa) — PLM 2.0.

import type { BopStep } from "./store";
import { round2 } from "./textile";

export interface LineBalancingParams {
  costureiras: number;
  jornadaMin: number;
  eficienciaPct: number;
  metaPecasDia?: number;
  lotePlanejado: number;
  cotacaoFaccaoPeca?: number;
}

export interface BalancedStationRow {
  id: string;
  seq: number;
  etapa: string;
  setor: string;
  maquina: string;
  tempoMin: number;
  custo: number;
  postosTeoricos: number;
  postosAlocados: number;
  ocupacaoPostoPct: number;
  acimaDoPitch: boolean;
}

export interface LineBalancingResult {
  samTotal: number;
  custoInternoPeca: number;
  custoMinutoMedio: number;
  capacidadePecasDia: number;
  pitchTimeMin: number;
  taktTimeMetaMin: number;
  diasParaConcluirLote: number;
  postosAlocadosTotal: number;
  eficienciaBalanceamentoPct: number;
  gargalo: { etapa: string; maquina: string; tempoMin: number } | null;
  stations: BalancedStationRow[];
  makeOrBuy: {
    cotacaoFaccaoPeca: number;
    diferencaPorPeca: number;
    diferencaNoLote: number;
    recomendacao: "interno" | "faccao" | "equivalente";
  };
}

export function computeLineBalancing(
  bop: BopStep[],
  raw: LineBalancingParams,
): LineBalancingResult {
  const costureiras = Math.max(1, Math.round(Number(raw.costureiras) || 1));
  const jornadaMin = Math.max(60, Number(raw.jornadaMin) || 480);
  const eficiencia = Math.min(1, Math.max(0.1, (Number(raw.eficienciaPct) || 75) / 100));
  const lotePlanejado = Math.max(1, Math.round(Number(raw.lotePlanejado) || 200));

  const ordered = [...bop].sort((a, b) => a.seq - b.seq);
  const samTotal = round2(
    ordered.reduce((acc, s) => acc + Math.max(0, Number(s.tempoMin) || 0), 0),
  );
  const custoInternoPeca = round2(
    ordered.reduce((acc, s) => acc + Math.max(0, Number(s.custo) || 0), 0),
  );
  const custoMinutoMedio = samTotal > 0 ? round2(custoInternoPeca / samTotal) : 0;

  const minutosUteisCelulaDia = jornadaMin * costureiras * eficiencia;
  const capacidadePecasDia = samTotal > 0 ? Math.floor(minutosUteisCelulaDia / samTotal) : 0;

  // Pitch Time teórico da célula = SAM / nº de operadores
  const pitchTimeMin = samTotal > 0 ? round2(samTotal / costureiras) : 0;
  const metaDia = Math.max(1, Number(raw.metaPecasDia) || capacidadePecasDia || 1);
  const taktTimeMetaMin = round2((jornadaMin * eficiencia) / metaDia);

  let gargalo: LineBalancingResult["gargalo"] = null;
  for (const s of ordered) {
    const t = Math.max(0, Number(s.tempoMin) || 0);
    if (!gargalo || t > gargalo.tempoMin) {
      gargalo = { etapa: s.etapa, maquina: s.maquina || "Manual", tempoMin: t };
    }
  }

  const stations: BalancedStationRow[] = ordered.map((s) => {
    const tempo = Math.max(0, Number(s.tempoMin) || 0);
    const postosTeoricos = pitchTimeMin > 0 ? round2(tempo / pitchTimeMin) : 1;
    const postosAlocados = Math.max(1, Math.ceil(postosTeoricos - 0.08));
    const tempoPorPosto = tempo / postosAlocados;
    const ocupacaoPostoPct =
      pitchTimeMin > 0 ? Math.min(140, Math.round((tempoPorPosto / pitchTimeMin) * 100)) : 0;

    return {
      id: s.id,
      seq: s.seq,
      etapa: s.etapa,
      setor: s.setor,
      maquina: s.maquina || "Bancada",
      tempoMin: tempo,
      custo: round2(Number(s.custo) || 0),
      postosTeoricos,
      postosAlocados,
      ocupacaoPostoPct,
      acimaDoPitch: pitchTimeMin > 0 && tempoPorPosto > pitchTimeMin * 1.08,
    };
  });

  const postosAlocadosTotal = stations.reduce((acc, st) => acc + st.postosAlocados, 0);
  const maxTempoPosto = stations.reduce(
    (mx, st) => Math.max(mx, st.tempoMin / st.postosAlocados),
    0,
  );
  const eficienciaBalanceamentoPct =
    postosAlocadosTotal > 0 && maxTempoPosto > 0
      ? Math.min(100, round2((samTotal / (postosAlocadosTotal * maxTempoPosto)) * 100))
      : 0;

  const diasParaConcluirLote =
    capacidadePecasDia > 0 ? round2(lotePlanejado / capacidadePecasDia) : 0;

  const cotacaoFaccaoPeca = round2(
    raw.cotacaoFaccaoPeca != null ? Math.max(0, raw.cotacaoFaccaoPeca) : custoInternoPeca * 1.12,
  );
  // Diferença positiva = facção mais cara que interno; negativa = facção mais barata
  const diferencaPorPeca = round2(cotacaoFaccaoPeca - custoInternoPeca);
  const diferencaNoLote = round2(diferencaPorPeca * lotePlanejado);
  const recomendacao: LineBalancingResult["makeOrBuy"]["recomendacao"] =
    Math.abs(diferencaPorPeca) <= 0.35
      ? "equivalente"
      : diferencaPorPeca > 0
        ? "interno"
        : "faccao";

  return {
    samTotal,
    custoInternoPeca,
    custoMinutoMedio,
    capacidadePecasDia,
    pitchTimeMin,
    taktTimeMetaMin,
    diasParaConcluirLote,
    postosAlocadosTotal,
    eficienciaBalanceamentoPct,
    gargalo,
    stations,
    makeOrBuy: {
      cotacaoFaccaoPeca,
      diferencaPorPeca,
      diferencaNoLote,
      recomendacao,
    },
  };
}
