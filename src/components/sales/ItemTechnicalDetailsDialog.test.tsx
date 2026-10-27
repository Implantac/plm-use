// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ItemTechnicalDetailsDialog } from "./ItemTechnicalDetailsDialog";

const api = vi.hoisted(() => ({
  startItemTechnicalDetails: vi.fn(),
  getItemTechnicalDetails: vi.fn(),
  saveItemDetailGroup: vi.fn(),
  deleteItemDetailGroup: vi.fn(),
}));
vi.mock("@/lib/sales/technical-details-api", () => api);

const groups = [
  { id: "det", name: "Detalhes", detail: "", revision: 1, sort_order: 10 },
  { id: "cos", name: "Costura", detail: "", revision: 1, sort_order: 40 },
  { id: "bor", name: "Bordado", detail: "", revision: 1, sort_order: 30 },
];
const sheet = {
  initialized: true,
  base_ref: "REF-01",
  base_found: true,
  base: { materiais: [{ tipo: "Tecido", material: "Malha", consumo: "1", unidade: "m" }] },
  groups,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.startItemTechnicalDetails.mockResolvedValue({ data: sheet, error: null });
  api.getItemTechnicalDetails.mockResolvedValue({ data: sheet, error: null });
  api.saveItemDetailGroup.mockImplementation(async (input) => ({
    data: {
      id: input.groupId ?? "new-group",
      name: input.name ?? groups.find((g) => g.id === input.groupId)?.name ?? "",
      detail: input.detail,
      revision: input.revision + 1,
      sort_order: 100,
    },
    error: null,
  }));
  api.deleteItemDetailGroup.mockResolvedValue({ data: null, error: null });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function editor(editable = true, onClose = vi.fn()) {
  render(
    <ItemTechnicalDetailsDialog
      itemId="item-1"
      itemLabel="Item 1 · Camisa"
      open
      editable={editable}
      onClose={onClose}
    />,
  );
  return onClose;
}

describe("detalhamento por grupo do item", () => {
  it("troca de grupo sem perder rascunhos e grava somente o item selecionado", async () => {
    editor();
    await screen.findByRole("button", { name: "Costura" });
    expect(api.startItemTechnicalDetails).toHaveBeenCalledWith("item-1");
    expect(screen.getByText(/Base da ficha padrão · REF-01/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Costura" }));
    fireEvent.change(screen.getByLabelText("Detalhes de Costura"), {
      target: { value: "Seguir peça piloto\nEtiqueta na gola" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Bordado" }));
    fireEvent.change(screen.getByLabelText("Detalhes de Bordado"), {
      target: { value: "Logo no peito" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Costura/ }));
    expect((screen.getByLabelText("Detalhes de Costura") as HTMLTextAreaElement).value).toBe(
      "Seguir peça piloto\nEtiqueta na gola",
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar detalhes" }));
    await waitFor(() =>
      expect(api.saveItemDetailGroup).toHaveBeenCalledWith({
        itemId: "item-1",
        groupId: "cos",
        name: null,
        detail: "Seguir peça piloto\nEtiqueta na gola",
        revision: 1,
      }),
    );
    expect(await screen.findByRole("status")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Bordado/ }));
    expect((screen.getByLabelText("Detalhes de Bordado") as HTMLTextAreaElement).value).toBe(
      "Logo no peito",
    );
  });

  it("oferece criar e excluir grupo, preservando confirmação e revisão", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    editor();
    await screen.findByRole("button", { name: "Novo grupo" });
    fireEvent.click(screen.getByRole("button", { name: "Novo grupo" }));
    fireEvent.change(screen.getByLabelText("Nome do novo grupo"), {
      target: { value: "Etiquetas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar grupo" }));
    await screen.findByLabelText("Detalhes de Etiquetas");
    expect(api.saveItemDetailGroup).toHaveBeenCalledWith({
      itemId: "item-1",
      groupId: null,
      name: "Etiquetas",
      detail: "",
      revision: 0,
    });
    fireEvent.click(screen.getByRole("button", { name: "Excluir grupo" }));
    await waitFor(() =>
      expect(api.deleteItemDetailGroup).toHaveBeenCalledWith({
        itemId: "item-1",
        groupId: "new-group",
        revision: 1,
      }),
    );
    expect(screen.queryByLabelText("Detalhes de Etiquetas")).toBeNull();
  });

  it("conflito não apaga o texto digitado", async () => {
    api.saveItemDetailGroup.mockResolvedValueOnce({
      data: null,
      error: { message: "Grupo alterado por outro usuario." },
    });
    editor();
    await screen.findByRole("button", { name: "Costura" });
    fireEvent.click(screen.getByRole("button", { name: "Costura" }));
    fireEvent.change(screen.getByLabelText("Detalhes de Costura"), {
      target: { value: "Minha orientação" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar detalhes" }));
    expect((await screen.findByRole("alert")).textContent).toContain("outro usuario");
    expect((screen.getByLabelText("Detalhes de Costura") as HTMLTextAreaElement).value).toBe(
      "Minha orientação",
    );
  });

  it("avisa antes de fechar alterações não salvas", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onClose = editor();
    await screen.findByLabelText("Detalhes de Detalhes");
    fireEvent.change(screen.getByLabelText("Detalhes de Detalhes"), {
      target: { value: "Não perder" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(window.confirm).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("item bloqueado apenas consulta, sem iniciar ou permitir edição", async () => {
    editor(false);
    const text = await screen.findByLabelText("Detalhes de Detalhes");
    expect((text as HTMLTextAreaElement).disabled).toBe(true);
    expect(api.getItemTechnicalDetails).toHaveBeenCalledWith("item-1");
    expect(api.startItemTechnicalDetails).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Novo grupo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Salvar detalhes" })).toBeNull();
  });

  it("mostra falha de ativação sem fingir que salvou", async () => {
    api.startItemTechnicalDetails.mockResolvedValueOnce({
      data: null,
      error: { message: "Ative o SQL no Lovable." },
    });
    editor();
    expect((await screen.findByRole("alert")).textContent).toContain("SQL no Lovable");
    expect(screen.queryByRole("button", { name: "Salvar detalhes" })).toBeNull();
  });
});
