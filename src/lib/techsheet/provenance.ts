// Procedência de uma ficha técnica usada em tela.
//
// Várias telas fazem `sheetsMap[code] ?? seedFor(code)`: se o usuário ainda não
// salvou a ficha, a tela cai no seed de demonstração e passa a exibir números
// com cara de operação. O fallback em si é útil (a tela nunca fica vazia), mas
// precisa ser dito — senão o gestor lê referência como se fosse ficha aprovada.
//
// Este módulo centraliza essa decisão para que a tela não invente a sua.

import type { TechSheetData } from "@/lib/techsheet/store";

export type SheetProvenance = "salva" | "referencia";

export interface SheetUsage {
  code: string;
  provenance: SheetProvenance;
}

/** A ficha existe no store (foi aberta/salva pelo usuário) ou é seed? */
export function sheetProvenance(
  sheets: Record<string, TechSheetData> | undefined,
  code: string,
): SheetProvenance {
  return sheets?.[code] ? "salva" : "referencia";
}

/**
 * Resolve a ficha e devolve junto de onde ela veio, para a tela poder rotular.
 * `fallback` é o produtor do seed (normalmente `seedFor`).
 */
export function resolveSheet(
  sheets: Record<string, TechSheetData> | undefined,
  code: string,
  fallback: (code: string) => TechSheetData,
): { doc: TechSheetData; provenance: SheetProvenance } {
  const saved = sheets?.[code];
  return saved
    ? { doc: saved, provenance: "salva" }
    : { doc: fallback(code), provenance: "referencia" };
}

/** Resumo para o cabeçalho da tela quando ela mostra várias fichas. */
export function summarizeSheets(
  sheets: Record<string, TechSheetData> | undefined,
  codes: string[],
): { total: number; salvas: number; referencias: number; codesReferencia: string[] } {
  const referencias = codes.filter((c) => sheetProvenance(sheets, c) === "referencia");
  return {
    total: codes.length,
    salvas: codes.length - referencias.length,
    referencias: referencias.length,
    codesReferencia: referencias,
  };
}
