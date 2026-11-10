// @vitest-environment jsdom
//
// Onda 43. O card é a resposta única para "por que está tudo vazio?".
// Estes testes garantem que ele (a) explica o "—" em linguagem simples,
// (b) mostra progresso, (c) oferece UM botão por passo apontando à rota certa,
// (d) destaca o próximo passo e (e) se desfaz quando a operação está pronta.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { EstadoOnboarding } from "@/lib/onboarding/primeiros-passos";

const estado = vi.hoisted(() => ({ atual: null as EstadoOnboarding | null }));

vi.mock("@/lib/onboarding/primeiros-passos", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/onboarding/primeiros-passos")>();
  return { ...original, usePrimeirosPassos: () => estado.atual };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { ComecePorAqui } from "./ComecePorAqui";
import { computarPrimeirosPassos } from "@/lib/onboarding/primeiros-passos";

const VAZIO = { fichas: 0, pedidos: 0, fornecedores: 0, campanhas: 0 };

afterEach(() => {
  cleanup();
  estado.atual = null;
});

describe("Onda 43 — ComecePorAqui", () => {
  it("explica o estado vazio sem culpar a conexão", () => {
    estado.atual = computarPrimeirosPassos(VAZIO);
    render(<ComecePorAqui />);
    const card = screen.getByTestId("comece-por-aqui");
    expect(card.textContent).toContain("Comece por aqui");
    expect(card.textContent).toContain("não mistura exemplos de demonstração");
    expect(card.textContent).not.toContain("Verifique sua conexão");
  });

  it("mostra 0 de 4 e uma barra de progresso acessível", () => {
    estado.atual = computarPrimeirosPassos(VAZIO);
    render(<ComecePorAqui />);
    expect(screen.getByTestId("progresso-onboarding").textContent).toContain("0 de 4");
    const barra = screen.getByRole("progressbar");
    expect(barra.getAttribute("aria-valuenow")).toBe("0");
    expect(barra.getAttribute("aria-valuemax")).toBe("100");
  });

  it("um botão por passo, cada um apontando para a rota correta", () => {
    estado.atual = computarPrimeirosPassos(VAZIO);
    render(<ComecePorAqui />);
    const esperadas = ["/references", "/orders", "/suppliers", "/marketing"];
    for (const rota of esperadas) {
      const link = document.querySelector(`a[href="${rota}"]`);
      expect(link, rota).not.toBeNull();
      expect(link?.getAttribute("aria-label")).toContain("Ir para:");
    }
  });

  it("destaca o próximo passo com 'Começar' e marca os demais como 'Abrir'", () => {
    estado.atual = computarPrimeirosPassos(VAZIO);
    render(<ComecePorAqui />);
    const ficha = screen.getByTestId("passo-ficha");
    expect(ficha.textContent).toContain("Começar");
    expect(screen.getByTestId("passo-pedido").textContent).toContain("Abrir");
  });

  it("passo concluído deixa de ser o próximo e ganha marcação", () => {
    estado.atual = computarPrimeirosPassos({ ...VAZIO, fichas: 1 });
    render(<ComecePorAqui />);
    expect(screen.getByTestId("progresso-onboarding").textContent).toContain("1 de 4");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");
    expect(screen.getByTestId("passo-ficha").getAttribute("data-concluido")).toBe("true");
    expect(screen.getByTestId("passo-pedido").textContent).toContain("Começar");
  });

  it("com tudo concluído o card de tarefas desaparece e dá lugar a status", () => {
    estado.atual = computarPrimeirosPassos({
      fichas: 1,
      pedidos: 1,
      fornecedores: 1,
      campanhas: 1,
    });
    render(<ComecePorAqui />);
    expect(screen.queryByTestId("comece-por-aqui")).toBeNull();
    const ok = screen.getByTestId("onboarding-concluido");
    expect(ok.getAttribute("role")).toBe("status");
    expect(ok.textContent).toContain("já tem dados reais");
  });

  it("cada passo diz exatamente o que clicar ao chegar na rota", () => {
    estado.atual = computarPrimeirosPassos(VAZIO);
    render(<ComecePorAqui />);
    expect(screen.getByTestId("passo-ficha").textContent).toContain("Nova referência");
    expect(screen.getByTestId("passo-pedido").textContent).toContain("Novo pedido");
    expect(screen.getByTestId("passo-fornecedor").textContent).toContain("Novo parceiro");
  });
});
