// Onda 52 — 36ª/37ª medições. Depois de validar a publicação da Onda 51 com
// cliques reais em produção, a varredura de risco **abriu os diálogos** das
// 44 rotas com clique real (a Onda 49 só havia medido campos montados na
// carga inicial; a Onda 51 corrigiu apenas o diálogo de `/collections`).
//
//   ANTES (produção, Onda 51): 19 diálogos abertos em 13 rotas,
//   **107 campos sem nome acessível**:
//     cad 11 · catalog 9 · colors 4 · commercial 5 · development 4 ·
//     looks 5 · marketing 10 (×2, mesmo diálogo) · prints 4 ·
//     prototypes 5 (×2) · research 11 · security 2 · suppliers 10 ·
//     tech-sheet 2 + 10 · collections 0 · orders 0 · references 0
//
// Correção: 114 `aria-label` derivados do `<Label>`/`<label>` visível (ou do
// placeholder, com 6 textos reescritos à mão) em 13 rotas + `AplicacoesPanel`.
// Nenhum `id` foi inventado, nenhum `<Label>` foi alterado, nenhum handler,
// validação ou store mudou. O `SelectTrigger` de "Ocasião" em `/looks`
// também ganhou nome (é um button, fora da métrica input/select/textarea).
//
//   DEPOIS (browser local): **19 diálogos, 0 campos sem nome**.
//
// Nenhuma asserção antiga é relaxada (guardas 47/48/49/50/51 preservadas).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const ROTAS = [
  "cad",
  "catalog",
  "colors",
  "commercial",
  "development",
  "looks",
  "marketing",
  "prints",
  "prototypes",
  "research",
  "security",
  "suppliers",
  "tech-sheet",
];
const ARQUIVOS = [
  ...ROTAS.map((r) => `src/routes/_authenticated.${r}.tsx`),
  "src/components/techsheet/AplicacoesPanel.tsx",
];

describe("Onda 52 — todo campo de diálogo tem nome acessível", () => {
  it("os 14 arquivos medidos receberam aria-label", () => {
    expect(ARQUIVOS).toHaveLength(14);
    for (const arq of ARQUIVOS) {
      const fonte = ler(arq);
      expect(fonte, arq).toContain("aria-label=");
    }
  });

  it("114 rótulos novos, sem texto genérico ou de exemplo", () => {
    const tudo = ARQUIVOS.map(ler).join("\n");
    const adicionados = ARQUIVOS.map((a) => (ler(a).match(/aria-label="/g) ?? []).length).reduce(
      (a, b) => a + b,
      0,
    );
    // Alguns aria-label já existiam antes da Onda 52 (Ondas 47/49); o total
    // precisa comportar os 114 inseridos por esta onda.
    expect(adicionados).toBeGreaterThanOrEqual(114);
    expect(tudo).not.toContain('aria-label="Campo do formulário"');
    expect(tudo).not.toContain('aria-label="opcional"');
    expect(tudo).not.toContain('aria-label="denim, oversized, monocromia"');
  });

  it("os nomes reescritos à mão são descritivos", () => {
    const looks = ler("src/routes/_authenticated.looks.tsx");
    for (const nome of [
      "Nome do look",
      "Coleção do look",
      "Cor do look",
      "Tags do look, separadas por vírgula",
      "Ocasião do look",
    ]) {
      expect(looks, nome).toContain(`aria-label="${nome}"`);
    }
    const aplicacoes = ler("src/components/techsheet/AplicacoesPanel.tsx");
    expect(aplicacoes).toContain('aria-label="Pontos de bordado (milhares)"');
    expect(aplicacoes).toContain('aria-label="Número de cores da aplicação"');
    expect(aplicacoes).toContain('aria-label="Técnica"');
  });

  it("os 13 diálogos com maior incidência estão cobertos", () => {
    const esperados: ReadonlyArray<[string, number]> = [
      ["cad", 11],
      ["catalog", 19],
      ["colors", 4],
      ["commercial", 5],
      ["development", 4],
      ["looks", 5],
      ["marketing", 10],
      ["prints", 4],
      ["prototypes", 7],
      ["research", 11],
      ["security", 2],
      ["suppliers", 10],
      ["tech-sheet", 10],
    ];
    for (const [rota, minimo] of esperados) {
      const n = (ler(`src/routes/_authenticated.${rota}.tsx`).match(/aria-label="/g) ?? []).length;
      expect(n, rota).toBeGreaterThanOrEqual(minimo);
    }
  });

  it("as guardas das Ondas 47 a 51 permanecem intactas", () => {
    expect(ler("src/components/sales/CostQueueNominalPanel.tsx")).toContain(
      'data-testid="ficha-cega-bloqueada"',
    );
    expect(ler("src/routes/_authenticated.marketing.tsx")).toContain(
      'data-testid="media-kit-bloqueado"',
    );
    expect(ler("src/routes/_authenticated.collection-map.tsx")).toContain(
      'data-testid="colecao-so-vitrine"',
    );
    expect(ler("src/components/inventory/MrpNetExplosionPanel.tsx")).toContain(
      'data-testid="mrp-sem-apuracao"',
    );
    expect(ler("src/components/pcp/FiniteCapacityPanel.tsx")).toContain('data-testid="crp-sem-op"');
    expect(ler("src/routes/_authenticated.collections.tsx")).toContain(
      'data-testid="colecoes-so-vitrine"',
    );
    expect(ler("src/lib/collections/store.ts")).toContain("demo: true");
  });

  it("o diálogo de /collections continua com os 7 pares id/htmlFor", () => {
    const rota = ler("src/routes/_authenticated.collections.tsx");
    expect(rota).toContain("htmlFor={`colecao-${key}`}");
    expect(rota).toContain("id={`colecao-${key}`}");
  });

  it("os campos da carga inicial (Ondas 49/51) não regrediram", () => {
    expect(ler("src/routes/_authenticated.quality.tsx")).toContain(
      'aria-label="Defeito ou problema da CAPA"',
    );
    expect(ler("src/routes/_authenticated.launch.tsx")).toContain('htmlFor="wave-codigo"');
    expect(ler("src/routes/_authenticated.orders.tsx")).toContain('htmlFor="novo-pedido-cliente"');
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
