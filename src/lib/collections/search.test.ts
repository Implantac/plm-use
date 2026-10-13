import { describe, expect, it } from "vitest";
import { collectionsValidateSearch } from "./search";

describe("collectionsValidateSearch (busca compartilhável por URL)", () => {
  it("aceita string com conteúdo", () => {
    expect(collectionsValidateSearch({ q: "verão" })).toEqual({ q: "verão" });
  });
  it("lixo/espacos/vazio viram ausência (link torto não quebra a tela)", () => {
    expect(collectionsValidateSearch({})).toEqual({});
    expect(collectionsValidateSearch({ q: "   " })).toEqual({});
    expect(collectionsValidateSearch({ q: 42 })).toEqual({});
    expect(collectionsValidateSearch({ q: ["a", "b"] })).toEqual({});
  });
  it("não injeta a chave q quando ausente (navigate spread preserva as outras)", () => {
    expect("q" in collectionsValidateSearch({ outras: "coisas" })).toBe(false);
  });
});
