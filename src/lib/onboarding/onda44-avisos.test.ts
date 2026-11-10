// Onda 44 — guardas de fonte. Os 9 avisos de vitrine das Ondas 38–42
// continuam com seus `data-testid` (nenhum teste antigo foi relaxado), mas
// agora cada um tem uma SAÍDA. Medição antes da correção: 0 de 9 avisos
// com botão de ação.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { computarPrimeirosPassos } from "./primeiros-passos";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const AVISOS: Array<{ rel: string; testId: string; ctaTestId: string }> = [
  {
    rel: "src/routes/_authenticated.suppliers.tsx",
    testId: "supplier-so-vitrine",
    ctaTestId: "cta-supplier-so-vitrine",
  },
  {
    rel: "src/routes/_authenticated.research.tsx",
    testId: "briefing-so-vitrine",
    ctaTestId: "cta-briefing-so-vitrine",
  },
  {
    rel: "src/routes/_authenticated.security.tsx",
    testId: "lgpd-so-vitrine",
    ctaTestId: "cta-lgpd-so-vitrine",
  },
  {
    rel: "src/routes/_authenticated.marketing.tsx",
    testId: "gtm-so-vitrine",
    ctaTestId: "cta-gtm-so-vitrine",
  },
  {
    rel: "src/components/suppliers/SupplierScoreboard.tsx",
    testId: "scoreboard-so-vitrine",
    ctaTestId: "cta-scoreboard-so-vitrine",
  },
  {
    rel: "src/routes/_authenticated.financial.tsx",
    testId: "dre-provenance",
    ctaTestId: "cta-dre-sem-ficha",
  },
  {
    rel: "src/components/analytics/LiveSopBoard.tsx",
    testId: "sop-sem-faccao",
    ctaTestId: "cta-sop-sem-faccao",
  },
  {
    rel: "src/components/analytics/LiveSopBoard.tsx",
    testId: "sop-sem-pedidos",
    ctaTestId: "cta-sop-sem-pedidos",
  },
  {
    rel: "src/components/analytics/LiveSopBoard.tsx",
    testId: "sop-sem-drops",
    ctaTestId: "cta-sop-sem-drops",
  },
];

describe("Onda 44 — todo aviso de vitrine tem saída", () => {
  it("os 9 data-testid originais das Ondas 38–42 foram preservados", () => {
    for (const { rel, testId } of AVISOS) {
      expect(ler(rel), `${rel} · ${testId}`).toContain(`data-testid="${testId}"`);
    }
  });

  it("os 9 CTAs estão presentes nos seus respectivos arquivos", () => {
    for (const { rel, ctaTestId } of AVISOS) {
      expect(ler(rel), `${rel} · ${ctaTestId}`).toContain(`testId="${ctaTestId}"`);
    }
  });

  it("os 7 arquivos importam o componente único", () => {
    const arquivos = [...new Set(AVISOS.map((a) => a.rel))];
    expect(arquivos).toHaveLength(7);
    for (const rel of arquivos) {
      expect(ler(rel), rel).toContain("@/components/onboarding/CtaProximoPasso");
    }
  });

  it("há exatamente 9 CTAs — nenhum aviso ficou sem saída, nenhum duplicado", () => {
    const total = [...new Set(AVISOS.map((a) => a.rel))].reduce(
      (n, rel) => n + (ler(rel).match(/<CtaProximoPasso/g) ?? []).length,
      0,
    );
    expect(total).toBe(9);
  });

  it("ações locais abrem diálogo/modal; os demais navegam", () => {
    const locais = [
      "src/routes/_authenticated.suppliers.tsx",
      "src/routes/_authenticated.research.tsx",
      "src/routes/_authenticated.security.tsx",
      "src/routes/_authenticated.marketing.tsx",
    ];
    for (const rel of locais) expect(ler(rel), rel).toContain("onAcao=");
    // LiveSopBoard não tem formulário local: usa o Link do passo.
    const sop = ler("src/components/analytics/LiveSopBoard.tsx");
    expect(sop).not.toContain("onAcao=");
    expect(sop).toContain('passo="pedido"');
    expect(sop).toContain('passo="fornecedor"');
    expect(sop).toContain('passo="campanha"');
  });
});

describe("Onda 44 — regressão da Onda 43", () => {
  it("o card continua com 4 passos e as mesmas rotas", () => {
    const e = computarPrimeirosPassos({ fichas: 0, pedidos: 0, fornecedores: 0, campanhas: 0 });
    expect(e.total).toBe(4);
    expect(e.passos.map((p) => p.rota)).toEqual([
      "/references",
      "/orders",
      "/suppliers",
      "/marketing",
    ]);
  });

  it("usePasso deriva do mesmo estado, sem contador paralelo", () => {
    const lib = ler("src/lib/onboarding/primeiros-passos.ts");
    expect(lib).toContain("export function usePasso(id: PassoId): Passo");
    expect(lib).toContain("estado.passos.find((p) => p.id === id)");
    expect(lib).not.toContain("localStorage");
    const cta = ler("src/components/onboarding/CtaProximoPasso.tsx");
    expect(cta).toContain("if (p.concluido) return null");
    expect(cta).not.toContain("localStorage");
  });
});
