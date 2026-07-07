// V11 · Contexto ao vivo para agentes IA — puxa snapshot real de entity_events + contadores.
// Autenticado: RLS aplica como o usuário. Server-only.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ScopeInput = z.object({
  since_hours: z.number().int().min(1).max(720).default(72),
  entity_types: z
    .array(z.enum(["reference", "lote", "tech_sheet", "piloto", "capa", "engenharia", "facao_order"]))
    .optional(),
  limit_events: z.number().int().min(1).max(200).default(40),
});

export type LiveContext = {
  window_hours: number;
  generated_at: string;
  counters: Record<string, number>;
  recent_events: Array<{
    entity_type: string;
    entity_id: string;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    actor_name: string | null;
    created_at: string;
    note: string | null;
  }>;
  as_prompt: string;
};

export const fetchLiveContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScopeInput.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<LiveContext> => {
    const { supabase } = context;
    const since = new Date(Date.now() - data.since_hours * 3600 * 1000).toISOString();

    let q = supabase
      .from("entity_events")
      .select("entity_type,entity_id,event_type,from_status,to_status,actor_name,created_at,note")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(data.limit_events);

    if (data.entity_types && data.entity_types.length > 0) {
      q = q.in("entity_type", data.entity_types);
    }

    const { data: events, error } = await q;
    if (error) {
      return {
        window_hours: data.since_hours,
        generated_at: new Date().toISOString(),
        counters: {},
        recent_events: [],
        as_prompt: `(sem acesso ao stream de eventos: ${error.message})`,
      };
    }

    const rows = (events ?? []) as LiveContext["recent_events"];
    const counters: Record<string, number> = {};
    for (const e of rows) {
      const key = `${e.entity_type}.${e.event_type}`;
      counters[key] = (counters[key] ?? 0) + 1;
    }

    const bullets = rows.slice(0, 20).map((e) => {
      const when = new Date(e.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const status =
        e.from_status && e.to_status ? ` [${e.from_status} → ${e.to_status}]` : "";
      const who = e.actor_name ? ` por ${e.actor_name}` : "";
      return `- ${when} · ${e.entity_type} ${e.event_type}${status}${who}`;
    });

    const counterLines = Object.entries(counters)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([k, v]) => `- ${k}: ${v}`);

    const as_prompt = [
      `Snapshot operacional (últimas ${data.since_hours}h, ${rows.length} eventos):`,
      "",
      "Contadores por evento:",
      counterLines.length ? counterLines.join("\n") : "- (sem eventos)",
      "",
      "Eventos recentes:",
      bullets.length ? bullets.join("\n") : "- (sem eventos)",
    ].join("\n");

    return {
      window_hours: data.since_hours,
      generated_at: new Date().toISOString(),
      counters,
      recent_events: rows,
      as_prompt,
    };
  });
