import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 111 — toda rota autenticada declara um <title> próprio (aba, histórico, favoritos).
const dir = new URL("../../routes/", import.meta.url);
const rotas = readdirSync(dir).filter(
  (f) =>
    f.startsWith("_authenticated.") &&
    f.endsWith(".tsx") &&
    !["_authenticated.tsx", "_authenticated.index.tsx"].includes(f),
);

describe("onda111: título por rota", () => {
  it("há 44 rotas autenticadas e todas têm head() com title", () => {
    expect(rotas.length).toBe(44);
    const sem = rotas.filter((f) => {
      const s = readFileSync(new URL(f, dir), "utf8");
      return !/head:\s*\(\)\s*=>/.test(s) || !/title:\s*["'`]/.test(s);
    });
    expect(sem).toEqual([]);
  });

  it("nenhum título é o genérico do index.html", () => {
    for (const f of rotas) {
      const s = readFileSync(new URL(f, dir), "utf8");
      expect(s, f).not.toMatch(/title:\s*"USE MODA PLM AI \| Next-Gen/);
    }
  });
});
