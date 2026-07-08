// H9-10 · Cron público de performance de lançamento.
// Chamado por pg_cron via net.http_post. Autenticação via HMAC-SHA256 no header
// x-launch-signature, secret LAUNCH_CRON_SECRET. Nenhuma escrita sem verificação.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/cron/launch-performance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.LAUNCH_CRON_SECRET;
        if (!secret) {
          return new Response("Cron secret not configured", { status: 503 });
        }

        const signature = request.headers.get("x-launch-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) Waves lançadas nos últimos 30 dias.
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: waves } = await supabaseAdmin
          .from("launch_wave")
          .select("id, codigo, status, updated_at")
          .in("status", ["publicada", "em_producao", "lancada"])
          .gte("updated_at", since);

        if (!waves || waves.length === 0) {
          return Response.json({ ok: true, processed: 0 });
        }

        // 2) Snapshot mock de sell-through (TODO: substituir por ErpAdapter.getSellThrough)
        //    Aqui só emitimos o evento com placeholder para BI consumir.
        const events = waves.map((w) => ({
          entity_type: "launch_wave" as const,
          entity_id: w.id,
          event_type: "launch.performance.updated",
          actor: null,
          payload: {
            codigo: w.codigo,
            janela_dias: 30,
            sell_through_pct: null, // preenchido quando ErpAdapter.getSellThrough existir
            fonte: "cron:mock",
            calculado_em: new Date().toISOString(),
          },
        }));

        const { error } = await supabaseAdmin.from("entity_events").insert(events);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        return Response.json({ ok: true, processed: events.length });
      },
    },
  },
});
