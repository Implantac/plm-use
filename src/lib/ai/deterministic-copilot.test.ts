import { describe, expect, it } from "vitest";
import { campanhasSalvas } from "@/test/campanhas-salvas";
import { pedidosSalvos } from "@/test/pedidos-salvos";
import { INITIAL_GTM_CAMPAIGNS } from "@/lib/techsheet/research-gtm";
import { seedFor } from "@/lib/techsheet/store";
import { runDeterministicAgentAnalysis } from "./deterministic-copilot";

describe("Copiloto Industrial Determinístico (USE AI Agents)", () => {
  const sheets = { "V24-001": seedFor("V24-001") };

  it("identifica pedidos abaixo da margem mínima e preço sugerido no agente Engenharia & Custos", () => {
    const reply = runDeterministicAgentAnalysis({
      agent: "engenharia",
      question: "Quais pedidos estão com margem comprimida pelo setup?",
      sheets,
      privateLabelOrders: pedidosSalvos(),
      lotesSummary: [],
      drops: campanhasSalvas(),
    });

    expect(reply).toContain("PD-2026-801");
    expect(reply).toContain("Alerta Crítico de Margem");
    expect(reply).toContain("R$");
  });

  it("sintetiza ROAS e melhor Drop ativo no agente Marketing AI", () => {
    const reply = runDeterministicAgentAnalysis({
      agent: "marketing",
      question: "Qual drop tem maior ROAS?",
      sheets,
      privateLabelOrders: pedidosSalvos(),
      lotesSummary: [],
      drops: campanhasSalvas(),
    });

    expect(reply).toContain("ROAS");
    expect(reply).toContain("Drop 02");
    expect(reply).toContain("5.62x");
  });
});
