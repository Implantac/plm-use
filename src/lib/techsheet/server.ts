// Serialização store ↔ tech_sheets (colunas jsonb bom/bop/versoes).
// O preCost e as extensões v3 (meta, colorways, medidas, etiquetagem,
// encaixeCad) moram dentro do envelope `bom = {v:3, items, preCost, ...}`
// porque a tabela não exige coluna nova no banco vivo e sobrevive à leitura
// de linhas v1, v2 e arrays legados.
import type { PreCost, TechSheetData, TechSheetMeta } from "./store";
import type {
  CadMarkerSpec,
  CareLabelSpec,
  TechSheetColorway,
  TechSheetMeasurementSpec,
} from "./textile";

export const BOM_ENVELOPE_V = 3;

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
    bom: {
      v: BOM_ENVELOPE_V,
      items: doc.bom,
      preCost: doc.preCost,
      aplicacoes: doc.aplicacoes,
      image: doc.image,
      ...(doc.meta ? { meta: doc.meta } : {}),
      ...(doc.colorways ? { colorways: doc.colorways } : {}),
      ...(doc.medidas ? { medidas: doc.medidas } : {}),
      ...(doc.etiquetagem ? { etiquetagem: doc.etiquetagem } : {}),
      ...(doc.encaixeCad ? { encaixeCad: doc.encaixeCad } : {}),
    },
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
  let aplicacoes: TechSheetData["aplicacoes"] = [];
  let image: string | undefined;
  let meta: TechSheetMeta | undefined;
  let colorways: TechSheetColorway[] | undefined;
  let medidas: TechSheetMeasurementSpec | undefined;
  let etiquetagem: CareLabelSpec | undefined;
  let encaixeCad: CadMarkerSpec | undefined;

  if (row.bom && typeof row.bom === "object" && !Array.isArray(row.bom)) {
    const env = row.bom as {
      v?: number;
      items?: unknown;
      preCost?: Partial<PreCost>;
      aplicacoes?: unknown;
      image?: unknown;
      meta?: unknown;
      colorways?: unknown;
      medidas?: unknown;
      etiquetagem?: unknown;
      encaixeCad?: unknown;
    };
    items = env.items;
    if (env.preCost && typeof env.preCost === "object") {
      preCost = { ...DEFAULT_PRE_COST, ...env.preCost };
    }
    if (Array.isArray(env.aplicacoes)) aplicacoes = env.aplicacoes as TechSheetData["aplicacoes"];
    if (typeof env.image === "string" && env.image.startsWith("https://")) image = env.image;
    if (env.meta && typeof env.meta === "object") meta = env.meta as TechSheetMeta;
    if (Array.isArray(env.colorways)) colorways = env.colorways as TechSheetColorway[];
    if (env.medidas && typeof env.medidas === "object") {
      medidas = env.medidas as TechSheetMeasurementSpec;
    }
    if (env.etiquetagem && typeof env.etiquetagem === "object") {
      etiquetagem = env.etiquetagem as CareLabelSpec;
    }
    if (env.encaixeCad && typeof env.encaixeCad === "object") {
      encaixeCad = env.encaixeCad as CadMarkerSpec;
    }
  }
  return {
    ref: row.ref,
    bom: Array.isArray(items) ? (items as TechSheetData["bom"]) : [],
    bop: Array.isArray(row.bop) ? (row.bop as TechSheetData["bop"]) : [],
    versoes: Array.isArray(row.versoes) ? (row.versoes as TechSheetData["versoes"]) : [],
    preCost,
    aplicacoes,
    ...(image ? { image } : {}),
    ...(meta ? { meta } : {}),
    ...(colorways ? { colorways } : {}),
    ...(medidas ? { medidas } : {}),
    ...(etiquetagem ? { etiquetagem } : {}),
    ...(encaixeCad ? { encaixeCad } : {}),
  };
}

/** Guarda para dados vindos do cache antigo (persist do zustand pré-envelope). */
export function normalizeTechSheetDoc(
  doc: Partial<TechSheetData> & { ref: string },
): TechSheetData {
  const cleanImg =
    typeof doc.image === "string" && doc.image.startsWith("https://") ? doc.image : undefined;
  return {
    ref: doc.ref,
    bom: Array.isArray(doc.bom) ? doc.bom : [],
    bop: Array.isArray(doc.bop) ? doc.bop : [],
    aplicacoes: Array.isArray(doc.aplicacoes) ? doc.aplicacoes : [],
    ...(cleanImg ? { image: cleanImg } : { image: undefined }),
    versoes: Array.isArray(doc.versoes) ? doc.versoes : [],
    preCost: doc.preCost ?? DEFAULT_PRE_COST,
    ...(doc.meta ? { meta: doc.meta } : {}),
    ...(Array.isArray(doc.colorways) ? { colorways: doc.colorways } : {}),
    ...(doc.medidas ? { medidas: doc.medidas } : {}),
    ...(doc.etiquetagem ? { etiquetagem: doc.etiquetagem } : {}),
    ...(doc.encaixeCad ? { encaixeCad: doc.encaixeCad } : {}),
  };
}
