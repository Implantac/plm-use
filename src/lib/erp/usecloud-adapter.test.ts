import { describe, expect, it } from "vitest";
import { seedFor } from "@/lib/techsheet/store";
import { buildUseCloudProductionOrderPayload, buildUseCloudSkuExplosion } from "./usecloud-adapter";
import { mockErpAdapter } from "./mock-adapter";

describe("integração UseCloud ERP (explosão SKU + OP sem cliente obrigatório)", () => {
  it("explode SKUs de produto acabado cruzando Colorways ativas × Grade de tamanhos", () => {
    const doc = seedFor("DEV000006");
    // 3 colorways × 5 tamanhos (PP..GG) = 15 SKUs
    const skus = buildUseCloudSkuExplosion(doc);
    expect(skus).toHaveLength(15);
    expect(skus[0]).toMatchObject({
      sku: "DEV000006-VD-OURO-PP",
      ncm: "6109.90.00",
      composicaoAbnt: "96% Poliéster · 4% Elastano",
    });
  });

  it("gera OP para ESTOQUE_PROPRIO sem obrigar cliente e calcula necessidade de MP com quebra", () => {
    const doc = seedFor("DEV000006");
    const op = buildUseCloudProductionOrderPayload(doc, {
      grade: [
        { colorCode: "VD-OURO", size: "M", quantity: 60 },
        { colorCode: "VD-OURO", size: "G", quantity: 40 },
      ],
    });
    expect(op.tipoOp).toBe("ESTOQUE_PROPRIO");
    expect(op.customerCode).toBeNull();
    expect(op.totalQuantity).toBe(100);
    // Malha Dry Fit: 0.26 kg * 1.07 * 100 = 27.82 kg
    expect(op.materiaisNecessarios[0].consumoTotalComPerda).toBeCloseTo(27.82, 2);
  });

  it("mockErpAdapter devolve saldo determinístico sem jitter aleatório", async () => {
    const s1 = await mockErpAdapter.getStock("MAL-VIS-BR-001");
    const s2 = await mockErpAdapter.getStock("MAL-VIS-BR-001");
    expect(s1?.available).toBe(1240);
    expect(s2?.available).toBe(1240);
  });
});
