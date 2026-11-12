// Onda 70 — 64ª medição. Depois de validar a publicação da Onda 69 com
// cliques reais em produção (`/materials` com o aviso `materials-demo` e
// métricas em `—`, 0 `pageerror`), a varredura de risco mediu os seeds
// restantes: `analyticsKpisSeed` (BI Executivo, módulo 8 do creative-sync)
// e o dashboard de marketing hardcoded em `/analytics`.
//
// Medição: o seed de 3 KPIs (`Meta de Coleção` R$ 2.4M/4M, `Crescimento
// YoY` +24.8%, `Eficiência PCP` 94.2%) era BI de demonstração **sem nenhuma
// declaração** — e entrava em número operacional em três lugares:
//
//   1. `/analytics` — os cards de KPI mostravam os valores fictícios como
//      indicadores da empresa; as 5 métricas do topo eram literais
//      ("Investimento (real) R$ 84k", "ROI médio 3.4x", "ROAS 5.8x",
//      "Ruptura 4.2%", "Giro 7.1x").
//   2. Dashboard de Marketing — 4 produtos com spend/receita/ROI fictícios
//      ("Vestido Floral (Ref. 302)" ROI 5.69x, receita R$ 262.000) e
//      penetração por região ("Sudeste R$ 1.2M") lidos como marketing real.
//   3. `creative-sync` — `listAnalyticsKpis` sincronizava o seed inteiro
//      para a tabela `analytics_kpis` do Supabase como se fosse cadastro
//      da empresa.
//
// Prova antes: "2.4M", "R$ 84k" e "Vestido Floral (Ref. 302)" visíveis, 0
// menções a demonstração.
//
// Correção (mesmo contrato das coleções `demo: true` da Onda 51 e dos
// creators da Onda 59): o seed marca `demo: true`; as métricas do topo
// viram `—` (nunca número inventado); o dashboard de marketing nasce
// vazio; o engine só sincroniza KPIs operacionais; e a tela mostra o aviso
// `analytics-demo`. Nenhuma asserção antiga relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 70 — BI de demonstração fora das métricas e do banco", () => {
  it("o seed marca os KPIs de demonstração com demo: true", () => {
    const store = ler("src/lib/analytics/store.ts");
    expect(store).toContain("demo: true");
    expect(store).toContain("demo?: boolean;");
    expect(store).toContain("export function kpisOperacionais(");
    expect(store).toContain("return list.filter((k) => k.demo !== true);");
  });

  it("as métricas do topo viram — (nunca número inventado)", () => {
    const page = ler("src/routes/_authenticated.analytics.tsx");
    expect(page).toContain('data-testid="analytics-demo"');
    expect(page).toContain("BI de demonstração");
    expect(page).toContain("não são apurados como reais");
    expect(page).toContain("O PLM não é ERP");
    expect(page).not.toContain('value: "R$ 84k"');
    expect(page).not.toContain('value: "3.4x"');
    expect(page).not.toContain('value: "5.8x"');
    expect(page).not.toContain('value: "4.2%"');
    expect(page).not.toContain('value: "7.1x"');
  });

  it("o dashboard de marketing nasce vazio (sem produtos fictícios)", () => {
    const page = ler("src/routes/_authenticated.analytics.tsx");
    expect(page).toContain("const marketingMetrics: MarketingMetric[] = [];");
    expect(page).not.toContain("Vestido Floral (Ref. 302)");
    expect(page).not.toContain("Blusa Listrada (Ref. 811)");
    expect(page).not.toContain("Calça Linho (Ref. 441)");
    expect(page).not.toContain("Casaco Estruturado (Ref. 902)");
  });

  it("a demonstração nunca sobe para o banco (creative-sync)", () => {
    const sync = ler("src/lib/creative-sync.ts");
    expect(sync).toContain("list: () => kpisOperacionais(listAnalyticsKpis())");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
