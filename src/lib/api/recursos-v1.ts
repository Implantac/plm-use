// Onda 121 — API pública v1 (leitura): mapa de recursos expostos.
// Puro (sem servidor) para ser testável e gerar a OpenAPI. Só colunas listadas
// aqui saem — nunca `select("*")` num endpoint público.

export interface RecursoV1 {
  /** segmento da URL: /api/v1/<slug> */
  slug: string;
  tabela: string;
  descricao: string;
  colunas: string[];
  /** coluna usada por `updated_since` e pela paginação (ordem estável com id); null = snapshot sem cursor (view) */
  colunaAtualizacao: string | null;
  filtros?: Record<string, string>;
}

export const RECURSOS_V1: RecursoV1[] = [
  {
    slug: "references",
    tabela: "references",
    descricao: "Referências (produtos em desenvolvimento) com status do fluxo.",
    colunas: [
      "id",
      "code",
      "name",
      "status",
      "collection_id",
      "season",
      "line",
      "theme",
      "priority",
      "target_cost",
      "target_price",
      "erp_product_id",
      "image_url",
      "created_at",
      "updated_at",
    ],
    colunaAtualizacao: "updated_at",
    filtros: { status: "Status da referência (ex.: aprovado)", collection_id: "UUID da coleção" },
  },
  {
    slug: "materials",
    tabela: "materials",
    descricao: "Cadastro de materiais e aviamentos.",
    colunas: [
      "id",
      "sku",
      "external_key",
      "name",
      "material_type",
      "unit",
      "unit_cost",
      "supplier",
      "created_at",
      "updated_at",
    ],
    colunaAtualizacao: "updated_at",
    filtros: { material_type: "Tipo do material (tecido, aviamento…)" },
  },
  {
    slug: "suppliers",
    tabela: "suppliers",
    descricao: "Fornecedores e facções homologados.",
    colunas: [
      "id",
      "code",
      "name",
      "cnpj",
      "tipo",
      "cidade",
      "uf",
      "status",
      "created_at",
      "updated_at",
    ],
    colunaAtualizacao: "updated_at",
    filtros: { tipo: "confeccao, malharia, aviamentos…", status: "ativo / inativo" },
  },
  {
    slug: "sales-orders",
    tabela: "sales_orders",
    descricao: "Pedidos de venda B2B (cabeçalho).",
    colunas: [
      "id",
      "number",
      "customer_id",
      "seller_id",
      "status",
      "is_quote",
      "total_value",
      "due_date",
      "payment_terms",
      "approved_at",
      "released_at",
      "created_at",
      "updated_at",
    ],
    colunaAtualizacao: "updated_at",
    filtros: { status: "Status do pedido", customer_id: "UUID do cliente" },
  },
  {
    slug: "production-orders",
    tabela: "production_orders",
    descricao: "Ordens de produção (OP) e seu estágio.",
    colunas: [
      "id",
      "number",
      "status",
      "priority",
      "planned_start",
      "planned_end",
      "erp_op_id",
      "created_at",
      "updated_at",
    ],
    colunaAtualizacao: "updated_at",
    filtros: { status: "Status da OP" },
  },
  {
    slug: "stock-balance",
    tabela: "stock_balance",
    descricao: "Saldo de estoque por item e armazém.",
    colunas: [
      "item_id",
      "item_code",
      "item_name",
      "warehouse_id",
      "warehouse_code",
      "qty_on_hand",
      "qty_reserved",
    ],
    colunaAtualizacao: null,
    filtros: { warehouse_code: "Código do armazém", item_code: "Código do item" },
  },
  {
    slug: "tech-sheets",
    tabela: "tech_sheets",
    descricao: "Fichas técnicas salvas (BOM e sequência de operações em JSON).",
    colunas: ["id", "ref", "bom", "bop", "created_at", "updated_at"],
    colunaAtualizacao: "updated_at",
    filtros: { ref: "Código da referência" },
  },
];

export const LIMITE_PADRAO = 100;
export const LIMITE_MAXIMO = 500;

export function recursoPorSlug(slug: string): RecursoV1 | undefined {
  return RECURSOS_V1.find((r) => r.slug === slug);
}

