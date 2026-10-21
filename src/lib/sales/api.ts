// Acesso a dados do fluxo de Pedido.
//
// As tabelas novas ainda não estão no `types.ts` gerado (roda `supabase gen
// types typescript --local > src/integrations/supabase/types.ts` depois do db
// push); até lá o acesso passa pelo cliente frouxo abaixo — mesmo padrão de
// creative-sync.ts. Todo erro volta como { error } para a tela decidir: o
// caso comum aqui é a migration ainda não aplicada, e a UI mostra o aviso em
// vez de quebrar.
import { supabase } from "@/integrations/supabase/client";
import type {
  CatalogOption,
  CatalogProduct,
  CostDriver,
  Customer,
  ItemCost,
  MaterialLine,
  OperationLine,
  OrderEvent,
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
} from "./types";

export type Row = Record<string, unknown>;
export type Err = { message: string; code?: string };
export type Res<T> = { data: T | null; error: Err | null };

type LooseQuery = Promise<Res<Row[]>> & {
  select(cols?: string): LooseQuery;
  eq(col: string, val: unknown): LooseQuery;
  in(col: string, vals: unknown[]): LooseQuery;
  order(col: string, opts?: { ascending?: boolean }): LooseQuery;
  limit(n: number): LooseQuery;
  maybeSingle(): Promise<Res<Row>>;
  single(): Promise<Res<Row>>;
  insert(rows: unknown): LooseQuery;
  update(row: unknown): LooseQuery;
  upsert(rows: unknown, opts?: { onConflict?: string }): LooseQuery;
  delete(): LooseQuery;
};
type LooseClient = {
  from(table: string): LooseQuery;
  rpc(fn: string, args?: Record<string, unknown>): Promise<Res<unknown>>;
};

const db = supabase as unknown as LooseClient;

const str = (v: unknown, fallback = ""): string => (v == null ? fallback : String(v));
const optStr = (v: unknown): string | undefined => (v == null ? undefined : String(v));
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const optNum = (v: unknown): number | undefined => (v == null ? undefined : num(v));
const dateStr = (v: unknown): string | undefined =>
  v == null ? undefined : String(v).slice(0, 10);

/** Erro de "relação não existe" = migration não aplicada neste ambiente. */
export function isMissingTable(error: Err | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|não existe|schema cache/i.test(error.message)
  );
}

export const MIGRATION_HINT =
  "Migration pendente: aplique 20261021090000_sales_orders_enums.sql e 20261021090100_sales_orders.sql " +
  "(Lovable → Cloud → SQL editor) para ativar o fluxo de pedidos.";

