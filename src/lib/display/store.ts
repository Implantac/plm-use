// Display board store (Painel de Displayagem)
// Free-form drag-drop canvas grouping references into lookbooks/coordenados
// before showroom publishing. In-memory mock; migrate to `display_boards`
// table when the schema lands.

export type BoardItem = {
  id: string;
  refCode: string;
  refName: string;
  image: string;
  category: string;
  colorHex?: string;
  price?: number;
  // percent position on the canvas (0-100) so it scales responsively
  x: number;
  y: number;
  w: number; // width in percent
};

export type DisplayBoard = {
  id: string;
  name: string;
  season: string;
  target: string; // "Multimarcas RJ", "E-commerce hero"
  status: "rascunho" | "em_revisao" | "aprovada";
  cover: string;
  updatedAt: string;
  bgColor: string; // canvas background
  items: BoardItem[];
};

// Pool of references available to drag onto the canvas.
export type RefCatalog = {
  code: string;
  name: string;
  category: string;
  image: string;
  colorHex: string;
  price: number;
};

export const refCatalog: RefCatalog[] = [
  {
    code: "V24-001",
    name: "Blusa Linho Amalfi",
    category: "Top",
    image:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=400",
    colorHex: "#F3E9C8",
    price: 289,
  },
  {
    code: "V24-014",
    name: "Calça Wide Terracota",
    category: "Bottom",
    image:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=400",
    colorHex: "#C86B4A",
    price: 429,
  },
  {
    code: "V24-021",
    name: "Vestido Midi Botânica",
    category: "Dress",
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=400",
    colorHex: "#3E8E4C",
    price: 599,
  },
  {
    code: "V24-032",
    name: "Camisa Oversized Cru",
    category: "Top",
    image:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=400",
    colorHex: "#EDE7DA",
    price: 349,
  },
  {
    code: "V24-045",
    name: "Saia Slip Âmbar",
    category: "Bottom",
    image:
      "https://images.unsplash.com/photo-1583496661160-fb5886a13d44?auto=format&fit=crop&q=80&w=400",
    colorHex: "#D9A05B",
    price: 379,
  },
  {
    code: "V24-052",
    name: "Blazer Alfaiataria Concreto",
    category: "Outerwear",
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=400",
    colorHex: "#8C8A85",
    price: 849,
  },
  {
    code: "V24-063",
    name: "Bolsa Estruturada Índigo",
    category: "Acessório",
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=400",
    colorHex: "#1F3A5F",
    price: 459,
  },
  {
    code: "V24-071",
    name: "Sandália Trama Palha",
    category: "Calçado",
    image:
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=400",
    colorHex: "#D6C7A1",
    price: 399,
  },
];

export const boardsSeed: DisplayBoard[] = [
  {
    id: "board-01",
    name: "Look Amalfi · Costa",
    season: "Verão 25",
    target: "Multimarcas RJ",
    status: "aprovada",
    cover:
      "https://images.unsplash.com/photo-1499084732479-de2c02d45fcc?auto=format&fit=crop&q=80&w=600",
    updatedAt: "2026-07-01",
    bgColor: "#F3E9C8",
    items: [
      {
        id: "i1",
        refCode: "V24-001",
        refName: "Blusa Linho Amalfi",
        image: refCatalog[0].image,
        category: "Top",
        colorHex: "#F3E9C8",
        price: 289,
        x: 12,
        y: 18,
        w: 22,
      },
      {
        id: "i2",
        refCode: "V24-014",
        refName: "Calça Wide Terracota",
        image: refCatalog[1].image,
        category: "Bottom",
        colorHex: "#C86B4A",
        price: 429,
        x: 40,
        y: 28,
        w: 24,
      },
      {
        id: "i3",
        refCode: "V24-063",
        refName: "Bolsa Estruturada Índigo",
        image: refCatalog[6].image,
        category: "Acessório",
        colorHex: "#1F3A5F",
        price: 459,
        x: 70,
        y: 20,
        w: 16,
      },
      {
        id: "i4",
        refCode: "V24-071",
        refName: "Sandália Trama Palha",
        image: refCatalog[7].image,
        category: "Calçado",
        colorHex: "#D6C7A1",
        price: 399,
        x: 72,
        y: 62,
        w: 18,
      },
    ],
  },
  {
    id: "board-02",
    name: "Urban Neutros · Hero E-com",
    season: "Alto Verão 25",
    target: "E-commerce hero",
    status: "em_revisao",
    cover:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=600",
    updatedAt: "2026-07-05",
    bgColor: "#B8A48C",
    items: [
      {
        id: "i5",
        refCode: "V24-032",
        refName: "Camisa Oversized Cru",
        image: refCatalog[3].image,
        category: "Top",
        colorHex: "#EDE7DA",
        price: 349,
        x: 18,
        y: 22,
        w: 24,
      },
      {
        id: "i6",
        refCode: "V24-052",
        refName: "Blazer Alfaiataria Concreto",
        image: refCatalog[5].image,
        category: "Outerwear",
        colorHex: "#8C8A85",
        price: 849,
        x: 50,
        y: 20,
        w: 26,
      },
    ],
  },
];

