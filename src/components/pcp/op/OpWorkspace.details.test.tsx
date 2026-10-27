// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { OpWorkspace } from "./OpWorkspace";

const mocks = vi.hoisted(() => ({ getTechnicalSheet: vi.fn() }));
vi.mock("@/lib/sales/api", () => ({ getTechnicalSheet: mocks.getTechnicalSheet }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "pcp" } }),
  useUserRoles: () => ({ roles: ["pcp"] }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { id: "pedido-1" }, error: null }) }),
      }),
    }),
  },
}));
vi.mock("@/hooks/use-production-orders", () => ({
  nextStep: () => null,
  usePassages: () => ({ data: [] }),
  useRegisterPassages: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useChangeItemRoute: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateOrderSchedule: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/orders">{children}</a>,
}));
vi.mock("@/components/entity/EntityTimeline", () => ({ EntityTimeline: () => null }));

afterEach(cleanup);

describe("ficha técnica dentro da OP", () => {
  it("mostra na OP os detalhes sem custo do pedido de origem", async () => {
    mocks.getTechnicalSheet.mockResolvedValue({
      data: {
        items: [
          {
            item_id: "i1",
            description: "Camisa teste",
            color: "Azul",
            quantity: 20,
            detail_groups: [
              { name: "Costura", detail: "Seguir piloto aprovado\nEtiqueta na gola" },
            ],
            base_snapshot: {
              ref: "R1",
              found: true,
              data: {
                materiais: [
                  { tipo: "Tecido", material: "Malha", consumo: "1", unidade: "m", custo: 9876 },
                ],
              },
            },
          },
        ],
      },
      error: null,
    });
    render(
      <OpWorkspace
        order={{
          id: "op1",
          number: "OP-PED-123",
          erp_op_id: null,
          status: "planejada",
          priority: "media",
          planned_start: null,
          planned_end: null,
          items: [],
        }}
        routes={[]}
        onClose={() => undefined}
      />,
    );
    await screen.findByText(/Gerada do pedido PED-123/);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Ficha técnica" }), { button: 0 });
    await waitFor(() => expect(mocks.getTechnicalSheet).toHaveBeenCalledWith("pedido-1"));
    expect(await screen.findByText("Camisa teste")).toBeTruthy();
    expect(document.body.textContent).toContain("Seguir piloto aprovado\nEtiqueta na gola");
    expect(document.body.textContent).not.toContain("9876");
  });
});
