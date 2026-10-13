// Cloud sync dos 6 módulos criativos (P0-1): colors, prints, looks, display,
// measurements e os filtros salvos do collection-map.
//
// Mesmo contrato do cloud-sync.ts (hidrata 1x por sessão; listeners empurram
// snapshots debounceados; realtime re-hidrata) com duas mudanças:
//   1. Chave do upsert = `external_key` (o id do store), não o uuid do banco.
//      Seeds locais ("pal-01") viram linhas na 1ª edição sem corrida de
//      double-insert e sem o store trocar de id depois do hydrate.
//   2. Snapshot completo é reescrito a cada push, e linhas ausentes são
//      podadas — exclusões (removeLook, deleteChart, removeFilter) também
//      sincronizam, coisa que o push upsert-only antigo não fazia.
//
// Tabelas novas ainda não estão no `types.ts` gerado (roda
// `supabase gen types typescript --local > src/integrations/supabase/types.ts`
// depois do `db push`); até lá o acesso passa pelo cliente frouxo abaixo,
// tipado só no que usamos.
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listPalettes,
  replaceAllPalettes,
  subscribe as subscribePalettes,
  type ColorPalette,
  type ColorRef,
} from "@/lib/colors/store";
import {
  listPrints,
  replaceAllPrints,
  subscribe as subscribePrints,
  type PrintAsset,
  type PrintVersion,
} from "@/lib/prints/store";
import {
  listLooks,
  replaceAllLooks,
  subscribeLooks,
  type Look,
  type LookItem,
} from "@/lib/looks/store";
import {
  listBoards,
  replaceAllBoards,
  subscribe as subscribeBoards,
  type BoardItem,
  type DisplayBoard,
} from "@/lib/display/store";
import {
  listCharts,
  replaceAllCharts,
  subscribe as subscribeCharts,
  type MeasurementChart,
  type MeasurementGradeRow,
  type MeasurementPoint,
} from "@/lib/measurements/store";
import {
  listCollections,
  replaceAllCollections,
  subscribeCollections,
  upsertCollection,
  type Collection,
} from "@/lib/collections/store";
import { useQualityStore, type CapaAction } from "@/lib/quality/store";
import { useInfluencersStore, type Envio, type Influencer } from "@/lib/influencers/store";
import {
  listAnalyticsKpis,
  replaceAllAnalyticsKpis,
  subscribeAnalyticsKpis,
  type AnalyticsKpi,
} from "@/lib/analytics/store";
import {
  listFilters,
  replaceAllFilters,
  subscribeFilters,
  type SavedFilter,
} from "@/lib/collection-map/store";

// ---------- Cliente frouxo (único ponto de cast p/ as tabelas novas) ----------
export type QueryRow = Record<string, unknown>;
type Builder = {
  select(cols: string): {
    order(
      col: string,
      opts?: { ascending?: boolean },
    ): Promise<{ data: QueryRow[] | null; error: { message: string } | null }>;
  };
  upsert(
    rows: unknown[],
    opts?: { onConflict: string },
  ): Promise<{ error: { message: string } | null }>;
  delete(): {
    not(col: string, op: "in", vals: string[]): Promise<{ error: { message: string } | null }>;
    neq(col: string, val: string): Promise<{ error: { message: string } | null }>;
  };
};
const db = supabase as unknown as { from(table: string): Builder };

// ---------- Helpers puros de mapeamento (testados) ----------
const str = (v: unknown): string => (v == null ? "" : String(v));
const optStr = (v: unknown): string | undefined => (v == null ? undefined : String(v));
const num = (v: unknown): number => Number(v) || 0;
const isoOrNow = (v: unknown): string => {
  const d = v == null ? null : new Date(String(v));
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
};
const dateStr = (v: unknown): string => (v == null ? "" : String(v).slice(0, 10));

export function paletteToRow(p: ColorPalette, uid: string): QueryRow {
  return {
    external_key: p.id,
    name: p.name,
    season: p.season ?? "",
    brand: p.brand ?? "",
    mood: p.mood ?? "",
    cover: p.cover ?? "",
    status: p.status ?? "rascunho",
    colors: p.colors ?? [],
    linked_refs: p.linkedRefs ?? 0,
    updated_on: isoOrNow(p.updatedAt),
    created_by: uid,
  };
}
export function paletteFromRow(r: QueryRow): ColorPalette {
  return {
    id: str(r.external_key),
    name: str(r.name),
    season: str(r.season),
    brand: str(r.brand),
    mood: str(r.mood),
    cover: str(r.cover),
    status: (r.status as ColorPalette["status"]) ?? "rascunho",
    colors: (r.colors as ColorRef[]) ?? [],
    updatedAt: dateStr(r.updated_on),
    linkedRefs: num(r.linked_refs),
  };
}

