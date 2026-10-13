// Busca textual da tela de Coleções — extraída da rota para ser testável e
// reutilizável (o comparativo pode querer o mesmo corte depois).

import type { Collection } from "./store";

/** Normaliza para comparação: minúsculas, sem acentos (o público digita sem). */
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Substring simples sobre nome, marca, temporada e status, mais match numérico
 * direto por ano (buscar "2026" acha o ano sem depender do texto).
 */
export function filterCollections(list: Collection[], q: string): Collection[] {
  const needle = normalizeForSearch(q.trim());
  if (!needle) return list;
  return list.filter((c) => {
    const hay = normalizeForSearch([c.name, c.brand, c.season, c.status].filter(Boolean).join(" "));
    if (hay.includes(needle)) return true;
    return String(c.year) === needle;
  });
}
