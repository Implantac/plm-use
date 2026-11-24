// Onda 121 — trava da API pública v1: colunas existem no schema, parâmetros, cursor, OpenAPI, auth.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  codificarCursor,
  decodificarCursor,
  gerarOpenApi,
  lerParametros,
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  RECURSOS_V1,
  recursoPorSlug,
} from "./recursos-v1";
import { autenticarChave, gerarChave, hashChave, PREFIXO_CHAVE } from "./api-key-auth.server";

function colunasDoSchema(tabela: string): Set<string> {
  const src = readFileSync(resolve(__dirname, "../../integrations/supabase/types.ts"), "utf8");
  const ini = src.indexOf(`\n      ${tabela}: {\n        Row: {`);
  expect(ini, `tabela/view ${tabela} ausente em types.ts`).toBeGreaterThan(-1);
  const fim = src.indexOf("\n        }", ini + 10);
  const bloco = src.slice(ini, fim);
  return new Set([...bloco.matchAll(/^\s{10}([a-z_0-9]+)\??:/gm)].map((m) => m[1]!));
}

describe("API v1 — recursos", () => {
  it("todo recurso usa só colunas que existem no schema (nunca select *)", () => {
    for (const r of RECURSOS_V1) {
      const cols = colunasDoSchema(r.tabela);
      for (const c of r.colunas) expect(cols.has(c), `${r.slug}.${c}`).toBe(true);
      expect(r.colunas).not.toContain("*");
      if (r.colunaAtualizacao) expect(r.colunas).toContain("id");
      if (r.colunaAtualizacao) expect(cols.has(r.colunaAtualizacao)).toBe(true);
      for (const f of Object.keys(r.filtros ?? {}))
        expect(cols.has(f), `${r.slug} filtro ${f}`).toBe(true);
    }
  });
  it("slugs únicos e resolvíveis", () => {
    const slugs = RECURSOS_V1.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(
      expect.arrayContaining([
        "references",
        "materials",
        "suppliers",
        "sales-orders",
        "production-orders",
        "stock-balance",
        "tech-sheets",
      ]),
    );
    expect(recursoPorSlug("nope")).toBeUndefined();
  });
});

describe("API v1 — parâmetros", () => {
  const refs = recursoPorSlug("references")!;
  const estoque = recursoPorSlug("stock-balance")!;
  it("limit padrão, teto e inválido", () => {
    expect(lerParametros(refs, new URLSearchParams())).toMatchObject({
      ok: true,
      limit: LIMITE_PADRAO,
    });
    expect(lerParametros(refs, new URLSearchParams("limit=9999"))).toMatchObject({
      ok: true,
      limit: LIMITE_MAXIMO,
    });
    expect(lerParametros(refs, new URLSearchParams("limit=0")).ok).toBe(false);
    expect(lerParametros(refs, new URLSearchParams("limit=abc")).ok).toBe(false);
  });
  it("updated_since exige ISO; snapshot rejeita updated_since e cursor", () => {
    expect(lerParametros(refs, new URLSearchParams("updated_since=ontem")).ok).toBe(false);
    expect(lerParametros(refs, new URLSearchParams("updated_since=2026-11-01T00:00:00Z")).ok).toBe(
      true,
    );
    expect(lerParametros(estoque, new URLSearchParams("updated_since=2026-11-01")).ok).toBe(false);
    expect(lerParametros(estoque, new URLSearchParams("cursor=abc")).ok).toBe(false);
  });
  it("filtro desconhecido dá erro claro", () => {
    const r = lerParametros(refs, new URLSearchParams("foo=bar"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/foo/);
  });
  it("cursor faz roundtrip e rejeita lixo", () => {
    const c = codificarCursor("2026-11-22T10:00:00+00:00", "abc-123");
    expect(decodificarCursor(c)).toEqual({ updatedAt: "2026-11-22T10:00:00+00:00", id: "abc-123" });
    expect(decodificarCursor("%%%")).toBeNull();
    expect(decodificarCursor(Buffer.from("semseparador").toString("base64url"))).toBeNull();
  });
});

describe("API v1 — OpenAPI", () => {
  it("documenta todos os recursos e o bearer", () => {
    const doc = gerarOpenApi("https://exemplo.test");
    expect(doc.openapi).toBe("3.0.3");
    for (const r of RECURSOS_V1) expect(doc.paths).toHaveProperty(`/api/v1/${r.slug}`);
    expect(JSON.stringify(doc)).toContain("https://exemplo.test");
    expect(JSON.stringify(doc.components)).toMatch(/bearer/i);
  });
});

describe("API v1 — chaves", () => {
  it("gera chave com prefixo e hash estável", () => {
    const k = gerarChave();
    expect(k.chave.startsWith(PREFIXO_CHAVE)).toBe(true);
    expect(k.chave.startsWith(k.prefixo)).toBe(true);
    expect(k.hash).toBe(hashChave(k.chave));
    expect(k.hash).toHaveLength(64);
    expect(gerarChave().chave).not.toBe(k.chave);
  });
  it("sem Bearer → 401; formato errado → 401; sem credencial de banco → 503", async () => {
    const sem = await autenticarChave(new Request("http://x/api/v1/references"));
    expect(sem).toMatchObject({ ok: false, status: 401 });
    const ruim = await autenticarChave(
      new Request("http://x/api/v1/references", { headers: { authorization: "Bearer abc" } }),
    );
    expect(ruim).toMatchObject({ ok: false, status: 401 });
    const bem = await autenticarChave(
      new Request("http://x/api/v1/references", {
        headers: { authorization: `Bearer ${gerarChave().chave}` },
      }),
    );
    expect(bem.ok).toBe(false);
    if (!bem.ok) expect([401, 503]).toContain(bem.status);
  });
});
