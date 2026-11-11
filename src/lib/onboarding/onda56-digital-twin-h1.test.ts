// Onda 56 — 46ª/47ª medições. Depois de validar a publicação da Onda 55 com
// cliques reais (0 campos sem nome nas 4 abas do drawer CAPA), a varredura de
// risco mediu os **títulos de página** das 43 rotas:
//
//   42 rotas com <h1> · **1 rota sem <h1>: `/digital-twin`**
//
// Medido com espera fixa de 2,5 s (sem `wait_for_selector`): `h1 = 0`,
// `h2 = 1`, body ~1.034 caracteres, só `data-testid="gemeo-sem-ficha"` e
// nenhum `pageerror`. Ou seja, **não era timeout do crawler** — era a rota que,
// sem ficha salva, devolvia apenas um `<Card>` com `<h2>`, sem o `<header>`
// com `<h1>` que o caminho normal renderiza. Registrado como "artefato do
// crawler" desde a Onda 31; a 46ª medição corrigiu o diagnóstico.
//
// Correção: mesmo cabeçalho do caminho normal no estado de vitrine, KPIs em
// `—`, `CtaProximoPasso` e o Link `/tech-sheet` original preservado (com
// data-testid). Nenhuma simulação, store, emissor ou guarda anterior mudou.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const ROTA = "src/routes/_authenticated.digital-twin.tsx";

describe("Onda 56 — /digital-twin tem título também sem ficha salva", () => {
  it("o estado de vitrine agora renderiza <h1>", () => {
    const fonte = ler(ROTA);
    const bloco = fonte.slice(
      fonte.indexOf("if (!doc || !sim)"),
      fonte.indexOf(
        'return (\n    <div className="space-y-5 pb-8">',
        fonte.indexOf("if (!doc || !sim)") + 20,
      ),
    );
    expect(bloco).toContain("<h1");
    expect(bloco).toContain("Gêmeo Digital & Simulador What-If");
    expect(bloco).toContain('data-testid="gemeo-sem-ficha"');
  });

  it("o caminho normal continua com o seu <h1>", () => {
    const fonte = ler(ROTA);
    expect((fonte.match(/<h1/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(fonte).toContain('aria-label="Selecionar Ficha Técnica do Gêmeo Digital"');
    expect(fonte).toContain("simulateDigitalTwinScenario(");
  });

  it("ausência virou travessão, não zero apurado", () => {
    const fonte = ler(ROTA);
    expect(fonte).toContain("Simulação What-If");
    expect(fonte).toContain("Tiragem planejada");
    expect(
      (fonte.match(/<strong className="text-foreground">—<\/strong>/g) ?? []).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("há duas saídas clicáveis, sem regredir o Link original", () => {
    const fonte = ler(ROTA);
    expect(fonte).toContain('data-testid="cta-gemeo-abrir-ficha"');
    expect(fonte).toContain('testId="cta-gemeo-sem-ficha"');
    expect(fonte).toContain('to="/tech-sheet"');
    expect(fonte).toContain('passo="ficha"');
    expect(fonte).toContain("CtaProximoPasso");
  });

  it("a guarda da Onda 31 (sem ensure / sem seed) permanece", () => {
    const fonte = ler(ROTA);
    expect(fonte).toContain("useOperationalRefs()");
    expect(fonte).toContain("useSelectedRef(refOptions)");
    // `ensure()` só sobrevive em comentário histórico da Onda 31; nenhuma
    // chamada executável pode voltar a materializar o modelo no render.
    const linhasEnsure = fonte.split("\n").filter((l) => l.includes("ensure("));
    expect(linhasEnsure.length).toBeGreaterThan(0);
    for (const linha of linhasEnsure) {
      expect(linha.trim().startsWith("//") || linha.trim().startsWith("*"), linha).toBe(true);
    }
    // O código da vitrine também só sobrevive em comentário: nenhum literal
    // executável de `DEV000006` pode voltar a plantar a referência de fábrica.
    const linhasDev = fonte.split("\n").filter((l) => l.includes("DEV000006"));
    expect(linhasDev.length).toBeGreaterThan(0);
    for (const linha of linhasDev) expect(linha.trim().startsWith("//"), linha).toBe(true);
  });

  it("as guardas das Ondas 47 a 55 permanecem intactas", () => {
    expect(ler("src/components/sales/CostQueueNominalPanel.tsx")).toContain(
      'data-testid="ficha-cega-bloqueada"',
    );
    expect(ler("src/routes/_authenticated.marketing.tsx")).toContain(
      'data-testid="media-kit-bloqueado"',
    );
    expect(ler("src/components/inventory/MrpNetExplosionPanel.tsx")).toContain(
      'data-testid="mrp-sem-apuracao"',
    );
    expect(ler("src/routes/_authenticated.collections.tsx")).toContain(
      'data-testid="colecoes-so-vitrine"',
    );
    expect(ler("src/components/collections/CollectionROI.tsx")).toContain(
      'data-testid="roi-sem-lote"',
    );
    expect(ler("src/routes/_authenticated.production.tsx")).toContain(
      'data-testid="producao-sem-op"',
    );
    expect(ler("src/components/quality/CapaDrawer.tsx")).toContain(
      'aria-label="Causa-raiz da CAPA"',
    );
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
