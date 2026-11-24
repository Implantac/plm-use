// Onda 122 — validação (pura) das escritas aceitas pela API v1.
export const STATUS_OP = ["planejada", "em_producao", "pausada", "concluida", "cancelada"] as const;

export interface PatchOp {
  status?: (typeof STATUS_OP)[number];
  erp_op_id?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  notes?: string | null;
}

const dataISO = /^\d{4}-\d{2}-\d{2}$/;

export function validarPatchOp(
  corpo: unknown,
): { ok: true; patch: PatchOp } | { ok: false; erro: string } {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo))
    return { ok: false, erro: "Corpo deve ser um objeto JSON." };
  const c = corpo as Record<string, unknown>;
  const patch: PatchOp = {};
  const permitidos = ["status", "erp_op_id", "planned_start", "planned_end", "notes"];
  for (const k of Object.keys(c)) {
    if (!permitidos.includes(k))
      return { ok: false, erro: `Campo não permitido: ${k}. Aceitos: ${permitidos.join(", ")}` };
  }
  if (c.status !== undefined) {
    if (typeof c.status !== "string" || !(STATUS_OP as readonly string[]).includes(c.status))
      return { ok: false, erro: `status deve ser um de: ${STATUS_OP.join(", ")}` };
    patch.status = c.status as PatchOp["status"];
  }
  if (c.erp_op_id !== undefined) {
    if (c.erp_op_id !== null && (typeof c.erp_op_id !== "string" || c.erp_op_id.length > 60))
      return { ok: false, erro: "erp_op_id deve ser texto (≤ 60) ou null" };
    patch.erp_op_id = c.erp_op_id as string | null;
  }
  for (const k of ["planned_start", "planned_end"] as const) {
    if (c[k] !== undefined) {
      if (c[k] !== null && (typeof c[k] !== "string" || !dataISO.test(c[k] as string)))
        return { ok: false, erro: `${k} deve ser data AAAA-MM-DD ou null` };
      patch[k] = c[k] as string | null;
    }
  }
  if (c.notes !== undefined) {
    if (c.notes !== null && (typeof c.notes !== "string" || c.notes.length > 2000))
      return { ok: false, erro: "notes deve ser texto (≤ 2000) ou null" };
    patch.notes = c.notes as string | null;
  }
  if (Object.keys(patch).length === 0) return { ok: false, erro: "Nada para atualizar." };
  return { ok: true, patch };
}

// ---------------------------------------------------------------------------
// Onda 123 — POST /api/v1/sales-orders (loja/ERP → PLM)
// ---------------------------------------------------------------------------
export interface ItemPedidoEntrada {
  product_code: string;
  description?: string;
  color?: string | null;
  quantity: number;
  unit_price: number;
  sizes?: { size: string; quantity: number }[];
  notes?: string | null;
}
export interface PedidoEntrada {
  source: string;
  external_ref: string;
  customer: {
    code: string;
    name?: string;
    trade_name?: string;
    tax_id?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
  };
  is_quote: boolean;
  due_date?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  items: ItemPedidoEntrada[];
}

const texto = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const slugFonte = /^[a-z0-9_-]{2,30}$/;

