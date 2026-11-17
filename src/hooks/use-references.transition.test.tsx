// @vitest-environment jsdom
// Onda 99 — `transition` de useReferences devolve o motivo real quando a
// gravação falha (RLS/sessão) e um motivo de fluxo quando a transição não é
// permitida — nunca um boolean que as telas traduzam em texto genérico.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

type R = { data: unknown; error: unknown };
const state = {
  refs: [{ id: "r1", code: "REF-001", status: "IDEIA" }] as unknown[],
  trs: [{ from_status: "IDEIA", to_status: "CROQUI", is_active: true }] as unknown[],
  updateError: null as unknown,
};
function selectBuilder(table: string) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) b[m] = () => b;
  b.then = (res: (v: R) => void) =>
    Promise.resolve({ data: table === "references" ? state.refs : state.trs, error: null }).then(
      res,
    );
  return b;
}
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch };
      return ch;
    },
    removeChannel: () => undefined,
    from: (table: string) => ({
      select: () => selectBuilder(table),
      update: () => ({ eq: async () => ({ error: state.updateError }) }),
      insert: async () => ({ error: null }),
    }),
  },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "u1", email: "e@x" } }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));

import { useReferences, type ReferenceRow } from "./use-references";

describe("Onda 99 — transition com motivo", () => {
  beforeEach(() => {
    state.updateError = null;
  });

  it("falha de permissão no UPDATE devolve o motivo real", async () => {
    state.updateError = { message: "new row violates row-level security policy", code: "42501" };
    const { result } = renderHook(() => useReferences());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let r!: Awaited<ReturnType<typeof result.current.transition>>;
    await act(async () => {
      r = await result.current.transition(result.current.items[0] as ReferenceRow, "CROQUI");
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.reason).toMatch(
        /^Não foi possível salvar a referência: sua sessão não tem permissão/,
      );
  });

  it("transição fora do fluxo tem motivo de fluxo; permitida devolve ok", async () => {
    const { result } = renderHook(() => useReferences());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const ref = result.current.items[0] as ReferenceRow;
    let r1!: Awaited<ReturnType<typeof result.current.transition>>;
    let r2!: Awaited<ReturnType<typeof result.current.transition>>;
    await act(async () => {
      r1 = await result.current.transition(ref, "PCP" as ReferenceRow["status"]);
      r2 = await result.current.transition(ref, "CROQUI");
    });
    expect(r1).toEqual({
      ok: false,
      reason: expect.stringMatching(/^A transição de Ideia para .* não é permitida pelo fluxo\.$/),
    });
    expect(r2).toEqual({ ok: true });
  });
});