export function printToRow(p: PrintAsset, uid: string): QueryRow {
  return {
    external_key: p.id,
    code: p.code ?? "",
    name: p.name,
    tecnica: p.tecnica ?? "digital",
    repeat_cm: { widthCm: p.repeat?.widthCm ?? 0, heightCm: p.repeat?.heightCm ?? 0 },
    color_count: p.colorCount ?? 0,
    colors: p.colors ?? [],
    supplier: p.supplier ?? null,
    season: p.season ?? null,
    brand: p.brand ?? null,
    status: p.status ?? "rascunho",
    cover: p.cover ?? "",
    file_format: p.fileFormat ?? "AI",
    file_size_mb: p.fileSizeMb ?? null,
    linked_refs: p.linkedRefs ?? 0,
    tags: p.tags ?? [],
    versions: p.versions ?? [],
    updated_on: isoOrNow(p.updatedAt),
    created_by: uid,
  };
}
export function printFromRow(r: QueryRow): PrintAsset {
  const rep = (r.repeat_cm ?? {}) as { widthCm?: unknown; heightCm?: unknown };
  return {
    id: str(r.external_key),
    code: str(r.code),
    name: str(r.name),
    tecnica: (r.tecnica as PrintAsset["tecnica"]) ?? "digital",
    repeat: { widthCm: num(rep.widthCm), heightCm: num(rep.heightCm) },
    colorCount: num(r.color_count),
    colors: (r.colors as string[]) ?? [],
    supplier: optStr(r.supplier),
    season: optStr(r.season),
    brand: optStr(r.brand),
    status: (r.status as PrintAsset["status"]) ?? "rascunho",
    cover: str(r.cover),
    fileFormat: (r.file_format as PrintAsset["fileFormat"]) ?? "AI",
    fileSizeMb: r.file_size_mb == null ? undefined : Number(r.file_size_mb),
    linkedRefs: num(r.linked_refs),
    updatedAt: dateStr(r.updated_on),
    tags: (r.tags as string[]) ?? [],
    versions: (r.versions as PrintVersion[]) ?? [],
  };
}

export function lookToRow(l: Look, uid: string): QueryRow {
  return {
    external_key: l.id,
    name: l.name,
    season: l.season ?? "",
    occasion: l.occasion ?? "casual",
    status: l.status ?? "rascunho",
    tags: l.tags ?? [],
    styling_notes: l.stylingNotes ?? "",
    cover_color: l.coverColor ?? "#000000",
    items: l.items ?? [],
    created_on: isoOrNow(l.createdAt),
    updated_on: isoOrNow(l.updatedAt),
    created_by: uid,
  };
}
export function lookFromRow(r: QueryRow): Look {
  return {
    id: str(r.external_key),
    name: str(r.name),
    season: str(r.season),
    occasion: (r.occasion as Look["occasion"]) ?? "casual",
    status: (r.status as Look["status"]) ?? "rascunho",
    tags: (r.tags as string[]) ?? [],
    stylingNotes: str(r.styling_notes),
    coverColor: str(r.cover_color),
    items: (r.items as LookItem[]) ?? [],
    createdAt: str(r.created_on),
    updatedAt: str(r.updated_on),
  };
}

export function boardToRow(b: DisplayBoard, uid: string): QueryRow {
  return {
    external_key: b.id,
    name: b.name,
    season: b.season ?? "",
    target: b.target ?? "",
    status: b.status ?? "rascunho",
    cover: b.cover ?? "",
    bg_color: b.bgColor ?? "#ffffff",
    items: b.items ?? [],
    updated_on: isoOrNow(b.updatedAt),
    created_by: uid,
  };
}
export function boardFromRow(r: QueryRow): DisplayBoard {
  return {
    id: str(r.external_key),
    name: str(r.name),
    season: str(r.season),
    target: str(r.target),
    status: (r.status as DisplayBoard["status"]) ?? "rascunho",
    cover: str(r.cover),
    bgColor: str(r.bg_color),
    items: (r.items as BoardItem[]) ?? [],
    updatedAt: dateStr(r.updated_on),
  };
}