export function validarPedidoEntrada(
  corpo: unknown,
): { ok: true; pedido: PedidoEntrada } | { ok: false; erro: string } {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo))
    return { ok: false, erro: "Corpo deve ser um objeto JSON." };
  const c = corpo as Record<string, unknown>;
  if (typeof c.source !== "string" || !slugFonte.test(c.source))
    return {
      ok: false,
      erro: "source obrigatório: identificador da origem (ex.: vtex, bling, totvs; a-z 0-9 _ -).",
    };
  if (!texto(c.external_ref, 80))
    return { ok: false, erro: "external_ref obrigatório: id do pedido na origem (≤ 80)." };
  const cu = c.customer;
  if (!cu || typeof cu !== "object" || Array.isArray(cu))
    return {
      ok: false,
      erro: "customer obrigatório: { code, name?, tax_id?, email?, phone?, city?, state? }.",
    };
  const cust = cu as Record<string, unknown>;
  if (!texto(cust.code, 60))
    return { ok: false, erro: "customer.code obrigatório (código do cliente na origem, ≤ 60)." };
  for (const k of ["name", "trade_name", "tax_id", "email", "phone", "city"] as const)
    if (cust[k] !== undefined && !texto(cust[k], 160))
      return { ok: false, erro: `customer.${k} deve ser texto (≤ 160).` };
  if (
    cust.state !== undefined &&
    !(typeof cust.state === "string" && /^[A-Z]{2}$/.test(cust.state))
  )
    return { ok: false, erro: "customer.state deve ser a UF com 2 letras (ex.: SP)." };
  if (c.is_quote !== undefined && typeof c.is_quote !== "boolean")
    return { ok: false, erro: "is_quote deve ser true/false." };
  if (c.due_date != null && !(typeof c.due_date === "string" && dataISO.test(c.due_date)))
    return { ok: false, erro: "due_date deve ser AAAA-MM-DD." };
  if (c.payment_terms != null && !texto(c.payment_terms, 120))
    return { ok: false, erro: "payment_terms deve ser texto (≤ 120)." };
  if (c.notes != null && !(typeof c.notes === "string" && c.notes.length <= 2000))
    return { ok: false, erro: "notes deve ser texto (≤ 2000)." };
  if (!Array.isArray(c.items) || c.items.length === 0)
    return { ok: false, erro: "items obrigatório: ao menos 1 item." };
  if (c.items.length > 200) return { ok: false, erro: "Máximo de 200 itens por pedido." };
  const items: ItemPedidoEntrada[] = [];
  for (let i = 0; i < c.items.length; i++) {
    const it = c.items[i] as Record<string, unknown>;
    const pre = `items[${i}]`;
    if (!it || typeof it !== "object") return { ok: false, erro: `${pre} deve ser objeto.` };
    if (!texto(it.product_code, 60))
      return {
        ok: false,
        erro: `${pre}.product_code obrigatório (código do produto no catálogo do PLM).`,
      };
    if (typeof it.quantity !== "number" || !Number.isFinite(it.quantity) || it.quantity <= 0)
      return { ok: false, erro: `${pre}.quantity deve ser número > 0.` };
    if (typeof it.unit_price !== "number" || !Number.isFinite(it.unit_price) || it.unit_price < 0)
      return { ok: false, erro: `${pre}.unit_price deve ser número ≥ 0.` };
    if (it.description !== undefined && !texto(it.description, 200))
      return { ok: false, erro: `${pre}.description deve ser texto (≤ 200).` };
    if (it.color != null && !texto(it.color, 60))
      return { ok: false, erro: `${pre}.color deve ser texto (≤ 60).` };
    let sizes: { size: string; quantity: number }[] | undefined;
    if (it.sizes !== undefined) {
      if (!Array.isArray(it.sizes))
        return { ok: false, erro: `${pre}.sizes deve ser lista [{size, quantity}].` };
      sizes = [];
      let soma = 0;
      for (const sz of it.sizes as Record<string, unknown>[]) {
        if (!sz || !texto(sz.size, 10) || typeof sz.quantity !== "number" || sz.quantity < 0)
          return {
            ok: false,
            erro: `${pre}.sizes: cada item precisa de size (≤ 10) e quantity ≥ 0.`,
          };
        soma += sz.quantity;
        sizes.push({ size: (sz.size as string).trim(), quantity: sz.quantity });
      }
      if (soma !== it.quantity)
        return {
          ok: false,
          erro: `${pre}: a soma da grade (${soma}) difere de quantity (${it.quantity}).`,
        };
    }
    items.push({
      product_code: (it.product_code as string).trim(),
      description: it.description as string | undefined,
      color: (it.color as string | null | undefined) ?? null,
      quantity: it.quantity,
      unit_price: it.unit_price,
      sizes,
      notes: (it.notes as string | null | undefined) ?? null,
    });
  }
  return {
    ok: true,
    pedido: {
      source: c.source,
      external_ref: (c.external_ref as string).trim(),
      customer: {
        code: (cust.code as string).trim(),
        name: cust.name as string | undefined,
        trade_name: cust.trade_name as string | undefined,
        tax_id: cust.tax_id as string | undefined,
        email: cust.email as string | undefined,
        phone: cust.phone as string | undefined,
        city: cust.city as string | undefined,
        state: cust.state as string | undefined,
      },
      is_quote: c.is_quote === true,
      due_date: (c.due_date as string | null | undefined) ?? null,
      payment_terms: (c.payment_terms as string | null | undefined) ?? null,
      notes: (c.notes as string | null | undefined) ?? null,
      items,
    },
  };
}
