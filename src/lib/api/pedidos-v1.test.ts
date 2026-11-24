// Onda 123 — trava do POST /api/v1/sales-orders: validação e criação (Supabase fake em memória).
import { describe, expect, it } from "vitest";
import { validarPedidoEntrada } from "./escrita-v1";
import { criarPedidoExterno } from "./pedidos-v1.server";
import { gerarOpenApi, recursoPorSlug } from "./recursos-v1";

const base = {
  source: "vtex",
  external_ref: "1234567-01",
  customer: { code: "C-100", name: "Loja Centro", state: "SP" },
  items: [
    {
      product_code: "CAM-001",
      quantity: 6,
      unit_price: 89.9,
      sizes: [
        { size: "P", quantity: 2 },
        { size: "M", quantity: 4 },
      ],
    },
    { product_code: "SAI-010", quantity: 2, unit_price: 120 },
  ],
};

describe("validarPedidoEntrada", () => {
  it("aceita pedido completo e normaliza", () => {
    const r = validarPedidoEntrada(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pedido.is_quote).toBe(false);
      expect(r.pedido.items[0]!.sizes).toHaveLength(2);
    }
  });
  it("mensagens apontam o campo", () => {
    const casos: [unknown, RegExp][] = [
      [{}, /source/],
      [{ ...base, source: "VTEX!" }, /source/],
      [{ ...base, external_ref: "" }, /external_ref/],
      [{ ...base, customer: { name: "x" } }, /customer\.code/],
      [{ ...base, customer: { code: "c", state: "sp" } }, /UF/],
      [{ ...base, items: [] }, /items/],
      [{ ...base, items: [{ product_code: "A", quantity: 0, unit_price: 1 }] }, /quantity/],
      [
        {
          ...base,
          items: [
            { product_code: "A", quantity: 3, unit_price: 1, sizes: [{ size: "M", quantity: 2 }] },
          ],
        },
        /grade/,
      ],
      [{ ...base, due_date: "24/11/2026" }, /due_date/],
    ];
    for (const [c, re] of casos) {
      const r = validarPedidoEntrada(c);
      expect(r.ok, JSON.stringify(c)).toBe(false);
      if (!r.ok) expect(r.erro).toMatch(re);
    }
  });
  it("OpenAPI documenta GET e POST; recurso lê external_ref", () => {
    const doc = gerarOpenApi("https://x");
    const p = doc.paths["/api/v1/sales-orders"] as Record<string, unknown>;
    expect(Object.keys(p).sort()).toEqual(["get", "post"]);
    expect(recursoPorSlug("sales-orders")!.colunas).toEqual(
      expect.arrayContaining(["external_source", "external_ref"]),
    );
  });
});

// ---- Supabase fake ----
type Row = Record<string, unknown>;
function fake(seed: Record<string, Row[]>, opts: { falharInsertPedidoCom?: string } = {}) {
  const t: Record<string, Row[]> = {
    sales_orders: [],
    customers: [],
    catalog_products: [],
    sales_order_items: [],
    sales_order_item_sizes: [],
    ...seed,
  };
  let seq = 100;
  const chamadas: string[] = [];
  const from = (nome: string) => {
    const rows = t[nome]!;
    const f: ((r: Row) => boolean)[] = [];
    let modo: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row | Row[] | null = null;
    const exec = () => {
      chamadas.push(`${nome}.${modo}`);
      if (modo === "insert") {
        const lista = Array.isArray(payload) ? payload : [payload!];
        if (nome === "sales_orders" && opts.falharInsertPedidoCom)
          return { data: null, error: { code: opts.falharInsertPedidoCom } };
        const novos = lista.map((p) => ({
          id: `${nome}-${++seq}`,
          status: nome === "sales_orders" ? "rascunho" : undefined,
          created_at: "2026-11-24T00:00:00Z",
          ...p,
        }));
        rows.push(...novos);
        return { data: novos.length === 1 ? novos[0] : novos, error: null };
      }
      const sel = rows.filter((r) => f.every((x) => x(r)));
      if (modo === "update") {
        for (const r of sel) Object.assign(r, payload);
        return { data: sel, error: null };
      }
      if (modo === "delete") {
        for (const r of sel) rows.splice(rows.indexOf(r), 1);
        return { data: null, error: null };
      }
      return { data: sel, error: null };
    };
    const q = {
      select: () => q,
      insert: (p: Row | Row[]) => ((modo = "insert"), (payload = p), q),
      update: (p: Row) => ((modo = "update"), (payload = p), q),
      delete: () => ((modo = "delete"), q),
      eq: (k: string, v: unknown) => (f.push((r) => r[k] === v), q),
      in: (k: string, vs: unknown[]) => (f.push((r) => vs.includes(r[k])), q),
      maybeSingle: () => {
        const r = exec();
        return Promise.resolve({
          data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data,
          error: r.error,
        });
      },
      single: () => {
        const r = exec();
        return Promise.resolve({
          data: Array.isArray(r.data) ? r.data[0] : r.data,
          error: r.error,
        });
      },
      then: (res: (v: unknown) => void) => res(exec()),
    };
    return q;
  };
  const rpc = (fn: string) =>
    Promise.resolve(
      fn === "next_sales_order_number"
        ? { data: `PV-${++seq}`, error: null }
        : { data: null, error: { message: "?" } },
    );
  return {
    admin: { from, rpc } as unknown as Parameters<typeof criarPedidoExterno>[0],
    t,
    chamadas,
  };
}
const catalogo = [
  { id: "p1", code: "CAM-001", name: "Camisa Linho", status: "validado", active: true },
  { id: "p2", code: "SAI-010", name: "Saia Midi", status: "validado", active: true },
  { id: "p3", code: "OLD-1", name: "Antigo", status: "descontinuado", active: false },
];
const pedido = () => {
  const r = validarPedidoEntrada(base);
  if (!r.ok) throw new Error(r.erro);
  return r.pedido;
};

