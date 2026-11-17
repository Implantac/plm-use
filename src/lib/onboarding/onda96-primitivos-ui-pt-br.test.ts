import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Onda 96 — os primitivos de UI (shadcn) ainda falavam inglês para leitores de
// tela e na paginação: "Close", "Previous/Next", "More pages", "Toggle
// Sidebar". Acessibilidade também é em pt-BR.
const ui = join(__dirname, "..", "..", "components", "ui");
const PROIBIDO =
  /(sr-only">|aria-label="|title=")(Close|Previous slide|Next slide|More pages|More|Toggle Sidebar|Go to (previous|next) page)</;

describe("Onda 96 — primitivos de UI em pt-BR", () => {
  it("nenhum texto de acessibilidade em inglês em components/ui", () => {
    const ofensores: string[] = [];
    for (const f of readdirSync(ui).filter((n) => n.endsWith(".tsx"))) {
      const src = readFileSync(join(ui, f), "utf8");
      if (PROIBIDO.test(src) || /<span>(Previous|Next)<\/span>/.test(src)) ofensores.push(f);
    }
    expect(ofensores).toEqual([]);
  });

  it("os textos traduzidos existem", () => {
    const ler = (f: string) => readFileSync(join(ui, f), "utf8");
    expect(ler("dialog.tsx")).toContain('sr-only">Fechar<');
    expect(ler("sheet.tsx")).toContain('sr-only">Fechar<');
    expect(ler("pagination.tsx")).toContain('aria-label="Ir para a página anterior"');
    expect(ler("pagination.tsx")).toContain("<span>Próxima</span>");
    expect(ler("carousel.tsx")).toContain("Slide anterior");
    expect(ler("sidebar.tsx")).toContain("Alternar menu lateral");
  });
});
