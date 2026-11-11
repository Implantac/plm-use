// Onda 53 — 38ª/39ª medições. Depois de validar a publicação da Onda 52 com
// cliques reais (15 diálogos reabertos, 0 campos sem nome), a varredura de
// números de fábrica em 44 rotas achou UM painel ainda apurando vitrine:
//
//   /collections → "ROI por Coleção" (CollectionROI)
//     R$ 476.800 receita · R$ 208.000 investimento · R$ 143.640 lucro ·
//     1.490 produzidas · 69% ROI · 2,29× ROAS ·
//     "Pré-Verão 2026" com R$ 38.400 / -70% / 0,41×
//
// Origem: `CollectionROI` lia `usePCPStore((s) => s.lotes)` DIRETO, e os 4
// lotes do seed são `demo: true` (Onda 40 já criou `lotesOperacionais()`).
// `CollectionPerformance` recebia `collections` com as 3 coleções de vitrine
// (Onda 51 já criou `colecoesOperacionais()`). Havia um aviso geral no topo da
// rota, mas a tabela/KPIs não tinham nenhuma marcação e apareciam como
// apuração operacional.
//
// Correção: filtrar a vitrine nos dois painéis; sem dado salvo, `—` + aviso +
// CTA (`roi-sem-lote` / `performance-sem-colecao`), tabelas e barras não
// renderizadas; declaração explícita de que receita/custo/investimento são
// estimativas de referência (ticket médio R$ 320), não BI/fiscal.
//
// Nenhuma função pura foi alterada (`lotesOperacionais`,
// `colecoesOperacionais`, `computeMrpNetExplosion`, formatadores), nenhuma
// asserção antiga relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lotesOperacionais } from "@/lib/pcp/store";
import { colecoesOperacionais, collectionsSeed } from "@/lib/collections/store";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 53 — KPI de coleção não nasce da vitrine", () => {
  it("os seletores das Ondas 40 e 51 continuam separando vitrine de salvo", () => {
    const lotes = [
      { demo: true, numero: "LOTE 2601" },
      { demo: false, numero: "LOTE REAL" },
    ];
    expect(lotesOperacionais(lotes as never).map((l) => l.numero)).toEqual(["LOTE REAL"]);
    expect(colecoesOperacionais(collectionsSeed)).toEqual([]);
  });

  it("CollectionROI usa lotesOperacionais, não s.lotes direto", () => {
    const roi = ler("src/components/collections/CollectionROI.tsx");
    expect(roi).toContain("lotesOperacionais(lotesTodos)");
    expect(roi).not.toContain("const lotes = usePCPStore((s) => s.lotes)");
    expect(roi).toContain("const apuravel = rows.length > 0");
  });

  it("sem lote salvo, ROI mostra travessão com aviso e CTA", () => {
    const roi = ler("src/components/collections/CollectionROI.tsx");
    expect(roi).toContain('data-testid="roi-sem-lote"');
    expect(roi).toContain('testId="cta-roi-sem-lote"');
    expect((roi.match(/value=\{apuravel \? /g) ?? []).length).toBe(3);
    expect(roi).toContain("{apuravel && (");
    expect(roi).toContain('value={apuravel ? brl(rows.reduce((a, r) => a + r.receita, 0)) : "—"}');
  });

  it("as constantes de estimativa estão declaradas na tela", () => {
    const roi = ler("src/components/collections/CollectionROI.tsx");
    expect(roi).toContain("ticket médio de referência R$ 320");
    expect(roi).toContain("Não é dado de BI nem");
  });

  it("sem coleção salva, Meta × Realizado mostra travessão com aviso e CTA", () => {
    const perf = ler("src/components/collections/CollectionPerformance.tsx");
    expect(perf).toContain("const apuravel = collections.length > 0");
    expect(perf).toContain('data-testid="performance-sem-colecao"');
    expect(perf).toContain('testId="cta-performance-sem-colecao"');
    expect(perf).toContain('value={apuravel ? totals.planned : "—"}');
    expect(perf).toContain('label="Real." value={apuravel ? totals.realized : "—"}');
  });

  it("a rota passa só coleções operacionais para o painel", () => {
    const rota = ler("src/routes/_authenticated.collections.tsx");
    expect(rota).toContain("<CollectionPerformance collections={operacionais} />");
    expect(rota).toContain("const operacionais = colecoesOperacionais(collections)");
  });

  it("as guardas das Ondas 47 a 52 permanecem intactas", () => {
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
    expect(ler("src/routes/_authenticated.looks.tsx")).toContain('aria-label="Nome do look"');
    expect(ler("src/components/techsheet/AplicacoesPanel.tsx")).toContain(
      'aria-label="Pontos de bordado (milhares)"',
    );
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
