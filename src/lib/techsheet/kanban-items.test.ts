import { describe, expect, it } from "vitest";
import { seedFor } from "./store";
import { computeFullTechSheetPricing } from "./pricing";
import {
  averageKanbanMargin,
  buildKanbanRefItems,
  canAdvanceStage,
  mapPercentToStage,
} from "./kanban-items";

const vazio = { lifecycles: [], dbRefs: [] };

describe("Onda 30 — a esteira não fabrica ficha técnica", () => {
  it("referência do Ciclo de Vida sem ficha entra sem documento e sem números", () => {
    const items = buildKanbanRefItems({
      techDocs: {},
      lifecycles: [{ ref: "V24-001", nome: "Polo Piquet", colecao: "Verão 2027", pct: 42 }],
      dbRefs: [],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.ref).toBe("V24-001");
    expect(items[0]?.name).toBe("Polo Piquet");
    expect(items[0]?.stage).toBe(mapPercentToStage(42));
    // Era aqui que `seedFor(code)` plantava BOM, BOP e custo de demonstração.
    expect(items[0]?.doc).toBeUndefined();
  });

  it("referência do banco sem ficha também não ganha documento", () => {
    const items = buildKanbanRefItems({
      techDocs: {},
      ...vazio,
      dbRefs: [{ code: "NOVA-777", name: "Jaqueta", collection_id: "Inverno 2027" }],
    });
    expect(items[0]?.doc).toBeUndefined();
    expect(items[0]?.collection).toBe("Inverno 2027");
  });

  it("arrastar um cartão sem ficha não avança de estágio", () => {
    const items = buildKanbanRefItems({
      techDocs: {},
      ...vazio,
      dbRefs: [{ code: "NOVA-777", name: "Jaqueta" }],
    });
    expect(canAdvanceStage(items, "NOVA-777")).toBe(false);
    // `ensure()` + `updateMeta()` no drop gravariam o modelo e promoveriam a
    // ref a "salva", liberando RFQ, MRP e showroom sobre números inventados.
  });

  it("ficha salva entra com o mesmo documento e pode avançar", () => {
    const doc = seedFor("V24-001");
    const items = buildKanbanRefItems({
      techDocs: { "V24-001": doc },
      lifecycles: [{ ref: "V24-001", nome: "nome do ciclo", pct: 90 }],
      dbRefs: [{ code: "V24-001", name: "nome do banco" }],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.doc).toBe(doc);
    expect(items[0]?.name).toBe("nome do banco");
    expect(canAdvanceStage(items, "V24-001")).toBe(true);
  });

  it("média de margem conta só fichas salvas e vira null sem nenhuma", () => {
    expect(
      averageKanbanMargin(
        buildKanbanRefItems({ techDocs: {}, ...vazio, dbRefs: [{ code: "A", name: "A" }] }),
      ),
    ).toBeNull();
    expect(averageKanbanMargin([])).toBeNull();

    const doc = seedFor("V24-001");
    const items = buildKanbanRefItems({
      techDocs: { "V24-001": doc },
      ...vazio,
      dbRefs: [
        { code: "B", name: "B" },
        { code: "C", name: "C" },
        { code: "D", name: "D" },
      ],
    });
    const esperado = Math.round(computeFullTechSheetPricing(doc).margemLiquidaRealPct * 10) / 10;
    // Três cartões sem ficha não diluem a média com margem do modelo.
    expect(averageKanbanMargin(items)).toBe(esperado);
  });

  it("código vindo em minúsculas encontra a ficha e não duplica o cartão", () => {
    const items = buildKanbanRefItems({
      techDocs: { abc123: seedFor("ABC123") },
      lifecycles: [{ ref: "abc123", nome: "minúsculo", pct: 10 }],
      dbRefs: [],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.ref).toBe("ABC123");
    expect(items[0]?.doc).toBeDefined();
  });
});
