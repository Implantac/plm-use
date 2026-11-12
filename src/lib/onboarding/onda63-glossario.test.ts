// Onda 63 — 57ª medição. Depois de validar a publicação da Onda 62 com
// cliques reais (4 rotas com os termos corretos no DOM, 0 `pageerror`), a
// varredura de risco mediu o jargão restante no texto visível das 24 rotas
// sem glossário:
//
//   12 rotas com siglas do glossário no texto visível e nenhuma tinha
//   `GlossarioTermos`: tech-sheet 9 (ABNT/BOM/BOP/CAD/MRP/NCM/OP/PV/SKU),
//   approvals 5, research 5, digital-twin 4, cad 2 e 7 rotas com 1 sigla
//   (catalog, flow, looks, measurements, prototypes, references, showroom).
//   As outras 12 rotas têm 0 siglas e não precisam de glossário.
//
//   3 siglas frequentes nem existiam no dicionário de 48 termos: B2B (15×),
//   RLS (5×), RBAC (2×) — todas medidas em texto visível (audit, security).
//
// Correção: +3 termos (51, sem duplicatas), `GlossarioTermos` com `siglas`
// medidas por tela + `testId` próprio nas 12 rotas, e B2B/RLS/RBAC somados
// aos arrays de audit e security (onde foram medidas). **32 rotas com
// glossário.** Nenhuma asserção antiga relaxada: os testes das Ondas 58 e
// 62 só tiveram a contagem 48 → 51 atualizada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TERMOS, explicacaoDe, termosPorSigla } from "@/lib/onboarding/glossario";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const NOVOS = ["B2B", "RLS", "RBAC"];

const ROTAS: ReadonlyArray<[string, readonly string[]]> = [
  ["tech-sheet", ["ABNT", "BOM", "BOP", "CAD", "MRP", "NCM", "OP", "PV", "SKU"]],
  ["approvals", ["ABNT", "BOM", "BOP", "CAD", "POM"]],
  ["research", ["ABNT", "CAD", "DPP", "ESG", "OTB"]],
  ["digital-twin", ["BOM", "BOP", "MRP", "PV"]],
  ["cad", ["BOM", "CAD"]],
  ["catalog", ["PCP"]],
  ["flow", ["PCP"]],
  ["looks", ["PV"]],
  ["measurements", ["POM"]],
  ["prototypes", ["POM"]],
  ["references", ["CAPA"]],
  ["showroom", ["CAPA"]],
];

describe("Onda 63 — glossário em todas as rotas com jargão", () => {
  it("o dicionário passou de 48 para 51 termos, sem duplicatas", () => {
    expect(TERMOS).toHaveLength(51);
    const siglas = TERMOS.map((t) => t.sigla.toLowerCase());
    expect(new Set(siglas).size).toBe(51);
    for (const novo of NOVOS) {
      expect(explicacaoDe(novo), novo).not.toBeNull();
    }
  });

  it("os 3 termos novos têm explicação em português simples", () => {
    const novos = termosPorSigla(NOVOS);
    expect(novos).toHaveLength(3);
    for (const t of novos) {
      expect(t.explicacao.length).toBeGreaterThan(30);
      expect(t.nome.length).toBeGreaterThan(5);
    }
  });

  it("as 12 rotas medidas ganharam GlossarioTermos com testId próprio", () => {
    for (const [rota] of ROTAS) {
      const fonte = ler(`src/routes/_authenticated.${rota}.tsx`);
      expect(fonte, rota).toContain("<GlossarioTermos");
      expect(fonte, rota).toContain(`testId="glossario-${rota}"`);
      expect(fonte, rota).toContain("GlossarioTermos } from");
    }
    expect(ROTAS).toHaveLength(12);
  });

  it("cada tela pede as siglas que foram medidas nela", () => {
    for (const [rota, esperadas] of ROTAS) {
      const fonte = ler(`src/routes/_authenticated.${rota}.tsx`);
      for (const sigla of esperadas) {
        expect(fonte, `${rota} :: ${sigla}`).toContain(`"${sigla}"`);
      }
    }
  });

  it("B2B/RLS/RBAC entraram nos arrays de audit e security, onde foram medidos", () => {
    const audit = ler("src/routes/_authenticated.audit.tsx");
    for (const s of ["B2B", "RLS", "RBAC"]) {
      expect(audit, `audit :: ${s}`).toContain(`"${s}"`);
    }
    const security = ler("src/routes/_authenticated.security.tsx");
    for (const s of ["RLS", "RBAC"]) {
      expect(security, `security :: ${s}`).toContain(`"${s}"`);
    }
  });

  it("32 rotas têm glossário; as 12 sem jargão não precisam", () => {
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
      "tech-sheet",
      "approvals",
      "research",
      "digital-twin",
      "cad",
      "catalog",
      "flow",
      "looks",
      "measurements",
      "prototypes",
      "references",
      "showroom",
    ];
    for (const r of comGlossario) {
      expect(ler(`src/routes/_authenticated.${r}.tsx`), r).toContain("<GlossarioTermos");
    }
    expect(comGlossario).toHaveLength(32);
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
