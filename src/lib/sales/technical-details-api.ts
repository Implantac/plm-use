// Instruções de produção por item. As RPCs fazem o gate de papel/status e
// fornecem uma cópia técnica da ficha padrão, sem os valores financeiros.
import { supabase } from "@/integrations/supabase/client";
import type { Res } from "./api";

export type TechnicalDetailGroup = {
  id: string;
  name: string;
  commercial_detail?: string;
  detail: string;
  revision: number;
  sort_order: number;
};

export type BaseMaterial = {
  tipo: string | null;
  material: string | null;
  fornecedor?: string | null;
  lote?: string | null;
  consumo: string | null;
  unidade: string | null;
};
export type BaseOperation = {
  seq: string | null;
  setor: string | null;
  etapa: string | null;
  tempo_min: string | null;
  responsavel?: string | null;
};
export type BaseApplication = {
  tipo: string | null;
  posicao: string | null;
  arte: string | null;
  largura_cm: string | null;
  altura_cm: string | null;
  pontos: string | null;
  cores: string | null;
  qtd_por_peca: string | null;
  observacao: string | null;
};
export type TechnicalBase = {
  materiais?: BaseMaterial[];
  operacoes?: BaseOperation[];
  aplicacoes?: BaseApplication[];
  foto?: string | null;
};
export type ItemTechnicalDetails = {
  initialized: boolean;
  base_ref?: string | null;
  base_found?: boolean;
  base_updated_at?: string | null;
  base_captured_at?: string | null;
  base?: TechnicalBase;
  groups: TechnicalDetailGroup[];
};
export type TechnicalBaseSnapshot = {
  ref: string | null;
  found: boolean;
  captured_at?: string | null;
  data: TechnicalBase;
};
export type ProductionDetail = { name: string; commercial_detail?: string; detail: string };

/** Linha de consumo acessível apenas ao papel de custo. */
export type ItemMaterialConsumption = {
  id: string;
  kind: string;
  material: string;
  unit: string;
  consumption: number;
  waste_pct: number;
  unit_cost: number;
  total_cost: number | null;
  source: "catalogo" | "custo";
  revision: number;
};
export type SaveItemConsumption = {
  itemId: string;
  materialId: string | null;
  kind: string | null;
  material: string | null;
  unit: string | null;
  consumption: number;
  wastePct: number;
  unitCost: number;
  revision: number;
};

// As funções são novas e o types.ts do Lovable é gerado, não deve ser editado.
type RpcClient = {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
};
const db = supabase as unknown as RpcClient;

async function callRpc<T>(name: string, args: Record<string, unknown>): Promise<Res<T>> {
  try {
    const result = await db.rpc(name, args);
    if (result.error) {
      const missing = result.error.code === "PGRST202" || result.error.code === "42883";
      return {
        data: null,
        error: missing
          ? {
              message:
                "Este recurso ainda não foi ativado no banco. Peça ao administrador para aplicar os SQLs da ficha de produção e do fluxo comercial/consumo no Lovable.",
              code: result.error.code,
            }
          : result.error,
      };
    }
    return { data: result.data as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : "Falha ao acessar os detalhes." },
    };
  }
}

export function getItemTechnicalDetails(itemId: string): Promise<Res<ItemTechnicalDetails>> {
  return callRpc("get_order_item_details", { _item_id: itemId });
}

export function startItemTechnicalDetails(itemId: string): Promise<Res<ItemTechnicalDetails>> {
  return callRpc("start_order_item_details", { _item_id: itemId });
}

export function startCommercialItemDetails(itemId: string): Promise<Res<ItemTechnicalDetails>> {
  return callRpc("start_order_item_commercial_details", { _item_id: itemId });
}

export function saveItemDetailGroup(input: {
  itemId: string;
  groupId: string | null;
  name: string | null;
  detail: string;
  revision: number;
}): Promise<Res<TechnicalDetailGroup>> {
  return callRpc("save_order_item_detail_group", {
    _item_id: input.itemId,
    _group_id: input.groupId,
    _name: input.name,
    _detail: input.detail,
    _expected_revision: input.revision,
  });
}

export function saveCommercialItemDetailGroup(input: {
  itemId: string;
  groupId: string | null;
  name: string | null;
  detail: string;
  revision: number;
}): Promise<Res<TechnicalDetailGroup>> {
  return callRpc("save_order_item_commercial_group", {
    _item_id: input.itemId,
    _group_id: input.groupId,
    _name: input.name,
    _detail: input.detail,
    _expected_revision: input.revision,
  });
}

export function deleteItemDetailGroup(input: {
  itemId: string;
  groupId: string;
  revision: number;
}): Promise<Res<null>> {
  return callRpc("delete_order_item_detail_group", {
    _item_id: input.itemId,
    _group_id: input.groupId,
    _expected_revision: input.revision,
  });
}

export function deleteCommercialItemDetailGroup(input: {
  itemId: string;
  groupId: string;
  revision: number;
}): Promise<Res<null>> {
  return callRpc("delete_order_item_commercial_group", {
    _item_id: input.itemId,
    _group_id: input.groupId,
    _expected_revision: input.revision,
  });
}

export function listItemConsumption(itemId: string): Promise<Res<ItemMaterialConsumption[]>> {
  return callRpc("list_order_item_material_consumption", { _item_id: itemId });
}

export function saveItemConsumption(
  input: SaveItemConsumption,
): Promise<Res<ItemMaterialConsumption>> {
  return callRpc("save_order_item_material_consumption", {
    _item_id: input.itemId,
    _material_id: input.materialId,
    _kind: input.kind,
    _material: input.material,
    _unit: input.unit,
    _consumption: input.consumption,
    _waste_pct: input.wastePct,
    _unit_cost: input.unitCost,
    _expected_revision: input.revision,
  });
}

export function deleteItemConsumption(input: {
  itemId: string;
  materialId: string;
  revision: number;
}): Promise<Res<null>> {
  return callRpc("delete_order_item_material_consumption", {
    _item_id: input.itemId,
    _material_id: input.materialId,
    _expected_revision: input.revision,
  });
}
