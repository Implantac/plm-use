import { createFileRoute } from "@tanstack/react-router";
import { autenticarChave } from "@/lib/api/api-key-auth.server";
import { checkCronRateLimit } from "@/lib/api/cron-auth.server";
import { validarPedidoEntrada } from "@/lib/api/escrita-v1";
import { erroJson, responderLeituraV1 } from "@/lib/api/leitura-v1.server";
import { recursoPorSlug } from "@/lib/api/recursos-v1";

// Onda 123 — /api/v1/sales-orders
//   GET  → leitura paginada (igual aos demais recursos)
//   POST → cria pedido vindo da loja/ERP (escopo write), idempotente por (source, external_ref)
export const Route = createFileRoute("/api/v1/sales-orders")({
  server: {
    handlers: {
      GET: async ({ request }) => responderLeituraV1(request, recursoPorSlug("sales-orders")!),
      POST: async ({ request }) => {
        const auth = await autenticarChave(request);
        if (!auth.ok) return erroJson(auth.status, auth.message);
        if (!auth.scopes.includes("write"))
          return erroJson(
            403,
            "Esta chave só tem escopo de leitura. Crie uma chave com escopo write em Segurança.",
          );
        const rl = checkCronRateLimit(request, `api-v1w:${auth.keyId}`, 60, 60_000);
        if (!rl.ok)
          return Response.json(
            { error: "Limite de requisições atingido." },
            { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
          );
        let corpo: unknown;
        try {
          corpo = await request.json();
        } catch {
          return erroJson(400, "Corpo deve ser JSON.");
        }
        const v = validarPedidoEntrada(corpo);
        if (!v.ok) return erroJson(400, v.erro);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { criarPedidoExterno } = await import("@/lib/api/pedidos-v1.server");
        const r = await criarPedidoExterno(supabaseAdmin, v.pedido, auth.name);
        if ("erro" in r) return erroJson(r.status, r.erro, r.detalhes);
        return Response.json(r.corpo, {
          status: r.status,
          headers: { "cache-control": "no-store", "x-api-version": "1" },
        });
      },
    },
  },
});
