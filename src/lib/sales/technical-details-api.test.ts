import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteCommercialItemDetailGroup,
  deleteItemConsumption,
  deleteItemDetailGroup,
  listItemConsumption,
  saveCommercialItemDetailGroup,
  saveItemConsumption,
  saveItemDetailGroup,
  startCommercialItemDetails,
  startItemTechnicalDetails,
} from "./technical-details-api";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

beforeEach(() => vi.resetAllMocks());

describe("API de detalhes técnicos do pedido", () => {
  it("inicia o item usando a RPC do servidor", async () => {
    rpc.mockResolvedValue({ data: { initialized: true, groups: [] }, error: null });
    expect((await startItemTechnicalDetails("item-1")).data?.initialized).toBe(true);
    expect(rpc).toHaveBeenCalledWith("start_order_item_details", { _item_id: "item-1" });
  });

  it("envia revisão e texto exato ao salvar e ao remover", async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    await saveItemDetailGroup({
      itemId: "item-1",
      groupId: "g1",
      name: null,
      detail: "Linha 1\nLinha 2",
      revision: 7,
    });
    expect(rpc).toHaveBeenCalledWith("save_order_item_detail_group", {
      _item_id: "item-1",
      _group_id: "g1",
      _name: null,
      _detail: "Linha 1\nLinha 2",
      _expected_revision: 7,
    });
    await deleteItemDetailGroup({ itemId: "item-1", groupId: "g1", revision: 8 });
    expect(rpc).toHaveBeenCalledWith("delete_order_item_detail_group", {
      _item_id: "item-1",
      _group_id: "g1",
      _expected_revision: 8,
    });
  });

  it("usa RPC comercial separada e envia revisão para salvar e remover", async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    await startCommercialItemDetails("item-1");
    expect(rpc).toHaveBeenCalledWith("start_order_item_commercial_details", { _item_id: "item-1" });
    await saveCommercialItemDetailGroup({
      itemId: "item-1",
      groupId: "g1",
      name: null,
      detail: "Pedido\nAzul",
      revision: 4,
    });
    expect(rpc).toHaveBeenCalledWith("save_order_item_commercial_group", {
      _item_id: "item-1",
      _group_id: "g1",
      _name: null,
      _detail: "Pedido\nAzul",
      _expected_revision: 4,
    });
    await deleteCommercialItemDetailGroup({ itemId: "item-1", groupId: "g1", revision: 5 });
    expect(rpc).toHaveBeenCalledWith("delete_order_item_commercial_group", {
      _item_id: "item-1",
      _group_id: "g1",
      _expected_revision: 5,
    });
  });

  it("consumo usa RPC de leitura protegida e gravação transacional com revisão", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await listItemConsumption("item-1");
    expect(rpc).toHaveBeenCalledWith("list_order_item_material_consumption", {
      _item_id: "item-1",
    });
    await saveItemConsumption({
      itemId: "item-1",
      materialId: "m1",
      kind: null,
      material: null,
      unit: null,
      consumption: 1.5,
      wastePct: 8,
      unitCost: 12,
      revision: 3,
    });
    expect(rpc).toHaveBeenCalledWith("save_order_item_material_consumption", {
      _item_id: "item-1",
      _material_id: "m1",
      _kind: null,
      _material: null,
      _unit: null,
      _consumption: 1.5,
      _waste_pct: 8,
      _unit_cost: 12,
      _expected_revision: 3,
    });
    await deleteItemConsumption({ itemId: "item-1", materialId: "m1", revision: 4 });
    expect(rpc).toHaveBeenCalledWith("delete_order_item_material_consumption", {
      _item_id: "item-1",
      _material_id: "m1",
      _expected_revision: 4,
    });
  });

  it("instrui ativar o SQL quando a RPC não existe, em vez de fingir sucesso", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "missing" } });
    const result = await startItemTechnicalDetails("item-1");
    expect(result.data).toBeNull();
    expect(result.error?.message).toContain("SQL");
    expect(result.error?.message).toContain("Lovable");
  });

  it("não esconde erro de permissão ou falha de rede", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "Sem permissao" } });
    expect((await startItemTechnicalDetails("item-1")).error?.message).toBe("Sem permissao");
    rpc.mockRejectedValueOnce(new Error("Rede indisponível"));
    expect((await startItemTechnicalDetails("item-1")).error?.message).toBe("Rede indisponível");
  });
});
