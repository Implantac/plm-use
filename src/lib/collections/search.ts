// Estado de busca da tela de Coleções na URL (compartilhável por link) e
// paginação da grade. Mora fora da rota por dois motivos: react-refresh só
// gosta de componentes no arquivo-export, e as funções ficam testáveis sem
// montar o router.

import { parseQSearch, type QSearch } from "@/lib/url-search";

export type CollectionsSearch = QSearch;

/** Delega ao parser genérico (mesmo contrato de /analytics). */
export function collectionsValidateSearch(raw: Record<string, unknown>): CollectionsSearch {
  return parseQSearch(raw);
}

/** Paginação incremental da grade — exportada pura p/ teste. */
export const COLLECTIONS_PAGE = 12;
export function paginateVisible<T>(items: T[], pageSize = COLLECTIONS_PAGE) {
  return { shown: items.slice(0, pageSize), remaining: Math.max(0, items.length - pageSize) };
}
