// Biblioteca de Materiais (módulo 11 do creative-sync) — catálogo reutilizável
// de tecidos, aviamentos, linhas, embalagens, bordados e silk que alimenta o
// BOM das fichas técnicas. Contrato igual aos módulos 1–10: objeto serializável
// + replaceAll como repositor de hidratação; o engine cuida de push (chave
// external_key), prune de exclusões e realtime. Antes do db push do SQL
// 20261014220000 o store vive só no dispositivo — degradação graciosa, sem
// feature-flag (mesma filosofia das telas criativas em julho).

import { useSyncExternalStore } from "react";
import type { BomItem } from "@/lib/techsheet/store";

export const MATERIAL_TIPOS = [
  "Tecido",
  "Aviamento",
  "Linha",
  "Embalagem",
  "Bordado",
  "Silk",
] as const;
export type MaterialTipo = (typeof MATERIAL_TIPOS)[number];

export interface MaterialItem {
  id: string;
  name: string;
  tipo: MaterialTipo;
  supplier: string;
  unit: string;
  unitCost: number;
  sku: string;
  notes: string;
}

export const materialsSeed: MaterialItem[] = [
  {
    id: "mat-01",
    name: "Linho Puro Off-White",
    tipo: "Tecido",
    supplier: "Têxtil Camargo",
    unit: "m",
    unitCost: 42,
    sku: "TC-220",
    notes: "Lote de referência da coleção Verão.",
  },
  {
    id: "mat-02",
    name: "Botão Madre Pérola 18L",
    tipo: "Aviamento",
    supplier: "Aviamentos Real",
    unit: "un",
    unitCost: 3,
    sku: "AR-MP18",
    notes: "",
  },
  {
    id: "mat-03",
    name: "Linha Poliéster 120",
    tipo: "Linha",
    supplier: "Coats Corrente",
    unit: "m",
    unitCost: 0.0125,
    sku: "CC-120",
    notes: "Caixa de 5.000 m.",
  },
  {
    id: "mat-04",
    name: "Tag Luxury + Polybag",
    tipo: "Embalagem",
    supplier: "EmbalaPlus",
    unit: "un",
    unitCost: 4.5,
    sku: "EP-LUX",
    notes: "",
  },
];

let items: MaterialItem[] = [...materialsSeed];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useMaterials(): MaterialItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => items,
  );
}

export function listMaterials(): MaterialItem[] {
  return items;
}

export function subscribeMaterials(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function upsertMaterial(next: MaterialItem) {
  const idx = items.findIndex((m) => m.id === next.id);
  if (idx === -1) items = [...items, next];
  else items = items.map((m, j) => (j === idx ? next : m));
  emit();
}

export function removeMaterial(id: string) {
  items = items.filter((m) => m.id !== id);
  emit();
}

/** Repositor de hidratação (creative-sync) — ver colors/store.ts. */
export function replaceAllMaterials(next: MaterialItem[]) {
  items = next;
  emit();
}

/** Validação do form — pura, como `validateKpiDraft` (S7). */
export function validateMaterialDraft(d: { name: string; unitCost: number; unit: string }) {
  if (d.name.trim().length < 2) return "Dê um nome ao material (2+ caracteres).";
  if (!Number.isFinite(d.unitCost) || d.unitCost < 0)
    return "Custo unitário inválido — use um número ≥ 0.";
  if (!d.unit.trim()) return "Informe a unidade de medida (m, un, kg…).";
  return null;
}

export function filterMaterials(list: MaterialItem[], q: string): MaterialItem[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((m) =>
    `${m.name} ${m.sku} ${m.supplier} ${m.tipo}`.toLowerCase().includes(needle),
  );
}

/** Conversão catálogo → linha de BOM (o que o botão "Do catálogo" insere). */
export function materialForBom(m: MaterialItem): Omit<BomItem, "id"> {
  return {
    tipo: m.tipo,
    material: m.name,
    fornecedor: m.supplier,
    consumo: "1",
    unidade: m.unit,
    custo: m.unitCost,
    ...(m.sku ? { lote: m.sku } : {}),
  };
}
