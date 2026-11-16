import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

// Onda 89 — `inputValidator()` está deprecado no TanStack Start (alias de
// `validator()`); um upgrade futuro removeria o alias e derrubaria todas as
// server functions de uma vez. Esta trava garante que nenhum arquivo de
// server function volte a usar o nome antigo.
function listar(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) listar(p, acc);
    else if (/\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome)) acc.push(p);
  }
  return acc;
}

const raiz = join(__dirname, "..", "..");
const arquivos = listar(raiz);

describe("Onda 89 — server functions usam validator()", () => {
  it("nenhum arquivo de src usa .inputValidator(", () => {
    const ofensores = arquivos.filter((p) => readFileSync(p, "utf8").includes(".inputValidator("));
    expect(ofensores).toEqual([]);
  });

  it("toda server function que lê `data` passa por .validator(", () => {
    const fns = arquivos.filter((p) => p.endsWith(".functions.ts"));
    expect(fns.length).toBeGreaterThanOrEqual(5);
    const semValidacao: string[] = [];
    for (const p of fns) {
      const src = readFileSync(p, "utf8");
      // cada bloco começa em createServerFn( e termina no próximo
      const blocos = src.split(/(?=createServerFn\()/).slice(1);
      blocos.forEach((bloco, i) => {
        const leData = /handler\(async \(\{[^}]*\bdata\b/.test(bloco);
        const valida = bloco.includes(".validator(");
        if (leData && !valida) semValidacao.push(`${p}#${i + 1}`);
      });
    }
    expect(semValidacao).toEqual([]);
  });
});

// Prova executável: o validator ligado via `.validator(` de fato recusa entrada
// inválida e aceita a válida (o ambiente local não chega ao validator pelo
// browser porque o middleware de auth falha antes — Node 20 sem WebSocket).
vi.mock("@tanstack/react-start", () => {
  const validadores: Array<(i: unknown) => unknown> = [];
  const builder = {
    middleware: () => builder,
    validator: (fn: (i: unknown) => unknown) => {
      validadores.push(fn);
      return builder;
    },
    handler: () => async () => ({ ok: true }),
  };
  return { createServerFn: () => builder, __validadores: validadores };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

describe("Onda 89 — validator() de createLaunchWave continua recusando entrada inválida", () => {
  it("recusa código com 1 caractere e aceita payload válido", async () => {
    await import("@/lib/launch/launch.functions");
    const mod = (await import("@tanstack/react-start")) as unknown as {
      __validadores: Array<(i: unknown) => unknown>;
    };
    const [criarWave] = mod.__validadores;
    expect(criarWave).toBeTypeOf("function");
    expect(() =>
      criarWave({
        codigo: "W",
        colecao: "X",
        janela_inicio: "2026-11-01",
        janela_fim: "2026-11-30",
      }),
    ).toThrow();
    expect(() => criarWave({})).toThrow();
    expect(
      criarWave({
        codigo: "W89",
        colecao: "X",
        janela_inicio: "2026-11-01",
        janela_fim: "2026-11-30",
      }),
    ).toMatchObject({ codigo: "W89" });
  });
});
