import { createFileRoute } from "@tanstack/react-router";
import {
  codificarCursor,
  decodificarCursor,
  lerParametros,
  recursoPorSlug,
  RECURSOS_V1,
} from "@/lib/api/recursos-v1";
import { autenticarChave } from "@/lib/api/api-key-auth.server";
import { checkCronRateLimit } from "@/lib/api/cron-auth.server";

// Onda 121 — API pública v1 (somente leitura).
// GET /api/v1/<recurso>?limit=&updated_since=&cursor=&<filtros>
// Autenticação: Authorization: Bearer plm_live_…  (Segurança → Chaves de API)
// Leitura com service role, mas SÓ colunas do mapa RECURSOS_V1 e com chave válida.

const erro = (status: number, message: string, extra?: Record<string, unknown>) =>
  Response.json({ error: message, ...extra }, { status, headers: { "cache-control": "no-store" } });

export const Route = createFileRoute("/api/v1/$recurso")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const recurso = recursoPorSlug(params.recurso);
        if (!recurso)
          return erro(404, `Recurso desconhecido: ${params.recurso}`, {
            recursos: RECURSOS_V1.map((r) => r.slug),
            docs: "/api/v1/openapi.json",
          });

        const url = new URL(request.url);
        const p = lerParametros(recurso, url.searchParams);
        if (!p.ok) return erro(400, p.erro);

        const auth = await autenticarChave(request);
        if (!auth.ok) return erro(auth.status, auth.message);

        // 120 req/min por chave
        const rl = checkCronRateLimit(request, `api-v1:${auth.keyId}`, 120, 60_000);
        if (!rl.ok)
          return Response.json(
            { error: "Limite de requisições atingido." },
            { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
          );

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (supabaseAdmin.from(recurso.tabela as any) as any).select(
          recurso.colunas.join(","),
        );
        for (const [k, v] of Object.entries(p.filtros)) q = q.eq(k, v);

        const col = recurso.colunaAtualizacao;
        if (col) {
          if (p.updatedSince) q = q.gte(col, p.updatedSince);
          if (p.cursor) {
            const c = decodificarCursor(p.cursor);
            if (!c) return erro(400, "cursor inválido");
            // (updated_at, id) > (c.updatedAt, c.id)
            q = q.or(`${col}.gt.${c.updatedAt},and(${col}.eq.${c.updatedAt},id.gt.${c.id})`);
          }
          q = q.order(col, { ascending: true }).order("id", { ascending: true });
        } else {
          q = q.order(recurso.colunas[1] ?? recurso.colunas[0]!, { ascending: true });
        }
        q = q.limit(p.limit + 1);

        const { data, error } = await q;
        if (error) {
          const pendente = error.code === "42P01" || error.code === "PGRST205";
          return erro(
            pendente ? 503 : 500,
            pendente
              ? "Tabela ainda não aplicada no banco (migration pendente)."
              : "Falha ao consultar o recurso.",
          );
        }
        const rows = (data ?? []) as Record<string, unknown>[];
        const temMais = rows.length > p.limit;
        const pagina = temMais ? rows.slice(0, p.limit) : rows;
        const ultimo = pagina[pagina.length - 1];
        const next_cursor =
          temMais && col && ultimo ? codificarCursor(String(ultimo[col]), String(ultimo.id)) : null;

        return Response.json(
          { data: pagina, next_cursor, count: pagina.length },
          { headers: { "cache-control": "no-store", "x-api-version": "1" } },
        );
      },
    },
  },
});
