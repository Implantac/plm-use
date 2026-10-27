// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ItemConsumptionEditor } from "./ItemConsumptionEditor";

const api = vi.hoisted(() => ({
  listItemConsumption: vi.fn(),
  saveItemConsumption: vi.fn(),
  deleteItemConsumption: vi.fn(),
}));
vi.mock("@/lib/sales/technical-details-api", () => api);

const material = {
  id: "m1",
  kind: "tecido",
  material: "Malha",
  unit: "m",
  consumption: 1.2,
  waste_pct: 5,
  unit_cost: 10,
  total_cost: 126,
  source: "custo" as const,
  revision: 3,
};
const base = [{ tipo: "Tecido", material: "Malha padrão", unidade: "m", consumo: "1,25" }];
const onChanged = vi.fn<() => void>();
const onDirtyChange = vi.fn<(dirty: boolean) => void>();
const onSavingChange = vi.fn<(saving: boolean) => void>();
beforeEach(() => {
  vi.clearAllMocks();
  api.listItemConsumption.mockResolvedValue({ data: [material], error: null });
  api.saveItemConsumption.mockResolvedValue({
    data: { ...material, consumption: 1.5, waste_pct: 8, unit_cost: 12, revision: 4 },
    error: null,
  });
  api.deleteItemConsumption.mockResolvedValue({ data: null, error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderEditor(editable = true) {
  render(
    <ItemConsumptionEditor
      itemId="item-1"
      quantity={10}
      baseMaterials={base}
      editable={editable}
      disabled={false}
      onChanged={onChanged}
      onDirtyChange={onDirtyChange}
      onSavingChange={onSavingChange}
    />,
  );
}

describe("consumo dos materiais na ficha do pedido", () => {
  it("grava consumo, perda, custo e revisão na mesma operação", async () => {
    renderEditor();
    fireEvent.change(await screen.findByLabelText("Consumo por peça de Malha"), {
      target: { value: "1,5" },
    });
    fireEvent.change(screen.getByLabelText("Perda de Malha (%)"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Custo unitário de Malha"), { target: { value: "12" } });
    expect(onDirtyChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Salvar consumo de Malha" }));
    await waitFor(() =>
      expect(api.saveItemConsumption).toHaveBeenCalledWith({
        itemId: "item-1",
        materialId: "m1",
        kind: null,
        material: null,
        unit: null,
        consumption: 1.5,
        wastePct: 8,
        unitCost: 12,
        revision: 3,
      }),
    );
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(onChanged).toHaveBeenCalled();
    expect((screen.getByLabelText("Consumo por peça de Malha") as HTMLInputElement).value).toBe(
      "1.5",
    );
    expect(screen.getByText(/total salvo: 16,2 m/)).toBeTruthy();
  });

  it("sugere material da base sem criar linha nem inventar custo", async () => {
    api.saveItemConsumption.mockResolvedValueOnce({
      data: { ...material, id: "m2", material: "Malha padrão", consumption: 1.25, revision: 1 },
      error: null,
    });
    renderEditor();
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar material" }));
    fireEvent.change(screen.getByLabelText("Material da ficha padrão"), { target: { value: "0" } });
    expect((screen.getByLabelText("Novo material") as HTMLInputElement).value).toBe("Malha padrão");
    expect(
      (screen.getByLabelText("Consumo por peça do novo material") as HTMLInputElement).value,
    ).toBe("1,25");
    expect(
      (screen.getByLabelText("Custo unitário do novo material") as HTMLInputElement).value,
    ).toBe("");
    expect(api.saveItemConsumption).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar e recalcular" }));
    expect(screen.getByRole("alert").textContent).toContain("custo unitário");
    expect(api.saveItemConsumption).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Custo unitário do novo material"), {
      target: { value: "19,50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar e recalcular" }));
    await waitFor(() =>
      expect(api.saveItemConsumption).toHaveBeenCalledWith({
        itemId: "item-1",
        materialId: null,
        kind: "tecido",
        material: "Malha padrão",
        unit: "m",
        consumption: 1.25,
        wastePct: 0,
        unitCost: 19.5,
        revision: 0,
      }),
    );
  });

  it("preserva digitação ao receber conflito de revisão", async () => {
    api.saveItemConsumption.mockResolvedValueOnce({
      data: null,
      error: { message: "Material alterado por outro usuario." },
    });
    renderEditor();
    const input = (await screen.findByLabelText("Consumo por peça de Malha")) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2,2" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar consumo de Malha" }));
    expect((await screen.findByRole("alert")).textContent).toContain("outro usuario");
    expect(input.value).toBe("2,2");
  });

  it("bloqueia edição de consumo após aprovação", async () => {
    renderEditor(false);
    expect(
      ((await screen.findByLabelText("Consumo por peça de Malha")) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(screen.queryByRole("button", { name: "Adicionar material" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Salvar consumo de Malha" })).toBeNull();
  });

  it("não permite adicionar sem conseguir carregar os materiais existentes", async () => {
    api.listItemConsumption.mockResolvedValueOnce({
      data: null,
      error: { message: "Erro de rede" },
    });
    renderEditor();
    expect((await screen.findByRole("alert")).textContent).toContain("Erro de rede");
    expect(screen.queryByRole("button", { name: "Adicionar material" })).toBeNull();
  });

  it("remove somente linha criada pelo custo, com revisão", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderEditor();
    await screen.findByText("Malha");
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    await waitFor(() =>
      expect(api.deleteItemConsumption).toHaveBeenCalledWith({
        itemId: "item-1",
        materialId: "m1",
        revision: 3,
      }),
    );
    expect(onChanged).toHaveBeenCalled();
  });
});
