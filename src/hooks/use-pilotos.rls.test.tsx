// Testes de RLS do client para a entidade Piloto.
// Cobre: usuário sem papel recebe lista vazia (RLS filtra); INSERT sem papel
// falha silenciosamente (create → null); usuário com papel autorizado enxerga
// os pilotos que a policy permite.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

type QueryResult = { data: unknown; error: unknown };

const state: {
  selectResult: QueryResult;
  insertResult: QueryResult;
  lastInsertPayload: unknown;
} = {
  selectResult: { data: [], error: null },
  insertResult: { data: null, error: { message: "RLS" } },
  lastInsertPayload: null,
};

// Cria um builder Supabase encadeável que sempre retorna `state.selectResult`
// no final da cadeia (via then()).
function makeSelectBuilder() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const m of ["select", "eq", "order", "limit"]) builder[m] = chain;
  builder.maybeSingle = async () => state.selectResult;
  builder.single = async () => state.selectResult;
  builder.then = (resolve: (v: QueryResult) => void) =>
    Promise.resolve(state.selectResult).then(resolve);
  return builder;
}

function makeInsertBuilder(payload: unknown) {
  state.lastInsertPayload = payload;
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.single = async () => state.insertResult;
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (_table: string) => ({
      select: (...args: unknown[]) => makeSelectBuilder().select?.(...args),
      insert: (payload: unknown) => makeInsertBuilder(payload),
    }),
  },
}));

const authState: { user: { id: string } | null } = { user: { id: "user-1" } };
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));

import { usePilotos, useCreatePiloto } from "./use-pilotos";

beforeEach(() => {
  state.selectResult = { data: [], error: null };
  state.insertResult = { data: null, error: { message: "RLS" } };
  state.lastInsertPayload = null;
  authState.user = { id: "user-1" };
});

describe("usePilotos — RLS no client", () => {
  it("usuário sem papel permitido recebe lista vazia (RLS filtra)", async () => {
    state.selectResult = { data: [], error: null };
    const { result } = renderHook(() => usePilotos("ref-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
  });

  it("usuário com papel autorizado recebe os pilotos permitidos", async () => {
    const pilots = [
      { id: "p1", reference_id: "ref-1", rodada: 2, status: "RASCUNHO" },
      { id: "p2", reference_id: "ref-1", rodada: 1, status: "APROVADO" },
    ];
    state.selectResult = { data: pilots, error: null };
    const { result } = renderHook(() => usePilotos("ref-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].id).toBe("p1");
  });
});

describe("useCreatePiloto — RLS no INSERT", () => {
  it("retorna null quando a policy nega o INSERT (403 equivalente)", async () => {
    state.selectResult = { data: null, error: null }; // maybeSingle para rodada
    state.insertResult = {
      data: null,
      error: { message: "new row violates row-level security policy" },
    };
    const { create } = renderHook(() => useCreatePiloto()).result.current;
    let out: unknown;
    await act(async () => {
      out = await create({ reference_id: "ref-1" });
    });
    expect(out).toBeNull();
  });

  it("não permite criar sem sessão autenticada", async () => {
    authState.user = null;
    const { create } = renderHook(() => useCreatePiloto()).result.current;
    let out: unknown;
    await act(async () => {
      out = await create({ reference_id: "ref-1" });
    });
    expect(out).toBeNull();
    expect(state.lastInsertPayload).toBeNull();
  });

  it("com papel autorizado, cria e força created_by = auth.uid()", async () => {
    state.selectResult = { data: { rodada: 3 }, error: null };
    state.insertResult = {
      data: { id: "novo", reference_id: "ref-1", rodada: 4 },
      error: null,
    };
    const { create } = renderHook(() => useCreatePiloto()).result.current;
    let out: unknown;
    await act(async () => {
      out = await create({ reference_id: "ref-1" });
    });
    expect(out).toMatchObject({ id: "novo" });
    expect(state.lastInsertPayload).toMatchObject({
      reference_id: "ref-1",
      created_by: "user-1",
      updated_by: "user-1",
    });
  });
});
