// Prints library store (Cartela de Estampas)
// Same in-memory pattern as src/lib/colors/store.ts. Replace with a server fn
// + `print_library` table when the schema lands.

export type PrintVersion = {
  id: string;
  label: string; // "v1", "v2 - repeat menor"
  createdAt: string; // ISO date
  createdBy: string;
  note?: string;
  image: string; // preview URL of that version
};

export type PrintAsset = {
  id: string;
  code: string; // "EST-0142"
  name: string; // "Floral Amalfi"
  tecnica: "digital" | "rotativa" | "localizada" | "sublimacao" | "silk";
  repeat: { widthCm: number; heightCm: number }; // rapport
  colorCount: number; // qtde de cores no CMYK/spot
  colors: string[]; // hex principais
  supplier?: string; // estamparia parceira
  season?: string; // Verão 25
  brand?: string;
  status: "rascunho" | "em_prova" | "aprovada" | "arquivada";
  cover: string; // last approved preview
  fileFormat: "AI" | "PSD" | "SVG" | "TIFF" | "PDF";
  fileSizeMb?: number;
  linkedRefs: number;
  updatedAt: string;
  tags: string[];
  versions: PrintVersion[];
};

export const printsSeed: PrintAsset[] = [
  {
    id: "est-01",
    code: "EST-0142",
    name: "Floral Amalfi",
    tecnica: "digital",
    repeat: { widthCm: 42, heightCm: 60 },
    colorCount: 8,
    colors: ["#C86B4A", "#D9A05B", "#2E5A7A", "#F3E9C8", "#7A8B4F"],
    supplier: "Estamparia Zanotti",
    season: "Verão 25",
    brand: "Premium Luxe",
    status: "aprovada",
    cover:
      "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=900",
    fileFormat: "AI",
    fileSizeMb: 24.8,
    linkedRefs: 12,
    updatedAt: "2026-06-30",
    tags: ["floral", "riviera", "verão"],
    versions: [
      {
        id: "v1",
        label: "v1",
        createdAt: "2026-05-12",
        createdBy: "Estilo",
        note: "Primeira arte com repeat 60cm",
        image:
          "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=600",
      },
      {
        id: "v2",
        label: "v2",
        createdAt: "2026-06-08",
        createdBy: "Estilo",
        note: "Repeat reduzido para 42cm, melhor aproveitamento",
        image:
          "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=600",
      },
      {
        id: "v3",
        label: "v3 · aprovada",
        createdAt: "2026-06-30",
        createdBy: "Estamparia Zanotti",
        note: "Prova física aprovada",
        image:
          "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&q=80&w=600",
      },
    ],
  },
  {
    id: "est-02",
    code: "EST-0158",
    name: "Geo Concreto",
    tecnica: "rotativa",
    repeat: { widthCm: 18, heightCm: 22 },
    colorCount: 3,
    colors: ["#B8A48C", "#2A2A2A", "#D6C7A1"],
    supplier: "Cataguases",
    season: "Alto Verão 25",
    brand: "Basic Chic",
    status: "em_prova",
    cover:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=900",
    fileFormat: "SVG",
    fileSizeMb: 3.2,
    linkedRefs: 4,
    updatedAt: "2026-07-04",
    tags: ["geométrico", "neutro"],
    versions: [
      {
        id: "v1",
        label: "v1",
        createdAt: "2026-06-25",
        createdBy: "Estilo",
        image:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=600",
      },
      {
        id: "v2",
        label: "v2 · em prova",
        createdAt: "2026-07-04",
        createdBy: "Cataguases",
        note: "Ajuste de contraste para rotativa",
        image:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=600",
      },
    ],
  },
  {
    id: "est-03",
    code: "EST-0163",
    name: "Denim Wash Texture",
    tecnica: "sublimacao",
    repeat: { widthCm: 150, heightCm: 100 },
    colorCount: 5,
    colors: ["#1F3A5F", "#4A6E92", "#8FAAC4", "#EDE7DA"],
    supplier: "Santista",
    season: "Continuativo",
    brand: "Core",
    status: "aprovada",
    cover:
      "https://images.unsplash.com/photo-1608228088998-57828365d486?auto=format&fit=crop&q=80&w=900",
    fileFormat: "TIFF",
    fileSizeMb: 128.4,
    linkedRefs: 24,
    updatedAt: "2026-04-18",
    tags: ["denim", "textura", "core"],
    versions: [
      {
        id: "v1",
        label: "v1 · aprovada",
        createdAt: "2026-04-18",
        createdBy: "Estilo",
        image:
          "https://images.unsplash.com/photo-1608228088998-57828365d486?auto=format&fit=crop&q=80&w=600",
      },
    ],
  },
  {
    id: "est-04",
    code: "EST-0170",
    name: "Botânica Tropical",
    tecnica: "localizada",
    repeat: { widthCm: 0, heightCm: 0 },
    colorCount: 12,
    colors: ["#0F5132", "#3E8E4C", "#E63946", "#F1FAEE"],
    supplier: "—",
    season: "Verão 26",
    brand: "Premium Luxe",
    status: "rascunho",
    cover:
      "https://images.unsplash.com/photo-1517640287-9dc38ca61b4b?auto=format&fit=crop&q=80&w=900",
    fileFormat: "PSD",
    fileSizeMb: 84.1,
    linkedRefs: 0,
    updatedAt: "2026-07-07",
    tags: ["tropical", "localizada", "novidade"],
    versions: [
      {
        id: "v1",
        label: "v1 · rascunho",
        createdAt: "2026-07-07",
        createdBy: "Estilo",
        note: "Estudo inicial de posicionamento no busto",
        image:
          "https://images.unsplash.com/photo-1517640287-9dc38ca61b4b?auto=format&fit=crop&q=80&w=600",
      },
    ],
  },
];

type Listener = () => void;
const listeners = new Set<Listener>();
let prints = [...printsSeed];

export function listPrints(): PrintAsset[] {
  return prints;
}

export function getPrint(id: string): PrintAsset | undefined {
  return prints.find((p) => p.id === id);
}

import { emitLocalEvent } from "@/lib/local-events/store";

export function upsertPrint(next: PrintAsset) {
  const idx = prints.findIndex((p) => p.id === next.id);
  const prev = idx === -1 ? null : prints[idx];
  if (idx === -1) prints = [next, ...prints];
  else prints = prints.map((p, i) => (i === idx ? next : p));
  listeners.forEach((l) => l());
  if (!prev) {
    emitLocalEvent({
      entity_type: "print_design",
      entity_id: next.id,
      event_type: "created",
      to_status: next.status,
      note: `Estampa ${next.code} "${next.name}"`,
    });
  } else if (prev.status !== next.status) {
    emitLocalEvent({
      entity_type: "print_design",
      entity_id: next.id,
      event_type: "status_changed",
      from_status: prev.status,
      to_status: next.status,
    });
  } else {
    emitLocalEvent({
      entity_type: "print_design",
      entity_id: next.id,
      event_type: "updated",
    });
  }
}

export function addVersion(printId: string, v: PrintVersion) {
  const p = getPrint(printId);
  if (!p) return;
  prints = prints.map((x) =>
    x.id === printId
      ? {
          ...x,
          versions: [v, ...x.versions],
          cover: v.image,
          updatedAt: new Date().toISOString().slice(0, 10),
        }
      : x,
  );
  listeners.forEach((l) => l());
  emitLocalEvent({
    entity_type: "print_design",
    entity_id: printId,
    event_type: "updated",
    note: `Nova versão ${v.label}${v.note ? ` — ${v.note}` : ""}`,
    actor_name: v.createdBy,
  });
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