/** Normaliza os parâmetros de consulta; erros viram mensagens claras (400). */
export function lerParametros(
  recurso: RecursoV1,
  params: URLSearchParams,
):
  | {
      ok: true;
      limit: number;
      updatedSince: string | null;
      cursor: string | null;
      filtros: Record<string, string>;
    }
  | { ok: false; erro: string } {
  const limitRaw = params.get("limit");
  let limit = LIMITE_PADRAO;
  if (limitRaw != null) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n < 1) return { ok: false, erro: "limit deve ser inteiro ≥ 1" };
    limit = Math.min(n, LIMITE_MAXIMO);
  }
  const updatedSince = params.get("updated_since");
  if (updatedSince && !recurso.colunaAtualizacao)
    return {
      ok: false,
      erro: `${recurso.slug} é um snapshot: não aceita updated_since nem cursor`,
    };
  if (updatedSince && Number.isNaN(Date.parse(updatedSince)))
    return { ok: false, erro: "updated_since deve ser data ISO 8601 (ex.: 2026-11-01T00:00:00Z)" };
  const cursor = params.get("cursor");
  if (cursor && !recurso.colunaAtualizacao)
    return {
      ok: false,
      erro: `${recurso.slug} é um snapshot: não aceita updated_since nem cursor`,
    };
  const filtros: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    if (["limit", "updated_since", "cursor"].includes(k)) continue;
    if (!recurso.filtros || !(k in recurso.filtros))
      return {
        ok: false,
        erro: `filtro desconhecido: ${k}. Aceitos: ${Object.keys(recurso.filtros ?? {}).join(", ") || "nenhum"}`,
      };
    filtros[k] = v;
  }
  return { ok: true, limit, updatedSince, cursor, filtros };
}

/** Cursor opaco = base64url de "<updated_at>|<id>" do último item da página. */
export function codificarCursor(updatedAt: string, id: string) {
  return Buffer.from(`${updatedAt}|${id}`, "utf8").toString("base64url");
}
export function decodificarCursor(cursor: string): { updatedAt: string; id: string } | null {
  try {
    const txt = Buffer.from(cursor, "base64url").toString("utf8");
    const i = txt.lastIndexOf("|");
    if (i <= 0) return null;
    const updatedAt = txt.slice(0, i);
    const id = txt.slice(i + 1);
    if (Number.isNaN(Date.parse(updatedAt)) || !id) return null;
    return { updatedAt, id };
  } catch {
    return null;
  }
}

/** Documento OpenAPI 3.0 gerado do mapa (servido em /api/v1/openapi.json). */
export function gerarOpenApi(baseUrl: string) {
  const paths: Record<string, unknown> = {};
  for (const r of RECURSOS_V1) {
    paths[`/api/v1/${r.slug}`] = {
      get: {
        summary: r.descricao,
        tags: [r.slug],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: LIMITE_MAXIMO, default: LIMITE_PADRAO },
          },
          {
            name: "updated_since",
            in: "query",
            schema: { type: "string", format: "date-time" },
            description: "Só registros alterados a partir desta data (sincronização incremental).",
          },
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
            description: "Valor de next_cursor da página anterior.",
          },
          ...Object.entries(r.filtros ?? {}).map(([name, description]) => ({
            name,
            in: "query",
            schema: { type: "string" },
            description,
          })),
        ],
        responses: {
          "200": {
            description: "Página de registros",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: Object.fromEntries(r.colunas.map((c) => [c, {}])),
                      },
                    },
                    next_cursor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          "400": { description: "Parâmetro inválido (mensagem em `error`)" },
          "401": { description: "Chave ausente, inválida ou revogada" },
          "429": { description: "Limite de requisições (ver header retry-after)" },
        },
        security: [{ apiKey: [] }],
      },
    };
  }
  return {
    openapi: "3.0.3",
    info: {
      title: "USE MODA PLM — API pública v1",
      version: "1.0.0",
      description:
        "Leitura dos dados do PLM para integração com ERP, e-commerce e BI. Autentique com `Authorization: Bearer <chave>` (crie a chave em Segurança → Chaves de API). Paginação por cursor; use `updated_since` para sincronização incremental.",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: { apiKey: { type: "http", scheme: "bearer", bearerFormat: "plm_live_…" } },
    },
    paths,
  };
}
