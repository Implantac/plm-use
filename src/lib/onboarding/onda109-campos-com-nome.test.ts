import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 109 — selects com rótulo visual ficam associados por htmlFor/id ou aria-label.
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("onda109: campos de formulário têm nome acessível", () => {
  it("filtros de /looks associam label ao SelectTrigger", () => {
    const s = read("routes/_authenticated.looks.tsx");
    expect(s).toContain('htmlFor="looks-filtro-status"');
    expect(s).toContain('<SelectTrigger id="looks-filtro-status">');
    expect(s).toContain('htmlFor="looks-filtro-ocasiao"');
    expect(s).toContain('<SelectTrigger id="looks-filtro-ocasiao">');
    expect(s).toContain("aria-label={`Status do look ${look.name}`}");
  });

  it("comparador de coleções e tiragem do pré-custo têm nome", () => {
    const c = read("routes/_authenticated.collections.compare.tsx");
    expect(c).toContain('htmlFor="compare-colecao-a"');
    expect(c).toContain('<SelectTrigger id="compare-colecao-a">');
    expect(c).toContain('<SelectTrigger id="compare-colecao-b">');
    expect(read("components/techsheet/AplicacoesPanel.tsx")).toContain(
      'aria-label="Tiragem planejada (peças)"',
    );
  });
});
