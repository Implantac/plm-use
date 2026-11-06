// Onda 34 — o molde de demonstração sai da engenharia.
//
// Até a Onda 33 o veto existia nos *documentos*, mas `seedFor()` continuava
// entregando composição (Poliéster 96% / Elastano 4%) e encaixe CAD (88,3%,
// 1,8 m, arquivo do DEV000006) dentro de toda ficha nova. Os `?? default*()`
// e os `|| 1.8` / `|| 5.35` / `|| 155` reconstruíam os números do modelo
// quando o campo estava vazio. Estes testes provam que a ficha agora nasce
// vazia e que **só engenharia declarada** produz plano, gate e passaporte.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fichaDeclarada } from "@/test/ficha-declarada";
import { evaluateOmnichannelReadiness } from "../launch/omnichannel-readiness";
import {
  buildCutOrderPrintableHtml,
  computeLayAndCutPlan,
  evaluateTechSheetGateReadiness,
} from "./cut-order";
import {
  computeDigitalProductPassport,
  dppRequirements,
  resolveReferenceTechSheet,
} from "./dpp-expedition";
import { buildCutOrderPrintHtml, computeMrpCutPlan } from "./mrp";
import { emptyCadMarkerSpec, emptyCareLabelSpec, seedFor } from "./store";

const params = {
  markerRatio: { P: 1, M: 2, G: 2, GG: 1 },
  totalPlies: 140,
  maxPliesPerSpread: 60,
  endLossCm: 4,
  colorName: "Verde Brasil",
};

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

describe("Onda 34 — ficha nova não herda engenharia do modelo", () => {
  it("o seed nasce sem composição, NCM, origem, instruções e risco CAD", () => {
    const doc = seedFor("NOVA-001");
    expect(doc.etiquetagem?.composicao).toEqual([]);
    expect(doc.etiquetagem?.ncm).toBe("");
    expect(doc.etiquetagem?.paisOrigem).toBe("");
    expect(doc.etiquetagem?.instrucoesExtras).toBe("");
    expect(doc.encaixeCad).toBeUndefined();
  });

  it("os moldes de edição são brancos — sem o produto de demonstração", () => {
    const tudo = JSON.stringify({ etiqueta: emptyCareLabelSpec(), cad: emptyCadMarkerSpec() });
    for (const proibido of [
      "Poliéster",
      "Elastano",
      "88.3",
      "DEV000006_CAMISETA",
      "Audaces",
      "transfer ou bordado",
    ]) {
      expect(tudo).not.toContain(proibido);
    }
    expect(emptyCadMarkerSpec().eficienciaPct).toBe(0);
    expect(emptyCadMarkerSpec().larguraEnfestoM).toBe(0);
  });

  it("o gate omnichannel reprova ficha nova sem composição declarada", () => {
    const [item] = evaluateOmnichannelReadiness({ "NOVA-001": seedFor("NOVA-001") });
    expect(item?.hasCareLabelAbnt).toBe(false);
    expect(item?.goNoGoStatus).toBe("PENDENCIA_ENGENHARIA");
    expect(item?.abntComposition).not.toContain("Poliéster");
  });

  it("o plano de corte não é apurável sem risco CAD, gramatura e composição", () => {
    const plan = computeLayAndCutPlan(seedFor("NOVA-001"), params);
    expect(plan.apuravel).toBe(false);
    expect(plan.spreads).toEqual([]);
    expect(plan.bundles).toEqual([]);
    expect(plan.totalPecasCortadas).toBe(0);
    expect(plan.pesoTotalMalhaKg).toBe(0);
    expect(plan.comprimentoMesaM).toBe(0);
    expect(plan.motivoNaoApuravel).toContain("largura de enfesto não declarada");
    expect(plan.motivoNaoApuravel).toContain("comprimento de risco não declarado");
    expect(plan.motivoNaoApuravel).toContain("composição ABNT não declarada");
  });

  it("a Ordem de Corte A4 não é emitida com plano não apurável", () => {
    const plan = computeLayAndCutPlan(seedFor("NOVA-001"), params);
    expect(() => buildCutOrderPrintableHtml("NOVA-001", "Nova", "Verde", plan)).toThrow(
      /não apurável/,
    );
  });

  it("com engenharia declarada o plano volta a ser apurável", () => {
    const plan = computeLayAndCutPlan(fichaDeclarada(), params);
    expect(plan.apuravel).toBe(true);
    expect(plan.motivoNaoApuravel).toBeNull();
    expect(plan.spreads.length).toBeGreaterThan(0);
    expect(plan.larguraEnfestoM).toBe(1.8);
    expect(plan.descansoMalhaHoras).toBe(24);
  });

  it("o gate de estágio declara a ausência em vez de emprestar 88,3%", () => {
    const gate = evaluateTechSheetGateReadiness(seedFor("NOVA-001"));
    expect(gate.scorePct).toBe(60);
    expect(gate.checks.find((c) => c.id === "cad")?.detail).toBe("Risco CAD não declarado");
    expect(gate.checks.find((c) => c.id === "abnt")?.detail).toBe("NCM não declarado");
  });

  it("o relatório de MRP imprime '—' e não os números do modelo", () => {
    const doc = seedFor("NOVA-001");
    const plan = computeMrpCutPlan("NOVA-001", doc, { totalPieces: 100 });
    const html = buildCutOrderPrintHtml({ ref: "NOVA-001", name: "Nova" }, doc, plan);
    expect(html).toContain("—");
    expect(html).not.toContain("88.3");
    expect(html).not.toContain("DEV000006_CAMISETA");
    expect(html).not.toContain("(undefined)");
  });

  it("o relatório de MRP mostra o CAD quando ele foi declarado", () => {
    const doc = fichaDeclarada();
    const plan = computeMrpCutPlan("DEV000006", doc, { totalPieces: 100 });
    const html = buildCutOrderPrintHtml({ ref: "DEV000006", name: "Declarada" }, doc, plan);
    expect(html).toContain("88.3");
    expect(html).toContain("RISCO_HOMOLOGADO_v1.ADS");
  });

  it("o DPP de uma ficha nova recém-salva lista todas as pendências", () => {
    const sheets = { "NOVA-001": seedFor("NOVA-001") };
    const ref = resolveReferenceTechSheet("NOVA-001", sheets);
    const req = dppRequirements(ref);
    expect(req.ok).toBe(false);
    expect(req.pendencias).toEqual(["sem-ncm", "sem-origem", "sem-composicao", "sem-encaixe"]);
    expect(computeDigitalProductPassport(ref)).toBeNull();
  });
});

