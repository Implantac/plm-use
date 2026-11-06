// Onda 35 — criar uma ficha não pode herdar a engenharia do modelo.
//
// Medição prévia (executada antes da correção): `convertBriefingToTechSheetStore`
// devolvia `provenance: "salva"` com BOM de 4 itens (3 do DEV000006), 4 BOP,
// 3 colorways e pré-custo 34 / 185% / 200 pçs / R$ 89,90. Um único clique no
// "Briefing → Engenharia" bastava para o modelo entrar na DRE, no pré-custo,
// no MRP e no catálogo como se fosse produto da empresa.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { buildUseCloudSkuExplosion } from "@/lib/erp/usecloud-adapter";
import { INITIAL_BRIEFINGS, convertBriefingToTechSheetStore } from "./research-gtm";
import { blankFor, seedFor, useTechSheetStore } from "./store";
import { sheetProvenance } from "./provenance";
import { computeMrpCutPlan } from "./mrp";
import { computeLayAndCutPlan } from "./cut-order";
import { computeFullTechSheetPricing } from "./pricing";
import { computeCollectionDreSummary } from "./cfo-dre";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

beforeEach(() => {
  useTechSheetStore.setState({ data: {}, materializadas: {}, dirty: {} });
});

describe("Onda 35 — blankFor e criarFicha", () => {
  it("blankFor devolve um documento sem nenhuma engenharia do modelo", () => {
    const d = blankFor("NOVA-001");
    expect(d.bom).toEqual([]);
    expect(d.bop).toEqual([]);
    expect(d.versoes).toEqual([]);
    expect(d.aplicacoes).toEqual([]);
    expect(d.colorways).toEqual([]);
    expect(d.medidas?.pontos).toEqual([]);
    expect(d.etiquetagem?.composicao).toEqual([]);
    expect(d.etiquetagem?.ncm).toBe("");
    expect(d.encaixeCad).toBeUndefined();
    expect(d.preCost.targetCusto).toBe(0);
    expect(d.preCost.markupPct).toBe(0);
    expect(d.preCost.tiragemPlanejada).toBe(0);
    expect(JSON.stringify(d)).not.toContain("DEV000006");
    expect(JSON.stringify(d)).not.toContain("Malha Dry Fit");
  });

  it("criarFicha grava trabalho do usuário, não template", () => {
    const st = useTechSheetStore.getState();
    st.criarFicha("NOVA-001", { name: "Produto real" });
    const s = useTechSheetStore.getState();
    expect(s.data["NOVA-001"]?.meta?.name).toBe("Produto real");
    expect(s.data["NOVA-001"]?.bom).toEqual([]);
    expect(s.materializadas["NOVA-001"]).toBeUndefined();
    expect(s.dirty["NOVA-001"]).toBe(true);
    expect(sheetProvenance(s.data, "NOVA-001", s.materializadas)).toBe("salva");
  });

  it("criarFicha não sobrescreve uma ficha existente", () => {
    const st = useTechSheetStore.getState();
    st.criarFicha("NOVA-001", { name: "Primeira" });
    useTechSheetStore.getState().criarFicha("NOVA-001", { name: "Segunda" });
    expect(useTechSheetStore.getState().data["NOVA-001"]?.meta?.name).toBe("Primeira");
  });

  it("um updater chamado sem ficha não planta mais o modelo", () => {
    useTechSheetStore.getState().updateMeta("NOVA-002", { name: "Editada" });
    const d = useTechSheetStore.getState().data["NOVA-002"];
    expect(d?.meta?.name).toBe("Editada");
    expect(d?.bom).toEqual([]);
    expect(d?.bop).toEqual([]);
    expect(d?.preCost?.targetCusto).toBe(0);
    expect(d?.colorways).toEqual([]);
    expect(sheetProvenance(useTechSheetStore.getState().data, "NOVA-002")).toBe("salva");
  });

  it("ensure() continua sendo o template explícito e marcado", () => {
    const d = useTechSheetStore.getState().ensure("TPL-001");
    const s = useTechSheetStore.getState();
    expect(d.bom).toHaveLength(4);
    expect(s.materializadas["TPL-001"]).toBe(true);
    expect(sheetProvenance(s.data, "TPL-001", s.materializadas)).toBe("template");
  });
});

describe("Onda 35 — Briefing → Engenharia (1 clique)", () => {
  it("cria ficha salva só com o que o briefing declara", () => {
    const ref = convertBriefingToTechSheetStore(INITIAL_BRIEFINGS[0]!, 1);
    const s = useTechSheetStore.getState();
    const d = s.data[ref]!;
    expect(sheetProvenance(s.data, ref, s.materializadas)).toBe("salva");
    expect(d.bom).toHaveLength(1);
    expect(d.bom[0]?.gramaturaGm2).toBe(195);
    expect(d.bom[0]?.material).toContain("Linho");
    expect(d.bop).toEqual([]);
    expect(d.colorways).toHaveLength(1);
    expect(d.preCost.targetCusto).toBe(0);
    expect(d.preCost.markupPct).toBe(0);
    expect(d.preCost.tiragemPlanejada).toBe(0);
    expect(d.preCost.targetPreco).toBeGreaterThan(0); // preço-alvo É do briefing
    expect(d.etiquetagem?.ncm).toBe("");
    expect(d.encaixeCad).toBeUndefined();
  });

  it("a ficha do briefing não contém nenhum insumo do DEV000006", () => {
    const ref = convertBriefingToTechSheetStore(INITIAL_BRIEFINGS[0]!, 1);
    const json = JSON.stringify(useTechSheetStore.getState().data[ref]);
    for (const proibido of [
      "Ribana Gola V",
      "Linha Poliéster Texturizada",
      "Etiqueta CNPJ Transfer",
      "Malha Dry Fit",
      "DEV000006",
      '"markupPct":185',
      '"targetCusto":34',
    ]) {
      expect(json).not.toContain(proibido);
    }
  });
});

