// @vitest-environment jsdom
// Costura UI↔lib do export: o botão existe, o rótulo é customizável e a grade
// vazia não oferece download de nada (rows=[] → disabled, contrato do próprio
// componente). A execução real de downloadCsv/printTable é testada na lib.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/export/csv", () => ({
  downloadCsv: vi.fn(),
  printTable: vi.fn(),
}));

import { ExportMenu } from "./ExportMenu";

describe("ExportMenu", () => {
  it("desabilita o gatilho quando não há linhas (nada de CSV vazio)", () => {
    render(<ExportMenu title="t" filename="f" rows={[]} />);
    const btn = screen.getByRole("button", { name: /exportar/i });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("usa o rótulo custom e habilita com dados", () => {
    render(<ExportMenu title="t" filename="f" rows={[{ a: 1 }]} label="Exportar Relatórios" />);
    const btn = screen.getByRole("button", { name: /exportar relatórios/i });
    expect(btn.hasAttribute("disabled")).toBe(false);
  });
});
