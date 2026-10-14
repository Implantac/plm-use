// Modelo de apresentação do feed de atividade. O feed NÃO é mais uma tela de
// demonstração: cada linha vem de public.entity_events — a mesma trilha que o
// PCP, o workflow de amostras e o creative-sync já gravam (e que a /audit
// consulta). Este módulo é puro e testável: a rota cuida de fetch/realtime.

import { LOCAL_ENTITY_LABEL, type LocalEntityType } from "@/lib/local-events/store";

export interface FeedEventRow {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  from_status?: string | null;
  to_status?: string | null;
  note?: string | null;
  actor_name?: string | null;
  created_at: string;
}

export interface FeedItem {
  id: string;
  actor: string;
  initials: string;
  verb: string;
  /** Rótulo humano da entidade alvo ("ficha técnica", "Estampa", ...). */
  target: string;
  /** Trecho do id para diferenciar entidades de mesmo tipo. */
  ref: string;
  /** Destino navegável se houver rota conhecida para o tipo. */
  route?: string;
  statusFrom?: string;
  statusTo?: string;
  note?: string;
  /** "há 3 min" etc.; recebe `now` para ser determinístico em teste. */
  when: string;
}

const VERBS: Record<string, string> = {
  created: "criou",
  updated: "atualizou",
  status_changed: "mudou o status de",
  archived: "arquivou",
  deleted: "excluiu",
  item_added: "adicionou um item em",
  item_removed: "removeu um item de",
};

const FALLBACK_VERB = "registrou uma atividade em";

const ENTITY_LABELS: Record<string, string> = {
  reference: "referência",
  lote: "lote",
  tech_sheet: "ficha técnica",
  piloto: "piloto",
  capa: "ação de qualidade",
  engenharia: "dossiê de engenharia",
  facao_order: "ordem de facção",
  showroom_sample: "amostra de showroom",
  showroom_publication: "publicação de showroom",
  showroom_feedback: "feedback de showroom",
  showroom_decision: "decisão de showroom",
  launch_wave: "onda de lançamento",
  launch_item: "item de lançamento",
  launch_handoff: "handoff de lançamento",
  stock_item: "item de estoque",
  stock_movement: "movimentação de estoque",
  stock_reservation: "reserva de estoque",
  supplier: "fornecedor",
  production_order: "ordem de produção",
  production_order_item: "item de ordem de produção",
  production_route: "roteiro de produção",
  // Tipos do creative-sync (enum novo; antes do db push só aparecem via mirror local)
  color_palette: LOCAL_ENTITY_LABEL.color_palette,
  print_design: LOCAL_ENTITY_LABEL.print_design,
  look: LOCAL_ENTITY_LABEL.look,
  display_board: LOCAL_ENTITY_LABEL.display_board,
  collection_map: LOCAL_ENTITY_LABEL.collection_map,
  measurement_chart: LOCAL_ENTITY_LABEL.measurement_chart,
};

const ENTITY_ROUTES: Record<string, string> = {
  reference: "/references",
  lote: "/production",
  tech_sheet: "/tech-sheet",
  piloto: "/development",
  capa: "/quality",
  engenharia: "/development",
  facao_order: "/production",
  showroom_sample: "/showroom",
  showroom_publication: "/showroom",
  showroom_feedback: "/showroom",
  showroom_decision: "/showroom",
  launch_wave: "/launch",
  launch_item: "/launch",
  launch_handoff: "/launch",
  stock_item: "/inventory",
  stock_movement: "/inventory",
  stock_reservation: "/inventory",
  supplier: "/suppliers",
  production_order: "/production",
  production_order_item: "/production",
  production_route: "/production",
  color_palette: "/colors",
  print_design: "/prints",
  look: "/looks",
  display_board: "/showroom",
  collection_map: "/collection-map",
  measurement_chart: "/measurements",
};

function prettify(value: string): string {
  return value.replaceAll("_", " ");
}

function labelFor(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? prettify(entityType);
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeTime(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return "agora mesmo";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `há ${days} d`;
  return new Date(then).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function feedItemFromRow(row: FeedEventRow, now: number = Date.now()): FeedItem {
  const actor = row.actor_name?.trim() || "Membro da equipe";
  const item: FeedItem = {
    id: row.id,
    actor,
    initials: initialsFor(actor),
    verb: VERBS[row.event_type] ?? FALLBACK_VERB,
    target: labelFor(row.entity_type),
    ref: row.entity_id.slice(0, 6),
    when: relativeTime(row.created_at, now),
  };
  const route = ENTITY_ROUTES[row.entity_type];
  if (route) item.route = route;
  if (row.from_status && row.to_status) {
    item.statusFrom = prettify(row.from_status);
    item.statusTo = prettify(row.to_status);
  }
  if (row.note?.trim()) item.note = row.note.trim();
  return item;
}

export function feedItemsFromRows(rows: FeedEventRow[], now: number = Date.now()): FeedItem[] {
  return rows.map((row) => feedItemFromRow(row, now));
}

/** Tipos presentes no lote atual, com contagem — usado nos chips de filtro. */
export function countByEntityType(
  rows: FeedEventRow[],
): Array<{ type: string; label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.entity_type, (counts.get(r.entity_type) ?? 0) + 1);
  return [...counts.entries()]
    .map(([type, count]) => ({ type, label: labelFor(type), count }))
    .sort((a, b) => b.count - a.count);
}

export type { LocalEntityType };