type Listener = () => void;
const listeners = new Set<Listener>();
let boards = [...boardsSeed];

export function listBoards(): DisplayBoard[] {
  return boards;
}

export function getBoard(id: string): DisplayBoard | undefined {
  return boards.find((b) => b.id === id);
}

import { emitLocalEvent } from "@/lib/local-events/store";

export function upsertBoard(next: DisplayBoard) {
  const idx = boards.findIndex((b) => b.id === next.id);
  const prev = idx === -1 ? null : boards[idx];
  if (idx === -1) boards = [next, ...boards];
  else boards = boards.map((b, i) => (i === idx ? next : b));
  listeners.forEach((l) => l());
  if (!prev) {
    emitLocalEvent({
      entity_type: "display_board",
      entity_id: next.id,
      event_type: "created",
      to_status: next.status,
      note: `Painel "${next.name}" criado`,
    });
  } else if (prev.status !== next.status) {
    emitLocalEvent({
      entity_type: "display_board",
      entity_id: next.id,
      event_type: "status_changed",
      from_status: prev.status,
      to_status: next.status,
    });
  }
}

export function addItem(boardId: string, item: BoardItem) {
  const b = getBoard(boardId);
  if (!b) return;
  boards = boards.map((x) =>
    x.id === boardId
      ? { ...x, items: [...x.items, item], updatedAt: new Date().toISOString().slice(0, 10) }
      : x,
  );
  listeners.forEach((l) => l());
  emitLocalEvent({
    entity_type: "display_board",
    entity_id: boardId,
    event_type: "item_added",
    note: `${item.refCode} — ${item.refName}`,
  });
}

export function moveItem(boardId: string, itemId: string, x: number, y: number) {
  const b = getBoard(boardId);
  if (!b) return;
  boards = boards.map((br) =>
    br.id === boardId
      ? {
          ...br,
          items: br.items.map((i) => (i.id === itemId ? { ...i, x, y } : i)),
          updatedAt: new Date().toISOString().slice(0, 10),
        }
      : br,
  );
  listeners.forEach((l) => l());
  // move é ruidoso — não emite evento por peça movida (só via addItem/removeItem/status)
}

export function resizeItem(boardId: string, itemId: string, w: number) {
  const b = getBoard(boardId);
  if (!b) return;
  boards = boards.map((br) =>
    br.id === boardId
      ? {
          ...br,
          items: br.items.map((i) => (i.id === itemId ? { ...i, w } : i)),
          updatedAt: new Date().toISOString().slice(0, 10),
        }
      : br,
  );
  listeners.forEach((l) => l());
}

export function removeItem(boardId: string, itemId: string) {
  const b = getBoard(boardId);
  if (!b) return;
  const removed = b.items.find((i) => i.id === itemId);
  boards = boards.map((br) =>
    br.id === boardId
      ? {
          ...br,
          items: br.items.filter((i) => i.id !== itemId),
          updatedAt: new Date().toISOString().slice(0, 10),
        }
      : br,
  );
  listeners.forEach((l) => l());
  emitLocalEvent({
    entity_type: "display_board",
    entity_id: boardId,
    event_type: "item_removed",
    note: removed ? `${removed.refCode} — ${removed.refName}` : itemId,
  });
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Repositor de hidratação (creative-sync) — ver colors/store.ts.
export function replaceAllBoards(next: DisplayBoard[]) {
  boards = next;
  listeners.forEach((l) => l());
}
