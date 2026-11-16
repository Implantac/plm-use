import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderErrorPage } from "@/lib/error-page";

// Onda 95 — as páginas de falha (404, erro de rota, erro catastrófico SSR)
// eram o único ponto em inglês de um app pt-BR. Agora falam a língua do
// usuário, dizem que nada salvo se perdeu e oferecem ação.
describe("Onda 95 — páginas de falha em pt-BR", () => {
  it("renderErrorPage é pt-BR, sem texto em inglês, com ações", () => {
    const html = renderErrorPage();
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain("Esta página não carregou");
    expect(html).toContain("Nada do que você já salvou foi perdido");
    expect(html).toContain("Tentar novamente");
    expect(html).toContain("Ir para o início");
    expect(html).not.toMatch(/didn't load|Try again|Go home|Something went wrong/);
  });

  it("__root.tsx: 404 e ErrorComponent em pt-BR", () => {
    const src = readFileSync(join(__dirname, "..", "..", "routes", "__root.tsx"), "utf8");
    expect(src).toContain("Página não encontrada");
    expect(src).toContain("Esta página não carregou");
    expect(src).toContain("Tentar novamente");
    expect((src.match(/Ir para o início/g) ?? []).length).toBe(2);
    expect(src).not.toMatch(/Page not found|didn't load|Try again|Go home/);
  });
});
