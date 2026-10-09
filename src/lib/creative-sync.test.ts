import { describe, it, expect, beforeEach, vi } from "vitest";

type FakeTable = {
  rows: Record<string, unknown>[];
  calls: { kind: string; rows?: number; onConflict?: string; vals?: string[] }[];
};
const tables = new Map<string, FakeTable>();
function ft(name: string): FakeTable {
  if (!tables.has(name)) tables.set(name, { rows: [], calls: [] });
  return tables.get(name)!;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (t: string) => ({
      select: () => ({
        order: () => Promise.resolve({ data: ft(t).rows.map((r) => ({ ...r })), error: null }),
      }),
      upsert: (rows: Record<string, unknown>[], opts?: { onConflict?: string }) => {
        const tab = ft(t);
        tab.calls.push({ kind: "upsert", rows: rows.length, onConflict: opts?.onConflict });
        for (const r of rows) {
          const i = tab.rows.findIndex((x) => String(x.external_key) === String(r.external_key));
          if (i === -1) tab.rows.push({ ...r, created_at: new Date().toISOString() });
          else tab.rows[i] = { ...tab.rows[i], ...r };
        }
        return Promise.resolve({ error: null });
      },
      delete: () => ({
        not: (_c: string, _op: string, vals: string[]) => {
          const tab = ft(t);
          tab.calls.push({ kind: "prune-not", vals });
          tab.rows = tab.rows.filter((r) => vals.includes(String(r.external_key)));
          return Promise.resolve({ error: null });
        },
        neq: () => {
          const tab = ft(t);
          tab.calls.push({ kind: "prune-all" });
          tab.rows = [];
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

import {
  paletteToRow,
  paletteFromRow,
  printToRow,
  printFromRow,
  lookToRow,
  lookFromRow,
  boardToRow,
  boardFromRow,
  chartToRow,
  chartFromRow,
  filterToRow,
  filterFromRow,
  dedupeRows,
  type QueryRow,
} from "./creative-sync";
import { palettesSeed } from "./colors/store";
import { printsSeed } from "./prints/store";
import { boardsSeed } from "./display/store";
import { measurementsSeed } from "./measurements/store";

const UID = "00000000-0000-4000-8000-000000000001";

// O banco é a fonte da verdade depois do primeiro push; os mappers são a única
// tradução entre as formas. Round-trip sobre os seeds reais cobre todas as
// variações de formato que o produto carrega hoje sem precisar de Supabase.
describe("round-trip dos mappers (seeds reais)", () => {
  it("color_palettes preserva identidade, status e cores", () => {
    expect(palettesSeed.length).toBeGreaterThan(0);
    for (const p of palettesSeed) {
      const rt = paletteFromRow(paletteToRow(p, UID));
      expect(rt.id).toBe(p.id);
      expect(rt.name).toBe(p.name);
      expect(rt.status).toBe(p.status);
      expect(rt.colors).toEqual(p.colors);
      expect(rt.updatedAt).toBe(String(p.updatedAt).slice(0, 10));
    }
  });

  it("print_assets preserva rapport, tags e versões", () => {
    expect(printsSeed.length).toBeGreaterThan(0);
    for (const p of printsSeed) {
      const rt = printFromRow(printToRow(p, UID));
      expect(rt.id).toBe(p.id);
      expect(rt.code).toBe(p.code);
      expect(rt.tecnica).toBe(p.tecnica);
      expect(rt.repeat).toEqual(p.repeat);
      expect(rt.colorCount).toBe(p.colorCount);
      expect(rt.colors).toEqual(p.colors);
      expect(rt.fileFormat).toBe(p.fileFormat);
      expect(rt.tags).toEqual(p.tags);
      expect(rt.versions).toEqual(p.versions);
      expect(rt.fileSizeMb).toBe(p.fileSizeMb ?? undefined);
    }
  });

  it("looks preserva itens, tags e datas (fixture cobrindo o store sem seed exportado)", () => {
    const look = {
      id: "look-1728000000000",
      name: "Resort Amalfi",
      season: "Verão 25",
      occasion: "resort" as const,
      status: "aprovado" as const,
      tags: ["praia", "linho"],
      stylingNotes: "fechar com rasteira",
      items: [{ refCode: "V24-001", refName: "Blusa Linho", role: "peça-chave" as const }],
      coverColor: "#c6ff3d",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-02T12:00:00.000Z",
    };
    const rt = lookFromRow(lookToRow(look, UID));
    expect(rt).toEqual(look);
  });

  it("display_boards preserva posições do canvas e cores", () => {
    expect(boardsSeed.length).toBeGreaterThan(0);
    for (const b of boardsSeed) {
      const rt = boardFromRow(boardToRow(b, UID));
      expect(rt.id).toBe(b.id);
      expect(rt.name).toBe(b.name);
      expect(rt.status).toBe(b.status);
      expect(rt.bgColor).toBe(b.bgColor);
      expect(rt.items).toEqual(b.items);
      expect(rt.updatedAt).toBe(String(b.updatedAt).slice(0, 10));
    }
  });

  it("measurement_charts preserva pontos e grade", () => {
    expect(measurementsSeed.length).toBeGreaterThan(0);
    for (const c of measurementsSeed) {
      const rt = chartFromRow(chartToRow(c, UID));
      expect(rt.id).toBe(c.id);
      expect(rt.code).toBe(c.code);
      expect(rt.category).toBe(c.category);
      expect(rt.segment).toBe(c.segment);
      expect(rt.fit).toBe(c.fit ?? undefined);
      expect(rt.unit).toBe(c.unit);
      expect(rt.points).toEqual(c.points);
      expect(rt.grade).toEqual(c.grade);
      expect(rt.status).toBe(c.status);
      expect(rt.updatedBy).toBe(c.updatedBy);
    }
  });

  it("collection_map_filters preserva arrays e data de criação", () => {
    const f = {
      id: "f-1728000000000",
      name: "Só produção atrasada",
      owner: "Marina",
      categories: ["Top"],
      colors: ["#F3E9C8"],
      statuses: ["planejado"] as ("planejado" | "em_producao" | "concluido" | "cancelado")[],
      createdAt: "2026-10-03T09:00:00.000Z",
    };
    expect(filterFromRow(filterToRow(f, UID))).toEqual(f);
  });
});

describe("forma das linhas escritas", () => {
  it("usa external_key do store e nunca carrega o id local como id do banco", () => {
    const row = paletteToRow(palettesSeed[0], UID);
    expect(row.external_key).toBe(palettesSeed[0].id);
    expect(row).not.toHaveProperty("id");
    expect(row.created_by).toBe(UID);
  });

  it("data inválida/ausente vira timestamp válido (CHECK/não-nullable no banco)", () => {
    const row = paletteToRow({ ...palettesSeed[0], updatedAt: "" }, UID);
    expect(Number.isNaN(new Date(String(row.updated_on)).getTime())).toBe(false);
  });

  it("optionais ausentes viram NULL no insert, não a string 'undefined'", () => {
    const minimal: QueryRow = printFromRow({ external_key: "est-x", name: "X" }) as QueryRow;
    expect(minimal.supplier).toBeUndefined();
    expect(minimal.fileSizeMb).toBeUndefined();
    const row = printToRow(minimal as never, UID);
    expect(row.supplier).toBeNull();
    expect(row.file_size_mb).toBeNull();
  });
});

describe("robustez do fromRow contra linhas esparsas", () => {
  it("linha vazia produz defaults utilizáveis, sem throw", () => {
    expect(paletteFromRow({})).toMatchObject({
      id: "",
      name: "",
      status: "rascunho",
      colors: [],
      linkedRefs: 0,
    });
    expect(printFromRow({}).repeat).toEqual({ widthCm: 0, heightCm: 0 });
    expect(lookFromRow({}).tags).toEqual([]);
    expect(boardFromRow({}).items).toEqual([]);
    expect(chartFromRow({}).points).toEqual([]);
    expect(chartFromRow({}).fit).toBeUndefined();
    expect(filterFromRow({}).statuses).toEqual([]);
  });
});

describe("dedupeRows (defesa do ON CONFLICT)", () => {
  it("colisão de ids gerados por Date.now() no mesmo tick: mantém o último", () => {
    const out = dedupeRows([
      { external_key: "pal-1", name: "a" },
      { external_key: "pal-1", name: "b" },
      { external_key: "pal-2", name: "c" },
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((r) => r.external_key === "pal-1")?.name).toBe("b");
  });
});

// ---------- engine de sync: hidratar, empurrar, podar (client fake) ----------
import { __internals, collectionToRow, collectionFromRow, numericKey } from "./creative-sync";
import {
  collectionsSeed,
  listCollections,
  replaceAllCollections,
  removeCollection,
  upsertCollection,
} from "./collections/store";

describe("creative-sync engine", () => {
  const UID = "u-test";
  beforeEach(() => {
    tables.clear();
    __internals.resetSyncState();
    replaceAllCollections([...collectionsSeed]);
  });

  it("não escreve antes de hidratar (guarda contra apagar o estado do servidor)", async () => {
    upsertCollection({ ...collectionsSeed[0], id: 999999, name: "fantasma" });
    await __internals.pushByKey("collections", UID);
    expect(ft("collections").calls).toEqual([]);
  });

  it("banco vazio mantém os seeds locais; a primeira edição cria as linhas", async () => {
    await __internals.refreshByKey("collections");
    expect(listCollections().length).toBe(collectionsSeed.length); // seeds preservados

    const novo = { ...collectionsSeed[0], id: 1234567890, name: "Inverno 27" };
    upsertCollection(novo);
    await __internals.pushByKey("collections", UID);

    const tab = ft("collections");
    expect(tab.calls[0]).toEqual({
      kind: "upsert",
      rows: collectionsSeed.length + 1,
      onConflict: "external_key",
    });
    expect(tab.rows.some((r) => r.external_key === "1234567890")).toBe(true);
  });

  it("exclusões são podadas no próximo push (linha some do banco)", async () => {
    await __internals.refreshByKey("collections");
    await __internals.pushByKey("collections", UID);
    const before = ft("collections").rows.length;
    expect(before).toBe(collectionsSeed.length);

    removeCollection(collectionsSeed[0].id);
    await __internals.pushByKey("collections", UID);
    const tab = ft("collections");
    expect(tab.rows).toHaveLength(before - 1);
    expect(tab.rows.some((r) => r.external_key === String(collectionsSeed[0].id))).toBe(false);
  });

  it("snapshot do servidor substitui o local quando há linhas (último write vence)", async () => {
    await __internals.refreshByKey("collections");
    upsertCollection({ ...collectionsSeed[0], id: 777, name: "Remota" });
    await __internals.pushByKey("collections", UID);
    ft("collections").rows.push({
      external_key: "888",
      name: "Criada em outra aba",
      status: "Planejamento",
      created_at: new Date().toISOString(),
    });
    await __internals.refreshByKey("collections", true);
    expect(listCollections().some((c) => c.name === "Criada em outra aba")).toBe(true);
  });

  it("upsert é idempotente: dois pushes seguidos não duplicam linhas", async () => {
    await __internals.refreshByKey("collections");
    await __internals.pushByKey("collections", UID);
    await __internals.pushByKey("collections", UID);
    expect(ft("collections").rows).toHaveLength(collectionsSeed.length);
  });
});

describe("collections mappers", () => {
  it("round-trip do seed completo (id numérico ↔ external_key texto)", () => {
    for (const c of collectionsSeed) {
      const rt = collectionFromRow(collectionToRow(c, UID2));
      expect(rt.id).toBe(c.id);
      expect(rt.name).toBe(c.name);
      expect(rt.targetRevenue).toBe(c.targetRevenue);
      expect(rt.progress).toBe(c.progress);
      expect(rt.sellThrough).toBe(c.sellThrough);
    }
  });
  const UID2 = "u2";

  it("KPI ausente vira NULL no banco e undefined no store (não 0 disfarçado)", () => {
    const row = collectionToRow({ ...collectionsSeed[0], avgCost: undefined }, "u");
    expect(row.avg_cost).toBeNull();
    const back = collectionFromRow(row);
    expect(back.avgCost).toBeUndefined();
  });

  it("progress fora de 0..100 é clampado no write (CHECK do banco)", () => {
    expect(collectionToRow({ ...collectionsSeed[0], progress: 180 }, "u").progress).toBe(100);
    expect(collectionToRow({ ...collectionsSeed[0], progress: -3 }, "u").progress).toBe(0);
  });

  it("numericKey: numérico preserva; texto arbitrário é estável e finito", () => {
    expect(numericKey("1728000000000")).toBe(1728000000000);
    expect(numericKey("42")).toBe(42);
    expect(numericKey("")).toBeGreaterThan(0);
    expect(numericKey("abc")).toBe(numericKey("abc"));
    expect(Number.isFinite(numericKey("col-ext-xyz"))).toBe(true);
  });
});
