// Onda 62 — 56ª medição. Depois de validar a publicação da Onda 61 com
// cliques reais em produção (`/references` com o filtro "Filtrar por status"
// nomeado, entry `index-BOthbvNE.js` com os 6 marcadores da 61 em 2×), a
// varredura de risco mediu o jargão restante no texto visível das rotas:
//
//   9 siglas frequentes nem existiam no dicionário de 39 termos: OP (32×),
//   MOQ, TCO, UTM, CAC, CMV, ABC, OS, ERP — todas medidas em texto visível
//   (materials, supplier-portal, influencers, financial, audit, production).
//
// Correção: +9 termos (48, sem duplicatas) e `GlossarioTermos` com `siglas`
// medidas por tela + `testId` próprio nas 4 rotas que usavam os termos novos
// sem glossário (materials, supplier-portal, influencers, production).
// Nenhuma asserção antiga relaxada: o teste da Onda 58 só teve a contagem
// 39 → 48 atualizada, e os 20 testes do glossário seguem verdes.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TERMOS, explicacaoDe, termosPorSigla } from "@/lib/onboarding/glossario";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const NOVOS = ["OP", "MOQ", "TCO", "UTM", "CAC", "CMV", "ABC", "OS", "ERP"];

const ROTAS: ReadonlyArray<[string, readonly string[]]> = [
  ["materials", ["MOQ", "SKU"]],
  ["supplier-portal", ["MOQ", "TCO", "OP", "BOM", "OTIF", "RFQ"]],
  ["influencers", ["UTM", "CAC", "ROAS", "CFOP"]],
  ["production", ["OP", "PCP"]],
];

describe("Onda 62 — glossário cobre o jargão que a UI usa", () => {
  it("o dicionário passou de 39 para 48 termos, sem duplicatas", () => {
    // Onda 63: +3 termos (B2B, RLS, RBAC) → 51.
    expect(TERMOS).toHaveLength(51);
    const siglas = TERMOS.map((t) => t.sigla.toLowerCase());
    expect(new Set(siglas).size).toBe(51);
    for (const novo of NOVOS) {
      expect(explicacaoDe(novo), novo).not.toBeNull();
    }
  });

  it("os 9 termos novos têm explicação em português simples", () => {
    const novos = termosPorSigla(NOVOS);
    expect(novos).toHaveLength(9);
    for (const t of novos) {
      expect(t.explicacao.length).toBeGreaterThan(30);
      expect(t.nome.length).toBeGreaterThan(5);
    }
  });

  it("as 4 rotas medidas ganharam GlossarioTermos com testId próprio", () => {
    for (const [rota] of ROTAS) {
      const fonte = ler(`src/routes/_authenticated.${rota}.tsx`);
      expect(fonte, rota).toContain("<GlossarioTermos");
      expect(fonte, rota).toContain(`testId="glossario-${rota}"`);
      expect(fonte, rota).toContain("GlossarioTermos } from");
    }
    expect(ROTAS).toHaveLength(4);
  });

  it("cada tela pede as siglas que foram medidas nela", () => {
    for (const [rota, esperadas] of ROTAS) {
      const fonte = ler(`src/routes/_authenticated.${rota}.tsx`);
      for (const sigla of esperadas) {
        expect(fonte, `${rota} :: ${sigla}`).toContain(`"${sigla}"`);
      }
    }
  });

  it("as 20 rotas com glossário (16 da Onda 58 + 4 da 62) permanecem", () => {
    const comGlossario = [
      "analytics",
      "audit",
      "collections",
      "commercial",
      "dashboard",
      "development",
      "financial",
      "inventory",
      "launch",
      "marketing",
      "orders",
      "planner",
      "quality",
      "route-engineering",
      "security",
      "suppliers",
      "materials",
      "supplier-portal",
      "influencers",
      "production",
    ];
    for (const r of comGlossario) {
      expect(ler(`src/routes/_authenticated.${r}.tsx`), r).toContain("<GlossarioTermos");
    }
    expect(comGlossario).toHaveLength(20);
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
