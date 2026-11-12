// Onda 69 — 63ª medição. Depois de validar a publicação da Onda 68 com
// cliques reais em produção (`/inventory` com o aviso `fabric-rolls-demo`,
// sem o saldo de 52,2 kg da vitrine, 0 `pageerror`), a varredura de risco
// mediu os seeds restantes: `MoodBoard` (imagens/paleta/tecidos de
// referência — vitrine criativa, sem número operacional) e `materialsSeed`
// (biblioteca de materiais, módulo 11 do creative-sync).
//
// Medição: o seed de 6 materiais (`Linho Puro Off-White` R$ 42,00/m,
// `Botão Madre Pérola 18L`, `Linha Poliéster 120`, `Tag Luxury + Polybag`,
// `Malha Dry Fit UV50+` R$ 39,80/kg, `Ribana Gola V` R$ 48,50/kg) era
// catálogo de demonstração **sem nenhuma declaração** — e entrava em número
// operacional em três lugares:
//
//   1. `/materials` — as 4 métricas do topo ("Materiais 6", "Custo médio
//      R$ 22,97", "Tecidos 3") contavam a vitrine como catálogo real.
//   2. `BomBopPanel` (diálogo "Inserir da Biblioteca") — o botão inseria o
//      material de demonstração no BOM de uma ficha salva com custo,
//      fornecedor e SKU fictícios.
//   3. `creative-sync` — `listMaterials` sincronizava o seed inteiro para a
//      tabela `materials` do Supabase como se fosse cadastro da empresa.
//
// Prova antes: "Linho Puro Off-White" e "Têxtil Camargo" visíveis, métrica
// "6 / R$ 22,97", 0 menções a demonstração.
//
// Correção (mesmo contrato das coleções `demo: true` da Onda 51 e dos
// creators da Onda 59): o seed marca `demo: true`; as métricas do catálogo
// ignoram `demo` (sem material real, viram `—`); o botão de inserção no
// BOM fica desabilitado para demonstração; e o engine só sincroniza
// materiais operacionais. Nenhuma asserção antiga relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 69 — materiais de demonstração fora das métricas e do BOM", () => {
  it("o seed marca os materiais de demonstração com demo: true", () => {
    const store = ler("src/lib/materials/store.ts");
    expect(store).toContain("demo: true");
    expect(store).toContain("demo?: boolean;");
    expect(store).toContain("export function materiaisOperacionais(");
    expect(store).toContain("return list.filter((m) => m.demo !== true);");
  });

  it("as métricas do catálogo ignoram a demonstração e viram — sem material real", () => {
    const page = ler("src/routes/_authenticated.materials.tsx");
    expect(page).toContain('data-testid="materials-demo"');
    expect(page).toContain("Materiais de demonstração no catálogo");
    expect(page).toContain("não entram nas métricas");
    expect(page).toContain("value: String(reais.length)");
    expect(page).toContain("demo: reais.length === 0");
    // o aviso declara o contrato (quebra de linha no JSX)
    expect(page).toContain("nenhum custo de vitrine é apurado como real");
  });

  it("a demonstração não pode ser inserida no BOM de uma ficha salva", () => {
    const bom = ler("src/components/techsheet/BomBopPanel.tsx");
    expect(bom).toContain("disabled={m.demo}");
    expect(bom).toContain("Material de demonstração");
    expect(bom).toContain('{m.demo ? " · demonstração" : ""}');
  });

  it("a demonstração nunca sobe para o banco (creative-sync)", () => {
    const sync = ler("src/lib/creative-sync.ts");
    expect(sync).toContain("list: () => materiaisOperacionais(listMaterials())");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
