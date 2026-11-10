// Onda 43 — o estado do onboarding vem dos mesmos stores dos números.
// Se uma vitrine de fábrica voltar a contar como dado real, estes testes caem.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computarPrimeirosPassos,
  contarDadosOperacionais,
  type ContagensOnboarding,
} from "./primeiros-passos";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { usePrivateLabelQueueStore } from "@/lib/sales/private-label-queue";
import { useOutsourcingStore } from "@/lib/techsheet/outsourcing-os";
import { useResearchGtmStore } from "@/lib/techsheet/research-gtm";
import { INITIAL_PRIVATE_LABEL_ORDERS } from "@/lib/sales/private-label-queue";
import { INITIAL_PARTNERS, INITIAL_SERVICE_ORDERS } from "@/lib/techsheet/outsourcing-os";
import { INITIAL_GTM_CAMPAIGNS, INITIAL_BRIEFINGS } from "@/lib/techsheet/research-gtm";
import { seedFor } from "@/lib/techsheet/store";
import { fichaDeclarada } from "@/test/ficha-declarada";

const VAZIO: ContagensOnboarding = { fichas: 0, pedidos: 0, fornecedores: 0, campanhas: 0 };

function resetStores() {
  useTechSheetStore.setState({ data: {}, materializadas: {} });
  usePrivateLabelQueueStore.setState({ orders: INITIAL_PRIVATE_LABEL_ORDERS });
  useOutsourcingStore.setState({
    partners: INITIAL_PARTNERS,
    serviceOrders: INITIAL_SERVICE_ORDERS,
  });
  useResearchGtmStore.setState({
    campaigns: INITIAL_GTM_CAMPAIGNS,
    briefings: INITIAL_BRIEFINGS,
  });
}

beforeEach(resetStores);
afterEach(resetStores);

describe("Onda 43 — computarPrimeirosPassos (função pura)", () => {
  it(" sem dados reais: 0 de 4, próximo passo é a ficha", () => {
    const e = computarPrimeirosPassos(VAZIO);
    expect(e.total).toBe(4);
    expect(e.concluidos).toBe(0);
    expect(e.percentual).toBe(0);
    expect(e.pronto).toBe(false);
    expect(e.proximo?.id).toBe("ficha");
    expect(e.passos.every((p) => !p.concluido)).toBe(true);
  });

  it("cada passo conclui só com a sua própria contagem", () => {
    const casos: Array<[Partial<ContagensOnboarding>, string]> = [
      [{ fichas: 1 }, "ficha"],
      [{ pedidos: 1 }, "pedido"],
      [{ fornecedores: 1 }, "fornecedor"],
      [{ campanhas: 1 }, "campanha"],
    ];
    for (const [parcial, naoDeveSerProximo] of casos) {
      const e = computarPrimeirosPassos({ ...VAZIO, ...parcial });
      expect(e.concluidos).toBe(1);
      expect(e.percentual).toBe(25);
      expect(e.proximo?.id, naoDeveSerProximo).not.toBe(naoDeveSerProximo);
      expect(e.passos.find((p) => p.id === naoDeveSerProximo)?.concluido).toBe(true);
    }
  });

  it("contagens maiores que 1 contam como UM passo, não como progresso extra", () => {
    const e = computarPrimeirosPassos({ fichas: 90, pedidos: 40, fornecedores: 12, campanhas: 8 });
    expect(e.concluidos).toBe(4);
    expect(e.percentual).toBe(100);
  });

  it("tudo concluído: pronto, sem próximo passo", () => {
    const e = computarPrimeirosPassos({ fichas: 1, pedidos: 1, fornecedores: 1, campanhas: 1 });
    expect(e.pronto).toBe(true);
    expect(e.proximo).toBeNull();
    expect(e.passos.every((p) => p.concluido)).toBe(true);
  });

  it("cada passo aponta para uma rota e diz o que clicar", () => {
    const e = computarPrimeirosPassos(VAZIO);
    expect(e.passos.map((p) => p.rota)).toEqual([
      "/references",
      "/orders",
      "/suppliers",
      "/marketing",
    ]);
    expect(e.passos.every((p) => p.acao.length > 10 && p.descricao.length > 20)).toBe(true);
  });
});

describe("Onda 43 — contarDadosOperacionais ignora TODA a vitrine", () => {
  it("estado de fábrica: zero em todos os quatro", () => {
    expect(contarDadosOperacionais()).toEqual(VAZIO);
  });

  it("ficha salva (sem materializadas) conta; modelo de demonstração não conta", () => {
    useTechSheetStore.setState({
      data: { "MINHA-REF": fichaDeclarada("MINHA-REF") },
      materializadas: {},
    });
    expect(contarDadosOperacionais().fichas).toBe(1);
    useTechSheetStore.setState({
      data: { DEV000006: seedFor("DEV000006") },
      materializadas: { DEV000006: true },
    });
    expect(contarDadosOperacionais().fichas).toBe(0);
  });

  it("pedido, parceiro e campanha promovidos contam; os demo não", () => {
    usePrivateLabelQueueStore.setState({
      orders: [{ ...INITIAL_PRIVATE_LABEL_ORDERS[0]!, demo: false }],
    });
    useOutsourcingStore.setState({ partners: [{ ...INITIAL_PARTNERS[0]!, demo: false }] });
    useResearchGtmStore.setState({ campaigns: [{ ...INITIAL_GTM_CAMPAIGNS[0]!, demo: false }] });
    expect(contarDadosOperacionais()).toEqual({
      fichas: 0,
      pedidos: 1,
      fornecedores: 1,
      campanhas: 1,
    });
  });

  it("o estado do hook é o mesmo da função pura aplicada às contagens", () => {
    const c = contarDadosOperacionais();
    expect(computarPrimeirosPassos(c).concluidos).toBe(0);
  });
});
