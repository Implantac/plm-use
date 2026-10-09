// Doc 06.2 · Almoxarifado — cron público de reclassificação ABC (mensal).
// Chamado por pg_cron via net.http_post. Autenticação via HMAC-SHA256 no header
// x-abc-signature, secret ABC_CRON_SECRET. Nenhuma escrita sem verificação.
//
// SECURITY: nunca autentique um endpoint público com a publishable key do Supabase.
// Ela é pública por definição — o supabase-js a embute no bundle do navegador
// (VITE_SUPABASE_PUBLISHABLE_KEY) e qualquer visitante pode lê-la no DevTools.
// Um endpoint que a aceita como segredo é, na prática, um endpoint aberto que
// escreve com service_role. Este endpoint usava exatamente esse padrão até
// 2026-10-08; o caminho autenticado por usuário (inventory.functions.ts ·
// runAbcClassification) sempre esteve correto e continua sendo o preferido para uso
// interativo. Este cron é apenas o gatilho agendado e exige assinatura HMAC,
// seguindo o mesmo padrão de /api/public/cron/launch-performance.
import { createFileRoute } from "@tanstack/react-router";
import { checkCronRateLimit, verifyCronSignature } from "@/lib/api/cron-auth.server";

export const Route = createFileRoute("/api/public/cron/abc-classify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyCronSignature(
          request,
          process.env.ABC_CRON_SECRET,
          "x-abc-signature",
        );
        if (!auth.ok) return new Response(auth.message, { status: auth.status });

        const rl = checkCronRateLimit(request, "abc-classify");
        if (!rl.ok)
          return new Response("Too many requests", {
            status: 429,
            headers: { "retry-after": String(rl.retryAfterSec) },
          });

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
