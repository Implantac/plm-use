// Color palette store (Cartela de Cores)
// In-memory dataset following the same pattern as src/lib/collections/store.ts.
// Replace with a server fn + `color_palettes` table when the schema lands.

export type ColorRef = {
  id: string;
  name: string; // "Verde Amêndoa"
  hex: string; // "#7FA88B"
  pantone?: string; // "16-5533 TCX"
  supplier?: string; // fornecedor sugerido do tingimento
  season?: string; // estação-alvo
  usageCount?: number; // nº de refs usando essa cor
};

export type ColorPalette = {
  id: string;
  name: string;
  season: string; // "Verão 25", "Alto Verão 26"
  brand: string;
  mood: string; // curto — inspiração
  cover: string; // url image
  status: "rascunho" | "em_revisao" | "aprovada" | "arquivada";
  colors: ColorRef[];
  updatedAt: string; // ISO
  linkedRefs: number; // qtde de referências vinculadas
};

export const palettesSeed: ColorPalette[] = [
  {
    id: "pal-01",
    name: "Amalfi Sunset",
    season: "Verão 25",
    brand: "Premium Luxe",
    mood: "Costa italiana ao entardecer — terracotas, âmbar e mar",
    cover:
      "https://images.unsplash.com/photo-1499084732479-de2c02d45fcc?auto=format&fit=crop&q=80&w=900",
    status: "aprovada",
    updatedAt: "2026-06-28",
    linkedRefs: 42,
    colors: [
      {
        id: "c1",
        name: "Terracota Amalfi",
        hex: "#C86B4A",
        pantone: "17-1547 TCX",
        supplier: "Cataguases",
        season: "Verão 25",
        usageCount: 18,
      },
      {
        id: "c2",
        name: "Âmbar Toscano",
        hex: "#D9A05B",
        pantone: "15-1132 TCX",
        supplier: "Cataguases",
        usageCount: 11,
      },
      {
        id: "c3",
        name: "Azul Tirreno",
        hex: "#2E5A7A",
        pantone: "18-4041 TCX",
        supplier: "Santista",
        usageCount: 9,
      },
      {
        id: "c4",
        name: "Marfim Limoncello",
        hex: "#F3E9C8",
        pantone: "11-0619 TCX",
        supplier: "Cedro",
        usageCount: 22,
      },
      { id: "c5", name: "Verde Oliva", hex: "#7A8B4F", pantone: "17-0535 TCX", usageCount: 6 },
    ],
  },
  {
    id: "pal-02",
    name: "Urban Resort",
    season: "Alto Verão 25",
    brand: "Basic Chic",
    mood: "Concreto polido + palha crua — neutros quentes",
    cover:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=900",
    status: "em_revisao",
    updatedAt: "2026-07-02",
    linkedRefs: 18,
    colors: [
      { id: "c6", name: "Areia Molhada", hex: "#B8A48C", pantone: "15-1213 TCX", usageCount: 8 },
      { id: "c7", name: "Palha Natural", hex: "#D6C7A1", pantone: "13-0917 TCX", usageCount: 7 },
      { id: "c8", name: "Concreto", hex: "#8C8A85", pantone: "16-3801 TCX", usageCount: 5 },
      { id: "c9", name: "Preto Fumaça", hex: "#2A2A2A", pantone: "19-4005 TCX", usageCount: 12 },
    ],
  },
  {
    id: "pal-03",
    name: "Denim Blue Core",
    season: "Continuativo",
    brand: "Core",
    mood: "Jeans do índigo profundo ao lavado sol",
    cover:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=900",
    status: "aprovada",
    updatedAt: "2026-05-14",
    linkedRefs: 71,
    colors: [
      {
        id: "c10",
        name: "Índigo Puro",
        hex: "#1F3A5F",
        pantone: "19-4028 TCX",
        supplier: "Santista",
        usageCount: 24,
      },
      {
        id: "c11",
        name: "Denim Médio",
        hex: "#4A6E92",
        pantone: "17-4041 TCX",
        supplier: "Santista",
        usageCount: 31,
      },
      {
        id: "c12",
        name: "Lavado Sol",
        hex: "#8FAAC4",
        pantone: "15-4020 TCX",
        supplier: "Vicunha",
        usageCount: 12,
      },
      { id: "c13", name: "Cru", hex: "#EDE7DA", pantone: "11-0507 TCX", usageCount: 14 },
    ],
  },
];

// Simple in-memory subscription so multiple views stay in sync.
type Listener = () => void;
const listeners = new Set<Listener>();
let palettes = [...palettesSeed];

export function listPalettes(): ColorPalette[] {
  return palettes;
}

export function getPalette(id: string): ColorPalette | undefined {
  return palettes.find((p) => p.id === id);
}

import { emitLocalEvent } from "@/lib/local-events/store";

export function upsertPalette(next: ColorPalette) {
  const idx = palettes.findIndex((p) => p.id === next.id);
  const prev = idx === -1 ? null : palettes[idx];
  if (idx === -1) palettes = [next, ...palettes];
  else palettes = palettes.map((p, i) => (i === idx ? next : p));
  listeners.forEach((l) => l());
  if (!prev) {
    emitLocalEvent({
      entity_type: "color_palette",
      entity_id: next.id,
      event_type: "created",
      to_status: next.status,
      note: `Cartela "${next.name}" criada`,
    });
  } else if (prev.status !== next.status) {
    emitLocalEvent({
      entity_type: "color_palette",
      entity_id: next.id,
      event_type: "status_changed",
      from_status: prev.status,
      to_status: next.status,
    });
  } else {
    emitLocalEvent({
      entity_type: "color_palette",
      entity_id: next.id,
      event_type: "updated",
      note: `Cartela atualizada · ${next.colors.length} cores`,
    });
  }
}

export function addColorToPalette(paletteId: string, color: ColorRef) {
  const p = getPalette(paletteId);
  if (!p) return;
  palettes = palettes.map((x) =>
    x.id === paletteId
      ? { ...x, colors: [...x.colors, color], updatedAt: new Date().toISOString().slice(0, 10) }
      : x,
  );
  listeners.forEach((l) => l());
  emitLocalEvent({
    entity_type: "color_palette",
    entity_id: paletteId,
    event_type: "color_added",
    note: `Cor "${color.name}" (${color.hex})`,
  });
}

export function removeColor(paletteId: string, colorId: string) {
  const p = getPalette(paletteId);
  if (!p) return;
  const removed = p.colors.find((c) => c.id === colorId);
  palettes = palettes.map((x) =>
    x.id === paletteId
      ? {
          ...x,
          colors: x.colors.filter((c) => c.id !== colorId),
          updatedAt: new Date().toISOString().slice(0, 10),
        }
      : x,
  );
  listeners.forEach((l) => l());
  emitLocalEvent({
    entity_type: "color_palette",
    entity_id: paletteId,
    event_type: "color_removed",
    note: removed ? `Cor "${removed.name}" removida` : "Cor removida",
  });
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Repositor de hidratação (creative-sync): substitui o snapshot inteiro sem
// emitir eventos de auditoria locais — quem chama é o sync, não o usuário.
export function replaceAllPalettes(next: ColorPalette[]) {
  palettes = next;
  listeners.forEach((l) => l());
}

// Contrast helper — returns black or white for readable label on a swatch.
export function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.6 ? "#000" : "#fff";
}
