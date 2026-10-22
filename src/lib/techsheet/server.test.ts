import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRE_COST,
  deserializeTechSheetRow,
  normalizeTechSheetDoc,
  serializeTechSheetDoc,
} from "./server";
import type { TechSheetData } from "./store";

const doc: TechSheetData = {
  ref: "REF-811",
  bom: [
    {
      id: "b1",
      tipo: "Tecido",
      material: "Linho",
      fornecedor: "Camargo",
      consumo: "1.2",
      unidade: "m",
      custo: 42,
    },
  ],
  bop: [{ id: "p1", seq: 1, etapa: "Corte", setor: "Corte", tempoMin: 12, custo: 4.5 }],
  versoes: [
    {
      id: "v1",
      versao: "v1.0",
      data: "2026-10-14",
      autor: "Ana",
      status: "Em revisão",
      resumo: "start",
      alteracoes: ["+ BOM inicial"],
    },
  ],
  preCost: { targetCusto: 80, overheadPct: 12, markupPct: 220, targetPreco: 349 },
  aplicacoes: [
    {
      id: "ap1",
      tipo: "Silk",
      posicao: "Costas central",
      arte: "EST-0142",
      larguraCm: 28,
      alturaCm: 34,
      cores: 4,
      qtdPorPeca: 1,
      custoUnitario: 2.4,
      custoSetup: 240,
    },
  ],
};
// snapshot auto-referenciado: o fixture declara doc e a versão congela o próprio doc
doc.versoes[0].snapshot = { bom: doc.bom, bop: doc.bop, preCost: doc.preCost };

describe("serialize/deserialize (envelope v1)", () => {
  it("round-trip preserva BOM, BOP, versões e preCost", () => {
    const row = serializeTechSheetDoc("REF-811", doc, "uid-1");
    expect(row.created_by).toBe("uid-1");
    const back = deserializeTechSheetRow({
      ref: row.ref,
      bom: row.bom,
      bop: row.bop,
      versoes: row.versoes,
    });
    expect(back).toEqual(doc);
  });

  it("lê linha legada: bom como array puro, sem preCost", () => {
    const legacy = deserializeTechSheetRow({ ref: "R1", bom: doc.bom, bop: doc.bop });
    expect(legacy.bom).toHaveLength(1);
    expect(legacy.preCost).toEqual(DEFAULT_PRE_COST);
    expect(legacy.versoes).toEqual([]);
  });

  it("linha com lixo não derruba a tela: arrays viram [], envelope parcial faz merge", () => {
    const junk = deserializeTechSheetRow({ ref: "R2", bom: "não-sei", bop: 42, versoes: null });
    expect(junk.bom).toEqual([]);
    expect(junk.bop).toEqual([]);
    expect(junk.versoes).toEqual([]);
    const partial = deserializeTechSheetRow({
      ref: "R3",
      bom: { v: 1, items: doc.bom, preCost: { markupPct: 300 } },
    });
    expect(partial.preCost).toEqual({ ...DEFAULT_PRE_COST, markupPct: 300 });
  });
});

describe("normalizeTechSheetDoc (cache antigo do persist)", () => {
  it("completa doc órfão de preCost/listas", () => {
    const stale = normalizeTechSheetDoc({ ref: "R4" });
    expect(stale.preCost).toEqual(DEFAULT_PRE_COST);
    expect(stale.bom).toEqual([]);
  });
  it("doc completo passa idempotente", () => {
    expect(normalizeTechSheetDoc(doc)).toEqual(doc);
  });
});

describe("dirty set do store (push seletivo)", () => {
  it("ensure não marca; mutação marca; clearDirty resolve", async () => {
    const { useTechSheetStore } = await import("./store");
    useTechSheetStore.setState({ data: {}, dirty: {} });
    useTechSheetStore.getState().ensure("REF-DIRTY");
    expect(useTechSheetStore.getState().dirty["REF-DIRTY"]).toBeUndefined();

    useTechSheetStore.getState().addBomItem("REF-DIRTY", {
      tipo: "Aviamento",
      material: "Botão",
      fornecedor: "Real",
      consumo: "4",
      unidade: "un",
      custo: 12,
    });
    expect(useTechSheetStore.getState().dirty["REF-DIRTY"]).toBe(true);

    useTechSheetStore.getState().clearDirty(["REF-DIRTY"]);
    expect(useTechSheetStore.getState().dirty["REF-DIRTY"]).toBeUndefined();
    // a linha continua na tela — dirty controla o push, não a presença
    expect(useTechSheetStore.getState().data["REF-DIRTY"].bom).toHaveLength(5);
  });
});
