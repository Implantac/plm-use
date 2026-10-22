// Aplicações da ficha — o vocabulário de quem precifica uniforme (bordado,
// silk, sublimação, transfer) em POSIÇÃO, não como linha genérica de BOM.
// Nasce separado do store para o modelo viver testável: custo/peça e setup
// amortizado por tiragem são conta, não componente.
export const APLICACAO_TIPOS = ["Bordado", "Silk", "Sublimação", "Transfer"] as const;
export type AplicacaoTipo = (typeof APLICACAO_TIPOS)[number];

export type Aplicacao = {
  id: string;
  tipo: AplicacaoTipo;
  posicao: string; // "Peito esquerdo", "Costas superior", "Cós do shorts"
  arte?: string; // código na cartela (prints), ex.: "EST-0142"
  larguraCm: number;
  alturaCm: number;
  pontos?: number; // bordado: milhares de pontos (insumo da precificação, quando houver)
  cores: number; // silk/sublimação: cores/telas; bordado: fios distintos
  qtdPorPeca: number; // quantas aplicações dessa vão em CADA peça
  custoUnitario: number; // R$ por aplicação (uma posição, uma vez)
  custoSetup?: number; // telas/chapas/gabaritos — custo único do trabalho, não por peça
  obs?: string; // "base topper para malha", "fio dourado", "aplicação no sentido do pelo"
};

export const APLICACAO_POSICOES_SUGERIDAS = [
  "Peito esquerdo",
  "Peito central",
  "Costas superior",
  "Costas central",
  "Barra frente",
  "Manga",
  "Gola",
  "Cós do shorts",
  "Perna esquerda",
  "Faixa lateral",
] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function areaCm2(a: Pick<Aplicacao, "larguraCm" | "alturaCm">): number {
  const l = Math.max(0, a.larguraCm || 0);
  const h = Math.max(0, a.alturaCm || 0);
  return round2(l * h);
}

/** Custo que entra no custo industrial da PEÇA (posições × unitário). */
export function custoPeca(a: Aplicacao): number {
  return round2(Math.max(0, a.custoUnitario || 0) * Math.max(0, a.qtdPorPeca || 0));
}

export function custoAplicacoesPecasTotal(apps: Aplicacao[]): number {
  return round2(apps.reduce((acc, a) => acc + custoPeca(a), 0));
}

export function setupTotal(apps: Aplicacao[]): number {
  return round2(apps.reduce((acc, a) => acc + Math.max(0, a.custoSetup || 0), 0));
}

/**
 * O número que faltava na régua do lote: custo por peça diluindo setup na
 * tiragem. tiragem ≤ 0 devolve o custo sem setup (tela diz isso, não esconde).
 */
export function custoPorPecaComSetup(apps: Aplicacao[], tiragem: number): number {
  const pecas = custoAplicacoesPecasTotal(apps);
  if (!Number.isFinite(tiragem) || tiragem <= 0) return pecas;
  return round2(pecas + setupTotal(apps) / tiragem);
}

export type AplicacaoDraft = Omit<Aplicacao, "id">;

/** Validação de borda de dialog — mensagens prontas para FieldMessage. */
export function validateAplicacaoDraft(d: Partial<AplicacaoDraft>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.tipo || !APLICACAO_TIPOS.includes(d.tipo)) e.tipo = "Escolha a técnica da aplicação.";
  if (!d.posicao || d.posicao.trim().length < 2)
    e.posicao = "Posição é obrigatória (ex.: Peito esquerdo).";
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
  if (!(num(d.larguraCm) > 0)) e.larguraCm = "Largura deve ser > 0 cm.";
  if (!(num(d.alturaCm) > 0)) e.alturaCm = "Altura deve ser > 0 cm.";
  if (!(Number.isInteger(num(d.cores)) && (d.cores ?? 0) >= 1)) e.cores = "Mínimo 1 cor/fio.";
  if (!(Number.isInteger(num(d.qtdPorPeca)) && (d.qtdPorPeca ?? 0) >= 1))
    e.qtdPorPeca = "Qtde por peça: inteiro ≥ 1.";
  if (!(num(d.custoUnitario) >= 0)) e.custoUnitario = "Custo unitário deve ser ≥ 0.";
  if (d.pontos != null && !(num(d.pontos) >= 0)) e.pontos = "Pontos deve ser ≥ 0 (ou vazio).";
  if (d.custoSetup != null && !(num(d.custoSetup) >= 0))
    e.custoSetup = "Setup deve ser ≥ 0 (ou vazio).";
  return e;
}

/** Rótulo compacto p/ listas e PDF: o resumo que o custo lê de relance. */
export function resumoAplicacao(a: Aplicacao): string {
  const medida =
    a.tipo === "Bordado" && a.pontos
      ? `${a.pontos}k pts`
      : `${a.cores} cor${a.cores > 1 ? "es" : ""}`;
  return `${a.tipo} · ${a.posicao} · ${a.larguraCm}×${a.alturaCm} cm · ${medida}`;
}
