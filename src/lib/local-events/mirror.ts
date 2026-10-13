// Espelho dos eventos locais para public.entity_events (timeline cross-device).
// O store local continua sendo a fonte imediata da UI; o espelho é
// melhor-esforço: sem usuário, sem rede ou enum sem o valor novo (migration
// 20261009210000 não aplicada), o insert falha em silêncio e nada muda para o
// usuário — degradação graciosa, nunca toast de erro para log de timeline.

import type { LocalEvent } from "./store";

/** Mapeamento puro (testável): evento local → linha do entity_events. */
export function toMirrorRow(e: LocalEvent) {
  return {
    entity_type: e.entity_type,
    entity_id: e.entity_id,
    event_type: e.event_type,
    from_status: e.from_status ?? null,
    to_status: e.to_status ?? null,
    note: e.note ?? null,
    payload: { ...(e.payload ?? {}), mirrored_from: "local-events", local_id: e.id },
    created_at: e.created_at,
  };
}

export async function mirrorEvent(e: LocalEvent): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return false;
    const meta = user.user_metadata ?? {};
    const { error } = await supabase.from("entity_events").insert({
      ...toMirrorRow(e),
      actor: user.id,
      actor_name:
        (meta.full_name as string | undefined) ??
        (meta.name as string | undefined) ??
        user.email ??
        null,
    } as never);
    return !error;
  } catch {
    return false;
  }
}
