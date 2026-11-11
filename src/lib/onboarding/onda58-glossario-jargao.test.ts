// Onda 58 — 50ª/51ª medições. Depois de validar a publicação da Onda 57 com
// cliques reais (passo 8 do PCP com CTA → `/orders`, texto antigo ausente e
// `Liberar p/ PCP` → toast), a varredura de risco mediu **jargão técnico no
// texto visível das 44 rotas**:
//
//   41 rotas com siglas · só 5 com `GlossarioTermos` (Onda 47: audit,
//   dashboard, orders, route-engineering, suppliers).
//
// Refinamento: `CAD` e `PCP` aparecem em TODAS as rotas por causa da sidebar
// ("CAD & Modelagem", "PCP · PRODUÇÃO") — piso falso de 2 por tela. Descontado
// isso, **20 rotas têm jargão real de conteúdo e nenhuma tinha glossário**.
// Mais densas: financial 21 (OTB/DRE/BOM/BOP), analytics 21 (ROI/ROAS/S&OP),
// security 14 (LGPD), launch 13 (NCM/GTIN/EAN/ABNT), marketing 13 (ROAS),
// development 12 (SAM/PV), commercial 12 (CFOP/XML/NCM/POM), quality 11
// (AQL/CAPA), collections 11 (ROI), planner 10 (CRP/EDD).
//
// Seis siglas frequentes nem existiam no dicionário de 33 termos: BOP, PV,
// GTM, CRP, EDD, LEC. Correção: +6 termos (39, sem duplicatas) e
// `GlossarioTermos` com `siglas` medidas por tela + `testId` próprio nas 11
// rotas mais densas (10 + `inventory`, onde `LEC` aparece). Nenhuma asserção antiga relaxada (20/20 testes do
// glossário seguem verdes).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TERMOS,
  TERMOS_PRIMEIRA_DOBRA,
  explicacaoDe,
  termosPorSigla,
} from "@/lib/onboarding/glossario";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const ROTAS: ReadonlyArray<[string, readonly string[]]> = [
  ["financial", ["OTB", "DRE", "BOM", "BOP", "EBITDA", "PV"]],
  ["analytics", ["ROI", "ROAS", "S&OP", "GTM", "CRP", "MRP"]],
  ["security", ["LGPD", "CFOP", "BOM", "AQL", "ABNT"]],
  ["launch", ["NCM", "GTIN", "EAN", "ABNT", "BOM", "BOP"]],
  ["marketing", ["ROAS", "ESG", "GTM", "DPP", "SKU"]],
  ["development", ["SAM", "PV", "BOM", "BOP"]],
  ["commercial", ["CFOP", "XML", "NCM", "POM", "GTM"]],
  ["quality", ["AQL", "CAPA", "PCP"]],
  ["planner", ["CRP", "EDD", "AQL", "Kanban"]],
  ["collections", ["ROI", "ROAS", "PCP"]],
  ["inventory", ["MRP", "LEC", "BOM"]],
];

describe("Onda 58 — glossário onde há jargão", () => {
  it("o dicionário passou de 33 para 39 termos, sem duplicatas", () => {
    expect(TERMOS).toHaveLength(39);
    const siglas = TERMOS.map((t) => t.sigla.toLowerCase());
    expect(new Set(siglas).size).toBe(39);
    for (const novo of ["BOP", "PV", "GTM", "CRP", "EDD", "LEC"]) {
      expect(explicacaoDe(novo), novo).not.toBeNull();
    }
  });

  it("os 6 termos novos têm explicação em português simples", () => {
    const novos = termosPorSigla(["BOP", "PV", "GTM", "CRP", "EDD", "LEC"]);
    expect(novos).toHaveLength(6);
    for (const t of novos) {
      expect(t.explicacao.length).toBeGreaterThan(30);
      expect(t.nome.length).toBeGreaterThan(5);
    }
  });

  it("as 11 rotas medidas ganharam GlossarioTermos com testId próprio", () => {
    for (const [rota] of ROTAS) {
      const fonte = ler(`src/routes/_authenticated.${rota}.tsx`);
      expect(fonte, rota).toContain("<GlossarioTermos");
      expect(fonte, rota).toContain(`testId="glossario-${rota}"`);
      expect(fonte, rota).toContain("GlossarioTermos } from");
    }
    expect(ROTAS).toHaveLength(11);
  });

  it("cada tela pede as siglas que foram medidas nela", () => {
    for (const [rota, esperadas] of ROTAS) {
      const fonte = ler(`src/routes/_authenticated.${rota}.tsx`);
      for (const sigla of esperadas.slice(0, 3)) {
        expect(fonte, `${rota} :: ${sigla}`).toContain(`"${sigla}"`);
      }
    }
  });

  it("as 5 rotas da Onda 47 e os helpers permanecem", () => {
    for (const r of ["audit", "dashboard", "orders", "route-engineering", "suppliers"]) {
      expect(ler(`src/routes/_authenticated.${r}.tsx`), r).toContain("<GlossarioTermos");
    }
    expect(TERMOS_PRIMEIRA_DOBRA.length).toBeGreaterThan(10);
    expect(termosPorSigla(["MRP", "AQL", "OTIF"])).toHaveLength(3);
    expect(explicacaoDe("sigla-que-nao-existe")).toBeNull();
  });

  it("as guardas das Ondas 47 a 57 permanecem intactas", () => {
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
    expect(ler("src/components/quality/CapaDrawer.tsx")).toContain(
      'aria-label="Causa-raiz da CAPA"',
    );
    expect(ler("src/routes/_authenticated.digital-twin.tsx")).toContain(
      'data-testid="gemeo-sem-ficha"',
    );
    expect(ler("src/components/pcp/PCPFlowDiagram.tsx")).toContain(
      'testId="cta-lancar-pedido-pcp"',
    );
    expect(ler("src/lib/pcp/store.ts")).not.toContain("criarLote(args:");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
