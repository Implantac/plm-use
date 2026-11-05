// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const limit = vi.fn();
const select = vi.fn(() => ({ limit }));
const from = vi.fn((_table: string) => ({ select }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => from(table) },
}));

const {
  isMissingDatabaseObject,
  stockLifecycleAvailable,
  resetStockLifecycleProbe,
  useStockLifecycle,
} = await import("./stock-lifecycle");

beforeEach(() => {
  resetStockLifecycleProbe();
  from.mockClear();
  select.mockClear();
  limit.mockReset();
});

describe("isMissingDatabaseObject", () => {
  it("reconhece os códigos de objeto ausente do PostgREST e do Postgres", () => {
    expect(isMissingDatabaseObject({ code: "PGRST202" })).toBe(true);
    expect(isMissingDatabaseObject({ code: "PGRST205" })).toBe(true);
    expect(isMissingDatabaseObject({ code: "42883" })).toBe(true);
    expect(isMissingDatabaseObject({ code: "42P01" })).toBe(true);
  });

  it("reconhece pela mensagem quando o código vem vazio", () => {
    expect(
      isMissingDatabaseObject({
        message: "Could not find the table 'public.x' in the schema cache",
      }),
    ).toBe(true);
  });

  it("não confunde erro real com objeto ausente", () => {
    expect(isMissingDatabaseObject({ code: "08006", message: "connection failure" })).toBe(false);
    expect(isMissingDatabaseObject({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingDatabaseObject(null)).toBe(false);
  });
});

describe("sonda do ciclo de vida", () => {
  it("view presente => ativa", async () => {
    limit.mockResolvedValue({ error: null });
    await expect(stockLifecycleAvailable()).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("stock_reservation_aging");
  });

  it("404 da view => pendente", async () => {
    limit.mockResolvedValue({
      error: { code: "PGRST205", message: "Could not find the table" },
    });
    await expect(stockLifecycleAvailable()).resolves.toBe(false);
  });

  it("pergunta uma vez por sessão", async () => {
    limit.mockResolvedValue({ error: null });
    await stockLifecycleAvailable();
    await stockLifecycleAvailable();
    expect(from).toHaveBeenCalledTimes(1);
  });
});

describe("useStockLifecycle", () => {
  it("começa verificando e termina em 'pendente' quando falta a migração", async () => {
    limit.mockResolvedValue({ error: { code: "PGRST205" } });
    const { result } = renderHook(() => useStockLifecycle());
    expect(result.current).toBe("verificando");
    await waitFor(() => expect(result.current).toBe("pendente"));
  });

  it("termina em 'ativa' quando a view existe", async () => {
    limit.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useStockLifecycle());
    await waitFor(() => expect(result.current).toBe("ativa"));
  });
});
