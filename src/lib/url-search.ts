// Contrato único de "busca na URL" das telas: ?q=<string limpa>.
// Parse defensivo: qualquer lixo (número, array, vazio) vira ausência — link
// compartilhado nunca quebra a tela. Componentes usam navigate({search}) com
// replace:true para não inundar o histórico do navegador a cada tecla.

export type QSearch = { q?: string };

export function parseQSearch(raw: Record<string, unknown>): QSearch {
  return typeof raw.q === "string" && raw.q.trim() ? { q: raw.q } : {};
}
