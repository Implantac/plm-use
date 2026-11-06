import { emptyCareLabelSpec, seedFor, type TechSheetData } from "@/lib/techsheet/store";

/**
 * Onda 34. `seedFor()` agora nasce **sem engenharia declarada**: composição
 * vazia, NCM e origem em branco, risco CAD zerado. É o comportamento certo —
 * nenhuma ficha nova herda composição, eficiência ou arquivo de molde do
 * produto de demonstração.
 *
 * Esta fixture é o outro lado: o que um usuário **declara explicitamente**
 * para que a ficha possa virar documento operacional (DPP, Ordem de Corte,
 * etiqueta ABNT, gate de estágio). Os valores 96/4, 88,3% e 1,8 m aqui são
 * dados de entrada do teste, não defaults do produto — e o arquivo de molde
 * não cita o DEV000006.
 */
export function fichaDeclarada(ref = "DEV000006"): TechSheetData {
  const base = seedFor(ref);
  return {
    ...base,
    etiquetagem: {
      ...emptyCareLabelSpec(),
      composicao: [
        { fibra: "Poliéster", pct: 96 },
        { fibra: "Elastano", pct: 4 },
      ],
      ncm: "6109.10.00",
      paisOrigem: "Brasil",
      instrucoesExtras: "Lavar pelo avesso.",
    },
    encaixeCad: {
      eficienciaPct: 88.3,
      larguraEnfestoM: 1.8,
      comprimentoRiscoM: 4.65,
      encolhimentoUrdumePct: 2.0,
      encolhimentoTramaPct: 1.5,
      arquivoMolde: "RISCO_HOMOLOGADO_v1.ADS",
      sistemaCad: "Audaces",
    },
  };
}
