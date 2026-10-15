import { describe, expect, it } from "vitest";
import { filterMaterials, materialForBom, validateMaterialDraft } from "./store";
import { materialFromRow, materialToRow } from "@/lib/creative-sync";
import { materialsSeed, type MaterialItem } from "./store";

const mat: MaterialItem = {
  id: "mat-test",
  name: "Viscose Cru",
  tipo: "Tecido",
  supplier: "Têxtil Z",
  unit: "m",
  unitCost: 18.75,
  sku: "vz-77",
  notes: "largura 1,50m",
};

describe("store de materiais", () => {
  it("seed tem ids únicos e custos positivos", () => {
    const ids = new Set(materialsSeed.map((m) => m.id));
    expect(ids.size).toBe(materialsSeed.length);
    expect(materialsSeed.every((m) => m.unitCost > 0)).toBe(true);
  });

  it("filter casa nome, SKU e fornecedor (case-insensitive)", () => {
    const list = [mat, { ...mat, id: "b", name: "Botão", supplier: "Real", sku: "" }];
    expect(filterMaterials(list, "viscose")).toHaveLength(1);
    expect(filterMaterials(list, "VZ-77")).toHaveLength(1);
    expect(filterMaterials(list, "real")).toHaveLength(1);
    expect(filterMaterials(list, "  ")).toHaveLength(2);
  });

  it("validação: nome curto, custo negativo/nan e unidade vazia", () => {
    expect(validateMaterialDraft({ name: "a", unitCost: 1, unit: "m" })).toMatch(/2\+/);
    expect(validateMaterialDraft({ name: "ok", unitCost: -2, unit: "m" })).toMatch(/≥ 0/);
    expect(validateMaterialDraft({ name: "ok", unitCost: NaN, unit: "m" })).toMatch(/≥ 0/);
    expect(validateMaterialDraft({ name: "ok", unitCost: 1, unit: " " })).toMatch(/unidade/);
    expect(validateMaterialDraft({ name: "ok", unitCost: 0, unit: "un" })).toBeNull();
  });

  it("materialForBom converte para a linha do BOM e traz SKU como lote", () => {
    const bom = materialForBom(mat);
    expect(bom.material).toBe("Viscose Cru");
    expect(bom.custo).toBe(18.75);
    expect(bom.consumo).toBe("1");
    // o upper_case do SKU acontece na gravação da rota, não na conversão:
    expect(bom.lote).toBe("vz-77");
    const semSku = materialForBom({ ...mat, sku: "" });
    expect(semSku.lote).toBeUndefined();
  });
});

describe("mappers do creative-sync (módulo materials)", () => {
  it("round-trip preserva campos; sku no banco vem do input cru", () => {
    const row = materialToRow(mat, "uid-9");
    expect(row.created_by).toBe("uid-9");
    expect(row.external_key).toBe("mat-test");
    const back = materialFromRow(row);
    expect({ ...back, sku: back.sku }).toMatchObject({ ...mat });
  });

  it("clamp do custo negativo para 0 e tipo fora da lista cai em Tecido", () => {
    const row = materialToRow({ ...mat, unitCost: -5 }, "u");
    expect(row.unit_cost).toBe(0);
    const weird = materialFromRow({ ...row, material_type: "Couro" });
    expect(weird.tipo).toBe("Tecido");
  });

  it("linha legada sem campos não explode", () => {
    const empty = materialFromRow({});
    expect(empty.name).toBe("");
    expect(empty.unit).toBe("un");
    expect(empty.unitCost).toBe(0);
  });
});
