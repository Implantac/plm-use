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
  if (code === "PGRST301" || lower.includes("jwt expired") || lower.includes("invalid jwt")) {
    return `Não foi possível ${acao}: sua sessão expirou. Entre novamente e repita a ação.`;
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
