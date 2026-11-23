import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 115 — login, redefinição de senha e 404: título próprio e autocomplete para gerenciadores de senha.
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("onda115: páginas públicas", () => {
  it("login tem título e autocomplete corretos (email, senha atual/nova, nome)", () => {
    const s = read("routes/login.tsx");
    expect(s).toContain('title: "Entrar · USE MODA PLM"');
    expect(s).toContain('autoComplete="email"');
    expect(s).toContain('inputMode="email"');
    expect(s).toContain('autoComplete={mode === "signup" ? "new-password" : "current-password"}');
    expect(s).toContain('autoComplete="name"');
  });

  it("redefinição de senha usa new-password nos dois campos e tem título", () => {
    const s = read("routes/reset-password.tsx");
    expect(s).toContain('title: "Redefinir senha · USE MODA PLM"');
    expect(s.match(/autoComplete="new-password"/g)?.length).toBe(2);
  });

  it("404 define o título do documento", () => {
    expect(read("routes/__root.tsx")).toContain(
      'document.title = "Página não encontrada · USE MODA PLM"',
    );
  });
});
