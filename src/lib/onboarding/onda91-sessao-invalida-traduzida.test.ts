import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chamarServidor, descreverErroSupabase } from "@/lib/supabase/erro-humano";

// Onda 91 — na 84ª medição (produção) o aviso de contexto do agente mostrou
// "Unauthorized: Invalid token" cru: só `chamarServidor` traduzia o erro do
// middleware. Agora a tradução mora em `descreverErroSupabase` (um só lugar).
const raiz = join(__dirname, "..", "..");
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

describe("Onda 91 — sessão inválida sempre traduzida", () => {
  it.each([
    "Unauthorized: Invalid token",
    "Unauthorized: No token",
    "JWT expired",
    "invalid JWT: signature",
  ])("descreverErroSupabase traduz %p", (m) => {
    const r = descreverErroSupabase({ message: m }, "ler os eventos recentes");
    expect(r).toBe(
      "Não foi possível ler os eventos recentes: sua sessão expirou ou é inválida. Entre novamente e repita a ação.",
    );
    expect(r).not.toMatch(/unauthorized|token|jwt/i);
  });

  it("chamarServidor delega à mesma tradução", async () => {
    const r = await chamarServidor("consultar o agente", async () => {
      throw new Error("Unauthorized: Invalid token");
    });
    expect(r).toEqual({
      ok: false,
      reason:
        "Não foi possível consultar o agente: sua sessão expirou ou é inválida. Entre novamente e repita a ação.",
    });
  });

  it("não quebra os outros motivos", () => {
    expect(descreverErroSupabase({ code: "23505", message: "duplicate key" }, "salvar")).toMatch(
      /já existe/,
    );
    expect(descreverErroSupabase({ message: "Failed to fetch" }, "salvar")).toMatch(/sem conexão/);
    expect(descreverErroSupabase({ message: "boom" }, "salvar")).toBe(
      "Não foi possível salvar: boom",
    );
  });

  it("/ai-agents emite um único toast quando a IA falha; publish-catalog e live-context sem mensagem crua", () => {
    const agentes = ler("routes/_authenticated.ai-agents.tsx");
    expect(agentes).toMatch(/motivoLive = descreverErroSupabase/);
    expect(agentes).toMatch(/if \(motivoLive && avisoUnico\(motivoLive\)\)/);
    expect(agentes).not.toMatch(/O agente usará só o contexto local/);
    const pub = ler("lib/techsheet/publish-catalog.ts");
    expect(pub).not.toMatch(/\.error\??\.message/);
    expect((pub.match(/descreverErroSupabase\(/g) ?? []).length).toBe(3);
    const live = ler("lib/ai/live-context.functions.ts");
    expect(live).not.toMatch(/\$\{error\.message\}/);
  });
});
