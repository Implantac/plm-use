// Onda 71 — 65ª medição. Depois de validar a publicação da Onda 70 com
// cliques reais em produção (`/analytics` com o aviso `analytics-demo` e
// métricas em `—`, 0 `pageerror`), a varredura de risco mediu os seeds
// restantes: `measurementsSeed` (biblioteca de tabelas de medidas).
//
// Medição: o seed de 3 tabelas (`TM-BLU-01` "Blusas Slim Feminino" aprovada
// com 18 refs vinculadas, `TM-CAL-02` "Calças Alfaiataria Feminino"
// aprovada com 9 refs, `TM-VES-01` "Vestidos Longos Premium" em rascunho)
// era biblioteca de demonstração **sem nenhuma declaração** — e entrava em
// número operacional em quatro lugares:
//
//   1. `/measurements` — as 4 métricas do topo ("Grades 3", "Aprovadas 2",
//      "Rascunho 1", "Refs vinculadas 32") contavam a vitrine como
//      biblioteca real.
//   2. "Aplicar na Ficha" — a grade de demonstração podia ser aplicada
//      numa ficha salva (POMs e medidas fictícias na engenharia).
//   3. `GradedMeasurementsPanel` — o diálogo "Importar Tabela Base" da
//      ficha técnica importava a grade de demonstração.
//   4. `creative-sync` — `listCharts` sincronizava o seed inteiro para a
//      tabela `measurement_charts` do Supabase como se fosse cadastro da
//      empresa.
//
// Prova antes: "TM-BLU-01" e "Blusas Slim Feminino" visíveis, 0 menções a
// demonstração.
//
// Correção (mesmo contrato das coleções `demo: true` da Onda 51 e dos
// creators da Onda 59): o seed marca `demo: true`; as métricas da
// biblioteca ignoram `demo` (sem tabela real, viram `—`); "Aplicar na
// Ficha" e a importação na ficha ficam desabilitados para demonstração; e
// o engine só sincroniza tabelas operacionais. Nenhuma asserção antiga
// relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 71 — tabelas de demonstração fora das métricas e das fichas", () => {
  it("o seed marca as tabelas de demonstração com demo: true", () => {
    const store = ler("src/lib/measurements/store.ts");
    expect(store).toContain("demo: true");
    expect(store).toContain("demo?: boolean;");
    expect(store).toContain("export function tabelasOperacionais(");
    expect(store).toContain("return list.filter((c) => c.demo !== true);");
  });

  it("as métricas da biblioteca ignoram a demonstração e viram — sem tabela real", () => {
    const page = ler("src/routes/_authenticated.measurements.tsx");
    expect(page).toContain('data-testid="measurements-demo"');
    expect(page).toContain("Tabelas de demonstração na biblioteca");
    expect(page).toContain("não entram nas métricas");
    expect(page).toContain("demo: totals.total === 0");
    expect(page).toContain("só demonstração na lista");
    expect(page).toContain("grade de vitrine é apurada como real");
  });

  it("a demonstração não pode ser aplicada nem importada numa ficha salva", () => {
    const page = ler("src/routes/_authenticated.measurements.tsx");
    expect(page).toContain("disabled={!targetRef || selected.demo}");
    expect(page).toContain("Tabela de demonstração — cadastre a tabela real");
    const panel = ler("src/components/techsheet/GradedMeasurementsPanel.tsx");
    expect(panel).toContain("disabled={c.demo}");
    expect(panel).toContain('{c.demo ? " · demonstração" : ""}');
  });

  it("a demonstração nunca sobe para o banco (creative-sync)", () => {
    const sync = ler("src/lib/creative-sync.ts");
    expect(sync).toContain("list: () => tabelasOperacionais(listCharts())");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
