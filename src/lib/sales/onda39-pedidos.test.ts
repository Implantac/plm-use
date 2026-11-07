// Onda 39 — pedido de demonstração não entra no número.
//
// Medição executada ANTES da correção:
//   INITIAL_PRIVATE_LABEL_ORDERS = 2 pedidos (PD-2026-801/802), CNPJ
//   14.890.300/0001-22, preços R$ 69,90 / 89,50.
//   computeLiveSopSnapshot(...) -> { receita: 9867.2, margem: 50.79, pecas: 112 }
//   runDeterministicAgentAnalysis(...) -> "Alerta Crítico de Margem ...
//     PD-2026-801 ... preço mínimo recomendado: R$ 90.62"
//
// Eram R$ de papel na carteira B2B, no Book Executivo S&OP A4, no MRP, na
// capacidade finita e no copiloto — o mesmo padrão da Onda 38, agora em pedidos.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { campanhasSalvas } from "@/test/campanhas-salvas";
import { pedidosSalvos } from "@/test/pedidos-salvos";
import { servicosSalvos } from "@/test/chao-de-fabrica-salvo";
import { computeLiveSopSnapshot, buildExecutiveSopReportHtml } from "@/lib/analytics/live-sop";
import { computeMrpNetExplosion } from "@/lib/inventory/mrp-explosion";
import { runDeterministicAgentAnalysis } from "@/lib/ai/deterministic-copilot";
import { seedFor } from "@/lib/techsheet/store";
import {
  INITIAL_PRIVATE_LABEL_ORDERS,
  PEDIDO_DEMO_LABEL,
  pedidosOperacionais,
  usePrivateLabelQueueStore,
  type PrivateLabelOrder,
} from "./private-label-queue";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

const snapVitrine = () =>
  computeLiveSopSnapshot({
    orders: INITIAL_PRIVATE_LABEL_ORDERS,
    campaigns: [],
    serviceOrders: [],
  });

beforeEach(() => {
  usePrivateLabelQueueStore.setState({ orders: INITIAL_PRIVATE_LABEL_ORDERS });
});

describe("Onda 39 — os pedidos de fábrica são vitrine, não carteira", () => {
  it("os 2 pedidos iniciais estão marcados e continuam visíveis", () => {
    expect(INITIAL_PRIVATE_LABEL_ORDERS).toHaveLength(2);
    expect(INITIAL_PRIVATE_LABEL_ORDERS.every((o) => o.demo === true)).toBe(true);
    expect(INITIAL_PRIVATE_LABEL_ORDERS[0]?.customerCnpj).toBe("14.890.300/0001-22");
    expect(INITIAL_PRIVATE_LABEL_ORDERS.map((o) => o.unitSellingPriceBrl)).toEqual([69.9, 89.5]);
    expect(PEDIDO_DEMO_LABEL).toContain("não entra em número operacional");
  });

  it("pedidosOperacionais separa vitrine de carteira", () => {
    expect(pedidosOperacionais(INITIAL_PRIVATE_LABEL_ORDERS)).toEqual([]);
    const mistura: PrivateLabelOrder[] = [
      ...INITIAL_PRIVATE_LABEL_ORDERS,
      { ...pedidosSalvos()[0]!, id: "meu-1", orderNumber: "PD-MEU-1" },
    ];
    expect(pedidosOperacionais(mistura).map((o) => o.id)).toEqual(["meu-1"]);
  });

  it("o S&OP não soma receita, margem nem peças de papel", () => {
    const snap = snapVitrine();
    expect(snap.b2bOrderRevenueBrl).toBe(0);
    expect(snap.b2bWeightedMarginPct).toBe(0);
    expect(snap.totalActivePiecesB2b).toBe(0);
    expect(snap.apuravelB2b).toBe(false);
    expect(snap.apuravelGtm).toBe(false);
  });

  it("o Book Executivo A4 declara '—' em vez de imprimir zeros", () => {
    const html = buildExecutiveSopReportHtml(snapVitrine());
    expect(html).toContain("Book S&OP parcialmente não apurável");
    expect(html).toContain('<div class="val">—</div>');
    expect(html).not.toContain("9.867,20");
    expect(html).not.toContain("112 peças");
    expect(html).not.toContain("R$ 0,00");
  });

  it("MRP não transforma pedido de papel em necessidade de compra", () => {
    const mrp = computeMrpNetExplosion({
      orders: INITIAL_PRIVATE_LABEL_ORDERS,
      sheets: { DEV000006: seedFor("DEV000006") },
    });
    expect(mrp.rows).toEqual([]);
    expect(mrp.totalPurchaseBudgetBrl).toBe(0);
    expect(mrp.pedidosSemFicha).toEqual([]);
  });

  it("copiloto não emite alerta de margem nem preço mínimo sobre pedido de papel", () => {
    const r = runDeterministicAgentAnalysis({
      agent: "engenharia",
      question: "Margem",
      sheets: {},
      privateLabelOrders: INITIAL_PRIVATE_LABEL_ORDERS,
      lotesSummary: [],
      drops: [],
    });
    expect(r).toContain("Sem pedidos B2B salvos: margem industrial não apurável");
    expect(r).not.toContain("PD-2026-801");
    expect(r).not.toContain("Alerta Crítico de Margem");
    expect(r).not.toContain("90.62");
    // A frase antiga era falsa quando não havia pedido nenhum.
    expect(r).not.toContain("Todos os pedidos da Fila Private Label atingem");
  });
});

