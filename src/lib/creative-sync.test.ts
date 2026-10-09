import { describe, it, expect } from "vitest";
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
