// Serialização store ↔ tech_sheets (colunas jsonb bom/bop/versoes).
// O preCost mora dentro do envelope `bom = {v:1, items, preCost}` porque a
// tabela não tem coluna própria e o ambiente Lovable não aceita migration por
// nossa conta — um envelope versionado evita DDL novo e sobrevive a leitura de
// linhas legadas (bom como array puro, sem preCost).
import type { PreCost, TechSheetData } from "./store";

export const BOM_ENVELOPE_V = 1;

export const DEFAULT_PRE_COST: PreCost = {
  targetCusto: 0,
  overheadPct: 10,
  markupPct: 200,
};

export interface TechSheetRowOut {
  ref: string;
  bom: unknown;
  bop: unknown;
  versoes: unknown;
  created_by: string;
}

export function serializeTechSheetDoc(
  ref: string,
  doc: TechSheetData,
  uid: string,
): TechSheetRowOut {
  return {
    ref,
    bom: { v: BOM_ENVELOPE_V, items: doc.bom, preCost: doc.preCost },
    bop: doc.bop,
    versoes: doc.versoes,
    created_by: uid,
  };
}

interface LooseRow {
  ref: string;
  bom?: unknown;
  bop?: unknown;
  versoes?: unknown;
}

/** Linha → doc do store, tolerante: array legado vira items; sem preCost usa default. */
export function deserializeTechSheetRow(row: LooseRow): Omit<TechSheetData, never> {
  let items = row.bom;
  let preCost: PreCost = DEFAULT_PRE_COST;
  if (row.bom && typeof row.bom === "object" && !Array.isArray(row.bom)) {
    const env = row.bom as { v?: number; items?: unknown; preCost?: Partial<PreCost> };
    items = env.items;
    if (env.preCost && typeof env.preCost === "object") {
      preCost = { ...DEFAULT_PRE_COST, ...env.preCost };
    }
  }
  return {
    ref: row.ref,
    bom: Array.isArray(items) ? (items as TechSheetData["bom"]) : [],
    bop: Array.isArray(row.bop) ? (row.bop as TechSheetData["bop"]) : [],
    versoes: Array.isArray(row.versoes) ? (row.versoes as TechSheetData["versoes"]) : [],
    preCost,
  };
}

/** Guarda para dados vindos do cache antigo (persist do zustand pré-envelope). */
export function normalizeTechSheetDoc(
  doc: Partial<TechSheetData> & { ref: string },
): TechSheetData {
  return {
    ref: doc.ref,
    bom: Array.isArray(doc.bom) ? doc.bom : [],
    bop: Array.isArray(doc.bop) ? doc.bop : [],
    versoes: Array.isArray(doc.versoes) ? doc.versoes : [],
    preCost: doc.preCost ?? DEFAULT_PRE_COST,
  };
}