export function chartToRow(c: MeasurementChart, uid: string): QueryRow {
  return {
    external_key: c.id,
    code: c.code ?? "",
    name: c.name,
    category: c.category ?? "Top",
    segment: c.segment ?? "Feminino",
    fit: c.fit ?? null,
    unit: c.unit ?? "cm",
    brand: c.brand ?? null,
    linked_refs: c.linkedRefs ?? 0,
    status: c.status ?? "rascunho",
    updated_on: isoOrNow(c.updatedAt),
    updated_by: c.updatedBy ?? "",
    points: c.points ?? [],
    grade: c.grade ?? [],
    notes: c.notes ?? null,
    created_by: uid,
  };
}
export function chartFromRow(r: QueryRow): MeasurementChart {
  return {
    id: str(r.external_key),
    code: str(r.code),
    name: str(r.name),
    category: (r.category as MeasurementChart["category"]) ?? "Top",
    segment: (r.segment as MeasurementChart["segment"]) ?? "Feminino",
    fit: (r.fit as MeasurementChart["fit"]) ?? undefined,
    unit: (r.unit as MeasurementChart["unit"]) ?? "cm",
    brand: optStr(r.brand),
    linkedRefs: num(r.linked_refs),
    status: (r.status as MeasurementChart["status"]) ?? "rascunho",
    updatedAt: dateStr(r.updated_on),
    updatedBy: str(r.updated_by),
    points: (r.points as MeasurementPoint[]) ?? [],
    grade: (r.grade as MeasurementGradeRow[]) ?? [],
    notes: optStr(r.notes),
  };
}

export function filterToRow(f: SavedFilter, uid: string): QueryRow {
  return {
    external_key: f.id,
    name: f.name,
    owner: f.owner ?? "",
    categories: f.categories ?? [],
    colors: f.colors ?? [],
    statuses: f.statuses ?? [],
    created_on: isoOrNow(f.createdAt),
    created_by: uid,
  };
}
export function filterFromRow(r: QueryRow): SavedFilter {
  return {
    id: str(r.external_key),
    name: str(r.name),
    owner: str(r.owner),
    categories: (r.categories as string[]) ?? [],
    colors: (r.colors as string[]) ?? [],
    statuses: (r.statuses as SavedFilter["statuses"]) ?? [],
    createdAt: str(r.created_on),
  };
}

export function collectionToRow(c: Collection, uid: string): QueryRow {
  return {
    external_key: String(c.id),
    name: c.name,
    season: c.season ?? "",
    year: c.year ?? 2026,
    brand: c.brand ?? "",
    target_revenue: c.targetRevenue ?? "",
    target_sales: c.targetSales ?? "",
    target_margin: c.targetMargin ?? "",
    planned_qty: c.plannedQty ?? "",
    planned_mix: c.plannedMix ?? 0,
    realized_mix: c.realizedMix ?? 0,
    progress: Math.max(0, Math.min(100, c.progress ?? 0)),
    roi: c.roi ?? "",
    abc: c.abc ?? "",
    status: c.status ?? "Planejamento",
    image: c.image ?? "",
    showroom_approval: c.showroomApproval ?? null,
    avg_cost: c.avgCost ?? null,
    avg_price: c.avgPrice ?? null,
    sell_through: c.sellThrough ?? null,
    lead_time_dias: c.leadTimeDias ?? null,
    created_by: uid,
  };
}
export function collectionFromRow(r: QueryRow): Collection {
  return {
    id: numericKey(str(r.external_key)),
    name: str(r.name),
    season: str(r.season),
    year: num(r.year),
    brand: str(r.brand),
    targetRevenue: str(r.target_revenue),
    targetSales: str(r.target_sales),
    targetMargin: str(r.target_margin),
    plannedQty: str(r.planned_qty),
    plannedMix: num(r.planned_mix),
    realizedMix: num(r.realized_mix),
    progress: num(r.progress),
    roi: str(r.roi),
    abc: str(r.abc),
    status: str(r.status),
    image: str(r.image),
    showroomApproval: r.showroom_approval == null ? undefined : Number(r.showroom_approval),
    avgCost: r.avg_cost == null ? undefined : Number(r.avg_cost),
    avgPrice: r.avg_price == null ? undefined : Number(r.avg_price),
    sellThrough: r.sell_through == null ? undefined : Number(r.sell_through),
    leadTimeDias: r.lead_time_dias == null ? undefined : num(r.lead_time_dias),
  };
}

