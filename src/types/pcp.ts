// Modelo de dados central de PCP — Lotes, Referências, Passagens e Ocorrências.
// Mantido independente do backend para permitir migração futura sem refactor.

export type SetorPCP =
  | "Compras"
  | "CAD"
  | "Corte"
  | "Silk"
  | "Costura"
  | "Acabamento"
  | "Expedição"
  | "Terceirizados";

export const SETORES_PCP: SetorPCP[] = [
  "Compras",
  "CAD",
  "Corte",
  "Silk",
  "Costura",
  "Acabamento",
  "Expedição",
  "Terceirizados",
];

export type Prioridade = "Baixa" | "Média" | "Alta" | "Urgente";

export type StatusReferencia =
  | "Aguardando"
  | "Em produção"
  | "Pausado"
  | "Concluído"
  | "Ocorrência";

export type TipoPassagem = "integral" | "parcial";
export type LinhaPassagem = "1a" | "2a";
export type TipoOcorrencia = "positiva" | "negativa" | "neutra";

export interface Passagem {
  id: string;
  tipo: TipoPassagem;
  linha: LinhaPassagem;
  setor_origem: SetorPCP;
  setor_destino: SetorPCP | null; // null para 2ª linha (retrabalho)
  qtd: number;
  responsavel: string;
  observacao?: string;
  defeito?: string; // somente 2ª linha
  timestamp: string;
}

export interface Ocorrencia {
  id: string;
  tipo: TipoOcorrencia;
  qtd: number;
  motivo: string;
  setor: SetorPCP;
  responsavel: string;
  observacao?: string;
  timestamp: string;
}

export interface ReferenciaLote {
  ref: string;
  nome: string;
  imagem?: string;
  qtd_programada: number;
  qtd_adicional: number; // ocorrências positivas
  qtd_perdida: number; // ocorrências negativas
  qtd_produzida: number; // efetivamente concluída (Expedição)
  setor_atual: SetorPCP;
  status: StatusReferencia;
  grade?: Record<string, number>; // P/M/G/GG -> qtd
  passagens: Passagem[];
  ocorrencias: Ocorrencia[];
}

export interface Lote {
  numero: string;
  grupo: string;
  colecao?: string;
  prioridade: Prioridade;
  data_abertura: string;
  data_prevista: string;
  responsavel: string;
  observacao?: string;
  referencias: ReferenciaLote[];
}

// ----- Cálculos derivados (puros) -----

export function saldoReferencia(r: ReferenciaLote): number {
  // Saldo final previsto = programado + ocorrências positivas - ocorrências negativas
  return r.qtd_programada + r.qtd_adicional - r.qtd_perdida;
}

export function pendenteReferencia(r: ReferenciaLote): number {
  return Math.max(0, saldoReferencia(r) - r.qtd_produzida);
}

export function percentualReferencia(r: ReferenciaLote): number {
  const total = saldoReferencia(r);
  if (total <= 0) return 0;
  return Math.min(100, Math.round((r.qtd_produzida / total) * 100));
}

export function percentualLote(l: Lote): number {
  if (!l.referencias.length) return 0;
  const avg =
    l.referencias.reduce((acc, r) => acc + percentualReferencia(r), 0) /
    l.referencias.length;
  return Math.round(avg);
}

export function ocorrenciasAbertasLote(l: Lote): number {
  return l.referencias.reduce(
    (acc, r) =>
      acc + r.ocorrencias.filter((o) => o.tipo !== "neutra").length,
    0,
  );
}

export function diasParaPrazo(l: Lote): number {
  const ms = new Date(l.data_prevista).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function setoresAtivosLote(l: Lote): SetorPCP[] {
  // Um lote pode aparecer em vários setores ao mesmo tempo,
  // dependendo da posição de cada referência.
  return Array.from(new Set(l.referencias.map((r) => r.setor_atual)));
}
