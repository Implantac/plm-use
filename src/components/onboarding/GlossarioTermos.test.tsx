// @vitest-environment jsdom
//
// Onda 45. O glossário é a saída para as 15 siglas da primeira dobra:
// colapsado para quem já opera, aberto com 1 clique para quem chegou hoje.

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GlossarioTermos } from "./GlossarioTermos";

afterEach(cleanup);

describe("Onda 45 — GlossarioTermos", () => {
  it("está colapsado por padrão e anuncia quantos termos explica", () => {
    const { container } = render(<GlossarioTermos />);
    const detalhes = container.querySelector("details");
    expect(detalhes).not.toBeNull();
    expect(detalhes?.hasAttribute("open")).toBe(false);
    expect(container.textContent).toContain("O que significam essas siglas?");
    expect(container.textContent).toContain("termos em linguagem simples");
  });

  it("usa semântica de glossário dl/dt/dd", () => {
    const { container } = render(<GlossarioTermos />);
    expect(container.querySelectorAll("dl")).toHaveLength(1);
    expect(container.querySelector("dl")?.getAttribute("aria-label")).toContain("Glossário");
    expect(container.querySelectorAll("dt").length).toBeGreaterThanOrEqual(15);
    expect(container.querySelectorAll("dd").length).toBe(container.querySelectorAll("dt").length);
  });

  it("explica BOM, PCP e CFOP em português simples", () => {
    render(<GlossarioTermos />);
    expect(screen.getByText(/Lista de materiais/)).not.toBeNull();
    expect(document.body.textContent).toContain("A lista de todos os tecidos");
    expect(document.body.textContent).toContain("Planejamento e controle da produção");
    expect(document.body.textContent).toContain("Secretaria da Fazenda");
  });

  it("aceita subconjunto de siglas para reuso em outras telas", () => {
    render(<GlossarioTermos siglas={["BOM", "PCP"]} testId="glossario-enxuto" />);
    expect(screen.getByTestId("glossario-enxuto")).not.toBeNull();
    expect(document.querySelectorAll("dt")).toHaveLength(2);
    expect(document.body.textContent).toContain("BOM");
    expect(document.body.textContent).toContain("PCP");
  });

  it("sigla desconhecida é ignorada; só desconhecidas renderiza nada", () => {
    const { container } = render(<GlossarioTermos siglas={["NAO-EXISTE"]} />);
    expect(container.innerHTML).toBe("");
    render(<GlossarioTermos siglas={["NAO-EXISTE", "BOM"]} testId="glossario-misto" />);
    expect(document.querySelectorAll('[data-testid="glossario-misto"] dt')).toHaveLength(1);
  });

  it("testId customizável substitui o padrão", () => {
    render(<GlossarioTermos testId="glossario-custom" />);
    expect(screen.getByTestId("glossario-custom")).not.toBeNull();
    expect(screen.queryByTestId("glossario-termos")).toBeNull();
  });

  // Onda 47 — o glossário passou a ser reutilizado nas telas internas.
  it("explica as siglas novas das telas internas em linguagem simples", () => {
    const { container } = render(
      <GlossarioTermos
        siglas={["CAD", "EAN", "GTIN", "ABNT", "CAPA", "LGPD", "XML", "DRE", "POM"]}
        testId="glossario-interno"
      />,
    );
    expect(screen.getByTestId("glossario-interno")).not.toBeNull();
    expect(container.querySelectorAll("dt")).toHaveLength(9);
    expect(container.querySelectorAll("dd")).toHaveLength(9);
    expect(container.textContent).toContain("Código de barras do produto");
    expect(container.textContent).toContain("Medidas da peça");
    expect(container.textContent).toContain("Lei de proteção de dados");
  });

  it("um subconjunto interno não repete os 17 termos do dashboard", () => {
    render(<GlossarioTermos siglas={["PCP", "SAM", "GSD", "CAD"]} testId="glossario-engenharia" />);
    expect(document.querySelectorAll('[data-testid="glossario-engenharia"] dt')).toHaveLength(4);
  });
});
