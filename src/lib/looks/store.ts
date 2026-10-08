// Coordenados (Looks) store — agrupa referências em looks reutilizáveis
// para displayagem, showroom e catálogos. In-memory mock; migrar para
// tabela `looks` + `look_items` quando o schema entrar.
import { useSyncExternalStore } from "react";

export type LookOccasion = "casual" | "trabalho" | "festa" | "resort" | "esporte" | "streetwear";

export type LookStatus = "rascunho" | "aprovado" | "arquivado";

export type LookItem = {
  refCode: string;
  refName: string;
  role: "peça-chave" | "complemento" | "acessório" | "calçado";
  colorHex?: string;
  image?: string;
};

export type Look = {
  id: string;
  name: string;
  season: string;
  occasion: LookOccasion;
  status: LookStatus;
  tags: string[];
  stylingNotes: string;
  items: LookItem[];
  coverColor: string; // hex
  createdAt: string;
  updatedAt: string;
};

const seed: Look[] = [
  {
    id: "look-01",
    name: "Alfaiataria Fluida",
    season: "Alto Verão 26",
    occasion: "trabalho",
    status: "aprovado",
    tags: ["tailoring", "monocromia", "linho"],
    stylingNotes: "Blazer over com regata de seda por dentro. Calça pantalona. Sandália mule.",
    items: [
      {
        refCode: "REF-1042",
        refName: "Blazer Linho Argila",
        role: "peça-chave",
        colorHex: "#c8b6a0",
      },
      { refCode: "REF-1043", refName: "Regata Seda Off", role: "complemento", colorHex: "#f5efe6" },
      {
        refCode: "REF-1044",
        refName: "Pantalona Linho Argila",
        role: "complemento",
        colorHex: "#c8b6a0",
      },
      { refCode: "REF-2011", refName: "Mule Couro Nude", role: "calçado", colorHex: "#d9b899" },
    ],
    coverColor: "#c8b6a0",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "look-02",
    name: "Resort Beira-Mar",
    season: "Alto Verão 26",
    occasion: "resort",
    status: "aprovado",
    tags: ["crochê", "praia", "colorido"],
    stylingNotes: "Saída de praia crochê sobre biquíni. Chapéu palha. Sandália rasteira.",
    items: [
      {
        refCode: "REF-1101",
        refName: "Saída Crochê Coral",
        role: "peça-chave",
        colorHex: "#e8785a",
      },
      { refCode: "REF-1102", refName: "Biquíni Coral", role: "complemento", colorHex: "#e8785a" },
      {
        refCode: "REF-2020",
        refName: "Chapéu Palha Natural",
        role: "acessório",
        colorHex: "#d4b891",
      },
    ],
    coverColor: "#e8785a",
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: "look-03",
    name: "Street Neon Denim",
    season: "Inverno 26",
    occasion: "streetwear",
    status: "rascunho",
    tags: ["denim", "neon", "oversized"],
    stylingNotes: "Jaqueta jeans oversized. Top neon. Cargo baggy. Tênis chunky.",
    items: [
      {
        refCode: "REF-1310",
        refName: "Jaqueta Denim Wash",
        role: "peça-chave",
        colorHex: "#7fa3c9",
      },
      { refCode: "REF-1311", refName: "Top Neon", role: "complemento", colorHex: "#c6ff3d" },
      { refCode: "REF-1312", refName: "Cargo Baggy", role: "complemento", colorHex: "#4b5a48" },
      { refCode: "REF-2110", refName: "Chunky Sneaker", role: "calçado", colorHex: "#f0f0f0" },
    ],
    coverColor: "#c6ff3d",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let looks: Look[] = [...seed];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useLooks(): Look[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => looks,
    () => looks,
  );
}

import { emitLocalEvent } from "@/lib/local-events/store";

export function upsertLook(look: Look) {
  const idx = looks.findIndex((l) => l.id === look.id);
  const prev = idx >= 0 ? looks[idx] : null;
  const now = new Date().toISOString();
  const next = { ...look, updatedAt: now };
  if (idx >= 0) {
    looks = [...looks.slice(0, idx), next, ...looks.slice(idx + 1)];
  } else {
    looks = [{ ...next, createdAt: now }, ...looks];
  }
  emit();
  if (!prev) {
    emitLocalEvent({
      entity_type: "look",
      entity_id: next.id,
      event_type: "created",
      to_status: next.status,
      note: `Look "${next.name}" criado`,
    });
  } else if (prev.status !== next.status) {
    emitLocalEvent({
      entity_type: "look",
      entity_id: next.id,
      event_type: "status_changed",
      from_status: prev.status,
      to_status: next.status,
    });
  } else {
    emitLocalEvent({
      entity_type: "look",
      entity_id: next.id,
      event_type: "updated",
    });
  }
}

export function removeLook(id: string) {
  const l = looks.find((x) => x.id === id);
  looks = looks.filter((x) => x.id !== id);
  emit();
  if (l) {
    emitLocalEvent({
      entity_type: "look",
      entity_id: id,
      event_type: "archived",
      note: `Look "${l.name}" removido`,
    });
  }
}

export function duplicateLook(id: string) {
  const src = looks.find((l) => l.id === id);
  if (!src) return;
  const now = new Date().toISOString();
  const copy: Look = {
    ...src,
    id: `look-${Math.random().toString(36).slice(2, 8)}`,
    name: `${src.name} (cópia)`,
    status: "rascunho",
    createdAt: now,
    updatedAt: now,
  };
  looks = [copy, ...looks];
  emit();
  emitLocalEvent({
    entity_type: "look",
    entity_id: copy.id,
    event_type: "cloned",
    note: `Duplicado a partir de "${src.name}"`,
  });
}

export function setLookStatus(id: string, status: LookStatus) {
  const l = looks.find((x) => x.id === id);
  if (!l) return;
  upsertLook({ ...l, status });
}

export function addItemToLook(lookId: string, item: LookItem) {
  const l = looks.find((x) => x.id === lookId);
  if (!l) return;
  if (l.items.some((i) => i.refCode === item.refCode)) return;
  looks = looks.map((x) =>
    x.id === lookId ? { ...x, items: [...x.items, item], updatedAt: new Date().toISOString() } : x,
  );
  emit();
  emitLocalEvent({
    entity_type: "look",
    entity_id: lookId,
    event_type: "item_added",
    note: `${item.refCode} — ${item.refName}`,
  });
}

export function removeItemFromLook(lookId: string, refCode: string) {
  const l = looks.find((x) => x.id === lookId);
  if (!l) return;
  const removed = l.items.find((i) => i.refCode === refCode);
  looks = looks.map((x) =>
    x.id === lookId
      ? {
          ...x,
          items: x.items.filter((i) => i.refCode !== refCode),
          updatedAt: new Date().toISOString(),
        }
      : x,
  );
  emit();
  emitLocalEvent({
    entity_type: "look",
    entity_id: lookId,
    event_type: "item_removed",
    note: removed ? `${removed.refCode} — ${removed.refName}` : refCode,
  });
}

export const OCCASION_LABEL: Record<LookOccasion, string> = {
  casual: "Casual",
  trabalho: "Trabalho",
  festa: "Festa",
  resort: "Resort",
  esporte: "Esporte",
  streetwear: "Streetwear",
};

export const STATUS_LABEL: Record<LookStatus, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  arquivado: "Arquivado",
};
