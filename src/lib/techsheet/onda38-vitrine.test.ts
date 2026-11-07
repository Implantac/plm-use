// Onda 38 — a vitrine declara, o número não soma demonstração.
//
// Medição executada ANTES da correção, no repo e no bundle publicado
// (index-DDU6Ug_A.js): a rota de AI Agents montava
//   { "V24-001": seedFor("V24-001"), DEV000006: seedFor("DEV000006") }
// quando o store estava vazio, e o copiloto respondia
//   "2 fichas ativas · SAM médio 13.5 min/peça"
//   "2 referências técnicas mapeadas: V24-001, DEV000006 (Camiseta Esportiva Dry Pro)"
//
// Ao mesmo tempo, `INITIAL_GTM_CAMPAIGNS` (3 drops de fábrica, com
// attributedSalesBrl 218_400 e mediaSpendBrl 42_000) alimentava
// `computeGtmPortfolioSummary`, o Book Executivo S&OP A4, a tela de Marketing
// e o ROAS do copiloto. Eram R$ de papel em número operacional.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { campanhasSalvas } from "@/test/campanhas-salvas";
import { computeLiveSopSnapshot } from "@/lib/analytics/live-sop";
import { INITIAL_PRIVATE_LABEL_ORDERS } from "@/lib/sales/private-label-queue";
import { runDeterministicAgentAnalysis } from "@/lib/ai/deterministic-copilot";
import { computeGtmPortfolioSummary } from "./research-gtm";
import {
  campanhasOperacionais,
  GTM_DEMO_LABEL,
  INITIAL_GTM_CAMPAIGNS,
  type GtmDropCampaign,
} from "./research-gtm";
import { seedFor } from "./store";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

const base = {
  privateLabelOrders: [],
  lotesSummary: [],
  question: "Margem",
};

describe("Onda 38 — as campanhas de fábrica são vitrine, não portfólio", () => {
  it("as 3 campanhas iniciais estão marcadas e continuam visíveis", () => {
    expect(INITIAL_GTM_CAMPAIGNS).toHaveLength(3);
    expect(INITIAL_GTM_CAMPAIGNS.every((c) => c.demo === true)).toBe(true);
    expect(INITIAL_GTM_CAMPAIGNS[0]?.attributedSalesBrl).toBe(218_400);
    expect(GTM_DEMO_LABEL).toContain("não entra em número operacional");
  });

  it("o resumo do portfólio NÃO soma a vitrine", () => {
    const resumo = computeGtmPortfolioSummary(INITIAL_GTM_CAMPAIGNS);
    expect(resumo.totalCampaigns).toBe(0);
    expect(resumo.totalMediaSpendBrl).toBe(0);
    expect(resumo.totalSalesBrl).toBe(0);
    expect(resumo.blendedRoas).toBe(0);
    expect(resumo.transparentReadyCount).toBe(0);
  });

  it("campanhas salvas pela empresa continuam apurando (sem afrouxar)", () => {
    const resumo = computeGtmPortfolioSummary(campanhasSalvas());
    expect(resumo.totalCampaigns).toBe(3);
    expect(resumo.blendedRoas).toBeGreaterThan(4);
    expect(resumo.netFullRoas).toBeLessThan(resumo.blendedRoas);
  });

  it("mistura: só as não-demo entram", () => {
    const mistura: GtmDropCampaign[] = [
      ...INITIAL_GTM_CAMPAIGNS,
      { ...campanhasSalvas()[0]!, id: "minha-1", name: "Drop da empresa" },
    ];
    expect(campanhasOperacionais(mistura).map((c) => c.id)).toEqual(["minha-1"]);
    expect(computeGtmPortfolioSummary(mistura).totalCampaigns).toBe(1);
  });

  it("o S&OP A4 não herda o ROAS e a receita de papel", () => {
    const snap = computeLiveSopSnapshot({
      orders: INITIAL_PRIVATE_LABEL_ORDERS,
      campaigns: INITIAL_GTM_CAMPAIGNS,
      serviceOrders: [],
    });
    expect(snap.gtmAttributedSalesBrl).toBe(0);
    expect(snap.gtmBlendedRoas).toBe(0);
  });
});

describe("Onda 38 — o copiloto declara ausência em vez de imprimir zero", () => {
  it("engenharia sem ficha: SAM é '—', não '0.0 min/peça'", () => {
    const r = runDeterministicAgentAnalysis({
      ...base,
      agent: "engenharia",
      sheets: {},
      drops: INITIAL_GTM_CAMPAIGNS,
    });
    expect(r).toContain("sem ficha salva · SAM médio —");
    expect(r).not.toContain("0.0 min/peça");
    expect(r).not.toContain("fichas ativas");
  });

  it("criação sem ficha: não lista o modelo nem cai no 'catálogo base'", () => {
    const r = runDeterministicAgentAnalysis({
      ...base,
      agent: "fashion",
      sheets: {},
      drops: INITIAL_GTM_CAMPAIGNS,
    });
    expect(r).toContain("nenhuma referência técnica mapeada");
    expect(r).not.toContain("catálogo base");
    expect(r).not.toContain("DEV000006");
  });

  it("marketing com só vitrine: ROAS não apurável, sem 'Drop 02'", () => {
    const r = runDeterministicAgentAnalysis({
      ...base,
      agent: "marketing",
      sheets: {},
      drops: INITIAL_GTM_CAMPAIGNS,
    });
    expect(r).toContain("sem drops salvos · ROAS não apurável");
    expect(r).not.toContain("Drop 02");
    expect(r).not.toContain("5.62x");
    expect(r).toContain("Cadastre ao menos 1 Drop");
  });

  it("com ficha salva e Drop salvo, a apuração continua real", () => {
    const r = runDeterministicAgentAnalysis({
      ...base,
      agent: "engenharia",
      sheets: { "MINHA-001": seedFor("MINHA-001") },
      drops: campanhasSalvas(),
    });
    expect(r).toContain("1 fichas ativas · SAM médio");
    expect(r).toContain("min/peça");
  });
});

describe("Onda 38 — guardas de fonte", () => {
  it("a rota de AI Agents não semeia mais o modelo", () => {
    const s = codigo(ler("src/routes/_authenticated.ai-agents.tsx"));
    expect(s).not.toContain("seedFor(");
    expect(s).toContain("operationalCodes");
    expect(s).toContain("campanhasOperacionais");
    expect(s).toContain('value: temFichaSalva ? String(Object.keys(sheets).length) : "—"');
  });

  it("o copiloto filtra a vitrine e não tem mais o zero de papel", () => {
    const s = codigo(ler("src/lib/ai/deterministic-copilot.ts"));
    expect(s).toContain("campanhasOperacionais(input.drops)");
    expect(s).not.toContain('"0.0"');
  });

  it("marketing, S&OP e o resumo declaram a vitrine", () => {
    for (const rel of [
      "src/lib/techsheet/research-gtm.ts",
      "src/routes/_authenticated.marketing.tsx",
      "src/components/analytics/LiveSopBoard.tsx",
    ]) {
      expect(codigo(ler(rel)), rel).toContain("campanhasOperacionais");
    }
    expect(codigo(ler("src/routes/_authenticated.marketing.tsx"))).toContain("gtm-so-vitrine");
    expect(codigo(ler("src/components/analytics/LiveSopBoard.tsx"))).toContain("sop-sem-drops");
  });
});
