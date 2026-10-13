// Estado de busca da tela de Coleções na URL (compartilhável por link).
// Mora fora da rota por dois motivos: react-refresh só gosta de componentes no
// arquivo-export, e assim o parse fica testável sem montar o router.

export type CollectionsSearch = { q?: string };

/** Aceita apenas string limpa; lixo na URL vira ausência (link torto não quebra a tela). */
export function collectionsValidateSearch(raw: Record<string, unknown>): CollectionsSearch {
  return typeof raw.q === "string" && raw.q.trim() ? { q: raw.q } : {};
}
