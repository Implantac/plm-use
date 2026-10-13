import { describe, expect, it } from "vitest";
import { filterCollections, normalizeForSearch } from "./filter";
import { collectionsSeed, type Collection } from "./store";

const mk = (over: Partial<Collection>): Collection =>
  ({
    id: 1,
    name: "Litoral Verão",
    season: "Verão",
    year: 2026,
    brand: "Amalfi",
    status: "Planejamento",
    ...over,
  }) as unknown as Collection;

describe("normalizeForSearch", () => {
  it("minúsculas + sem acentos", () => {
    expect(normalizeForSearch("CRAVEJAR")).toBe("cravejar");
    expect(normalizeForSearch("Evolução ê")).toBe("evolucao e");
  });
});

describe("filterCollections", () => {
  const list = [
    mk({ id: 1, name: "Linhô Amalfi", brand: "Costa" }),
    mk({ id: 2, name: "Riviera", brand: "Linhó Mania", year: 2027 }),
  ];

  it("q vazio/só espaços = lista inteira (mesma referência, sem cópia)", () => {
    expect(filterCollections(list, "")).toBe(list);
    expect(filterCollections(list, "   ")).toBe(list);
  });

  it("acha por marca/temporada/status ignorando acento e caixa", () => {
    expect(filterCollections(list, "LINHO").map((c) => c.id)).toEqual([1, 2]);
    expect(filterCollections(list, "planejamento").length).toBe(2);
  });

  it("ano busca numericamente (2027 só na Riviera)", () => {
    expect(filterCollections(list, "2027").map((c) => c.id)).toEqual([2]);
  });

  it("nada coincide → array vazio (tela decide o empty state)", () => {
    expect(filterCollections(list, "zzz")).toEqual([]);
  });

  it("funciona sobre o seed real do store (busca por “verão” acha estações)", () => {
    const hits = filterCollections(collectionsSeed, "verão");
    expect(hits.length).toBeGreaterThan(0);
  });
});
