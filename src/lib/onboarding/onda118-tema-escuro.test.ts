import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 118 — axe no tema escuro: botão primário legível e tokens de status com contraste AA.
const css = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const dark = css.slice(css.indexOf(".dark {"));

describe("onda118: contraste no tema escuro", () => {
  it("botão primário usa texto escuro sobre o azul-petróleo", () => {
    expect(dark).toContain("--primary-foreground: 200 40% 10%");
    expect(dark).toContain("--brand-500: 188 50% 56%");
  });

  it("sucesso e perigo são legíveis como texto sobre cards escuros", () => {
    expect(dark).toContain("--success-500: 173 42% 54%");
    expect(dark).toContain("--danger-500: 4 70% 66%");
  });

  it("auditor axe aceita TEMA=dark", () => {
    const py = readFileSync(
      new URL("../../../scripts/provas/auditoria_axe.py", import.meta.url),
      "utf8",
    );
    expect(py).toContain('os.environ.get("TEMA")=="dark"');
  });
});
