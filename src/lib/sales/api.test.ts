// `listItems` pede dois embeds to-many irmãos numa só consulta (grades e opções).
// Testado contra o PostgREST 16.5: ele agrega cada relacionamento em separado —
// não há produto cartesiano. A deduplicação do mapItem é defensiva (join manual
// ou versão futura pode repetir linha) e é o que este teste trava: seja qual for
// o formato de entrada, a grade não pode dobrar e a soma de peças tem de fechar
// com a quantidade do item.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

const { mapItem } = await import("./api");

const base = {
  id: "i1",
  order_id: "o1",
  line_no: 1,
  catalog_product_id: "p1",
  description: "Camisa futebol oficial",
  quantity: 10,
  unit_price: 97.77,
  price_locked: false,
  tech_status: "em_detalhamento",
  cost_status: "aguardando_custo",
};

// Pior caso que o mapItem precisa tolerar: arrays com entradas repetidas.
function cartesianItem(
  sizes: Array<[string, number]>,
  options: Array<[string, number, number?]>,
): Record<string, unknown> {
  const sizeEntries: Record<string, unknown>[] = [];
  const optionEntries: Record<string, unknown>[] = [];
  for (const [size, qty] of sizes) {
    for (const [optionId, optionQty, driverQty] of options) {
      sizeEntries.push({ size, quantity: qty });
      optionEntries.push({
        option_id: optionId,
        quantity: optionQty,
        spec: driverQty ? { driver_qty: driverQty } : {},
        catalog_options: { name: `Opção ${optionId}` },
      });
    }
  }
  return { ...base, sales_order_item_sizes: sizeEntries, sales_order_item_options: optionEntries };
}

describe("mapItem deduplica grades e opções", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deduplica grade e opções mesmo com 14 entradas (2 x 7)", () => {
    const row = cartesianItem(
      [
        ["M", 6],
        ["G", 4],
      ],
      [
        ["corte", 1],
        ["costura", 1, 22],
        ["acabamento", 1],
        ["bordado", 1, 6.5],
        ["sublimacao", 1],
        ["nome", 1],
        ["gola-v", 1],
      ],
    );
    expect(row.sales_order_item_sizes).toHaveLength(14);

    const item = mapItem(row);
    expect(item.sizes).toEqual([
      { size: "M", quantity: 6 },
      { size: "G", quantity: 4 },
    ]);
    expect(item.options).toHaveLength(7);
    expect(item.sizes.reduce((acc, s) => acc + s.quantity, 0)).toBe(10);
  });

  it("preserva a spec técnica do driver (bordado 6,5 mil pontos)", () => {
    const item = mapItem(cartesianItem([["M", 10]], [["bordado", 1, 6.5]]));
    expect(item.options[0]).toMatchObject({ optionId: "bordado", driverQty: 6.5 });
  });

  it("item sem grade nem opções não quebra", () => {
    const item = mapItem({ ...base });
    expect(item.sizes).toEqual([]);
    expect(item.options).toEqual([]);
  });
});