describe("Onda 34 — guardas de fonte", () => {
  it("store.ts não contém mais os dados de demonstração", () => {
    const s = codigo(ler("src/lib/techsheet/store.ts"));
    for (const proibido of [
      "88.3",
      "88,3",
      "DEV000006_CAMISETA",
      "eficienciaPct: 8",
      "Lavar pelo avesso; não passar ferro",
      "{ fibra:",
    ]) {
      expect(s).not.toContain(proibido);
    }
    expect(s).toContain("composicao: []");
    expect(s).toContain("encaixeCad: undefined");
  });

  it("o motor de corte não tem mais os defaults numéricos escondidos", () => {
    const s = codigo(ler("src/lib/techsheet/cut-order.ts"));
    for (const proibido of [
      "|| 1.8",
      "|| 5.35",
      "|| 155",
      "emptyCadMarkerSpec",
      "emptyCareLabelSpec",
    ]) {
      expect(s).not.toContain(proibido);
    }
    expect(s).toContain("apuravel: false");
  });

  it("os emissores de documento não usam molde vazio como dado", () => {
    for (const rel of [
      "src/lib/techsheet/mrp.ts",
      "src/lib/techsheet/linesheet.ts",
      "src/lib/techsheet/outsourcing-os.ts",
      "src/lib/techsheet/sourcing-rfq.ts",
      "src/lib/techsheet/digital-twin.ts",
      "src/lib/techsheet/dpp-expedition.ts",
      "src/lib/erp/usecloud-adapter.ts",
    ]) {
      const s = codigo(ler(rel));
      expect(s, rel).not.toContain("emptyCadMarkerSpec(");
      expect(s, rel).not.toContain("emptyCareLabelSpec(");
    }
  });

  it("o painel de corte barra emissão e mostra o motivo", () => {
    const s = codigo(ler("src/components/pcp/CuttingRoomPlanPanel.tsx"));
    expect(s).toContain("!plan.apuravel");
    expect(s).toContain("motivoNaoApuravel");
  });
});
