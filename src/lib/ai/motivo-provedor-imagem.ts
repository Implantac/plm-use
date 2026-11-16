// Onda 94 — motivo em português para recusas do provedor de imagens.
/**
 * Onda 94 — traduz a recusa do provedor de imagens para o porquê, em
 * linguagem do usuário, sem repassar o texto cru. `detalhe` só decide a
 * classe (ex.: política de conteúdo) e nunca aparece na mensagem.
 */
export function motivoDoProvedor(status: number, detalhe = ""): string {
  const d = detalhe.toLowerCase();
  if (status === 402)
    return "Créditos de IA esgotados. Adicione créditos ao workspace para voltar a gerar imagens.";
  if (status === 429) return "Limite temporário de geração. Tente novamente em alguns segundos.";
  if (status === 401 || status === 403)
    return "A chave do provedor de imagens foi recusada neste ambiente. Avise o administrador.";
  if (status === 400 && /safety|policy|moderation|content/.test(d))
    return "O provedor recusou a descrição por política de conteúdo. Reescreva o pedido sem termos sensíveis.";
  if (status === 400 || status === 413 || status === 422)
    return "O provedor não aceitou o pedido (descrição ou imagem de referência). Simplifique e tente de novo.";
  if (status >= 500)
    return `O provedor de imagens está instável (HTTP ${status}). Tente novamente em instantes.`;
  return `Não foi possível gerar esta imagem (HTTP ${status}). Tente novamente.`;
}
