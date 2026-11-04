// Procedência de uma ficha técnica usada em tela.
//
// Várias telas fazem `sheetsMap[code] ?? seedFor(code)`: se o usuário ainda não
// salvou a ficha, a tela cai no seed de demonstração e passa a exibir números
// com cara de operação. O fallback em si é útil (a tela nunca fica vazia), mas
// precisa ser dito — senão o gestor lê referência como se fosse ficha aprovada.
//
// Este módulo centraliza essa decisão para que a tela não invente a sua.

import { seedFor, type TechSheetData } from "@/lib/techsheet/store";

/**
 * - `salva`      → existe no store por trabalho do usuário (editada/clonada).
 * - `template`   → existe no store só porque `ensure()` materializou o modelo de
 *                  demonstração. Antes isso virava "salva" e o selo mentia.
 * - `referencia` → nem está no store; a tela está caindo direto no `seedFor`.
 */
export type SheetProvenance = "salva" | "template" | "referencia";

export interface SheetUsage {
  code: string;
  provenance: SheetProvenance;
}

/**
 * A ficha é trabalho do usuário, materialização do modelo, ou seed?
 *
 * `materializadas` é o mapa do store com as refs criadas por `ensure()` e ainda
 * sem edição. Omitir o mapa mantém o comportamento antigo (presença = salva) —
 * útil em testes e em chamadas antigas.
 */
export function sheetProvenance(
  sheets: Record<string, TechSheetData> | undefined,
  code: string,
  materializadas?: Record<string, true> | undefined,
): SheetProvenance {
  if (!sheets?.[code]) return "referencia";
  return materializadas?.[code] ? "template" : "salva";
}

/**
 * Resolve a ficha e devolve junto de onde ela veio, para a tela poder rotular.
 * `fallback` é o produtor do seed (normalmente `seedFor`).
 */
export function resolveSheet(
  sheets: Record<string, TechSheetData> | undefined,
  code: string,
  fallback: (code: string) => TechSheetData,
  materializadas?: Record<string, true> | undefined,
): { doc: TechSheetData; provenance: SheetProvenance } {
  const saved = sheets?.[code];
  if (!saved) return { doc: fallback(code), provenance: "referencia" };
  return { doc: saved, provenance: sheetProvenance(sheets, code, materializadas) };
}

/**
 * Referências que a tela pode oferecer **como decisão operacional**.
 *
 * Várias telas montam a lista assim:
 *
 *     new Set(["DEV000006", "V24-001", "U25-014", "I25-088", ...Object.keys(sheets)])
 *
 * Isso oferece quatro fichas de demonstração como se fossem produto da empresa —
 * o usuário aprova um gate, libera corte ou manda cotação em cima de um exemplo.
 * Só a ficha salva é operação; a referência é vitrine.
 *
 * `incluirReferencias` existe para as telas em que mostrar o exemplo é didático
 * (vitrine, paleta de referência), nunca para as que decidem.
 */
export function operationalCodes(
  sheets: Record<string, TechSheetData> | undefined,
  incluirReferencias: string[] = [],
  materializadas?: Record<string, true> | undefined,
): string[] {
  const salvas = Object.keys(sheets ?? {}).filter((c) => !materializadas?.[c]);
  return Array.from(new Set([...salvas, ...incluirReferencias]));
}

/** Resumo para o cabeçalho da tela quando ela mostra várias fichas. */
export function summarizeSheets(
  sheets: Record<string, TechSheetData> | undefined,
  codes: string[],
  materializadas?: Record<string, true> | undefined,
): {
  total: number;
  salvas: number;
  referencias: number;
  templates: number;
  codesReferencia: string[];
} {
  const referencias = codes.filter(
    (c) => sheetProvenance(sheets, c, materializadas) === "referencia",
  );
  const templates = codes.filter((c) => sheetProvenance(sheets, c, materializadas) === "template");
  return {
    total: codes.length,
    salvas: codes.length - referencias.length - templates.length,
    referencias: referencias.length,
    templates: templates.length,
    codesReferencia: [...referencias, ...templates],
  };
}

/**
 * A ficha está **intacta** em relação ao modelo? (ninguém editou nada)
 *
 * `seedFor()` é determinístico — sem uuid, sem data de agora. Então a
 * comparação estrutural é confiável: se o documento persistido é idêntico ao
 * que o modelo produz, nenhuma edição humana aconteceu sobre ele.
 *
 * Serve para migrar o store que já está no navegador de quem usou o sistema
 * antes da Onda 22: essas fichas foram materializadas por `ensure()` e não têm
 * o mapa `materializadas` — sem esta checagem continuariam se passando por
 * "fichas salvas".
 *
 * Falso negativo possível: ficha editada e devolvida ao estado exato do modelo.
 * Nesse caso tratá-la como template é o resultado correto — o conteúdo É o modelo.
 */
export function isPristineSheet(doc: TechSheetData, ref: string): boolean {
  try {
    return JSON.stringify(doc) === JSON.stringify(seedFor(ref));
  } catch {
    return false;
  }
}

/** Refs do store que são cópia intacta do modelo. */
export function pristineRefs(sheets: Record<string, TechSheetData> | undefined): string[] {
  return Object.entries(sheets ?? {})
    .filter(([ref, doc]) => isPristineSheet(doc, ref))
    .map(([ref]) => ref);
}