describe("Onda 39 — com carteira real tudo continua apurando", () => {
  it("S&OP e A4 mantêm os números originais (sem afrouxar)", () => {
    const snap = computeLiveSopSnapshot({
      orders: pedidosSalvos(),
      campaigns: campanhasSalvas(),
      serviceOrders: servicosSalvos(),
    });
    expect(snap.b2bOrderRevenueBrl).toBeGreaterThan(9000);
    expect(snap.b2bWeightedMarginPct).toBeGreaterThan(40);
    expect(snap.totalActivePiecesB2b).toBe(112);
    expect(snap.apuravelB2b).toBe(true);
    expect(snap.apuravelGtm).toBe(true);
    const html = buildExecutiveSopReportHtml(snap);
    expect(html).toContain("9.867,20");
    expect(html).toContain("112 peças");
    expect(html).not.toContain("não apurável");
  });

  it("copiloto mantém o alerta de margem com pedido salvo", () => {
    const r = runDeterministicAgentAnalysis({
      agent: "engenharia",
      question: "Margem",
      sheets: {},
      privateLabelOrders: pedidosSalvos(),
      lotesSummary: [],
      drops: [],
    });
    expect(r).toContain("PD-2026-801");
    expect(r).toContain("Alerta Crítico de Margem");
  });
});

describe("Onda 39 — editar um pedido promove a vitrine a carteira real", () => {
  it("updateOrderPricing remove o selo demo", () => {
    usePrivateLabelQueueStore.getState().updateOrderPricing("pl-1", 79.9);
    const o = usePrivateLabelQueueStore.getState().orders.find((x) => x.id === "pl-1");
    expect(o?.demo).toBe(false);
    expect(pedidosOperacionais(usePrivateLabelQueueStore.getState().orders)).toHaveLength(1);
  });

  it("cloneOrder gera pedido operacional", () => {
    const c = usePrivateLabelQueueStore.getState().cloneOrder("pl-1");
    expect(c?.demo).toBe(false);
  });

  it("setOrderStatus, updateOperationFields e roster também promovem", () => {
    const st = () => usePrivateLabelQueueStore.getState();
    st().setOrderStatus("pl-1", "Custo Aprovado");
    expect(st().orders.find((o) => o.id === "pl-1")?.demo).toBe(false);
    usePrivateLabelQueueStore.setState({ orders: INITIAL_PRIVATE_LABEL_ORDERS });
    st().updateOperationFields("pl-1", st().orders[0]!.operations[0]!.id, { unitCost: 2 });
    expect(st().orders.find((o) => o.id === "pl-1")?.demo).toBe(false);
    usePrivateLabelQueueStore.setState({ orders: INITIAL_PRIVATE_LABEL_ORDERS });
    st().setNominalRosterAndSyncGrade("pl-1", st().orders[0]!.nominalRoster);
    expect(st().orders.find((o) => o.id === "pl-1")?.demo).toBe(false);
  });
});

describe("Onda 39 — guardas de fonte", () => {
  it("todos os consumidores filtram ou declaram a vitrine", () => {
    for (const rel of [
      "src/lib/analytics/live-sop.ts",
      "src/lib/inventory/mrp-explosion.ts",
      "src/lib/ai/deterministic-copilot.ts",
      "src/routes/_authenticated.ai-agents.tsx",
      "src/components/analytics/LiveSopBoard.tsx",
      "src/components/inventory/MrpNetExplosionPanel.tsx",
      "src/components/pcp/FiniteCapacityPanel.tsx",
    ]) {
      expect(codigo(ler(rel)), rel).toContain("pedidosOperacionais");
    }
    expect(codigo(ler("src/components/analytics/LiveSopBoard.tsx"))).toContain("sop-sem-pedidos");
    expect(codigo(ler("src/components/sales/CostQueueNominalPanel.tsx"))).toContain("Demonstração");
  });
});