// ids numéricos viram texto no banco; texto não-numérico (import externo) vira
// número estável p/ o store, que usa id number como chave de React/edit.
export function numericKey(k: string): number {
  const n = Number(k);
  if (k !== "" && Number.isFinite(n)) return n;
  let h = 5381;
  for (let i = 0; i < k.length; i++) h = (h * 33 + k.charCodeAt(i)) | 0;
  return Math.abs(h) % 2 ** 31;
}

export function analyticsKpiToRow(k: AnalyticsKpi, uid: string): QueryRow {
  return {
    external_key: String(k.id),
    label: k.label,
    value: k.value,
    sub: k.sub ?? "",
    progress: k.progress == null ? null : Math.max(0, Math.min(100, Math.round(k.progress))),
    icon_name: k.iconName,
    tone: k.tone ?? "primary",
    created_by: uid,
  };
}
export function analyticsKpiFromRow(r: QueryRow): AnalyticsKpi {
  const icon = str(r.icon_name);
  return {
    id: numericKey(str(r.external_key)),
    label: str(r.label),
    value: str(r.value),
    sub: str(r.sub),
    progress: r.progress == null ? undefined : num(r.progress),
    iconName: (["target", "trending-up", "zap", "bar-chart"].includes(icon)
      ? icon
      : "bar-chart") as AnalyticsKpi["iconName"],
    tone: str(r.tone) || "primary",
  };
}

export function capaToRow(c: CapaAction, uid: string): QueryRow {
  return {
    external_key: c.id,
    defeito: c.defeito,
    setor: c.setor ?? "",
    tipo: c.tipo,
    status: c.status,
    responsavel: c.responsavel ?? "",
    prazo: c.prazo ?? "",
    ref: c.ref ?? null,
    lote: c.lote ?? null,
    fornecedor: c.fornecedor ?? null,
    criada: c.criada,
    created_by: uid,
  };
}
const CAPA_TIPOS = ["Corretiva", "Preventiva"];
const CAPA_STATUS = ["Aberta", "Em andamento", "Concluída"];
export function capaFromRow(r: QueryRow): CapaAction {
  const tipo = str(r.tipo);
  const status = str(r.status);
  const out: CapaAction = {
    id: str(r.external_key),
    defeito: str(r.defeito),
    setor: str(r.setor),
    tipo: (CAPA_TIPOS.includes(tipo) ? tipo : "Corretiva") as CapaAction["tipo"],
    status: (CAPA_STATUS.includes(status) ? status : "Aberta") as CapaAction["status"],
    responsavel: str(r.responsavel),
    prazo: str(r.prazo),
    criada: str(r.criada) || new Date().toISOString().slice(0, 10),
  };
  if (r.ref != null) out.ref = str(r.ref);
  if (r.lote != null) out.lote = str(r.lote);
  if (r.fornecedor != null) out.fornecedor = str(r.fornecedor);
  return out;
}

export function influencerToRow(i: Influencer, uid: string): QueryRow {
  return {
    external_key: i.id,
    nome: i.nome,
    handle: i.handle ?? "",
    regiao: i.regiao ?? "",
    uf: i.uf ?? "",
    seguidores: i.seguidores ?? 0,
    segmento: i.segmento ?? "",
    perfil: i.perfil ?? "Micro",
    custo_medio: i.custoMedio ?? 0,
    vendas_geradas: i.vendasGeradas ?? 0,
    envios: i.envios ?? [],
    created_by: uid,
  };
}
export function influencerFromRow(r: QueryRow): Influencer {
  return {
    id: str(r.external_key),
    nome: str(r.nome),
    handle: str(r.handle),
    regiao: str(r.regiao),
    uf: str(r.uf),
    seguidores: num(r.seguidores),
    segmento: str(r.segmento),
    perfil: (["Macro", "Médio", "Micro"].includes(str(r.perfil))
      ? str(r.perfil)
      : "Micro") as Influencer["perfil"],
    custoMedio: Number(r.custo_medio) || 0,
    vendasGeradas: Number(r.vendas_geradas) || 0,
    envios: Array.isArray(r.envios) ? (r.envios as Envio[]) : [],
  };
}

