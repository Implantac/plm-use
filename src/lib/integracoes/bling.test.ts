// Onda 125 — Conector Bling: mapeamento puro, janela de busca, token e sincronização (HTTP e Supabase fakes).
import { describe, expect, it } from "vitest";
import { validarPedidoEntrada } from "@/lib/api/escrita-v1";
import {
  dataInicialSync,
  mapearPedidoBling,
  urlAutorizacaoBling,
  type BlingPedidoDetalhe,
} from "./bling";
import {
  expiraEm,
  obterTokenValido,
  sincronizarPedidosBling,
  trocarCodigoPorToken,
  type Http,
} from "./bling.server";

const detalhe = (over: Partial<BlingPedidoDetalhe> = {}): BlingPedidoDetalhe => ({
  id: 9001,
  numero: 1234,
  data: "2026-11-20",
  dataPrevista: "2026-12-05",
  situacao: { id: 6 },
  observacoes: "Entregar pela manhã",
  contato: {
    id: 55,
    nome: "Loja Centro LTDA",
    numeroDocumento: "12.345.678/0001-90",
    email: "compras@loja.com",
    celular: "(11) 99999-0000",
    endereco: { geral: { municipio: "São Paulo", uf: "sp" } },
  },
  itens: [
    { codigo: "CAM-001", descricao: "Camisa Linho", quantidade: 6, valor: 100, desconto: 10 },
    { codigo: "SAI-010", descricao: "Saia Midi", quantidade: 2, valor: 120 },
  ],
  parcelas: [
    { dataVencimento: "2026-12-10", valor: 400 },
    { dataVencimento: "2027-01-10", valor: 380 },
  ],
  ...over,
});

describe("Onda 125 — mapearPedidoBling", () => {
  it("vira um PedidoEntrada válido para o mesmo caminho do POST /api/v1/sales-orders", () => {
    const m = mapearPedidoBling(detalhe());
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    expect(m.pedido.source).toBe("bling");
    expect(m.pedido.external_ref).toBe("1234");
    expect(m.pedido.customer).toMatchObject({
      code: "12345678000190",
      tax_id: "12345678000190",
      name: "Loja Centro LTDA",
      state: "SP",
      city: "São Paulo",
    });
    expect(m.pedido.items[0]).toMatchObject({
      product_code: "CAM-001",
      quantity: 6,
      unit_price: 90,
    });
    expect(m.pedido.due_date).toBe("2026-12-05");
    expect(m.pedido.payment_terms).toBe("2x (2026-12-10, 2027-01-10)");
    expect(m.pedido.notes).toContain("Bling pedido nº 1234");
    const v = validarPedidoEntrada(m.pedido);
    expect(v.ok).toBe(true);
  });

  it("sem CNPJ usa BLING-<id>; cancelado é ignorado; sem SKU ou sem itens é rejeitado", () => {
    const semDoc = mapearPedidoBling(detalhe({ contato: { id: 7, nome: "Fulano" } }));
    expect(semDoc.ok && semDoc.pedido.customer.code).toBe("BLING-7");
    const canc = mapearPedidoBling(detalhe({ situacao: { id: 12 } }));
    expect(canc.ok).toBe(false);
    if (!canc.ok) expect(canc.ignorar).toBe(true);
    const semSku = mapearPedidoBling(
      detalhe({ itens: [{ codigo: "", quantidade: 1, valor: 10 }] }),
    );
    expect(semSku.ok).toBe(false);
    if (!semSku.ok) expect(semSku.motivo).toMatch(/SKU/);
    expect(mapearPedidoBling(detalhe({ itens: [] })).ok).toBe(false);
  });

  it("URL de autorização e janela de busca", () => {
    const u = new URL(urlAutorizacaoBling("abc", "st-1"));
    expect(u.origin + u.pathname).toBe("https://www.bling.com.br/Api/v3/oauth/authorize");
    expect(u.searchParams.get("client_id")).toBe("abc");
    expect(u.searchParams.get("state")).toBe("st-1");
    const agora = new Date("2026-11-25T12:00:00Z");
    expect(dataInicialSync(null, 30, agora)).toBe("2026-10-26");
    expect(dataInicialSync("2026-11-24T08:00:00Z", 30, agora)).toBe("2026-11-23"); // 1 dia de sobreposição
    expect(expiraEm(21_600, Date.parse("2026-11-25T12:00:00Z"))).toBe("2026-11-25T17:58:00.000Z");
  });
});

