// Onda 78 — 72ª medição. A auditoria de CTAs de criação (continuação do
// relato "telas e botões sem ações") encontrou o último beco sem saída: em
// `/orders` e `/catalog`, o botão de criação é gateado por papel
// (`canSell`/`canEdit`) e, sem o papel, **sumia em silêncio** — o estado
// vazio ficava sem CTA e sem explicação. Pior: o `/catalog` ainda mostrava
// o texto "Cadastre o produto…" para quem não pode cadastrar.
//
// O padrão correto já existia no app (`admin.users`: "Sem permissão de
// administrador. Solicite a um admin…"; `planner`: "Você está em modo
// leitura…"). A correção aplica o mesmo padrão aos dois estados vazios:
// sem o papel, a tela explica em vez de fingir que não há ação. Nenhuma
// asserção antiga relaxada — com o papel, o botão continua igual.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 78 — estado vazio sem papel explica em vez de sumir", () => {
  it("/orders explica quando o usuário não tem papel de comercial", () => {
    const page = ler("src/routes/_authenticated.orders.tsx");
    expect(page).toContain('data-testid="orders-sem-permissao"');
    expect(page).toContain("Você não tem o papel de");
    expect(page).toContain("para criar pedidos");
  });

  it("/catalog explica quando o usuário não tem permissão de edição", () => {
    const page = ler("src/routes/_authenticated.catalog.tsx");
    expect(page).toContain('data-testid="catalog-sem-permissao"');
    expect(page).toContain("Você não tem permissão para cadastrar produtos");
  });

  it("com o papel, o botão de criação continua existindo", () => {
    const orders = ler("src/routes/_authenticated.orders.tsx");
    const catalog = ler("src/routes/_authenticated.catalog.tsx");
    expect(orders).toContain("Novo pedido");
    expect(catalog).toContain("Novo produto");
  });
});
