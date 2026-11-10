// @vitest-environment jsdom
//
// Onda 44. O aviso de vitrine virou um convite para agir. Estes testes
// garantem que o CTA (a) abre a ação local quando ela existe, (b) navega
// para a rota do passo quando não existe, (c) desaparece quando o passo já
// foi concluído e (d) continua acessível.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Passo } from "@/lib/onboarding/primeiros-passos";

const estado = vi.hoisted(() => ({ passo: null as Passo | null }));

vi.mock("@/lib/onboarding/primeiros-passos", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/onboarding/primeiros-passos")>();
  return { ...original, usePasso: () => estado.passo };
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

import { CtaProximoPasso } from "./CtaProximoPasso";

const passo = (over: Partial<Passo> = {}): Passo => ({
  id: "pedido",
  titulo: "Registre um pedido B2B",
  descricao: "A carteira real alimenta faturamento e margem.",
  rota: "/orders",
  acao: 'Em Pedidos, clique em "Novo pedido"',
  concluido: false,
  ...over,
});

afterEach(() => {
  cleanup();
  estado.passo = passo();
});

describe("Onda 44 — CtaProximoPasso", () => {
  it("com ação local, o botão dispara o callback e não navega", () => {
    estado.passo = passo();
    const onAcao = vi.fn();
    render(<CtaProximoPasso passo="pedido" onAcao={onAcao} label="Novo pedido" />);
    fireEvent.click(screen.getByRole("button", { name: /Novo pedido/ }));
    expect(onAcao).toHaveBeenCalledTimes(1);
    expect(document.querySelector("a")).toBeNull();
  });

  it("sem ação local, vira link para a rota do passo", () => {
    estado.passo = passo();
    render(<CtaProximoPasso passo="pedido" label="Ir para Pedidos" />);
    const link = document.querySelector('a[href="/orders"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute("aria-label")).toContain("Registre um pedido B2B");
  });

  it("a rota vem do passo, não de uma constante paralela", () => {
    estado.passo = passo({ id: "fornecedor", rota: "/suppliers" });
    render(<CtaProximoPasso passo="fornecedor" />);
    expect(document.querySelector('a[href="/suppliers"]')).not.toBeNull();
  });

  it("passo concluído não oferece mais 'próximo passo'", () => {
    estado.passo = passo({ concluido: true });
    const { container } = render(<CtaProximoPasso passo="pedido" />);
    expect(container.innerHTML).toBe("");
  });

  it("testId custom e data-passo ficam no elemento", () => {
    estado.passo = passo();
    render(<CtaProximoPasso passo="pedido" testId="cta-sop-sem-pedidos" />);
    const el = screen.getByTestId("cta-sop-sem-pedidos");
    expect(el.getAttribute("data-passo")).toBe("pedido");
  });

  it("testId padrão é derivado do id do passo", () => {
    estado.passo = passo({ id: "campanha", rota: "/marketing" });
    render(<CtaProximoPasso passo="campanha" />);
    expect(screen.getByTestId("cta-campanha")).not.toBeNull();
  });

  it("dica mostra o nome exato do botão a clicar no destino", () => {
    estado.passo = passo();
    render(<CtaProximoPasso passo="pedido" dica />);
    expect(screen.getByText(/Novo pedido/)).not.toBeNull();
  });
});