function toError(error: unknown): Err | null {
  if (!error) return null;
  const e = error as { message?: string; code?: string };
  return { message: e.message ?? "erro desconhecido", code: e.code };
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
function mapCustomer(r: Row): Customer {
  return {
    id: str(r.id),
    name: str(r.name),
    tradeName: optStr(r.trade_name),
    taxId: optStr(r.tax_id),
    city: optStr(r.city),
    state: optStr(r.state),
    segment: optStr(r.segment),
    active: r.active !== false,
  };
}

export async function listCustomers(q?: string): Promise<Res<Customer[]>> {
  const res = await db.from("customers").select("*").order("name");
  if (res.error) return { data: null, error: res.error };
  const rows = (res.data ?? []).map(mapCustomer).filter((c) => c.active);
  const needle = (q ?? "").trim().toLowerCase();
  return {
    data: needle ? rows.filter((c) => c.name.toLowerCase().includes(needle)) : rows,
    error: null,
  };
}

export async function createCustomer(input: {
  name: string;
  taxId?: string;
  city?: string;
  state?: string;
  segment?: string;
}): Promise<Res<Customer>> {
  const res = await db
    .from("customers")
    .insert({
      name: input.name.trim(),
      tax_id: input.taxId?.trim() || null,
      city: input.city?.trim() || null,
      state: input.state?.trim() || null,
      segment: input.segment?.trim() || null,
    })
    .select("*")
    .single();
  if (res.error) return { data: null, error: res.error as Err };
  return { data: mapCustomer(res.data as Row), error: null };
}

// ---------------------------------------------------------------------------
// Catálogo técnico-comercial
// ---------------------------------------------------------------------------
function mapOption(r: Row): CatalogOption {
  const group = (r.catalog_option_groups ?? null) as Row | null;
  return {
    id: str(r.id),
    groupId: str(r.group_id),
    groupCode: group ? optStr(group.code) : undefined,
    groupName: group ? optStr(group.name) : undefined,
    code: str(r.code),
    name: str(r.name),
    sector: optStr(r.sector),
    operationName: optStr(r.operation_name),
    driver: (str(r.driver, "peca") as CostDriver) ?? "peca",
    unitCost: num(r.unit_cost),
    setupCost: num(r.setup_cost),
    minutes: optNum(r.minutes),
    outsourced: r.outsourced === true,
    priceDelta: num(r.price_delta),
    requiresSpec: Array.isArray(r.requires_spec) ? (r.requires_spec as string[]) : [],
  };
}

function mapProduct(r: Row, options: CatalogOption[]): CatalogProduct {
  return {
    id: str(r.id),
    code: str(r.code),
    name: str(r.name),
    family: optStr(r.family),
    description: optStr(r.description),
    referenceCode: optStr(r.reference_code),
    configurationId: optStr(r.configuration_id),
    basePrice: num(r.base_price),
    minQty: num(r.min_qty) || 1,
    grade: Array.isArray(r.grade) ? (r.grade as string[]) : [],
    status: (str(r.status, "rascunho") as CatalogProduct["status"]) ?? "rascunho",
    active: r.active !== false,
    options: options.filter((o) => o.groupId && o.groupId.length > 0),
  };
}

export async function listCatalog(): Promise<Res<CatalogProduct[]>> {
  const products = await db.from("catalog_products").select("*").order("name");
  if (products.error) return { data: null, error: products.error };
  const groups = await db.from("catalog_option_groups").select("*").order("sort");
  const options = await db
    .from("catalog_options")
    .select("*, catalog_option_groups(code, name, product_id)")
    .order("name");

  const groupToProduct = new Map<string, string>();
  for (const g of groups.data ?? []) groupToProduct.set(str(g.id), str(g.product_id));

  const optionsByProduct = new Map<string, CatalogOption[]>();
  for (const row of options.data ?? []) {
    const option = mapOption(row);
    const productId = groupToProduct.get(option.groupId);
    if (!productId) continue;
    const list = optionsByProduct.get(productId) ?? [];
    list.push(option);
    optionsByProduct.set(productId, list);
  }

  const rows = (products.data ?? []).map((r) => {
    const product = mapProduct(r, []);
    product.options = optionsByProduct.get(product.id) ?? [];
    return product;
  });
  return { data: rows, error: null };
}

export async function saveCatalogProduct(input: {
  id?: string;
  code: string;
  name: string;
  family?: string;
  description?: string;
  referenceCode?: string;
  configurationId?: string;
  basePrice: number;
  minQty: number;
  grade: string[];
}): Promise<Res<Row>> {
  const payload = {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    family: input.family?.trim() || null,
    description: input.description?.trim() || null,
    reference_code: input.referenceCode?.trim() || null,
    configuration_id: input.configurationId || null,
    base_price: input.basePrice,
    min_qty: input.minQty,
    grade: input.grade,
  };
  const res = input.id
    ? await db.from("catalog_products").update(payload).eq("id", input.id).select("*").maybeSingle()
    : await db.from("catalog_products").insert(payload).select("*").single();
  if (res.error) return { data: null, error: res.error };
  return { data: res.data, error: null };
}

export async function setCatalogStatus(
  id: string,
  status: CatalogProduct["status"],
): Promise<Res<Row>> {
  const { data: user } = await supabase.auth.getUser();
  const res = await db
    .from("catalog_products")
    .update({
      status,
      validated_by: status === "validado" ? (user.user?.id ?? null) : null,
      validated_at: status === "validado" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  return { data: res.data, error: res.error };
}

export async function listConfigurations(): Promise<
  Res<Array<{ id: string; name: string; baseProduct: string }>>
> {
  const res = await db.from("product_configurations").select("*").order("name");
  if (res.error) return { data: null, error: res.error };
  return {
    data: (res.data ?? []).map((r) => ({
      id: str(r.id),
      name: str(r.name),
      baseProduct: str(r.base_product),
    })),
    error: null,
  };
}

export async function listOptionGroups(productId: string): Promise<Res<Row[]>> {
  const res = await db
    .from("catalog_option_groups")
    .select("*")
    .eq("product_id", productId)
    .order("sort");
  return { data: res.data, error: res.error };
}

export async function saveOptionGroup(input: {
  productId: string;
  code: string;
  name: string;
  selection: "single" | "multi";
  required: boolean;
}): Promise<Res<Row>> {
  const res = await db
    .from("catalog_option_groups")
    .insert({
      product_id: input.productId,
      code: input.code.trim().toLowerCase(),
      name: input.name.trim(),
      selection: input.selection,
      required: input.required,
    })
    .select("*")
    .single();
  return { data: res.data, error: res.error };
}

export async function saveOption(input: {
  groupId: string;
  name: string;
  operationName?: string;
  sector?: string;
  driver: CostDriver;
  unitCost: number;
  setupCost: number;
  priceDelta: number;
  outsourced: boolean;
}): Promise<Res<Row>> {
  const res = await db
    .from("catalog_options")
    .insert({
      group_id: input.groupId,
      code: input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      name: input.name.trim(),
      operation_name: input.operationName?.trim() || null,
      sector: input.sector?.trim() || null,
      driver: input.driver,
      unit_cost: input.unitCost,
      setup_cost: input.setupCost,
      price_delta: input.priceDelta,
      outsourced: input.outsourced,
    })
    .select("*")
    .single();
  return { data: res.data, error: res.error };
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
function mapOrder(r: Row): SalesOrder {
  const customer = (r.customers ?? null) as Row | null;
  return {
    id: str(r.id),
    number: str(r.number),
    customerId: str(r.customer_id),
    customerName: customer ? str(customer.name) : undefined,
    sellerId: optStr(r.seller_id),
    status: (str(r.status, "rascunho") as SalesOrderStatus) ?? "rascunho",
    isQuote: r.is_quote !== false,
    dueDate: dateStr(r.due_date),
    quoteValidUntil: dateStr(r.quote_valid_until),
    paymentTerms: optStr(r.payment_terms),
    notes: optStr(r.notes),
    totalValue: num(r.total_value),
    submittedAt: optStr(r.submitted_at),
    approvedAt: optStr(r.approved_at),
    releasedAt: optStr(r.released_at),
    createdAt: str(r.created_at, new Date().toISOString()),
  };
}

export async function listOrders(): Promise<Res<SalesOrder[]>> {
  const res = await db
    .from("sales_orders")
    .select("*, customers(name)")
    .order("created_at", { ascending: false });
  if (res.error) return { data: null, error: res.error };
  return { data: (res.data ?? []).map(mapOrder), error: null };
}

export async function getOrder(id: string): Promise<Res<SalesOrder>> {
  const res = await db.from("sales_orders").select("*, customers(name)").eq("id", id).maybeSingle();
  if (res.error) return { data: null, error: res.error as Err };
  if (!res.data) return { data: null, error: { message: "Pedido não encontrado." } };
  return { data: mapOrder(res.data as Row), error: null };
}

export async function createOrder(input: {
  customerId: string;
  dueDate?: string;
  isQuote: boolean;
  quoteValidUntil?: string;
  paymentTerms?: string;
  notes?: string;
}): Promise<Res<SalesOrder>> {
  const numberRes = await db.rpc("next_sales_order_number");
  if (numberRes.error) return { data: null, error: numberRes.error };
  const number = str(numberRes.data);

  const res = await db
    .from("sales_orders")
    .insert({
      number,
      customer_id: input.customerId,
      is_quote: input.isQuote,
      due_date: input.dueDate || null,
      quote_valid_until: input.quoteValidUntil || null,
      payment_terms: input.paymentTerms?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("*, customers(name)")
    .single();
  if (res.error) return { data: null, error: res.error as Err };
  return { data: mapOrder(res.data as Row), error: null };
}

export async function updateOrderStatus(id: string, status: SalesOrderStatus): Promise<Res<Row>> {
  const res = await db
    .from("sales_orders")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  return { data: res.data, error: res.error };
}

export async function deleteOrder(id: string): Promise<Res<null>> {
  const res = await db.from("sales_orders").delete().eq("id", id);
  return { data: null, error: res.error };
}

// ---------------------------------------------------------------------------
// Itens do pedido
// ---------------------------------------------------------------------------
// Exportada para teste. Deduplicação defensiva: a consulta pede dois embeds
// to-many irmãos (grades e opções) e, verificado contra o PostgREST 16.5, ele
// agrega cada relacionamento separadamente (2 grades + 7 opções, sem produto
// cartesiano). O dedupe fica porque um LEFT JOIN manual ou uma versão futura
// pode repetir linha, e grade repetida somaria peças erradas na tela.
export function mapItem(r: Row): SalesOrderItem {
  const sizeRows = Array.isArray(r.sales_order_item_sizes)
    ? (r.sales_order_item_sizes as Row[])
    : [];
  const sizes = Array.from(
    new Map(
      sizeRows
        .filter((s) => str(s.size) !== "")
        .map((s) => [str(s.size), { size: str(s.size), quantity: num(s.quantity) }] as const),
    ).values(),
  );
  const optionRows = Array.isArray(r.sales_order_item_options)
    ? (r.sales_order_item_options as Row[])
    : [];
  const options = Array.from(
    new Map(
      optionRows
        .filter((o) => str(o.option_id) !== "")
        .map((o) => {
          const opt = (o.catalog_options ?? null) as Row | null;
          const spec = (o.spec ?? {}) as Row;
          const optionId = str(o.option_id);
          return [
            optionId,
            {
              optionId,
              name: opt ? str(opt.name) : "(opção)",
              quantity: num(o.quantity) || 1,
              driverQty: optNum(spec.driver_qty),
            },
          ] as const;
        }),
    ).values(),
  );
  return {
    id: str(r.id),
    orderId: str(r.order_id),
    lineNo: num(r.line_no) || 1,
    catalogProductId: str(r.catalog_product_id),
    referenceCode: optStr(r.reference_code),
    description: str(r.description),
    color: optStr(r.color),
    quantity: num(r.quantity),
    unitPrice: num(r.unit_price),
    priceLocked: r.price_locked === true,
    techStatus:
      (str(r.tech_status, "aguardando_ficha") as SalesOrderItem["techStatus"]) ??
      "aguardando_ficha",
    costStatus:
      (str(r.cost_status, "aguardando_custo") as SalesOrderItem["costStatus"]) ??
      "aguardando_custo",
    productionOrderItemId: optStr(r.production_order_item_id),
    sizes,
    options,
  };
}

export async function listItems(orderId: string): Promise<Res<SalesOrderItem[]>> {
  const res = await db
    .from("sales_order_items")
    .select(
      "*, sales_order_item_sizes(size, quantity), sales_order_item_options(option_id, quantity, spec, catalog_options(name))",
    )
    .eq("order_id", orderId)
    .order("line_no");
  if (res.error) return { data: null, error: res.error };
  return { data: (res.data ?? []).map(mapItem), error: null };
}

export async function addItem(input: {
  orderId: string;
  lineNo: number;
  catalogProductId: string;
  description: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  sizes: Array<{ size: string; quantity: number }>;
  options: Array<{ optionId: string; quantity: number; driverQty?: number }>;
  notes?: string;
}): Promise<Res<Row>> {
  const res = await db
    .from("sales_order_items")
    .insert({
      order_id: input.orderId,
      line_no: input.lineNo,
      catalog_product_id: input.catalogProductId,
      description: input.description.trim(),
      color: input.color?.trim() || null,
      quantity: input.quantity,
      unit_price: input.unitPrice,
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (res.error) return { data: null, error: res.error as Err };
  const itemId = str((res.data as Row).id);

  const sizes = input.sizes.filter((s) => s.quantity > 0);
  if (sizes.length > 0) {
    const sizeRes = await db
      .from("sales_order_item_sizes")
      .insert(sizes.map((s) => ({ item_id: itemId, size: s.size, quantity: s.quantity })));
    if (sizeRes.error) return { data: null, error: sizeRes.error };
  }

  if (input.options.length > 0) {
    const optRes = await db.from("sales_order_item_options").insert(
      input.options.map((o) => ({
        item_id: itemId,
        option_id: o.optionId,
        quantity: o.quantity,
        spec: o.driverQty ? { driver_qty: o.driverQty } : {},
      })),
    );
    if (optRes.error) return { data: null, error: optRes.error };
  }

  // mantém o total comercial do pedido coerente sem esperar o submit
  const items = await listItems(input.orderId);
  if (!items.error && items.data) {
    const total = items.data.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    await db.from("sales_orders").update({ total_value: total }).eq("id", input.orderId);
  }
  return { data: res.data, error: null };
}

export async function deleteItem(itemId: string, orderId: string): Promise<Res<null>> {
  const res = await db.from("sales_order_items").delete().eq("id", itemId);
  if (res.error) return { data: null, error: res.error };
  const items = await listItems(orderId);
  if (!items.error && items.data) {
    const total = items.data.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    await db.from("sales_orders").update({ total_value: total }).eq("id", orderId);
  }
  return { data: null, error: null };
}

// ---------------------------------------------------------------------------
// Ficha do pedido (materiais, operações) e custo — só papéis de custo leem
// ---------------------------------------------------------------------------
export async function listMaterials(itemId: string): Promise<Res<MaterialLine[]>> {
  const res = await db
    .from("sales_order_item_materials")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at");
  if (res.error) return { data: null, error: res.error };
  return {
    data: (res.data ?? []).map((r) => ({
      id: str(r.id),
      kind: str(r.kind, "aviamento"),
      material: str(r.material),
      unit: str(r.unit, "un"),
      consumption: num(r.consumption),
      wastePct: num(r.waste_pct),
      unitCost: num(r.unit_cost),
      totalCost: optNum(r.total_cost),
    })),
    error: null,
  };
}

export async function listOperations(itemId: string): Promise<Res<OperationLine[]>> {
  const res = await db
    .from("sales_order_item_operations")
    .select("*")
    .eq("item_id", itemId)
    .order("seq");
  if (res.error) return { data: null, error: res.error };
  return {
    data: (res.data ?? []).map((r) => ({
      id: str(r.id),
      seq: num(r.seq),
      sector: str(r.sector),
      operation: str(r.operation),
      driver: (str(r.driver, "peca") as OperationLine["driver"]) ?? "peca",
      driverQty: num(r.driver_qty),
      unitCost: num(r.unit_cost),
      setupCost: num(r.setup_cost),
      totalCost: optNum(r.total_cost),
      outsourced: r.outsourced === true,
      source: str(r.source, "custo") === "catalogo" ? "catalogo" : "custo",
    })),
    error: null,
  };
}

export async function listCosts(orderId: string): Promise<Res<ItemCost[]>> {
  const items = await listItems(orderId);
  if (items.error || !items.data) return { data: null, error: items.error };
  const ids = items.data.map((i) => i.id);
  if (ids.length === 0) return { data: [], error: null };
  const res = await db.from("sales_order_item_costs").select("*").in("item_id", ids);
  if (res.error) return { data: null, error: res.error };
  return {
    data: (res.data ?? []).map((r) => ({
      itemId: str(r.item_id),
      materialsTotal: num(r.materials_total),
      operationsTotal: num(r.operations_total),
      setupTotal: num(r.setup_total),
      overheadPct: num(r.overhead_pct),
      industrialCost: num(r.industrial_cost),
      unitCost: num(r.unit_cost),
      marginPct: r.margin_pct == null ? null : num(r.margin_pct),
      suggestedPrice: num(r.suggested_price),
      status: (str(r.status, "pendente") as ItemCost["status"]) ?? "pendente",
      detailedAt: optStr(r.detailed_at),
      approvedAt: optStr(r.approved_at),
    })),
    error: null,
  };
}

// ---------------------------------------------------------------------------
// RPCs (regra no banco)
// ---------------------------------------------------------------------------
export async function submitOrder(orderId: string): Promise<Res<null>> {
  const res = await db.rpc("submit_sales_order", { _order_id: orderId });
  return { data: null, error: res.error };
}

export async function recalcItem(itemId: string): Promise<Res<number>> {
  const res = await db.rpc("recalc_sales_order_item", { _item_id: itemId });
  return { data: res.error ? null : num(res.data), error: res.error };
}

export async function approveItem(itemId: string, note?: string): Promise<Res<null>> {
  const res = await db.rpc("approve_sales_order_item", {
    _item_id: itemId,
    _note: note?.trim() || null,
  });
  return { data: null, error: res.error };
}

export async function releaseToPcp(orderId: string): Promise<Res<string>> {
  const res = await db.rpc("release_sales_order_to_pcp", { _order_id: orderId });
  return { data: res.error ? null : str(res.data), error: res.error };
}

export async function getTechnicalSheet(orderId: string): Promise<Res<Row>> {
  const res = await db.rpc("order_item_technical_sheet", { _order_id: orderId });
  if (res.error) return { data: null, error: res.error };
  return { data: (res.data ?? {}) as Row, error: null };
}

export async function updateOperation(input: {
  id: string;
  driverQty?: number;
  unitCost?: number;
  setupCost?: number;
}): Promise<Res<Row>> {
  const res = await db
    .from("sales_order_item_operations")
    .update({
      ...(input.driverQty !== undefined ? { driver_qty: input.driverQty } : {}),
      ...(input.unitCost !== undefined ? { unit_cost: input.unitCost } : {}),
      ...(input.setupCost !== undefined ? { setup_cost: input.setupCost } : {}),
    })
    .eq("id", input.id)
    .select("*")
    .maybeSingle();
  return { data: res.data, error: res.error };
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
export async function listOrderEvents(orderId: string): Promise<Res<OrderEvent[]>> {
  const res = await db
    .from("entity_events")
    .select("*")
    .eq("entity_type", "sales_order")
    .eq("entity_id", orderId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (res.error) return { data: null, error: res.error };
  return {
    data: (res.data ?? []).map((r) => ({
      id: str(r.id),
      eventType: str(r.event_type),
      fromStatus: optStr(r.from_status),
      toStatus: optStr(r.to_status),
      note: optStr(r.note),
      actorName: optStr(r.actor_name),
      createdAt: str(r.created_at),
    })),
    error: null,
  };
}
