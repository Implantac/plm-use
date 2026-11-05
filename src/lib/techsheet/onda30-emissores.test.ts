// Guarda de regressão da Onda 30.
//
// Os testes de comportamento (cfo-dre, kanban-items, omnichannel-readiness,
// materializacao) provam o número. Este prova o **caminho de saída**: nenhum
// emissor de documento pode voltar a cair em `seedFor()` ou a plantar as quatro
// referências de demonstração no seletor. É uma leitura dos fontes, não um
// mock — se alguém reintroduzir o fallback, a suíte quebra aqui e não em produção.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

/** Linhas de código, sem comentários de linha nem de bloco. */
function codigo(fonte: string): string {
  return fonte
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");
}

const EMISSORES = [
  "src/components/pcp/CuttingRoomPlanPanel.tsx", // Ordem de Corte A4
  "src/routes/_authenticated.route-engineering.tsx", // Folha de Balanceamento A4 + escrita no BOP
  "src/components/inventory/FabricRollsShadePanel.tsx", // saldo de rolo → BOM
  "src/components/pcp/OutsourcingServiceOrderPanel.tsx", // OS + XML de remessa
  "src/components/launch/OmnichannelReadinessPanel.tsx", // feed CSV + checklist A4
  "src/routes/_authenticated.development.tsx", // esteira → ensure()+updateMeta()
  "src/routes/_authenticated.looks.tsx", // importar rápido de look
  "src/lib/techsheet/cfo-dre.ts", // DRE gerencial + A4
];

const QUATRO_REFS = '"DEV000006", "V24-001", "U25-014", "I25-088"';

describe("Onda 30 — emissores não usam o modelo de demonstração", () => {
  it.each(EMISSORES)("%s não chama seedFor() em código", (arquivo) => {
    expect(codigo(ler(arquivo))).not.toContain("seedFor(");
  });

  it.each(EMISSORES)("%s não planta as quatro refs de exemplo no seletor", (arquivo) => {
    // cfo-dre guarda a lista só para *declarar* quem ficou de fora; nunca a soma.
    if (arquivo.endsWith("cfo-dre.ts")) return;
    expect(ler(arquivo)).not.toContain(QUATRO_REFS);
  });

  it.each([
    "src/components/pcp/CuttingRoomPlanPanel.tsx",
    "src/routes/_authenticated.route-engineering.tsx",
    "src/components/pcp/OutsourcingServiceOrderPanel.tsx",
    "src/components/launch/OmnichannelReadinessPanel.tsx",
    "src/components/inventory/FabricRollsShadePanel.tsx",
    "src/routes/_authenticated.looks.tsx",
  ])("%s seleciona só fichas operacionais", (arquivo) => {
    const fonte = ler(arquivo);
    expect(
      fonte.includes("useOperationalRefs") ||
        fonte.includes("operationalCodes(") ||
        // resolveOmnichannelInputs chama operationalCodes internamente.
        fonte.includes("resolveOmnichannelInputs("),
    ).toBe(true);
  });

  it("a DRE não tem multiplicador de preset nem preço de papel", () => {
    const fonte = codigo(ler("src/lib/techsheet/cfo-dre.ts"));
    expect(fonte).not.toContain("multByRef");
    expect(fonte).not.toContain("99.9");
    expect(fonte).toContain("operationalCodes(");
  });

  it("os dois emissores A4 têm guarda de emissão", () => {
    const corte = ler("src/components/pcp/CuttingRoomPlanPanel.tsx");
    expect(corte).toContain('data-testid="corte-sem-ficha"');
    expect(corte).toContain("a Ordem de Corte não é emitível");

    const balanceamento = ler("src/routes/_authenticated.route-engineering.tsx");
    expect(balanceamento).toContain('data-testid="balanceamento-sem-ficha"');
    expect(balanceamento).toContain("não é emitível");
  });
});
