// Doc 06.2 · Almoxarifado — cron público de reclassificação ABC (mensal).
// Autenticação: apikey header contendo o Supabase publishable key (padrão Lovable /api/public/*).
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/abc-classify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey") ?? "";
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("classify_abc", {
          _a_threshold: 0.8,
          _b_threshold: 0.95,
        });
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const changes = (data ?? []) as Array<{
          item_id: string;
          old_class: string | null;
          new_class: string;
          cumulative_pct: number;
        }>;
        if (changes.length > 0) {
          await supabaseAdmin.from("entity_events").insert(
            changes.map((c) => ({
              entity_type: "stock_item" as const,
              entity_id: c.item_id,
              event_type: "stock.item.abc_reclassified_cron",
              from_status: c.old_class ?? undefined,
              to_status: c.new_class,
              actor: null,
              payload: { cumulative_pct: c.cumulative_pct, fonte: "cron:monthly" },
            })),
          );
        }
        return Response.json({ ok: true, changes: changes.length });
      },
    },
  },
});
