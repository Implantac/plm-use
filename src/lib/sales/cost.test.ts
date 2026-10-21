// Motor de custo do pedido: contrato com o SQL de recalc_sales_order_item().
// O caso "camisa futebol" é o mesmo exemplo do parecer (10 peças = R$ 68,44/pç
// e R$ 97,77 de preço com 30% de margem) — se o cálculo mudar, este teste é o
// primeiro a acusar.
import { describe, expect, it } from "vitest";
import {
  belowMinMargin,
  computeItemCost,
  driverQuantity,
  marginPct,
  materialLineTotal,
  operationLineTotal,
  priceForMargin,
  priceForMarkup,
  round2,
} from "./cost";

const camisaMateriais = [
  { consumption: 1.35, wastePct: 5, unitCost: 18 },
  { consumption: 0.08, wastePct: 3, unitCost: 32 },
  { consumption: 1, wastePct: 0, unitCost: 0.9 },
  { consumption: 1, wastePct: 0, unitCost: 3.2 },
  { consumption: 1, wastePct: 0, unitCost: 1.6 },
];

const camisaOperacoes = [
  { driverQty: 10, unitCost: 2.4, setupCost: 0 },
  { driverQty: 220, unitCost: 0.55, setupCost: 0 },
  { driverQty: 65, unitCost: 0.11, setupCost: 38 },
  { driverQty: 1, unitCost: 0, setupCost: 45 },
  { driverQty: 10, unitCost: 2, setupCost: 0 },
  { driverQty: 10, unitCost: 2.8, setupCost: 0 },
  { driverQty: 10, unitCost: 1.2, setupCost: 0 },
];

describe("quantidade de driver", () => {
  it("peça multiplica quantidade pelo fator da opção", () => {
    expect(driverQuantity("peca", 10)).toBe(10);
    expect(driverQuantity("peca", 10, 2)).toBe(20); // 2 bordados por peça
  });
  it("lote é sempre 1 (custo fixo do pedido)", () => {
    expect(driverQuantity("lote", 10, 5)).toBe(1);
  });
  it("driver técnico usa a spec da opção x quantidade", () => {
    expect(driverQuantity("mil_pontos", 10, 1, 6.5)).toBe(65);
    expect(driverQuantity("m2", 100, 1, 1.8)).toBe(180);
  });
  it("spec ausente cai no fator da opção", () => {
    expect(driverQuantity("mil_pontos", 10, 2)).toBe(20);
  });
});

describe("linhas de material e operação", () => {
  it("material aplica perda", () => {
    expect(materialLineTotal({ consumption: 1.35, wastePct: 5, unitCost: 18 })).toBe(25.52);
    expect(materialLineTotal({ consumption: 10, wastePct: 0, unitCost: 2 })).toBe(20);
  });
  it("operação separa variável de setup", () => {
    expect(operationLineTotal({ driverQty: 65, unitCost: 0.11, setupCost: 38 })).toEqual({
      variable: 7.15,
      setup: 38,
      total: 45.15,
    });
    expect(operationLineTotal({ driverQty: 0, unitCost: 9, setupCost: 12 }).total).toBe(12);
  });
});

describe("custo do item — camisa futebol (10 peças)", () => {
  const totals = computeItemCost({
    quantity: 10,
    overheadPct: 8,
    materials: camisaMateriais,
    operations: camisaOperacoes,
  });

  it("soma materiais com perda", () => {
    expect(totals.materialsTotal).toBe(338.52);
  });
  it("separa operações variáveis do setup do pedido", () => {
    expect(totals.operationsTotal).toBe(212.15);
    expect(totals.setupTotal).toBe(83);
  });
  it("fecha o custo industrial com overhead", () => {
    expect(totals.directTotal).toBe(633.67);
    expect(totals.overhead).toBe(50.69);
    expect(totals.industrialCost).toBe(684.36);
  });
  it("amortiza na quantidade: R$ 68,44 por peça", () => {
    expect(totals.unitCost).toBe(68.44);
  });
  it("preço de venda com 30% de margem = R$ 97,77", () => {
    expect(priceForMargin(totals.unitCost, 30)).toBe(97.77);
    expect(marginPct(97.77, totals.unitCost)).toBe(30);
  });
});

describe("amortização do setup muda o preço", () => {
  const pequeno = computeItemCost({
    quantity: 10,
    overheadPct: 8,
    materials: camisaMateriais,
    operations: camisaOperacoes,
  });
  const grande = computeItemCost({
    quantity: 100,
    overheadPct: 8,
    materials: camisaMateriais.map((m) => ({ ...m })),
    operations: camisaOperacoes.map((o) => ({ ...o, driverQty: o.driverQty * 10 })),
  });

  it("custo/peça cai quando a quantidade sobe", () => {
    expect(grande.unitCost).toBeLessThan(pequeno.unitCost);
    expect(grande.unitCost).toBe(60.37);
  });
  it("ignorar o setup subprecifica o pedido pequeno em ~13%", () => {
    const semSetup = round2(pequeno.directTotal - pequeno.setupTotal);
    const unitSemSetup = round2((semSetup * 1.08) / 10);
    const precoErrado = priceForMargin(unitSemSetup, 30);
    const precoCerto = priceForMargin(pequeno.unitCost, 30);
    expect(unitSemSetup).toBe(59.47);
    expect(precoErrado).toBe(84.96);
    expect(precoCerto).toBe(97.77);
    const descontoPct = ((precoCerto - precoErrado) / precoCerto) * 100;
    expect(descontoPct).toBeGreaterThan(13);
    expect(descontoPct).toBeLessThan(14);
  });
});

describe("guardas de margem", () => {
  it("sem preço, margem é null (não 0%)", () => {
    expect(marginPct(0, 50)).toBeNull();
    expect(belowMinMargin(null, 25)).toBe(true);
  });
  it("margem abaixo do mínimo exige gestor", () => {
    expect(belowMinMargin(19.4, 25)).toBe(true);
    expect(belowMinMargin(30, 25)).toBe(false);
  });
  it("markup é fallback do preço sugerido", () => {
    expect(priceForMarkup(68.44, 40)).toBe(95.82);
  });
  it("quantidade zero não divide por zero", () => {
    const t = computeItemCost({ quantity: 0, overheadPct: 8, materials: [], operations: [] });
    expect(t.unitCost).toBe(0);
  });
});