describe("Onda 35 — emissores não inventam variantes nem insumos", () => {
  it("explosão de SKUs de ficha vazia devolve lista vazia", () => {
    expect(buildUseCloudSkuExplosion(blankFor("NOVA-003"))).toEqual([]);
  });

  it("MRP de ficha vazia não produz matriz de cor nem necessidade de material", () => {
    const plan = computeMrpCutPlan("NOVA-003", blankFor("NOVA-003"), { totalPieces: 100 });
    expect(plan.matrix).toEqual([]);
    expect(plan.materials).toEqual([]);
  });

  it("plano de corte de ficha vazia continua não apurável (Onda 34)", () => {
    const plan = computeLayAndCutPlan(blankFor("NOVA-003"), {
      markerRatio: { M: 1 },
      totalPlies: 10,
      maxPliesPerSpread: 10,
      endLossCm: 0,
      colorName: "—",
    });
    expect(plan.apuravel).toBe(false);
    expect(plan.spreads).toEqual([]);
  });
});

describe("Onda 35 — resíduo medido, sem número inventado", () => {
  it("pré-custo e DRE de ficha vazia dão zero, nunca NaN nem prejuízo falso", () => {
    const doc = blankFor("NOVA-004");
    const pricing = computeFullTechSheetPricing(doc);
    expect(pricing.precoSugerido).toBe(0);
    expect(pricing.custoFinal).toBe(0);
    expect(Number.isNaN(pricing.precoSugerido)).toBe(false);

    const dre = computeCollectionDreSummary({ "NOVA-004": doc }, 0, 0);
    expect(dre.ebitdaBrl).toBe(0);
    expect(Number.isNaN(dre.ebitdaBrl)).toBe(false);
    // Registro honesto: a DRE ainda marca `apuravel: true` para uma ficha
    // salva sem BOM custeada. O EBITDA é zero, não inventado — mas o próximo
    // risco é sinalizar na tela que não há engenharia a apurar.
    expect(dre.skus).toHaveLength(1);
  });
});

describe("Onda 35 — guardas de fonte", () => {
  it("store.ts não usa mais seedFor como fallback de updater", () => {
    const s = codigo(ler("src/lib/techsheet/store.ts"));
    expect(s).not.toContain("?? seedFor(");
    expect(s).toContain("export const blankFor");
    expect(s).toContain("criarFicha(");
  });

  it("nenhuma rota ou painel chama ensure() em código executável", () => {
    const arquivos = [
      "src/routes/_authenticated.tech-sheet.tsx",
      "src/routes/_authenticated.development.tsx",
      "src/routes/_authenticated.prints.tsx",
      "src/routes/_authenticated.supplier-portal.tsx",
      "src/routes/_authenticated.approvals.tsx",
      "src/components/techsheet/OperationSequencePanel.tsx",
      "src/components/techsheet/PreCostPanel.tsx",
      "src/components/techsheet/TechSheetVersions.tsx",
      "src/components/techsheet/GarmentSketchStudio.tsx",
      "src/components/techsheet/BomBopPanel.tsx",
      "src/components/techsheet/GradedMeasurementsPanel.tsx",
    ];
    for (const rel of arquivos) {
      expect(codigo(ler(rel)), rel).not.toContain("ensure(");
    }
  });

  it("o cockpit não usa mais seedFor como placeholder", () => {
    const s = codigo(ler("src/routes/_authenticated.tech-sheet.tsx"));
    expect(s).not.toContain("seedFor(");
    expect(s).toContain("blankFor(");
    expect(s).toContain("criarFicha(");
  });

  it("MRP e UseCloud não emprestam colorways/grade do modelo", () => {
    for (const rel of ["src/lib/techsheet/mrp.ts", "src/lib/erp/usecloud-adapter.ts"]) {
      const s = codigo(ler(rel));
      expect(s, rel).not.toContain("defaultColorwaysFor(");
      expect(s, rel).not.toContain("defaultMedidasFor(");
    }
  });

  it("seedFor segue existindo só como modelo explícito", () => {
    // `provenance.ts` compara com o modelo para detectar templates antigos;
    // `ai-agents.tsx` é vitrine declarada. Nenhum dos dois cria ficha operacional.
    expect(codigo(ler("src/lib/techsheet/store.ts"))).toContain("export const seedFor");
    expect(seedFor("X").bom).toHaveLength(4);
  });
});