// ---- fakes ----
type Row = Record<string, unknown>;
function fakeAdmin(seed: Record<string, Row[]>) {
  const t: Record<string, Row[]> = {
    integration_connections: [],
    sales_orders: [],
    customers: [],
    catalog_products: [],
    sales_order_items: [],
    sales_order_item_sizes: [],
    ...seed,
  };
  let seq = 0;
  const from = (nome: string) => {
    const rows = t[nome]!;
    const f: ((r: Row) => boolean)[] = [];
    let modo: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row | Row[] | null = null;
    const exec = () => {
      if (modo === "insert") {
        const lista = Array.isArray(payload) ? payload : [payload!];
        const novos = lista.map((p) => ({ id: `${nome}-${++seq}`, status: "rascunho", ...p }));
        rows.push(...novos);
        return { data: novos.length === 1 ? novos[0] : novos, error: null };
      }
      const sel = rows.filter((r) => f.every((x) => x(r)));
      if (modo === "update") {
        for (const r of sel) Object.assign(r, payload);
        return { data: sel, error: null };
      }
      return { data: sel, error: null };
    };
    const q = {
      select: () => q,
      insert: (p: Row | Row[]) => ((modo = "insert"), (payload = p), q),
      update: (p: Row) => ((modo = "update"), (payload = p), q),
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
  const rpc = () => Promise.resolve({ data: `PV-${++seq}`, error: null });
  return { admin: { from, rpc } as unknown as Parameters<typeof sincronizarPedidosBling>[0], t };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function fakeHttp() {
  const chamadas: { url: string; init?: RequestInit }[] = [];
  const http: Http = async (url, init) => {
    chamadas.push({ url, init });
    if (url.includes("/oauth/token"))
      return json({ access_token: "AT2", refresh_token: "RT2", expires_in: 21600 });
    if (url.includes("/pedidos/vendas?"))
      return json({
        data: [
          { id: 9001, numero: 1234, situacao: { id: 6 } },
          { id: 9002, numero: 1235, situacao: { id: 12 } },
          { id: 9003, numero: 1236, situacao: { id: 6 } },
        ],
      });
    if (url.endsWith("/pedidos/vendas/9001")) return json({ data: detalhe() });
    if (url.endsWith("/pedidos/vendas/9002"))
      return json({ data: detalhe({ id: 9002, numero: 1235, situacao: { id: 12 } }) });
    if (url.endsWith("/pedidos/vendas/9003"))
      return json({
        data: detalhe({
          id: 9003,
          numero: 1236,
          itens: [{ codigo: "NAO-EXISTE", quantidade: 1, valor: 10 }],
        }),
      });
    return json({ error: { type: "not_found" } }, 404);
  };
  return { http, chamadas };
}
const cred = { id: "cid", secret: "csec" };
const catalogo = [
  { id: "p1", code: "CAM-001", name: "Camisa", status: "validado", active: true },
  { id: "p2", code: "SAI-010", name: "Saia", status: "validado", active: true },
];
const semEspera = () => Promise.resolve();

describe("Onda 125 — token", () => {
  it("troca o código com Basic auth e renova quando expirado, persistindo", async () => {
    const { http, chamadas } = fakeHttp();
    const t = await trocarCodigoPorToken("c0d3", cred, http);
    expect(t.access_token).toBe("AT2");
    const h = chamadas[0]!.init!.headers as Record<string, string>;
    expect(h.Authorization).toBe(`Basic ${Buffer.from("cid:csec").toString("base64")}`);
    expect(String(chamadas[0]!.init!.body)).toContain("grant_type=authorization_code");

    const { admin, t: tabelas } = fakeAdmin({
      integration_connections: [
        {
          provider: "bling",
          access_token: "OLD",
          refresh_token: "RT1",
          expires_at: "2020-01-01T00:00:00Z",
        },
      ],
    });
    expect(await obterTokenValido(admin, cred, http)).toBe("AT2");
    expect(tabelas.integration_connections[0]).toMatchObject({
      access_token: "AT2",
      refresh_token: "RT2",
    });
    expect(String(chamadas.at(-1)!.init!.body)).toContain("grant_type=refresh_token");
  });

  it("token ainda válido não bate no Bling; sem conexão explica", async () => {
    const { http, chamadas } = fakeHttp();
    const { admin } = fakeAdmin({
      integration_connections: [
        {
          provider: "bling",
          access_token: "OK",
          refresh_token: "RT1",
          expires_at: "2999-01-01T00:00:00Z",
        },
      ],
    });
    expect(await obterTokenValido(admin, cred, http)).toBe("OK");
    expect(chamadas).toHaveLength(0);
    await expect(obterTokenValido(fakeAdmin({}).admin, cred, http)).rejects.toThrow(
      /não conectado/,
    );
  });
});

describe("Onda 125 — sincronizarPedidosBling", () => {
  it("cria, ignora cancelado, rejeita SKU desconhecido, é idempotente e grava o resumo", async () => {
    const { http } = fakeHttp();
    const { admin, t } = fakeAdmin({
      catalog_products: catalogo,
      integration_connections: [
        {
          provider: "bling",
          access_token: "OK",
          refresh_token: "RT1",
          expires_at: "2999-01-01T00:00:00Z",
        },
      ],
    });
    const r1 = await sincronizarPedidosBling(admin, cred, { http, sleep: semEspera, dias: 7 });
    expect(r1.erro).toBeUndefined();
    expect(r1).toMatchObject({ lidos: 3, criados: 1, existentes: 0, ignorados: 1 });
    expect(r1.rejeitados).toHaveLength(1);
    expect(r1.rejeitados[0]).toMatchObject({ numero: "1236" });
    expect(r1.rejeitados[0]!.motivo).toContain("NAO-EXISTE");
    expect(t.sales_orders).toHaveLength(1);
    expect(t.sales_orders[0]).toMatchObject({ external_source: "bling", external_ref: "1234" });
    expect(t.customers[0]).toMatchObject({ code: "12345678000190" });
    expect(t.integration_connections[0]!.last_sync_at).toBe(r1.inicio);
    expect(t.integration_connections[0]!.last_sync_summary).toMatchObject({ criados: 1 });

    const r2 = await sincronizarPedidosBling(admin, cred, { http, sleep: semEspera });
    expect(r2).toMatchObject({ criados: 0, existentes: 1 });
    expect(t.sales_orders).toHaveLength(1);
  });

  it("falha de rede vira resumo.erro sem avançar last_sync_at", async () => {
    const http: Http = async () => json({ error: { type: "down" } }, 500);
    const { admin, t } = fakeAdmin({
      integration_connections: [
        {
          provider: "bling",
          access_token: "OK",
          refresh_token: "RT1",
          expires_at: "2999-01-01T00:00:00Z",
        },
      ],
    });
    const r = await sincronizarPedidosBling(admin, cred, { http, sleep: semEspera });
    expect(r.erro).toMatch(/500/);
    expect(t.integration_connections[0]!.last_sync_at).toBeUndefined();
  });
});
