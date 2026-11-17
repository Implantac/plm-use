// @vitest-environment jsdom
// Onda 100 — openGate/decide devolvem o motivo real da falha (RLS/sessão).
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const state = { error: null as unknown };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const ch = { on: () => ch, subscribe: () => ch };
      return ch;
    },
    removeChannel: () => undefined,
    from: () => ({
      select: () => {
        const b: Record<string, unknown> = {};
        for (const m of ["eq", "order", "in"]) b[m] = () => b;
        b.then = (res: (v: unknown) => void) =>
          Promise.resolve({ data: [], error: null }).then(res);
        return b;
      },
      upsert: async () => ({ error: state.error }),
      update: () => ({ eq: async () => ({ error: state.error }) }),
    }),
  },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { useReferenceGates } from "./use-reference-gates";

describe("Onda 100 — gates com motivo", () => {
  it("RLS ao abrir/decidir devolve reason traduzido; sucesso devolve ok", async () => {
    const { result } = renderHook(() => useReferenceGates());
    await waitFor(() => expect(result.current.loading).toBe(false));
    state.error = { message: "permission denied for table reference_gate", code: "42501" };
    let a!: Awaited<ReturnType<typeof result.current.openGate>>;
    let d!: Awaited<ReturnType<typeof result.current.decide>>;
    await act(async () => {
      a = await result.current.openGate("r1", "G1");
      d = await result.current.decide("g1", "aprovado", null);
    });
    expect(a.ok).toBe(false);
    if (!a.ok)
      expect(a.reason).toMatch(/^Não foi possível abrir o gate: sua sessão não tem permissão/);
    if (!d.ok) expect(d.reason).toMatch(/^Não foi possível registrar a decisão do gate: /);
    state.error = null;
    await act(async () => {
      a = await result.current.openGate("r1", "G1");
    });
    expect(a).toEqual({ ok: true });
  });
});
