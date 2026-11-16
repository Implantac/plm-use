import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { responderAgente } from "@/lib/ai/responder-agente";

// Onda 90 — o agente de IA nunca falha em silêncio nem mostra texto cru do
// gateway: o servidor devolve `reason` traduzido; as telas chamam via
// `chamarServidor` e avisam o motivo antes de cair no fallback local.
const raiz = join(__dirname, "..", "..");
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

describe("Onda 90 — IA com motivo real", () => {
  it("askAgent não devolve mensagem crua de rede/gateway", () => {
    const src = ler("lib/ai/responder-agente.ts");
    expect(src).not.toMatch(/error:\s*e instanceof Error \? e\.message/);
    expect(src).not.toMatch(/`Falha \(\$\{res\.status\}\): \$\{text/);
    expect(src).toMatch(/function falha\(reason: string/);
    // toda recusa passa pelo helper
    expect((src.match(/ok: false as const/g) ?? []).length).toBe(1);
  });

  it("telas de IA chamam via chamarServidor e não têm catch silencioso", () => {
    for (const p of [
      "routes/_authenticated.ai-agents.tsx",
      "components/ai/ProductStudio.tsx",
      "components/ai/TechSketchPanel.tsx",
    ]) {
      const src = ler(p);
      expect({ p, usa: /chamarServidor\(/.test(src) }).toEqual({ p, usa: true });
      expect({ p, cru: /toast\.error\((result|specResult\.value)\.error\)/.test(src) }).toEqual({
        p,
        cru: false,
      });
    }
    const agentes = ler("routes/_authenticated.ai-agents.tsx");
    expect(agentes).not.toMatch(/catch \{\s*\n\s*\/\/[^\n]*\n\s*\}/);
    expect(agentes).toMatch(
      /toast\.warning\(`\$\{motivo\} Resposta abaixo gerada localmente, sem IA\.`\)/,
    );
  });
});

// Prova executável do servidor (módulo puro `responderAgente`): sem membership
// → reason; gateway 402/502 → reason; rede caída → reason sem vazar e.message.
describe("Onda 90 — responderAgente devolve reason traduzido", () => {
  const ctx = (member: boolean) => ({
    supabase: { rpc: async () => ({ data: member, error: null }) },
    userId: "u1",
  });
  const data = { agent: "fashion" as const, message: "oi" };

  it("sem papel na confecção", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await responderAgente(data, ctx(false), { apiKey: "k" });
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("Sem permissão") });
  });

  it("sem chave do gateway", async () => {
    const r = await responderAgente(data, ctx(true), {
      apiKey: undefined,
      fetch: async () => {
        throw new Error("não deve chamar");
      },
    });
    if (!process.env.LOVABLE_API_KEY)
      expect(r).toMatchObject({
        ok: false,
        reason: expect.stringContaining("não está configurado"),
      });
  });

  it("gateway 402/502 e rede caída → reason sem texto cru", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const r1 = await responderAgente(data, ctx(true), {
      apiKey: "k",
      fetch: async () => new Response("quota exceeded xyz", { status: 402 }),
    });
    expect(r1).toMatchObject({ ok: false, reason: expect.stringContaining("créditos de IA") });
    const r2 = await responderAgente(data, ctx(true), {
      apiKey: "k",
      fetch: async () => new Response("<html>upstream boom</html>", { status: 502 }),
    });
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.reason).toContain("HTTP 502");
      expect(r2.reason).not.toContain("upstream boom");
    }
    const r3 = await responderAgente(data, ctx(true), {
      apiKey: "k",
      fetch: async () => {
        throw new Error("ECONNRESET socket hang up");
      },
    });
    expect(r3.ok).toBe(false);
    if (!r3.ok) {
      expect(r3.reason).toContain("falha de rede");
      expect(r3.reason).not.toContain("ECONNRESET");
    }
    const r4 = await responderAgente(data, ctx(true), {
      apiKey: "k",
      fetch: async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "olá" } }] }), {
          status: 200,
        }),
    });
    expect(r4).toEqual({ ok: true, reply: "olá" });
  });
});
