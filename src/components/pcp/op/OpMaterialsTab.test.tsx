// @vitest-environment jsdom
//
// A aba Material é o único caminho pela qual a saída de estoque de uma OP é
// registrada. Se ela chamar a RPC errada, ou liberar o botão para quem não tem
// papel de estoque, a reserva volta a ficar presa e o operador não percebe.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const rpc = vi.fn();
let rolesAtuais: string[] = ["admin"];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "u-1" } }),
  useUserRoles: () => ({ roles: rolesAtuais }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const { OpMaterialsTab } = await import("./OpMaterialsTab");

const reserva = (over: Record<string, unknown> = {}) => ({
  reservation_id: "r-1",
  item_id: "i-1",
  item_code: "TEC-001",
  item_name: "Tecido Dry",
  unit: "m",
  qty: 20,
  qty_on_hand: 100,
  dias_ativa: 2,
  ...over,
});

beforeEach(() => {
  rolesAtuais = ["admin"];
  rpc.mockReset();
});
afterEach(cleanup);

describe("aba Material da OP", () => {
  it("lista o que a OP reservou", async () => {
    rpc.mockResolvedValueOnce({ data: [reserva()], error: null });
    render(<OpMaterialsTab orderId="op-1" orderNumber="OP-PED-1" />);

    await waitFor(() => expect(screen.getByText(/Tecido Dry/)).toBeTruthy());
    expect(screen.getByText("Material reservado (1)")).toBeTruthy();
    expect(rpc).toHaveBeenCalledWith("op_reserved_materials", { _order_id: "op-1" });
  });

  it("dá baixa chamando a RPC certa e recarrega a lista", async () => {
    rpc
      .mockResolvedValueOnce({ data: [reserva()], error: null })
      .mockResolvedValueOnce({
        data: { total_consumido: 1, total_curto: 0, consumidos: [], curtos: [] },
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });

    render(<OpMaterialsTab orderId="op-1" orderNumber="OP-PED-1" />);
    await waitFor(() => expect(screen.getByText(/Tecido Dry/)).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /Dar baixa do material/i }));

    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("record_op_material_consumption", { _order_id: "op-1" }),
    );
    // recarregou depois da baixa
    await waitFor(() =>
      expect(rpc.mock.calls.filter((c) => c[0] === "op_reserved_materials")).toHaveLength(2),
    );
  });

  it("quem não movimenta estoque vê o botão desabilitado", async () => {
    rolesAtuais = ["pcp"];
    rpc.mockResolvedValueOnce({ data: [reserva()], error: null });
    render(<OpMaterialsTab orderId="op-1" orderNumber="OP-PED-1" />);

    await waitFor(() => expect(screen.getByText(/Tecido Dry/)).toBeTruthy());
    const botao = screen.getByRole("button", {
      name: /Dar baixa do material/i,
    }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(screen.getByText(/planeja a OP, mas não movimenta estoque/i)).toBeTruthy();
  });

  it("avisa quando o insumo reservado não tem saldo físico", async () => {
    rpc.mockResolvedValueOnce({ data: [reserva({ qty: 20, qty_on_hand: 5 })], error: null });
    render(<OpMaterialsTab orderId="op-1" orderNumber="OP-PED-1" />);

    await waitFor(() => expect(screen.getByText(/sem saldo físico/i)).toBeTruthy());
  });

  it("sem reserva, explica de onde elas nascem em vez de mostrar tabela vazia", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    render(<OpMaterialsTab orderId="op-1" orderNumber="OP-PED-1" />);

    await waitFor(() =>
      expect(screen.getByText(/não tem material reservado em aberto/i)).toBeTruthy(),
    );
    const botao = screen.getByRole("button", {
      name: /Dar baixa do material/i,
    }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });
});

describe("migração pendente não é lista vazia", () => {
  it("404 na RPC (PGRST202) mostra aviso de migração, não 'sem material'", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.op_reserved_materials",
      },
    });

    render(<OpMaterialsTab orderId="op-1" orderNumber="OP-PED-1" />);

    await waitFor(() => expect(screen.getByTestId("material-migracao-pendente")).toBeTruthy());
    // o texto de "não tem reserva" seria mentira: não deu para ler
    expect(screen.queryByText(/não tem material reservado em aberto/i)).toBeNull();
    const botao = screen.getByRole("button", {
      name: /Dar baixa do material/i,
    }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
  });

  it("erro de verdade (não-migração) aparece como erro com 'tentar de novo'", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "08006", message: "connection failure" },
    });

    render(<OpMaterialsTab orderId="op-1" orderNumber="OP-PED-1" />);

    await waitFor(() => expect(screen.getByTestId("material-erro-leitura")).toBeTruthy());
    expect(screen.getByText(/connection failure/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Tentar de novo/i })).toBeTruthy();
    expect(screen.queryByTestId("material-migracao-pendente")).toBeNull();
  });

  it("quando a migração está aplicada, nenhum aviso aparece", async () => {
    rpc.mockResolvedValueOnce({ data: [reserva()], error: null });
    render(<OpMaterialsTab orderId="op-1" orderNumber="OP-PED-1" />);

    await waitFor(() => expect(screen.getByText(/Tecido Dry/)).toBeTruthy());
    expect(screen.queryByTestId("material-migracao-pendente")).toBeNull();
    expect(screen.queryByTestId("material-erro-leitura")).toBeNull();
  });
});
