import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 112 — em telas estreitas o menu lateral é off-canvas e o header não cobre o botão de menu.
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("onda112: layout em viewport estreito", () => {
  const s = read("routes/_authenticated.tsx");

  it("menu começa recolhido abaixo de 1024px e fecha ao navegar", () => {
    expect(s).toContain('const NARROW_QUERY = "(max-width: 1023px)"');
    expect(s).toMatch(/if \(mq\.matches\) setSidebarCollapsed\(true\)/);
    expect(s).toMatch(
      /if \(isNarrow\) setSidebarCollapsed\(true\);\s*\}, \[pathname, isNarrow\]\)/,
    );
  });

  it("aberto, sobrepõe o conteúdo com backdrop fechável", () => {
    expect(s).toContain('aria-label="Fechar menu lateral"');
    expect(s).toMatch(/fixed inset-y-0 left-0 lg:relative/);
  });

  it("header não estoura: presença some no móvel e o CTA vira ícone", () => {
    expect(s).toMatch(/<div className="hidden md:block">\s*<PresenceBar \/>/);
    expect(s).toContain('<span className="hidden sm:inline">AI Product Studio</span>');
  });

  it("CTAs de texto têm alvo de toque de 44px e o feed fala 'PCP'", () => {
    expect(read("routes/_authenticated.feed.tsx")).toContain("Acompanhar o PCP");
    expect(read("routes/_authenticated.feed.tsx")).not.toMatch(/pc p\b/);
    expect(read("routes/_authenticated.digital-twin.tsx")).toMatch(
      /underline inline-flex min-h-11/,
    );
    expect(read("routes/_authenticated.route-engineering.tsx")).toMatch(/inline-flex min-h-11/);
  });
});
