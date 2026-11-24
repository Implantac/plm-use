import { createFileRoute } from "@tanstack/react-router";
import { autenticarChave } from "@/lib/api/api-key-auth.server";
import { checkCronRateLimit } from "@/lib/api/cron-auth.server";
import { validarPatchOp } from "@/lib/api/escrita-v1";

// Onda 122 — escrita vinda do ERP: PATCH /api/v1/production-orders/:id
// Exige chave com escopo "write". Campos aceitos: status, erp_op_id, planned_start, planned_end, notes.
// O trigger webhook_production_orders avisa os assinantes da mudança de status.

const erro = (status: number, message: string) =>
  Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });

export const Route = createFileRoute("/api/v1/production-orders/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const auth = await autenticarChave(request);
        if (!auth.ok) return erro(auth.status, auth.message);
        if (!auth.scopes.includes("write"))
          return erro(
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
          return erro(400, "Corpo deve ser JSON.");
        }
        const v = validarPatchOp(corpo);
        if (!v.ok) return erro(400, v.erro);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const seletor = /^[0-9a-f-]{36}$/i.test(params.id) ? "id" : "number";
        const { data, error } = await supabaseAdmin
          .from("production_orders")
          .update({ ...v.patch, updated_at: new Date().toISOString() })
          .eq(seletor, params.id)
          .select("id, number, status, erp_op_id, planned_start, planned_end, updated_at")
          .maybeSingle();
        if (error) return erro(500, "Falha ao atualizar a OP.");
        if (!data) return erro(404, `OP não encontrada: ${params.id}`);
        return Response.json(
          { data, atualizado_por: `api-key:${auth.name}` },
          { headers: { "cache-control": "no-store", "x-api-version": "1" } },
        );
      },
    },
  },
});
