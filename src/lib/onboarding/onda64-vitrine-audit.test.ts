// Onda 64 — 58ª medição. Depois de validar a publicação das Ondas 62 e 63
// com cliques reais em produção (`/materials` com MOQ/SKU, `/tech-sheet`
// com os 9 termos, 0 `pageerror`), a auditoria ponta a ponta do
// `DEV000006` (47 ocorrências na fonte, 20 no bundle) classificou cada
// superfície:
//
//   - ~20 em comentários (sem superfície de UI);
//   - seeds com `demo: true` (cad, prototypes, OS, private-label-queue,
//     campanhas GTM) — todas seladas/filtradas pelas telas;
//   - `cfo-dre` MODELO_REFS fora dos acumuladores;
//   - tech-sheet estado vazio declara a ficha de demonstração;
//   - dashboard DPP com `DataProvenanceBadge` ("demonstracao");
//   - looks filtra o DEV000006 e avisa com toast;
//   - research/marketing declaram a vitrine;
//   - showroom com preço null para ficha não salva;
//   - commercial só oferece ficha salva na expedição.
//
// E achou **3 vazamentos** do mesmo padrão — formulário pré-preenchido com
// dado de demonstração que, ao salvar, virava registro operacional:
//
//   1. marketing: `skuRefsText: "DEV000006, V24-001"` + R$ 12.000/25.000/
//      115.000 inventados → campanha "operacional" com SKUs de vitrine.
//      Provado por cliques: salvar só com nome derrubava a vitrine e os
//      KPIs mostravam o 115 inventado.
//   2. suppliers: parceiro fictício pré-preenchido (CNPJ, Apucarana,
//      75.000 min/mês, "Certificado ABVTEX") → fornecedor "homologado".
//   3. research: briefing pré-preenchido (tecido, gramatura 170, R$ 189,90)
//      → briefing operacional com dado de exemplo.
//
// Correção: padrões visíveis esvaziados + fallbacks do save neutralizados
// (sem CNPJ/cidade/capacidade inventados). Nenhuma asserção antiga relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 64 — auditoria DEV000006: formulário não planta demonstração", () => {
  it("marketing: o formulário de campanha não pré-preenche SKUs nem números de vitrine", () => {
    const fonte = ler("src/routes/_authenticated.marketing.tsx");
    expect(fonte).not.toContain('skuRefsText: "DEV000006');
    expect(fonte).not.toContain('productionCostBrl: "12000"');
    expect(fonte).not.toContain('mediaSpendBrl: "25000"');
    expect(fonte).not.toContain('attributedSalesBrl: "115000"');
    expect(fonte).toContain('skuRefsText: ""');
    // a vitrine segue declarada
    expect(fonte).toContain('data-testid="gtm-so-vitrine"');
  });

  it("suppliers: o formulário de fornecedor não pré-preenche parceiro fictício", () => {
    const fonte = ler("src/routes/_authenticated.suppliers.tsx");
    expect(fonte).not.toContain('"15.880.120/0001-40"');
    expect(fonte).not.toContain('capacityMinutesMonth: "75000"');
    expect(fonte).not.toContain('|| "Apucarana"');
    expect(fonte).not.toContain("|| 60000");
    // compliance neutra: parceiro novo não nasce "certificado"
    expect(fonte).toContain('compliance: "Em Auditoria"');
    expect(fonte).not.toContain('compliance: "Certificado ABVTEX"');
  });

  it("research: o formulário de briefing não pré-preenche tecido/preço de exemplo", () => {
    const fonte = ler("src/routes/_authenticated.research.tsx");
    expect(fonte).not.toContain('"Meia Malha Pima 170 g/m²"');
    expect(fonte).not.toContain('targetPriceBrl: "189.90"');
    expect(fonte).not.toContain("|| 179.9");
    expect(fonte).not.toContain("|| 165");
    expect(fonte).toContain('data-testid="briefing-so-vitrine"');
  });

  it("as superfícies DEV000006 seguem declaradas como demonstração", () => {
    // tech-sheet: estado vazio declara a ficha de demonstração
    expect(ler("src/routes/_authenticated.tech-sheet.tsx")).toContain(
      "ficha de demonstração DEV000006",
    );
    // dashboard: DPP do herói com selo de proveniência
    const dash = ler("src/routes/_authenticated.dashboard.tsx");
    expect(dash).toContain('source="demonstracao"');
    expect(dash).toContain('detail="DEV000006"');
    // cad: selo "Demonstração · não apurado"
    expect(ler("src/routes/_authenticated.cad.tsx")).toContain("Demonstração · não apurado");
    // looks: filtra o DEV000006 da sugestão
    expect(ler("src/routes/_authenticated.looks.tsx")).toContain('(c) => c !== "DEV000006"');
  });

  it("os seeds de demonstração seguem marcados com demo: true", () => {
    expect(ler("src/lib/cad/store.ts")).toContain("demo: true");
    expect(ler("src/lib/prototypes/store.ts")).toContain("demo: true");
    expect(ler("src/lib/techsheet/outsourcing-os.ts")).toContain("demo: true");
    expect(ler("src/lib/techsheet/research-gtm.ts")).toContain("demo: true");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
