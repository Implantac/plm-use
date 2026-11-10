// Onda 47 — 27ª medição. Medido no browser (Chromium, clique real):
//
//   /orders            18 inputs, 15 sem rótulo acessível, 0 required /
//                      0 aria-required; diálogo "Novo pedido" com 6 campos
//                      e 6 `<label htmlFor="">`.
//   CostQueueNominal   os 2 pedidos `demo: true` exibiam badge "Demonstração"
//                      mas mantinham "Ficha Cega A4" ativa; o HTML impresso
//                      levava CNPJ, referência, grade e lista nominal de um
//                      cliente que não existe.
//   /audit             9 siglas na primeira dobra, 18 no total;
//   /route-engineering PCP 4, SAM 1, GSD 2, CAD 1; /suppliers 11 siglas.
//
// Correção: gate de emissão de documento + rótulos + glossário interno.
// Nenhuma asserção das Ondas 38–46 foi relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  FICHA_CEGA_DEMO_BLOQUEIO,
  INITIAL_PRIVATE_LABEL_ORDERS,
  PEDIDO_DEMO_LABEL,
  pedidosOperacionais,
  podeEmitirFichaCega,
  usePrivateLabelQueueStore,
} from "@/lib/sales/private-label-queue";
import { TERMOS, TERMOS_PRIMEIRA_DOBRA, explicacaoDe, termosPorSigla } from "./glossario";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const st = () => usePrivateLabelQueueStore.getState();

const SIGLAS_NOVAS = ["CAD", "EAN", "GTIN", "ABNT", "CAPA", "LGPD", "XML", "DRE", "POM"];

beforeEach(() => {
  usePrivateLabelQueueStore.setState({ orders: INITIAL_PRIVATE_LABEL_ORDERS });
});

