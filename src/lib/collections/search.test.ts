import { describe, expect, it } from "vitest";
import { collectionsValidateSearch, paginateVisible } from "./search";

describe("collectionsValidateSearch (busca compartilhável por URL)", () => {
  it("aceita string com conteúdo", () => {
    expect(collectionsValidateSearch({ q: "verão" })).toEqual({ q: "verão" });
  });
  it("lixo/espaços/vazio viram ausência (link torto não quebra a tela)", () => {
    expect(collectionsValidateSearch({})).toEqual({});
    expect(collectionsValidateSearch({ q: "   " })).toEqual({});
    expect(collectionsValidateSearch({ q: 42 })).toEqual({});
    expect(collectionsValidateSearch({ q: ["a", "b"] })).toEqual({});
  });
  it("não injeta a chave q quando ausente", () => {
    expect("q" in collectionsValidateSearch({ outras: "coisas" })).toBe(false);
  });
});

describe("paginateVisible", () => {
  const arr = Array.from({ length: 30 }, (_, i) => i);
  it("primeira página tem o tamanho do page size e sobra o resto", () => {
    const p = paginateVisible(arr, 12);
    expect(p.shown).toEqual(arr.slice(0, 12));
    expect(p.remaining).toBe(18);
  });
  it("max maior que a lista mostra tudo e remaining 0 (botão some)", () => {
    expect(paginateVisible(arr, 100)).toEqual({ shown: arr, remaining: 0 });
    expect(paginateVisible([], 12)).toEqual({ shown: [], remaining: 0 });
  });
});
