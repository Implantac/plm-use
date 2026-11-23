import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 116 — teclado: skip link para o conteúdo; menu off-canvas com foco e Escape.
const s = readFileSync(new URL("../../routes/_authenticated.tsx", import.meta.url), "utf8");

describe("onda116: navegação por teclado", () => {
  it("primeiro foco da página é 'Pular para o conteúdo' e o main é focável", () => {
    expect(s).toContain('href="#conteudo"');
    expect(s).toContain("Pular para o conteúdo");
    expect(s).toMatch(/sr-only focus:not-sr-only/);
    expect(s).toMatch(/<main\s+id="conteudo"\s+tabIndex=\{-1\}/);
  });

  it("menu off-canvas: foco entra, Escape fecha e devolve o foco ao botão", () => {
    expect(s).toMatch(
      /if \(e\.key === "Escape"\) \{\s*setSidebarCollapsed\(true\);\s*toggleRef\.current\?\.focus\(\)/,
    );
    expect(s).toContain('querySelector<HTMLElement>("a[href], button, input")');
    expect(s).toContain("ref={toggleRef}");
  });

  it("botão de favorito fica visível quando recebe foco", () => {
    expect(s).toContain("focus-visible:opacity-100");
  });
});