// ids duplicados no mesmo debounce (dois `Date.now()` na mesma ms) não podem
// estourar o `ON CONFLICT DO UPDATE`; mantemos o último por chave.
export function dedupeRows(rows: QueryRow[]): QueryRow[] {
  const byKey = new Map<string, QueryRow>();
  for (const r of rows) byKey.set(String(r.external_key), r);
  return [...byKey.values()];
}

// ---------- Specs por módulo ----------
type ModuleSpec = {
  key: string;
  table: string;
  label: string;
  list(): unknown[];
  toRow(e: unknown, uid: string): QueryRow;
  apply(rows: QueryRow[]): void;
  subscribe(l: () => void): () => void;
};

const MODULES: ModuleSpec[] = [
  {
    key: "palettes",
    table: "color_palettes",
    label: "as cartelas de cor",
    list: listPalettes,
    toRow: (e, uid) => paletteToRow(e as ColorPalette, uid),
    apply: (rows) => replaceAllPalettes(rows.map(paletteFromRow)),
    subscribe: subscribePalettes,
  },
  {
    key: "prints",
    table: "print_assets",
    label: "a biblioteca de estampas",
    list: listPrints,
    toRow: (e, uid) => printToRow(e as PrintAsset, uid),
    apply: (rows) => replaceAllPrints(rows.map(printFromRow)),
    subscribe: subscribePrints,
  },
  {
    key: "looks",
    table: "looks",
    label: "os coordenados",
    list: listLooks,
    toRow: (e, uid) => lookToRow(e as Look, uid),
    apply: (rows) => replaceAllLooks(rows.map(lookFromRow)),
    subscribe: subscribeLooks,
  },
  {
    key: "boards",
    table: "display_boards",
    label: "os painéis de display",
    list: listBoards,
    toRow: (e, uid) => boardToRow(e as DisplayBoard, uid),
    apply: (rows) => replaceAllBoards(rows.map(boardFromRow)),
    subscribe: subscribeBoards,
  },
  {
    key: "charts",
    table: "measurement_charts",
    label: "as tabelas de medida",
    list: listCharts,
    toRow: (e, uid) => chartToRow(e as MeasurementChart, uid),
    apply: (rows) => replaceAllCharts(rows.map(chartFromRow)),
    subscribe: subscribeCharts,
  },
  {
    key: "collections",
    table: "collections",
    label: "as coleções",
    list: listCollections,
    toRow: (e, uid) => collectionToRow(e as Collection, uid),
    apply: (rows) => replaceAllCollections(rows.map(collectionFromRow)),
    subscribe: subscribeCollections,
  },
  {
    key: "analytics_kpis",
    table: "analytics_kpis",
    label: "os KPIs do BI",
    list: listAnalyticsKpis,
    toRow: (e, uid) => analyticsKpiToRow(e as AnalyticsKpi, uid),
    apply: (rows) => replaceAllAnalyticsKpis(rows.map(analyticsKpiFromRow)),
    subscribe: subscribeAnalyticsKpis,
  },
  {
    key: "capa",
    table: "quality_capa_actions",
    label: "as ações de CAPA",
    list: () => useQualityStore.getState().capa,
    toRow: (e, uid) => capaToRow(e as CapaAction, uid),
    apply: (rows) => useQualityStore.setState({ capa: rows.map(capaFromRow) }),
    subscribe: (l) => useQualityStore.subscribe(l),
  },
  {
    key: "influencers",
    table: "marketing_influencers",
    label: "os influenciadores",
    list: () => useInfluencersStore.getState().influencers,
    toRow: (e, uid) => influencerToRow(e as Influencer, uid),
    apply: (rows) => useInfluencersStore.setState({ influencers: rows.map(influencerFromRow) }),
    subscribe: (l) => useInfluencersStore.subscribe(l),
  },
  {
    key: "cfilters",
    table: "collection_map_filters",
    label: "os filtros do mapa de coleção",
    list: listFilters,
    toRow: (e, uid) => filterToRow(e as SavedFilter, uid),
    apply: (rows) => replaceAllFilters(rows.map(filterFromRow)),
    subscribe: subscribeFilters,
  },
];

// ---------- Estado de hidratação ----------
const hydrated: Record<string, boolean> = {};
const fromDb: Record<string, boolean> = {};
const pendingRehydrate = new Set<string>();

