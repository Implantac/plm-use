// Do banco para o Kanban: converte OPs reais no modelo de Lote que a tela do PCP
// já sabe desenhar.
//
// Por que existe: até 21/10/2026 o Kanban de lotes, a Torre de Controle, o Gantt e
// a capacidade liam `src/lib/pcp/store.ts` — um seed fixo ("LOTE 2601"). O pedido
// liberado ao PCP aparecia só na aba "Por OP / Rota". Na mesma tela conviviam dois
// mundos: um real e um de demonstração. Esta função é a ponte: OPs do banco viram
// lotes, e a tela passa a ter uma fonte só.
//
// Função pura de propósito: toda a regra (onde a peça está, o que é perda, qual
// setor) é testável sem banco.
import type {
  Lote,
  Ocorrencia,
  Passagem,
  Prioridade,
  ReferenciaLote,
  SetorPCP,
  StatusReferencia,
} from "@/types/pcp";

export interface DbStep {
  id: string;
  sector: string;
  sequence: number;
}

export interface DbBalance {
  step_id: string;
  quantity: number;
}

export interface DbPassage {
  id: string;
  production_order_item_id: string;
  origin_step_id: string | null;
  destination_step_id: string | null;
  quantity: number;
  type: string;
  responsible_name: string | null;
  observation: string | null;
  created_at: string;
}

export interface DbOrderItem {
  id: string;
  reference_code: string;
  reference_name: string | null;
  color: string | null;
  quantity_planned: number;
  quantity_produced: number;
  quantity_lost: number;
  status: string;
  balances: DbBalance[];
  /** Grade vinda do item do pedido (sales_order_item_sizes), quando ligada. */
  grade?: Record<string, number>;
}

export interface DbOrder {
  id: string;
  number: string;
  status: string;
  priority: string;
  planned_start: string | null;
  planned_end: string | null;
  created_at?: string;
  items: DbOrderItem[];
}

