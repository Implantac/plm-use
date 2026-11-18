// @vitest-environment jsdom
// Onda 105 — lerLocal/gravarLocal: corrompido avisa (uma vez) e devolve
// fallback; gravação bloqueada avisa e não lança.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toasts: string[] = [];
vi.mock("sonner", () => ({
  toast: {
    warning: (m: string) => toasts.push("W:" + m),
    error: (m: string) => toasts.push("E:" + m),
  },
}));

import { gravarLocal, lerLocal } from "./armazenamento-local";

describe("Onda 105 — armazenamento local com motivo", () => {
  beforeEach(() => {
    toasts.length = 0;
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("ausente → fallback em silêncio; corrompido → fallback + aviso único", () => {
    expect(lerLocal("k", "as rotas recentes", [], Array.isArray)).toEqual([]);
    vi.runAllTimers();
    expect(toasts).toEqual([]);
    localStorage.setItem("k", "{corrompido");
    expect(lerLocal("k", "as rotas recentes", ["x"], Array.isArray)).toEqual(["x"]);
    localStorage.setItem("k", '{"nao":"lista"}');
    expect(lerLocal("k", "as rotas recentes", [], Array.isArray)).toEqual([]);
    vi.runAllTimers();
    expect(toasts).toEqual([
      "W:Os dados das rotas recentes guardados neste navegador estavam corrompidos e foram ignorados. Confira o que está na tela antes de continuar.",
    ]);
  });

  it("gravação bloqueada → false + aviso com motivo, sem exceção", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const e = new DOMException("quota", "QuotaExceededError");
      throw e;
    });
    expect(() => gravarLocal("k", "o histórico local de eventos", [1])).not.toThrow();
    expect(gravarLocal("k", "o histórico local de eventos", [1])).toBe(false);
    vi.runAllTimers();
    expect(toasts.length).toBe(1);
    expect(toasts[0]).toMatch(
      /^E:Não foi possível guardar o histórico local de eventos neste navegador: /,
    );
    spy.mockRestore();
    expect(gravarLocal("k", "o histórico local de eventos", [1])).toBe(true);
    expect(localStorage.getItem("k")).toBe("[1]");
  });
});
