import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteItemDetailGroup,
  saveItemDetailGroup,
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
