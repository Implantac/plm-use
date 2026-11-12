// Onda 72 — 66ª medição. Depois de validar a publicação da Onda 71 com
// cliques reais em produção (`/measurements` com o aviso `measurements-demo`
// e métricas em `—`, 0 `pageerror`), a varredura de risco mediu o que ainda
// faltava no creative-sync: paletas, estampas, coordenados e pranchas de
// displayagem — os 4 módulos criativos com vitrine **sem nenhuma declaração**.
//
// Medição: `palettesSeed` (3 cartelas), `printsSeed` (4 estampas),
// `looksSeed` (3 coordenados), `boardsSeed` (2 painéis) e o `refCatalog`
// (8 referências com preço fixo R$ 289/429/599…) eram vitrine tratada como
// biblioteca real em quatro lugares:
//
//   1. `/colors` — "Paletas ativas 3", "Cores únicas 13", "Refs vinculadas
//      131", "Cobertura 67%" contavam a vitrine.
//   2. `/prints` — "Estampas 4", "Em prova 1", "Refs vinculadas 40",
//      "Reutilização 10x".
//   3. `/display` — "Painéis 2", "Looks montados 6", "Peças/look 3" e o
//      "Total look R$ 1.576" somando preço fictício do seed.
//   4. `creative-sync` — `listPalettes`/`listPrints`/`listLooks`/`listBoards`
//      subiam o seed inteiro para `color_palettes`, `print_assets`, `looks` e
//      `display_boards` do Supabase.
//
// Além disso, a vitrine alimentava **documento operacional**: a cartela de
// demonstração virava cor de ficha salva no `GarmentSketchStudio`, e a estampa
// de demonstração era sugerida como "arte" no `AplicacoesPanel`.
//
// Prova antes: `/colors` "Paletas ativas 3 · 131 refs"; `/prints` "Estampas 4
// · 40 refs"; `/display` "Painéis 2 · 6 looks · Total look R$ 1.576".
//
// Correção (mesmo contrato das coleções `demo: true` da Onda 51 e dos
// materiais da Onda 69): os quatro seeds marcam `demo: true`; as métricas das
// três telas ignoram `demo` (sem item real, viram `—`); o preço de vitrine não
// entra no total do look; as cores e estampas de demonstração não são
// oferecidas numa ficha salva; e o engine só sincroniza itens operacionais.
// Nenhuma asserção antiga relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 72 — vitrine criativa fora das métricas, das fichas e do banco", () => {
  it("os quatro seeds criativos marcam a demonstração", () => {
    const colors = ler("src/lib/colors/store.ts");
    expect(colors).toContain("demo?: boolean;");
    expect(colors).toContain("export function paletasOperacionais(");
    expect(colors).toContain("return list.filter((p) => p.demo !== true);");

    const prints = ler("src/lib/prints/store.ts");
    expect(prints).toContain("export function estampasOperacionais(");

    const display = ler("src/lib/display/store.ts");
    expect(display).toContain("export function pranchasOperacionais(");
    expect(display).toContain("demo?: boolean;");

    const looks = ler("src/lib/looks/store.ts");
    expect(looks).toContain("export function looksOperacionais(");
    expect(looks).toContain("demo?: boolean;");
  });

  it("as três telas declaram a vitrine e apuram as métricas sem ela", () => {
    for (const [arquivo, testid, frase] of [
      ["src/routes/_authenticated.colors.tsx", "colors-demo", "só demonstração na lista"],
      ["src/routes/_authenticated.prints.tsx", "prints-demo", "só demonstração na lista"],
      ["src/routes/_authenticated.display.tsx", "display-demo", "só demonstração na lista"],
    ] as const) {
      const page = ler(arquivo);
      expect(page).toContain(`data-testid="${testid}"`);
      expect(page).toContain(frase);
      expect(page).toContain("demo: total === 0");
    }
  });

  it("o preço de vitrine não é apurado no total do look", () => {
    const page = ler("src/routes/_authenticated.display.tsx");
    expect(page).toContain("const itensReais = board.demo ? [] : board.items.filter");
    expect(page).toContain("vitrine ilustrativa, não apurada");
    expect(page).toContain("sem preço apurado");
  });

  it("a vitrine não vira cor nem estampa de ficha salva", () => {
    const sketch = ler("src/components/techsheet/GarmentSketchStudio.tsx");
    expect(sketch).toContain("paletasOperacionais(listPalettes())");
    const aplic = ler("src/components/techsheet/AplicacoesPanel.tsx");
    expect(aplic).toContain("estampasOperacionais(listPrints())");
  });

  it("a demonstração nunca sobe para o banco (creative-sync)", () => {
    const sync = ler("src/lib/creative-sync.ts");
    expect(sync).toContain("list: () => paletasOperacionais(listPalettes())");
    expect(sync).toContain("list: () => estampasOperacionais(listPrints())");
    expect(sync).toContain("list: () => looksOperacionais(listLooks())");
    expect(sync).toContain("list: () => pranchasOperacionais(listBoards())");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