describe("criarPedidoExterno", () => {
  it("cria cliente, pedido, itens e grade; total correto; 201", async () => {
    const { admin, t } = fake({ catalog_products: catalogo });
    const r = await criarPedidoExterno(admin, pedido(), "Loja VTEX");
    expect(r.status).toBe(201);
    if ("corpo" in r) {
      const d = r.corpo.data as Row;
      expect(d.number).toMatch(/^PV-/);
      expect(d.total_value).toBeCloseTo(6 * 89.9 + 240, 2);
      expect((d.items as Row[]).length).toBe(2);
    }
    expect(t.customers).toHaveLength(1);
    expect(t.customers[0]).toMatchObject({ code: "C-100", name: "Loja Centro", state: "SP" });
    expect(t.sales_orders[0]).toMatchObject({
      external_source: "vtex",
      external_ref: "1234567-01",
      status: "rascunho",
    });
    expect(String(t.sales_orders[0]!.notes)).toContain("Origem: vtex #1234567-01");
    expect(t.sales_order_items.map((i) => i.line_no)).toEqual([1, 2]);
    expect(t.sales_order_items[0]).toMatchObject({
      catalog_product_id: "p1",
      description: "Camisa Linho",
      reference_code: "CAM-001",
    });
    expect(t.sales_order_item_sizes).toHaveLength(2);
  });
  it("reenvio do mesmo pedido → 200 already_existed, sem duplicar", async () => {
    const { admin, t } = fake({ catalog_products: catalogo });
    await criarPedidoExterno(admin, pedido(), "k");
    const r = await criarPedidoExterno(admin, pedido(), "k");
    expect(r.status).toBe(200);
    if ("corpo" in r) expect(r.corpo.already_existed).toBe(true);
    expect(t.sales_orders).toHaveLength(1);
  });
  it("produto desconhecido ou inativo → 422 com a lista", async () => {
    const { admin } = fake({ catalog_products: catalogo });
    const p = pedido();
    p.items.push(
      { product_code: "NADA", quantity: 1, unit_price: 1 },
      { product_code: "OLD-1", quantity: 1, unit_price: 1 },
    );
    const r = await criarPedidoExterno(admin, p, "k");
    expect(r.status).toBe(422);
    if ("erro" in r)
      expect(r.detalhes).toEqual({
        product_codes_desconhecidos: ["NADA"],
        product_codes_inativos: ["OLD-1"],
      });
  });
  it("cliente existente é reaproveitado (e atualizado); cliente novo sem name → 422", async () => {
    const { admin, t } = fake({
      catalog_products: catalogo,
      customers: [{ id: "c9", code: "C-100", name: "Antigo" }],
    });
    const r = await criarPedidoExterno(admin, pedido(), "k");
    expect(r.status).toBe(201);
    expect(t.customers).toHaveLength(1);
    expect(t.customers[0]!.name).toBe("Loja Centro");
    expect(t.sales_orders[0]!.customer_id).toBe("c9");
    const p = pedido();
    p.customer = { code: "NOVO" };
    p.external_ref = "outro";
    const r2 = await criarPedidoExterno(admin, p, "k");
    expect(r2.status).toBe(422);
  });
  it("migration pendente → 503 claro", async () => {
    const { admin } = fake({});
    (admin as unknown as { from: unknown }).from = () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: { code: "42703" } }),
          }),
        }),
      }),
    });
    const r = await criarPedidoExterno(admin, pedido(), "k");
    expect(r.status).toBe(503);
  });
});
