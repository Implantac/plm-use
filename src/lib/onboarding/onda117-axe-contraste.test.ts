import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 117 — axe-core (WCAG AA): contraste dos tokens, nome das barras de progresso, regiões roláveis focáveis.
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("onda117: contraste e axe", () => {
  it("tokens de sucesso/alerta/âmbar têm contraste AA sobre fundo claro", () => {
    const css = read("styles.css");
    expect(css).toContain("--success-500: 173 40% 31%");
    expect(css).toContain("--warning-500: 48 40% 34%");
    expect(css).toContain("--color-amber-600: #6f6a4c");
  });

  it("rótulos de seção do menu não usam opacidade reduzida", () => {
    expect(read("routes/_authenticated.tsx")).not.toContain(
      "text-muted-foreground/70 hover:text-foreground",
    );
  });

  it("Progress sempre tem nome acessível", () => {
    expect(read("components/ui/progress.tsx")).toContain("aria-label=");
  });

  it("wrapper de tabela é focável pelo teclado", () => {
    expect(read("components/ui/table.tsx")).toMatch(
      /<div\s+tabIndex=\{0\}\s+className="relative w-full overflow-auto/,
    );
  });

  it("texto âmbar sempre traz variante escura", () => {
    const out = execSync(
      "grep -rhoE 'text-amber-600( dark:text-amber-[0-9]+)?' src --include=*.tsx | grep -vc dark || true",
      { cwd: new URL("../../..", import.meta.url).pathname, encoding: "utf8" },
    ).trim();
    expect(out).toBe("0");
  });
});
