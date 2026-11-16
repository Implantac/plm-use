// Onda 81 — erro do Supabase traduzido para o porquê, em linguagem do
// usuário. Na Onda 79 a criação de referência falhou em produção com o toast
// "Falha ao criar referência" sem dizer o motivo (era 401/42501: sessão sem
// papel). Regra vigente: controle que falha explica o porquê próximo ao
// controle — e o motivo nunca é inventado: vem do código/mensagem retornado.

export type ErroSupabaseLike = {
  code?: string | null;
  message?: string | null;
  status?: number | null;
  details?: string | null;
} | null;

/**
 * Devolve uma frase curta com o motivo da falha, derivada do código/mensagem
 * do Supabase/PostgREST. Para códigos desconhecidos, repassa a mensagem
 * original (nunca esconde o erro atrás de um texto genérico).
 */
export function descreverErroSupabase(
  erro: ErroSupabaseLike,
  acao = "concluir a operação",
): string {
  if (!erro) return `Não foi possível ${acao}.`;
  const code = (erro.code ?? "").toString();
  const msg = (erro.message ?? "").toString();
  const lower = msg.toLowerCase();

  if (
    code === "42501" ||
    erro.status === 401 ||
    erro.status === 403 ||
    lower.includes("row-level security")
  ) {
    return `Não foi possível ${acao}: sua sessão não tem permissão para gravar aqui. Solicite o papel adequado a um gestor ou admin, ou entre novamente.`;
  }
  if (
    code === "PGRST301" ||
    lower.includes("jwt expired") ||
    lower.includes("invalid jwt") ||
    // Onda 91 — `Unauthorized: Invalid token` / `No token` do requireSupabaseAuth
    /unauthorized|invalid token|no token|\bjwt\b/.test(lower)
  ) {
    return `Não foi possível ${acao}: sua sessão expirou ou é inválida. Entre novamente e repita a ação.`;
  }
  if (code === "42P01" || code === "PGRST205" || lower.includes("schema cache")) {
    return `Não foi possível ${acao}: a tabela ainda não foi aplicada no banco (migration pendente). Avise o admin.`;
  }
  if (code === "23505") {
    return `Não foi possível ${acao}: já existe um registro com esse código. Use outro código.`;
  }
  if (code === "23503") {
    return `Não foi possível ${acao}: um dos vínculos informados (coleção, fornecedor…) não existe mais.`;
  }
  if (code === "23502") {
    return `Não foi possível ${acao}: há um campo obrigatório em branco.`;
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed")
  ) {
    return `Não foi possível ${acao}: sem conexão com o servidor. Verifique a rede e tente de novo.`;
  }
  return msg ? `Não foi possível ${acao}: ${msg}` : `Não foi possível ${acao}.`;
}

/**
 * Onda 92 — normaliza qualquer coisa lançada (Error, objeto de erro do
 * PostgREST/Storage com `code`/`message`, string) e devolve o motivo em
 * linguagem do usuário. Evita o "[object Object]" de `String(e)`.
 */
export function motivoDe(erro: unknown, acao: string): string {
  if (erro instanceof Error) return descreverErroSupabase({ message: erro.message }, acao);
  if (erro && typeof erro === "object") {
    const o = erro as { code?: unknown; message?: unknown; status?: unknown; details?: unknown };
    return descreverErroSupabase(
      {
        code: typeof o.code === "string" ? o.code : null,
        message: typeof o.message === "string" ? o.message : null,
        status: typeof o.status === "number" ? o.status : null,
        details: typeof o.details === "string" ? o.details : null,
      },
      acao,
    );
  }
  return descreverErroSupabase({ message: erro == null ? null : String(erro) }, acao);
}

const ultimosAvisos = new Map<string, number>();

/**
 * Para sincronizações debounced (que disparam a cada alteração do store):
 * devolve `true` no máximo uma vez por `janelaMs` para a mesma mensagem, para
 * o usuário ser avisado do porquê sem receber uma enxurrada de toasts.
 */
export function avisoUnico(mensagem: string, janelaMs = 60_000, agora = Date.now()): boolean {
  const ultimo = ultimosAvisos.get(mensagem);
  if (ultimo !== undefined && agora - ultimo < janelaMs) return false;
  ultimosAvisos.set(mensagem, agora);
  return true;
}

/**
 * Envolve a chamada a uma server function (`createServerFn`): se ela lançar
 * (sessão inválida → `Unauthorized: …` do middleware, rede, 500), devolve
 * `{ ok: false, reason }` com o motivo em linguagem do usuário em vez de
 * virar rejeição não tratada — e o chamador sempre consegue liberar o
 * estado `busy` no caminho normal.
 */
export async function chamarServidor<T extends { ok: boolean }>(
  acao: string,
  fn: () => Promise<T>,
): Promise<T | { ok: false; reason: string }> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: descreverErroSupabase({ message: msg }, acao) };
  }
}
