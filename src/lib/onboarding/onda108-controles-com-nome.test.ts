import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 108 — todo controle visível só com ícone tem nome acessível (aria-label).
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("onda108: controles só com ícone têm nome acessível", () => {
  it("sino de alertas do header anuncia contagem", () => {
    const s = read("components/alerts/AlertsBell.tsx");
    expect(s).toMatch(/aria-label=\{\s*unreadCount > 0/);
    expect(s).toContain("Alertas do sistema");
  });

  it("botões de remover/editar/enviar/fechar têm aria-label", () => {
    expect(read("routes/_authenticated.materials.tsx")).toContain("aria-label={`Remover material");
    expect(read("routes/_authenticated.materials.tsx")).toContain("aria-label={`Editar material");
    expect(read("routes/_authenticated.cad.tsx")).toContain("aria-label={`Remover molde");
    expect(read("routes/_authenticated.measurements.tsx")).toContain("aria-label={`Remover tabela");
    expect(read("routes/_authenticated.ai-agents.tsx")).toContain('aria-label="Enviar pergunta"');
    expect(read("components/entity/EntityDrawer.tsx")).toContain('aria-label="Fechar"');
    expect(read("components/quality/CapaDrawer.tsx")).toContain('aria-label="Fechar"');
  });
});