const debouncers = new Map<string, ReturnType<typeof setTimeout>>();
function debounce(key: string, fn: () => void, ms = 800) {
  const t = debouncers.get(key);
  if (t) clearTimeout(t);
  debouncers.set(
    key,
    setTimeout(() => {
      debouncers.delete(key);
      fn();
    }, ms),
  );
}

async function refreshModule(spec: ModuleSpec, force: boolean) {
  if (!force && hydrated[spec.key]) return;
  hydrated[spec.key] = true;
  const { data, error } = await db
    .from(spec.table)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    // sem tabela aplicada (migration pendente) ou rede fora: o store segue na
    // memória exatamente como era antes do P0-1 — nada quebra, só nada persiste.
    console.warn(`[creative-sync] hidratação de ${spec.table} indisponível:`, error.message);
    return;
  }
  const rows = data ?? [];
  if (rows.length === 0 && !fromDb[spec.key]) return; // projeto novo: mantém seeds; a 1ª edição cria as linhas
  fromDb[spec.key] = true;
  spec.apply(rows);
}

async function pushModule(spec: ModuleSpec, uid: string) {
  if (!hydrated[spec.key]) return; // nunca escrever antes de conhecer o estado do servidor
  const rows = dedupeRows(spec.list().map((e) => spec.toRow(e, uid)));
  const { error } = await db.from(spec.table).upsert(rows, { onConflict: "external_key" });
  if (error) {
    console.error(`[creative-sync] falha ao salvar ${spec.label}:`, error.message);
    toast.error(`Não foi possível salvar ${spec.label} na nuvem. Tente novamente.`);
    return;
  }
  // Poda: linhas que sumiram do snapshot local saem do banco (lista local é a
  // autoridade da tela, igual ao resto do padrão; `neq ''` = apagar todas).
  const del = db.from(spec.table).delete();
  const prune = rows.length
    ? await del.not(
        "external_key",
        "in",
        rows.map((r) => String(r.external_key)),
      )
    : await del.neq("external_key", "");
  if (prune.error) {
    console.error(`[creative-sync] falha ao podar ${spec.table}:`, prune.error.message);
    toast.error(`Salvo, mas não foi possível remover itens excluídos de ${spec.label}.`);
  }
  if (pendingRehydrate.delete(spec.key)) void refreshModule(spec, true);
}

// ---------- Hook mestre (mesma assinatura do useModulesCloudSync) ----------
export const __internals = {
  pushByKey(key: string, uid: string) {
    const m = MODULES.find((x) => x.key === key);
    if (!m) throw new Error("spec desconhecido: " + key);
    return pushModule(m, uid);
  },
  refreshByKey(key: string, force = false) {
    const m = MODULES.find((x) => x.key === key);
    if (!m) throw new Error("spec desconhecido: " + key);
    return refreshModule(m, force);
  },
  moduleKeys(): string[] {
    return MODULES.map((m) => m.key);
  },
  resetSyncState() {
    for (const k of Object.keys(hydrated)) delete hydrated[k];
    for (const k of Object.keys(fromDb)) delete fromDb[k];
    pendingRehydrate.clear();
    for (const t of debouncers.values()) clearTimeout(t);
    debouncers.clear();
  },
};

export function useCreativeCloudSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const unsubs: Array<() => void> = [];
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid || cancelled) return;
      await Promise.all(MODULES.map((m) => refreshModule(m, false)));
      if (cancelled) return;

      for (const m of MODULES) {
        unsubs.push(m.subscribe(() => debounce(m.key, () => void pushModule(m, uid))));
      }

      const channel = supabase.channel(`creative-live-${Math.random().toString(36).slice(2, 10)}`);
      for (const m of MODULES) {
        channel.on("postgres_changes", { event: "*", schema: "public", table: m.table }, () => {
          // eco remoto com push local em voo (debounce aberto) → re-hidratar
          // depois do push, senão a edição não salva do usuário é perdida
          // pelo snapshot antigo do servidor.
          if (debouncers.has(m.key)) pendingRehydrate.add(m.key);
          else void refreshModule(m, true);
        });
      }
      channel.subscribe();
      unsubs.push(() => {
        void supabase.removeChannel(channel);
      });
    })();
    return () => {
      cancelled = true;
      unsubs.forEach((fn) => fn());
    };
  }, [enabled]);
}
