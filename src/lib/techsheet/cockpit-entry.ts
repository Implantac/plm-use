// Ponto de entrada do Cockpit de Ficha Técnica (Onda 31).
//
// Até aqui `/tech-sheet` sem parâmetro fazia `refParam || "DEV000006"`, chamava
// `ensure("DEV000006")` **dentro do seletor do Zustand** e a tela inteira nascia
// com a BOM, o BOP, os custos e o nome do modelo de demonstração. Dali o
// usuário exportava `MRP_COMPRAS_DEV000006_*.csv` e imprimia Ordem de Corte /
// Dossiê de Engenharia A4 — documentos de compra sobre um produto que não existe.
//
// Regra: sem `?ref=` e sem ficha salva, o cockpit não escolhe produto nenhum.

import type { SheetProvenance } from "./provenance";

/**
 * Resolve a referência ativa. `null` = nenhuma ficha para abrir (estado vazio).
 * Só devolve `DEV000006` se ela estiver em `salvas` — nunca como default.
 */
export function resolveCockpitRef(
  refParam: string | undefined | null,
  salvas: string[],
): string | null {
  const limpo = refParam?.trim().toUpperCase();
  if (limpo) return limpo;
  return salvas.length > 0 ? salvas[0]!.toUpperCase() : null;
}

/** Documento de engenharia/compras só sai de ficha salva pela empresa. */
export function podeEmitirDocumento(provenance: SheetProvenance): boolean {
  return provenance === "salva";
}
