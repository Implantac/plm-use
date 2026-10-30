// Diff estrutural entre instantâneos de ficha (BOM/BOP/aplicações/pré-custo).
// Puro por contrato: recebe dois snapshots (ou nada) e devolve o que mudou —
// a UI só pinta. Versões antigas (pré-15/10) não têm snapshot; o diff devolve
// null e a tela degrada para o diff textual sem fingir que há dados.
import type { BomItem, BopStep, PreCost, TechSheetSnapshot } from "./store";
import { custoTotalBOM, custoTotalBOP, tempoTotalBOP } from "./store";
import { custoAplicacoesPecasTotal, type Aplicacao } from "./aplicacoes";

export type FieldChange = { field: string; from: string; to: string };
export type DiffRow = { label: string; kind: "add" | "rem" | "chg"; changes: FieldChange[] };
export type TableDiff = { added: DiffRow[]; removed: DiffRow[]; changed: DiffRow[]; kept: number };
export type SheetDiff = {
  bom: TableDiff;
  bop: TableDiff;
  aplicacoes?: TableDiff;
  preCost: FieldChange[];
  /** custo industrial (BOM+BOP+Aplicações) de B menos o de A, em R$ */
  custoIndustrialDelta: number;
  /** tempo total de operação de B menos o de A, em minutos */
  tempoBopDelta: number;
};

const BOM_FIELDS: Array<[keyof BomItem, string]> = [
  ["tipo", "Tipo"],
  ["material", "Material"],
  ["fornecedor", "Fornecedor"],
  ["consumo", "Consumo"],
  ["unidade", "Unidade"],
  ["perdaPct", "Perda %"],
  ["custo", "Custo"],
];
const BOP_FIELDS: Array<[keyof BopStep, string]> = [
  ["seq", "Seq"],
  ["etapa", "Etapa"],
  ["setor", "Setor"],
  ["tempoMin", "Tempo (min)"],
  ["custo", "Custo"],
];
const APP_FIELDS: Array<[keyof Aplicacao, string]> = [
  ["tipo", "Técnica"],
  ["posicao", "Posição"],
  ["larguraCm", "Largura (cm)"],
  ["alturaCm", "Altura (cm)"],
  ["cores", "Cores"],
  ["qtdPorPeca", "Qtd/peça"],
  ["custoUnitario", "Custo unit."],
];
const PRE_FIELDS: Array<[keyof PreCost, string]> = [
  ["targetCusto", "Meta de custo"],
  ["overheadPct", "Rateio %"],
  ["markupPct", "Markup %"],
  ["targetPreco", "Preço-alvo"],
];

export const fmtValue = (v: unknown): string => {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return String(v);
};

/** "1.2" vs 1.2 vs "1.20" são o mesmo valor; texto é comparado cru. */
function sameVal(x: unknown, y: unknown): boolean {
  const nx = typeof x === "number" ? x : Number.parseFloat(String(x));
  const ny = typeof y === "number" ? y : Number.parseFloat(String(y));
  if (Number.isFinite(nx) && Number.isFinite(ny)) return Math.abs(nx - ny) < 1e-9;
  return String(x ?? "").trim() === String(y ?? "").trim();
}

function diffTable<T extends { id: string }>(
  a: T[],
  b: T[],
  fields: Array<[keyof T, string]>,
  label: (row: T) => string,
): TableDiff {
  const mapB = new Map(b.map((r) => [r.id, r]));
  const mapA = new Map(a.map((r) => [r.id, r]));
  const out: TableDiff = { added: [], removed: [], changed: [], kept: 0 };
  for (const row of b) {
    const prev = mapA.get(row.id);
    if (!prev) {
      out.added.push({ label: label(row), kind: "add", changes: [] });
      continue;
    }
    const changes: FieldChange[] = [];
    for (const [key, name] of fields) {
      if (!sameVal(prev[key], row[key]))
        changes.push({ field: name, from: fmtValue(prev[key]), to: fmtValue(row[key]) });
    }
    if (changes.length) out.changed.push({ label: label(row), kind: "chg", changes });
    else out.kept++;
  }
  for (const row of a) {
    if (!mapB.has(row.id)) out.removed.push({ label: label(row), kind: "rem", changes: [] });
  }
  return out;
}

export function diffSnapshots(a?: TechSheetSnapshot, b?: TechSheetSnapshot): SheetDiff | null {
  if (!a || !b) return null;
  const preCost: FieldChange[] = [];
  for (const [key, name] of PRE_FIELDS) {
    if (!sameVal(a.preCost[key], b.preCost[key]))
      preCost.push({ field: name, from: fmtValue(a.preCost[key]), to: fmtValue(b.preCost[key]) });
  }
  const appsA = a.aplicacoes ?? [];
  const appsB = b.aplicacoes ?? [];
  const indA = custoTotalBOM(a.bom) + custoTotalBOP(a.bop) + custoAplicacoesPecasTotal(appsA);
  const indB = custoTotalBOM(b.bom) + custoTotalBOP(b.bop) + custoAplicacoesPecasTotal(appsB);

  return {
    bom: diffTable(a.bom, b.bom, BOM_FIELDS, (r) => `${r.tipo} · ${r.material}`),
    bop: diffTable(a.bop, b.bop, BOP_FIELDS, (r) => `#${r.seq} ${r.etapa}`),
    ...(appsA.length || appsB.length
      ? {
          aplicacoes: diffTable(appsA, appsB, APP_FIELDS, (r) => `${r.tipo} · ${r.posicao}`),
        }
      : {}),
    preCost,
    custoIndustrialDelta: indB - indA,
    tempoBopDelta: tempoTotalBOP(b.bop) - tempoTotalBOP(a.bop),
  };
}