// Setores que aparecem nas rotas reais → tipo do Kanban. O banco guarda texto
// livre (`production_route_steps.sector`); aqui normalizamos para as colunas.
const SECTOR_ALIASES: Record<string, SetorPCP> = {
  compras: "Compras",
  cad: "CAD",
  corte: "Corte",
  silk: "Silk",
  serigrafia: "Silk",
  estamparia: "Silk",
  costura: "Costura",
  bordado: "Bordado",
  sublimacao: "Sublimação",
  sublimação: "Sublimação",
  acabamento: "Acabamento",
  expedicao: "Expedição",
  expedição: "Expedição",
  lavanderia: "Terceirizados",
  faccao: "Terceirizados",
  facção: "Terceirizados",
  terceirizados: "Terceirizados",
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export function normalizeSector(raw: string | null | undefined): SetorPCP {
  if (!raw) return "Compras";
  const key = norm(raw);
  if (SECTOR_ALIASES[key]) return SECTOR_ALIASES[key];
  // desconhecido: cai em Terceirizados para não sumir do Kanban
  return "Terceirizados";
}

const PRIORITY_MAP: Record<string, Prioridade> = {
  baixa: "Baixa",
  media: "Média",
  média: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export function normalizePriority(raw: string | null | undefined): Prioridade {
  return PRIORITY_MAP[norm(raw ?? "")] ?? "Média";
}

/**
 * Onde a peça está agora: a etapa mais avançada que ainda tem saldo.
 * Sem saldo em nenhuma etapa, o item está na primeira (não começou) — ou em
 * Expedição, quando o banco já marcou a quantidade produzida.
 */
export function currentStep(
  item: Pick<DbOrderItem, "balances" | "quantity_planned" | "quantity_produced">,
  steps: DbStep[],
): { step: DbStep | null; finished: boolean } {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const withBalance = item.balances
    .filter((b) => b.quantity > 0 && byId.has(b.step_id))
    .map((b) => ({ ...byId.get(b.step_id)!, quantity: b.quantity }))
    .sort((a, b) => b.sequence - a.sequence);

  if (withBalance.length > 0) {
    const last = steps.reduce((acc, s) => (s.sequence > acc.sequence ? s : acc), steps[0]);
    const finished =
      item.quantity_produced >= item.quantity_planned ||
      (!!last && withBalance[0].id === last.id && withBalance.length === 1);
    return { step: withBalance[0], finished };
  }

  const first = steps.reduce((acc, s) => (s.sequence < acc.sequence ? s : acc), steps[0] ?? null!);
  return { step: first ?? null, finished: item.quantity_produced >= item.quantity_planned };
}

function statusFor(item: DbOrderItem, finished: boolean): StatusReferencia {
  if (finished && item.quantity_lost === 0) return "Concluído";
  if (item.status === "pausado") return "Pausado";
  if (item.quantity_lost > 0) return "Ocorrência";
  if ((item.quantity_produced ?? 0) > 0 || (item.balances ?? []).some((b) => b.quantity > 0))
    return "Em produção";
  return "Aguardando";
}

export function passagesToReferencia(
  passages: DbPassage[],
  steps: DbStep[],
): { passagens: Passagem[]; ocorrencias: Ocorrencia[] } {
  const byId = new Map(steps.map((s) => [s.id, s]));
  const passagens: Passagem[] = [];
  const ocorrencias: Ocorrencia[] = [];

  for (const p of passages) {
    const origin = p.origin_step_id ? byId.get(p.origin_step_id) : undefined;
    const destination = p.destination_step_id ? byId.get(p.destination_step_id) : undefined;
    const setorOrigem = normalizeSector(origin?.sector);
    const setorDestino = destination ? normalizeSector(destination.sector) : null;

    if (p.type === "perda") {
      ocorrencias.push({
        id: p.id,
        tipo: "negativa",
        qtd: p.quantity,
        motivo: p.observation ?? "perda sem motivo registrado",
        setor: setorOrigem,
        responsavel: p.responsible_name ?? "—",
        timestamp: p.created_at,
      });
      continue;
    }

    passagens.push({
      id: p.id,
      tipo: p.type === "parcial" ? "parcial" : "integral",
      linha: "1a",
      setor_origem: setorOrigem,
      setor_destino: setorDestino,
      qtd: p.quantity,
      responsavel: p.responsible_name ?? "—",
      observacao: p.observation ?? undefined,
      timestamp: p.created_at,
    });
  }

  return { passagens, ocorrencias };
}

export function itemToReferencia(
  item: DbOrderItem,
  steps: DbStep[],
  passages: DbPassage[],
): ReferenciaLote {
  const { step, finished } = currentStep(item, steps);
  const { passagens, ocorrencias } = passagesToReferencia(passages, steps);

  return {
    ref: item.reference_code,
    nome: item.reference_name ?? item.reference_code,
    qtd_programada: item.quantity_planned,
    qtd_adicional: 0,
    qtd_perdida: item.quantity_lost ?? 0,
    qtd_produzida: item.quantity_produced ?? 0,
    setor_atual: normalizeSector(step?.sector),
    status: statusFor(item, finished),
    grade: item.grade,
    passagens,
    ocorrencias,
  };
}

/**
 * Uma OP vira um lote; cada item da OP vira uma referência.
 * `stepsByRoute` mapeia route_id → etapas, porque a mesma OP pode ter itens com
 * rotas diferentes (change_item_route).
 */
export function ordersToLotes(
  orders: DbOrder[],
  stepsByRoute: Record<string, DbStep[]>,
  passages: DbPassage[] = [],
): Lote[] {
  const passagesByItem = new Map<string, DbPassage[]>();
  for (const p of passages) {
    const list = passagesByItem.get(p.production_order_item_id) ?? [];
    list.push(p);
    passagesByItem.set(p.production_order_item_id, list);
  }

  return orders.map((order) => {
    const referencias = order.items.map((item) => {
      const steps =
        stepsByRoute[(item as DbOrderItem & { route_id?: string }).route_id ?? ""] ?? [];
      return itemToReferencia(item, steps, passagesByItem.get(item.id) ?? []);
    });

    return {
      numero: order.number,
      grupo: order.items[0]?.reference_name ?? "OP",
      colecao: undefined,
      prioridade: normalizePriority(order.priority),
      data_abertura: (order.created_at ?? new Date().toISOString()).slice(0, 10),
      data_prevista: (order.planned_end ?? "").slice(0, 10),
      responsavel: "PCP",
      referencias,
    } satisfies Lote;
  });
}