describe("Onda 47 — documento operacional não nasce da vitrine", () => {
  it("pedido de demonstração não pode emitir Ficha Cega A4", () => {
    const demo = st().orders.find((o) => o.demo === true);
    expect(demo).toBeDefined();
    expect(podeEmitirFichaCega(demo!)).toBe(false);
    expect(PEDIDO_DEMO_LABEL).toContain("não entra em número operacional");
    expect(FICHA_CEGA_DEMO_BLOQUEIO).toContain("clone ou edite");
    // Regressão Onda 39: a vitrine continua fora de qualquer apuração.
    expect(pedidosOperacionais(st().orders)).toHaveLength(0);
  });

  it("clonar e editar promovem o pedido e liberam a emissão", () => {
    const demo = st().orders.find((o) => o.demo === true)!;
    const clonado = st().cloneOrder(demo.id);
    expect(clonado).not.toBeNull();
    expect(clonado?.demo).toBe(false);
    expect(podeEmitirFichaCega(clonado!)).toBe(true);
    expect(pedidosOperacionais(st().orders)).toHaveLength(1);

    st().updateOrderPricing(demo.id, 79.9);
    const promovido = st().orders.find((o) => o.id === demo.id)!;
    expect(promovido.demo).toBe(false);
    expect(podeEmitirFichaCega(promovido)).toBe(true);
    expect(pedidosOperacionais(st().orders)).toHaveLength(2);
  });

  it("qualquer edição humana continua promovendo (Onda 39)", () => {
    st().setOrderStatus("pl-1", "Em Detalhamento");
    st().setNominalRosterAndSyncGrade("pl-2", []);
    for (const o of st().orders) expect(o.demo, o.id).toBe(false);
  });

  it("o gate está no único chamador de UI, antes de imprimir", () => {
    const fonte = ler("src/components/sales/CostQueueNominalPanel.tsx");
    expect(fonte).toContain("function printBlindSheet(o: PrivateLabelOrder) {");
    expect(fonte).toContain("if (!podeEmitirFichaCega(o)) {");
    expect(fonte.indexOf("if (!podeEmitirFichaCega(o))")).toBeLessThan(
      fonte.indexOf("buildBlindOrderProductionSheetHtml(o)"),
    );
    // A vitrine não mostra botão que imprime: mostra aviso com saída.
    expect(fonte).toContain('data-testid="ficha-cega-bloqueada"');
    expect(fonte).toContain("clone para emitir");
    expect(fonte).toContain("podeEmitirFichaCega(o) ? (");
  });

  it("a grade de custo deixa de ter 15 inputs sem nome acessível", () => {
    const fonte = ler("src/components/sales/CostQueueNominalPanel.tsx");
    expect(fonte).toContain("Quantidade do driver ·");
    expect(fonte).toContain("Custo do driver por unidade ·");
    expect(fonte).toContain("Setup fixo do lote ·");
    expect(fonte).toContain('<caption className="sr-only">');
    expect((fonte.match(/aria-label=\{`/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});

describe("Onda 47 — formulário de pedido rotulado", () => {
  it("os labels apontam para os campos e os obrigatórios estão marcados", () => {
    const fonte = ler("src/routes/_authenticated.orders.tsx");
    for (const par of [
      ["novo-pedido-cliente", "Cliente"],
      ["novo-pedido-entrega", "Entrega"],
      ["novo-pedido-validade", "Validade do orçamento"],
      ["novo-pedido-pagamento", "Condição de pagamento"],
      ["novo-pedido-observacoes", "Observações"],
      ["novo-cliente-nome", "Razão social / nome"],
      ["novo-cliente-documento", "CNPJ / CPF"],
      ["novo-cliente-cidade", "Cidade"],
      ["novo-cliente-uf", "UF"],
      ["novo-cliente-segmento", "Segmento"],
    ]) {
      expect(fonte, par[0]).toContain(`htmlFor="${par[0]}"`);
      expect(fonte, par[0]).toContain(`id="${par[0]}"`);
    }
    expect((fonte.match(/htmlFor="/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect((fonte.match(/aria-required="true"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(fonte).toContain('aria-describedby={customers.length === 0 ? "novo-pedido-sem-cliente"');
    expect(fonte).toContain('id="novo-pedido-sem-cliente"');
    expect(fonte).toContain('autoComplete="organization"');
    // Regressão: a validação que o browser mediu continua no clique.
    expect(fonte).toContain('toast.error("Selecione o cliente.")');
  });

  it("a busca dos módulos também ganhou nome acessível", () => {
    expect(ler("src/components/modules/ModuleLayout.tsx")).toContain(
      "aria-label={searchPlaceholder",
    );
  });
});

describe("Onda 47 — glossário sai da primeira dobra do dashboard", () => {
  it("as 9 siglas medidas nas telas internas têm explicação em português simples", () => {
    expect(TERMOS.length).toBeGreaterThanOrEqual(33);
    expect(termosPorSigla(SIGLAS_NOVAS)).toHaveLength(SIGLAS_NOVAS.length);
    for (const s of SIGLAS_NOVAS) {
      const texto = explicacaoDe(s);
      expect(texto, s).not.toBeNull();
      expect(texto!.length, s).toBeGreaterThan(30);
      expect(texto!.toLowerCase(), s).not.toContain("conforme o");
      expect(texto!.toLowerCase(), s).not.toContain(" ver ");
    }
    // Regressão Onda 45: as siglas da primeira dobra seguem cobertas.
    expect(TERMOS_PRIMEIRA_DOBRA.length).toBeGreaterThanOrEqual(15);
    expect(termosPorSigla(TERMOS_PRIMEIRA_DOBRA)).toHaveLength(TERMOS_PRIMEIRA_DOBRA.length);
    expect(explicacaoDe("BOM")).toContain("Lista de materiais");
  });

  it("as quatro telas medidas montam glossário com testId próprio", () => {
    const rotas: Array<[string, string]> = [
      ["src/routes/_authenticated.orders.tsx", "glossario-orders"],
      ["src/routes/_authenticated.audit.tsx", "glossario-audit"],
      ["src/routes/_authenticated.route-engineering.tsx", "glossario-route-engineering"],
      ["src/routes/_authenticated.suppliers.tsx", "glossario-suppliers"],
    ];
    for (const [arquivo, testId] of rotas) {
      const fonte = ler(arquivo);
      expect(fonte, arquivo).toContain("<GlossarioTermos");
      expect(fonte, arquivo).toContain(`testId="${testId}"`);
      expect(fonte, arquivo).toContain('from "@/components/onboarding/GlossarioTermos"');
    }
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
