// Guarda de regressão da Onda 31: os pontos de ENTRADA não podem voltar a
// plantar o modelo de demonstração nem a criar ficha dentro do seletor do store.
//
// `cockpit-entry.test.ts` prova a regra; este teste prova que os quatro
// componentes continuam ligados nela.

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

const ENTRADAS = [
  "src/routes/_authenticated.tech-sheet.tsx",
  "src/routes/_authenticated.digital-twin.tsx",
  "src/components/ai/ProductStudio.tsx",
  "src/routes/_authenticated.marketing.tsx",
];

describe("Onda 31 — pontos de entrada sem modelo plantado", () => {
  it.each(ENTRADAS)("%s não planta as quatro refs de exemplo", (arquivo) => {
    expect(ler(arquivo)).not.toContain('"DEV000006", "V24-001", "U25-014", "I25-088"');
  });

  it.each([
    "src/routes/_authenticated.tech-sheet.tsx",
    "src/routes/_authenticated.digital-twin.tsx",
    "src/components/ai/ProductStudio.tsx",
  ])("%s não chama ensure() dentro do seletor nem no import", (arquivo) => {
    expect(codigo(ler(arquivo))).not.toContain("?? ensure(");
    expect(codigo(ler(arquivo))).not.toContain("?? ensureTechSheet(");
  });

  it("o cockpit resolve a ref pelo módulo puro e bloqueia as saídas", () => {
    const s = ler("src/routes/_authenticated.tech-sheet.tsx");
    expect(s).toContain("resolveCockpitRef(");
    expect(s).toContain("podeEmitirDocumento(");
    expect(s).toContain('data-testid="cockpit-sem-ficha"');
    expect(s).toContain("exigirFichaSalva(");
    // As cinco saídas: 2 PDFs, Ordem de Corte, CSV MRP e Publicar Catálogo.
    expect((s.match(/disabled=\{!emitivel\}/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("o gêmeo digital só simula ficha operacional", () => {
    const s = ler("src/routes/_authenticated.digital-twin.tsx");
    expect(s).toContain("useOperationalRefs");
    expect(s).toContain("useSelectedRef");
    expect(s).toContain('data-testid="gemeo-sem-ficha"');
    expect(s).not.toContain("defaultColorwaysFor(");
  });

  it("marketing não cria campanha com SKU de demonstração escondido", () => {
    const s = codigo(ler("src/routes/_authenticated.marketing.tsx"));
    expect(s).not.toContain('["DEV000006"]');
  });

  it("OS sem ficha fica fora das métricas e é declarada", () => {
    const s = ler("src/components/pcp/OutsourcingServiceOrderPanel.tsx");
    expect(s).toContain('data-testid="os-sem-ficha"');
    expect(s).toContain("filter((r) => r.emitivel)");
  });
});
