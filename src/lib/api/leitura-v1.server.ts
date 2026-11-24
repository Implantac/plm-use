// Onda 121/123 — leitura paginada de um recurso v1 (usada por $recurso e pelas rotas estáticas).
import { autenticarChave } from "./api-key-auth.server";
import { checkCronRateLimit } from "./cron-auth.server";
import { codificarCursor, decodificarCursor, lerParametros, type RecursoV1 } from "./recursos-v1";

export const erroJson = (status: number, message: string, extra?: Record<string, unknown>) =>
  Response.json({ error: message, ...extra }, { status, headers: { "cache-control": "no-store" } });

export async function responderLeituraV1(request: Request, recurso: RecursoV1): Promise<Response> {
  const url = new URL(request.url);
  const p = lerParametros(recurso, url.searchParams);
  if (!p.ok) return erroJson(400, p.erro);

  const auth = await autenticarChave(request);
  if (!auth.ok) return erroJson(auth.status, auth.message);

  // 120 req/min por chave
  const rl = checkCronRateLimit(request, `api-v1:${auth.keyId}`, 120, 60_000);
  if (!rl.ok)
    return Response.json(
      { error: "Limite de requisições atingido." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabaseAdmin.from(recurso.tabela as any) as any).select(recurso.colunas.join(","));
  for (const [k, v] of Object.entries(p.filtros)) q = q.eq(k, v);

  const col = recurso.colunaAtualizacao;
  if (col) {
    if (p.updatedSince) q = q.gte(col, p.updatedSince);
    if (p.cursor) {
      const c = decodificarCursor(p.cursor);
      if (!c) return erroJson(400, "cursor inválido");
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
    return erroJson(
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
}
