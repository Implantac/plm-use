// Onda 51 — 34ª/35ª medições. Depois de validar a publicação da Onda 50 com
// cliques reais em produção, a varredura de risco mediu `/collections`:
//
//   Exportar → "Baixar CSV"   → colecoes-2026-11-11.csv com 3 coleções de
//                               FÁBRICA (Verão 25 - Amalfi R$ 1,8 mi /
//                               24.000 peças / ROI 3.4x, Urban Resort,
//                               Essentials Atemporal) + toast "CSV exportado"
//   Exportar → "Imprimir / PDF" → A4 com os mesmos 3 registros e KPIs
//
// Sem nenhum aviso, nenhum bloqueio e nenhuma marcação de demonstração no
// documento. O subtítulo da tela avisava; o arquivo, não.
//
// Correção de diagnóstico: o `Exportar` NÃO é botão morto — é o `ExportMenu`
// (DropdownMenu do Radix) com "Baixar CSV" e "Imprimir / PDF". A primeira
// medição só contava popups/downloads/toasts no clique do trigger e por isso
// parecia inerte; clicar nos `menuitem` revelou os dois documentos.
//
// Regra das Ondas 22/23/27–50: só coleção salva entra em documento
// operacional; vitrine é declarada com `—` + aviso/CTA e só é promovida por
// ação explícita. `upsertCollection` promove (Onda 39), `replaceAllCollections`
// (hidratação do servidor) continua operacional, e `filterCollections` / o
// `ExportMenu` compartilhado NÃO foram alterados. Nenhuma asserção antiga é
// relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  COLECOES_SEM_APURACAO,
  colecoesOperacionais,
  collectionsSeed,
  listCollections,
  podeExportarColecoes,
  replaceAllCollections,
  upsertCollection,
} from "@/lib/collections/store";
import { filterCollections } from "@/lib/collections/filter";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

beforeEach(() => replaceAllCollections([...collectionsSeed]));

describe("Onda 51 — a vitrine não entra no CSV nem no PDF de coleções", () => {
  it("as 3 coleções do seed estão declaradas como demonstração", () => {
    expect(collectionsSeed).toHaveLength(3);
    expect(collectionsSeed.every((c) => c.demo === true)).toBe(true);
    expect(colecoesOperacionais(collectionsSeed)).toEqual([]);
  });

  it("sem coleção salva, CSV e PDF não são apuráveis", () => {
    const decisao = podeExportarColecoes(collectionsSeed);
    expect(decisao.pode).toBe(false);
    expect(decisao.motivo).toContain("demonstração");
    expect(decisao.motivo).toContain("não são apuráveis");
    expect(COLECOES_SEM_APURACAO).toBe(decisao.motivo);
  });

  it("criar/editar coleção promove por ação explícita e libera a emissão", () => {
    upsertCollection({ ...collectionsSeed[0], id: 999999, name: "Inverno 27" });
    const salva = listCollections().find((c) => c.id === 999999);
    expect(salva?.demo).toBe(false);
    expect(colecoesOperacionais(listCollections()).map((c) => c.name)).toEqual(["Inverno 27"]);
    expect(podeExportarColecoes(listCollections()).pode).toBe(true);
    expect(podeExportarColecoes(listCollections()).motivo).toBe("");
  });

  it("hidratação do servidor (sem flag demo) já é operacional", () => {
    const { demo: _demo, ...doServidor } = collectionsSeed[0];
    replaceAllCollections([{ ...doServidor, id: 42 }]);
    expect(podeExportarColecoes(listCollections()).pode).toBe(true);
  });

  it("o filtro de busca e o ExportMenu compartilhado não foram alterados", () => {
    expect(filterCollections(collectionsSeed, "verão").length).toBeGreaterThan(0);
    expect(filterCollections(collectionsSeed, "zzz")).toEqual([]);
    expect(ler("src/components/export/ExportMenu.tsx")).toContain(
      "const disabled = rows.length === 0;",
    );
  });

  it("a rota só exporta coleções operacionais e declara a vitrine com CTA", () => {
    const rota = ler("src/routes/_authenticated.collections.tsx");
    expect(rota).toContain("const operacionais = colecoesOperacionais(collections)");
    expect(rota).toContain("const emissao = podeExportarColecoes(collections)");
    expect(rota).toContain("rows={operacionais.map((col) => ({");
    expect(rota).toContain('data-testid="colecoes-so-vitrine"');
    expect(rota).toContain('testId="cta-colecoes-sem-colecao"');
    expect(rota).toContain("COLECOES_SEM_APURACAO");
    // os 4 KPIs do cabeçalho viram travessão quando só há vitrine
    expect((rota.match(/value: "—"/g) ?? []).length).toBeGreaterThanOrEqual(4);
    // 35ª medição: os 7 campos do diálogo "Nova coleção" também ganharam nome
    expect(rota).toContain("htmlFor={`colecao-${key}`}");
    expect(rota).toContain("id={`colecao-${key}`}");
  });

  it("as guardas das Ondas 47, 48, 49 e 50 permanecem intactas", () => {
    expect(ler("src/components/sales/CostQueueNominalPanel.tsx")).toContain(
      'data-testid="ficha-cega-bloqueada"',
    );
    expect(ler("src/routes/_authenticated.marketing.tsx")).toContain(
      'data-testid="media-kit-bloqueado"',
    );
    expect(ler("src/routes/_authenticated.collection-map.tsx")).toContain(
      'data-testid="colecao-so-vitrine"',
    );
    expect(ler("src/routes/_authenticated.quality.tsx")).toContain(
      'aria-label="Defeito ou problema da CAPA"',
    );
    expect(ler("src/components/inventory/MrpNetExplosionPanel.tsx")).toContain(
      'data-testid="mrp-sem-apuracao"',
    );
    expect(ler("src/components/pcp/FiniteCapacityPanel.tsx")).toContain('data-testid="crp-sem-op"');
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
