import { describe, expect, it } from "vitest";
import { diffSnapshots } from "./diff";
import type { BomItem, BopStep, TechSheetSnapshot } from "./store";

const bom = (over: Partial<BomItem> = {}): BomItem => ({
  id: "b1",
  tipo: "Tecido",
  material: "Linho",
  fornecedor: "Camargo",
  consumo: "1.2",
  unidade: "m",
  custo: 42,
  ...over,
});
const bop = (over: Partial<BopStep> = {}): BopStep => ({
  id: "p1",
  seq: 1,
  etapa: "Corte",
  setor: "Corte",
  tempoMin: 12,
  custo: 4.5,
  ...over,
});
const snap = (over: Partial<TechSheetSnapshot> = {}): TechSheetSnapshot => ({
  bom: [bom()],
  bop: [bop()],
  preCost: { targetCusto: 80, overheadPct: 10, markupPct: 200, targetPreco: 349 },
  ...over,
});

describe("diffSnapshots", () => {
  it("sem instantâneo de qualquer lado → null (degradação explícita, não zero falsificado)", () => {
    expect(diffSnapshots(undefined, snap())).toBeNull();
    expect(diffSnapshots(snap(), undefined)).toBeNull();
    expect(diffSnapshots(undefined, undefined)).toBeNull();
  });

  it("instantâneos iguais → tudo zerado, nada 'mudou'", () => {
    const d = diffSnapshots(snap(), snap())!;
    expect(d.bom.added).toHaveLength(0);
    expect(d.bom.removed).toHaveLength(0);
    expect(d.bom.changed).toHaveLength(0);
    expect(d.bom.kept).toBe(1);
    expect(d.preCost).toHaveLength(0);
    expect(d.custoIndustrialDelta).toBeCloseTo(0);
  });

  it("distingue adicionado/remudado por id e lista campo a campo", () => {
    const a = snap();
    const b = snap({
      bom: [
        bom({ custo: 50, consumo: "1.4" }), // mesmo id → changed
        bom({ id: "b2", material: "Algodão Pima", custo: 30 }), // novo → added
      ],
    });
    const d = diffSnapshots(a, b)!;
    expect(d.bom.added.map((r) => r.label)).toEqual(["Tecido · Algodão Pima"]);
    expect(d.bom.changed).toHaveLength(1);
    expect(d.bom.changed[0].changes).toEqual([
      { field: "Consumo", from: "1.2", to: "1.4" },
      { field: "Custo", from: "42", to: "50" },
    ]);
    // 50 + 30 + 4.5 = 84.5 vs 42 + 4.5 = 46.5
    expect(d.custoIndustrialDelta).toBeCloseTo(38);
  });

  it("linha que some de B aparece em removed com o rótulo de A", () => {
    const a = snap({ bom: [bom(), bom({ id: "b9", material: "Forro" })] });
    const d = diffSnapshots(a, snap())!;
    expect(d.bom.removed).toEqual([{ label: "Tecido · Forro", kind: "rem", changes: [] }]);
  });

  it('"1.20" e 1.2 são o mesmo número — formatação não é edição', () => {
    const d = diffSnapshots(snap(), snap({ bom: [bom({ consumo: "1.200" })] }))!;
    expect(d.bom.changed).toHaveLength(0);
    expect(d.bom.kept).toBe(1);
  });

  it("BOP: tempo e custo fecham os deltas; pré-custo perdido vira '—'", () => {
    const b = snap({
      bop: [bop({ tempoMin: 20, custo: 6 })],
      preCost: { targetCusto: 80, overheadPct: 12, markupPct: 200 }, // sem targetPreco
    });
    const d = diffSnapshots(snap(), b)!;
    expect(d.tempoBopDelta).toBe(8);
    // BOM igual (42); BOP 4.5→6 → Δ industrial = 1.5
    expect(d.custoIndustrialDelta).toBeCloseTo(1.5);
    expect(d.preCost).toEqual([
      { field: "Rateio %", from: "10", to: "12" },
      { field: "Preço-alvo", from: "349", to: "—" },
    ]);
  });
});

describe("createVersion congela instantâneo (store)", () => {
  it("snapshot nasce igual ao estado e não acompanha edições depois", async () => {
    const { useTechSheetStore } = await import("./store");
    const st = () => useTechSheetStore.getState();
    st().ensure("DIFF-TEST");
    st().addBomItem("DIFF-TEST", {
      tipo: "Aviamento",
      material: "Botão madrepérola",
      fornecedor: "Boto",
      consumo: "8",
      unidade: "un",
      custo: 3,
    });
    const nova = st().createVersion("DIFF-TEST", "QA", "baseline p/ diff", ["+ botões"]);
    expect(nova.snapshot?.bom.some((b) => b.material === "Botão madrepérola")).toBe(true);
    // edição posterior na ficha NÃO pode tocar o congelado:
    // removi o item do documento vivo e ele continua existindo no instantâneo
    const idVivo = st().data["DIFF-TEST"]!.bom.at(-1)!.id;
    st().removeBomItem("DIFF-TEST", idVivo);
    const after = st().data["DIFF-TEST"]!;
    expect(after.bom.some((b) => b.material === "Botão madrepérola")).toBe(false);
    expect(
      after.versoes
        .find((v) => v.id === nova.id)!
        .snapshot!.bom.some((b) => b.material === "Botão madrepérola" && b.custo === 3),
    ).toBe(true);
  });
});
