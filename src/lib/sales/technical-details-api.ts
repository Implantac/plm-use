// Instruções de produção por item. As RPCs fazem o gate de papel/status e
// fornecem uma cópia técnica da ficha padrão, sem os valores financeiros.
import { supabase } from "@/integrations/supabase/client";
import type { Res } from "./api";

export type TechnicalDetailGroup = {
  id: string;
  name: string;
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
export type ProductionDetail = { name: string; detail: string };

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
                "O detalhamento ainda não foi ativado no banco. Peça ao administrador para aplicar o SQL da ficha de produção no Lovable.",
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
