// Onda 122 — cron público que despacha a fila de webhooks (a cada minuto via pg_cron / agendador externo).
// Autenticação HMAC-SHA256 do corpo no header x-webhooks-signature com WEBHOOKS_CRON_SECRET.
// Nunca aceite a publishable key como segredo (ver abc-classify.ts).
import { createFileRoute } from "@tanstack/react-router";
import { checkCronRateLimit, verifyCronSignature } from "@/lib/api/cron-auth.server";

export const Route = createFileRoute("/api/public/cron/webhooks-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyCronSignature(
          request,
          process.env.WEBHOOKS_CRON_SECRET,
          "x-webhooks-signature",
        );
        if (!auth.ok) return new Response(auth.message, { status: auth.status });
        const rl = checkCronRateLimit(request, "webhooks-dispatch", 30, 60_000);
        if (!rl.ok)
          return new Response("Too many requests", {
            status: 429,
            headers: { "retry-after": String(rl.retryAfterSec) },
          });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { despacharPendentes } = await import("@/lib/api/webhooks.server");
        try {
          const r = await despacharPendentes(supabaseAdmin, 100);
          return Response.json({ ok: true, ...r });
        } catch (e) {
          return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
          );
        }
      },
    },
  },
});
