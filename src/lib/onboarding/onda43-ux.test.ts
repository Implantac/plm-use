// Onda 43 — guardas de fonte das quatro melhorias de experiência medidas
// no browser. Impedem que o default quebrado da sidebar, a primeira dobra
// carregada e o formulário sem semântica de obrigatoriedade voltem.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

describe("Onda 43 — descoberta da sidebar", () => {
  const layout = ler("src/routes/_authenticated.tsx");

  it("o default é derivado de NAV_GROUPS, não de chaves obsoletas", () => {
    expect(layout).toContain("Object.keys(NAV_GROUPS)");
    expect(layout).toContain("Object.fromEntries");
    expect(layout).not.toContain("inicio: true");
    expect(layout).not.toContain("criar: false");
    expect(layout).not.toContain("colecoes: false");
  });

  it("abre os três grupos iniciais e mostra quantas páginas há nos fechados", () => {
    expect(layout).toContain('new Set(["geral", "plm-criacao", "plm-engenharia"])');
    expect(layout).toContain("páginas neste grupo");
    expect(layout).toContain("section.items.length");
  });

  it("a preferência do usuário continua sendo respeitada", () => {
    expect(layout).toContain("use-moda-sidebar-sections-v4");
    expect(layout).toContain("if (stored) return JSON.parse(stored)");
  });
});

describe("Onda 43 — primeira dobra do dashboard", () => {
  const dash = ler("src/routes/_authenticated.dashboard.tsx");

  it("o guia vem ANTES do fluxo de 6 etapas", () => {
    expect(dash.indexOf("<ComecePorAqui />")).toBeLessThan(
      dash.indexOf('data-testid="fluxo-operacional-detalhes"'),
    );
    expect(dash).toContain('from "@/components/onboarding/ComecePorAqui"');
  });

  it("as 6 etapas ficam colapsadas por padrão, mas acessíveis", () => {
    expect(dash).toContain('<details data-testid="fluxo-operacional-detalhes"');
    expect(dash).not.toContain(
      '<details data-testid="fluxo-operacional-detalhes" className="group" open',
    );
    expect(dash).toContain("Ver etapas");
    expect(dash).toContain("ORDER_FLOW_STEPS.map");
  });
});

describe("Onda 43 — acessibilidade do primeiro formulário", () => {
  const dialogo = ler("src/components/references/NovaReferenciaDialog.tsx");

  it("os dois campos obrigatórios declaram required e aria-required", () => {
    expect(dialogo.match(/aria-required="true"/g)).toHaveLength(2);
    expect(dialogo.match(/\brequired\b/g)?.length).toBeGreaterThanOrEqual(2);
    expect(dialogo).toContain('<Label htmlFor="ref-code">Código *</Label>');
    expect(dialogo).toContain('<Label htmlFor="ref-name">Nome da peça *</Label>');
  });
});

describe("Onda 43 — uma única fonte de verdade para o progresso", () => {
  const lib = codigo(ler("src/lib/onboarding/primeiros-passos.ts"));

  it("o hook usa a função pura e os mesmos filtros das Ondas 38–42", () => {
    expect(lib).toContain("computarPrimeirosPassos({");
    expect(lib).toContain("operationalCodes(data, [], materializadas)");
    expect(lib).toContain("pedidosOperacionais(orders)");
    expect(lib).toContain("parceirosOperacionais(partners)");
    expect(lib).toContain("campanhasOperacionais(campaigns)");
  });

  it("não existe contador paralelo nem persistência de progresso inventado", () => {
    expect(lib).not.toContain("localStorage");
    expect(lib).not.toContain("sessionStorage");
  });
});
