// Collection map store (Mapa de Coleção)
// Matrix view: model × color × size grade. In-memory mock; migrate to
// server fn + `collection_matrix` when schema lands.

export type SizeGrade = "PP" | "P" | "M" | "G" | "GG";
export const SIZE_GRADES: SizeGrade[] = ["PP", "P", "M", "G", "GG"];

export type MatrixCell = {
  colorHex: string;
  colorName: string;
  grade: Partial<Record<SizeGrade, number>>; // qty planned per size
  status: "planejado" | "em_producao" | "concluido" | "cancelado";
};

export type MatrixRow = {
  refCode: string;
  refName: string;
  category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Acessório" | "Calçado";
  image: string;
  price: number;
  cost: number;
  cells: MatrixCell[];
};

export type CollectionMap = {
  id: string;
  name: string;
  season: string;
  brand: string;
  rows: MatrixRow[];
};

export type SavedFilter = {
  id: string;
  name: string;
  owner: string;
  categories: string[];
  colors: string[]; // hex list
  statuses: MatrixCell["status"][];
  createdAt: string;
};

export const collectionMap: CollectionMap = {
  id: "col-25-verao",
  name: "Verão 2025 · Amalfi",
  season: "Verão 25",
  brand: "Premium Luxe",
  rows: [
    {
      refCode: "V24-001",
      refName: "Blusa Linho Amalfi",
      category: "Top",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=200",
      price: 289,
      cost: 82,
      cells: [
        { colorHex: "#F3E9C8", colorName: "Marfim", status: "concluido", grade: { PP: 40, P: 80, M: 120, G: 80, GG: 40 } },
        { colorHex: "#C86B4A", colorName: "Terracota", status: "em_producao", grade: { PP: 20, P: 60, M: 90, G: 60, GG: 20 } },
        { colorHex: "#2E5A7A", colorName: "Azul Tirreno", status: "planejado", grade: { PP: 20, P: 40, M: 60, G: 40 } },
      ],
    },
    {
      refCode: "V24-014",
      refName: "Calça Wide Terracota",
      category: "Bottom",
      image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=200",
      price: 429,
      cost: 128,
      cells: [
        { colorHex: "#C86B4A", colorName: "Terracota", status: "em_producao", grade: { P: 60, M: 120, G: 80, GG: 40 } },
        { colorHex: "#2A2A2A", colorName: "Preto", status: "em_producao", grade: { PP: 30, P: 80, M: 140, G: 100, GG: 60 } },
      ],
    },
    {
      refCode: "V24-021",
      refName: "Vestido Midi Botânica",
      category: "Dress",
      image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=200",
      price: 599,
      cost: 178,
      cells: [
        { colorHex: "#3E8E4C", colorName: "Verde Botânica", status: "planejado", grade: { PP: 15, P: 45, M: 70, G: 40 } },
        { colorHex: "#F3E9C8", colorName: "Marfim", status: "cancelado", grade: { P: 20, M: 40 } },
      ],
    },
    {
      refCode: "V24-032",
      refName: "Camisa Oversized Cru",
      category: "Top",
      image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=200",
      price: 349,
      cost: 96,
      cells: [
        { colorHex: "#EDE7DA", colorName: "Cru", status: "concluido", grade: { PP: 30, P: 90, M: 140, G: 100, GG: 50 } },
        { colorHex: "#8C8A85", colorName: "Concreto", status: "em_producao", grade: { P: 40, M: 90, G: 60, GG: 30 } },
        { colorHex: "#1F3A5F", colorName: "Índigo", status: "planejado", grade: { PP: 20, P: 50, M: 80, G: 50 } },
      ],
    },
    {
      refCode: "V24-045",
      refName: "Saia Slip Âmbar",
      category: "Bottom",
      image: "https://images.unsplash.com/photo-1583496661160-fb5886a13d44?auto=format&fit=crop&q=80&w=200",
      price: 379,
      cost: 108,
      cells: [
        { colorHex: "#D9A05B", colorName: "Âmbar", status: "concluido", grade: { P: 40, M: 80, G: 60, GG: 30 } },
      ],
    },
    {
      refCode: "V24-052",
      refName: "Blazer Alfaiataria Concreto",
      category: "Outerwear",
      image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=200",
      price: 849,
      cost: 245,
      cells: [
        { colorHex: "#8C8A85", colorName: "Concreto", status: "planejado", grade: { P: 20, M: 40, G: 30 } },
        { colorHex: "#2A2A2A", colorName: "Preto", status: "planejado", grade: { PP: 10, P: 30, M: 50, G: 35, GG: 20 } },
      ],
    },
  ],
};

// Saved filters — per-user persistence would live server-side; localStorage
// keeps them across reloads in this mock.
const LS_KEY = "use-moda:collection-filters";

function loadFilters(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

let filters = loadFilters();
const listeners = new Set<() => void>();

export function listFilters(): SavedFilter[] {
  return filters;
}

export function saveFilter(f: SavedFilter) {
  filters = [f, ...filters.filter((x) => x.id !== f.id)];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_KEY, JSON.stringify(filters));
  }
  listeners.forEach((l) => l());
}

export function removeFilter(id: string) {
  filters = filters.filter((f) => f.id !== id);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LS_KEY, JSON.stringify(filters));
  }
  listeners.forEach((l) => l());
}

export function subscribeFilters(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Helpers
export function cellTotal(cell: MatrixCell): number {
  return Object.values(cell.grade).reduce((s, n) => s + (n ?? 0), 0);
}

export function rowTotal(row: MatrixRow): number {
  return row.cells.reduce((s, c) => s + cellTotal(c), 0);
}
