// V8 · Server function para transição de workflow: valida can_transition, aplica UPDATE
// na tabela alvo (RLS aplica como o usuário) e registra evento status_changed em entity_events.
// Aditivo: não substitui triggers existentes (references já loga sozinho via trigger).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ENTITY_TABLE: Record<string, string> = {
  reference: "references",
  lote: "pcp_lots",
  tech_sheet: "tech_sheets",
  capa: "quality_capa",
};

const Input = z.object({
  entity_type: z.enum(["reference", "lote", "tech_sheet", "capa"]),
  entity_id: z.string().uuid(),
  from_status: z.string().min(1),
  to_status: z.string().min(1),
  note: z.string().max(2000).optional(),
});

export type TransitionResult = {
  ok: boolean;
  reason?: string;
  event_id?: string;
  from_status: string;
  to_status: string;
};

export const performTransition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<TransitionResult> => {
    const { supabase, userId, claims } = context;

    // 1. Validar transição contra workflow_definitions
    const { data: allowed, error: rpcErr } = await supabase.rpc(
      "can_transition" as never,
      {
        _entity_type: data.entity_type,
        _from: data.from_status,
        _to: data.to_status,
      } as never,
    );
    if (rpcErr) {
      return {
        ok: false,
        reason: `Erro validando transição: ${rpcErr.message}`,
        from_status: data.from_status,
        to_status: data.to_status,
      };
    }
    if (!allowed) {
      return {
        ok: false,
        reason: `Transição não permitida: ${data.from_status} → ${data.to_status}`,
        from_status: data.from_status,
        to_status: data.to_status,
      };
    }

    // 2. Aplicar UPDATE na tabela alvo (RLS aplica como usuário autenticado)
    const table = ENTITY_TABLE[data.entity_type];
    if (!table) {
      return {
        ok: false,
        reason: `entity_type sem tabela mapeada: ${data.entity_type}`,
        from_status: data.from_status,
        to_status: data.to_status,
      };
    }

    const { error: upErr } = await supabase
      .from(table as never)
      .update({ status: data.to_status, updated_by: userId } as never)
      .eq("id", data.entity_id)
      .eq("status", data.from_status);
    if (upErr) {
      return {
        ok: false,
        reason: `Falha ao atualizar ${table}: ${upErr.message}`,
        from_status: data.from_status,
        to_status: data.to_status,
      };
    }

    // 3. Registrar evento status_changed (references já loga via trigger — evitar duplicar)
    let event_id: string | undefined;
    if (data.entity_type !== "reference") {
      const actorName =
        (claims as { name?: string; email?: string } | null)?.name ??
        (claims as { email?: string } | null)?.email ??
        null;
      const { data: ev, error: evErr } = await supabase
        .from("entity_events")
        .insert({
          entity_type: data.entity_type as never,
          entity_id: data.entity_id,
          event_type: "status_changed",
          from_status: data.from_status,
          to_status: data.to_status,
          note: data.note ?? null,
          actor: userId,
          actor_name: actorName,
          payload: { via: "performTransition" } as never,
        })
        .select("id")
        .single();
      if (!evErr && ev) event_id = (ev as { id: string }).id;
    }

    return {
      ok: true,
      event_id,
      from_status: data.from_status,
      to_status: data.to_status,
    };
  });
