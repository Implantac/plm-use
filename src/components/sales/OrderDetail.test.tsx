// @vitest-environment jsdom
// Render do detalhe do pedido com a API mockada: garante que a tela mostra
// grade, personalização e o painel de custo com os números do motor puro — e
// que a falta da migration vira aviso, não tela branca.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrderDetail } from "./OrderDetail";

const api = vi.hoisted(() => ({
  getOrder: vi.fn(),
  listItems: vi.fn(),
  listCosts: vi.fn(),
  listOrderEvents: vi.fn(),
  listMaterials: vi.fn(),
  listOperations: vi.fn(),
  listCatalog: vi.fn(),
  submitOrder: vi.fn(),
  recalcItem: vi.fn(),
  approveItem: vi.fn(),
  releaseToPcp: vi.fn(),
  deleteItem: vi.fn(),
  addItem: vi.fn(),
  updateOperation: vi.fn(),
  addOperation: vi.fn(),
  addMaterial: vi.fn(),
  updateMaterial: vi.fn(),
  listStockItemOptions: vi.fn(async () => ({ data: [], error: null })),
  findOpForOrder: vi.fn(async () => ({ data: null, error: null })),
  deleteOperation: vi.fn(),
  deleteMaterial: vi.fn(),
  isMissingTable: (error: { code?: string; message?: string } | null) =>
    error?.code === "42P01" || /does not exist/i.test(error?.message ?? ""),
  MIGRATION_HINT: "Migration pendente: rode 20261021090100_sales_orders.sql.",
}));

vi.mock("@/lib/sales/api", () => api);

const detailsApi = vi.hoisted(() => ({
  startItemTechnicalDetails: vi.fn(),
  startCommercialItemDetails: vi.fn(),
  getItemTechnicalDetails: vi.fn(),
  saveItemDetailGroup: vi.fn(),
  saveCommercialItemDetailGroup: vi.fn(),
  deleteItemDetailGroup: vi.fn(),
  deleteCommercialItemDetailGroup: vi.fn(),
  listItemConsumption: vi.fn(),
  saveItemConsumption: vi.fn(),
  deleteItemConsumption: vi.fn(),
}));
vi.mock("@/lib/sales/technical-details-api", () => detailsApi);

// O projeto não roda com globals do vitest: sem cleanup explícito, cada render
// acumula no document e os queries passam a achar múltiplos elementos.
afterEach(cleanup);

const order = {
  id: "o1",
  number: "PED-2026-0001",
  customerId: "c1",
  customerName: "Laranja Mecânica EC",
  status: "em_custo" as const,
  isQuote: true,
  dueDate: "2026-03-12",
  totalValue: 977.7,
  createdAt: "2026-10-21T10:00:00Z",
};

const item = {
  id: "i1",
  orderId: "o1",
  lineNo: 1,
  catalogProductId: "p1",
  description: "Camisa futebol oficial",
  color: "Laranja/Preto",
  quantity: 10,
  unitPrice: 97.77,
  priceLocked: false,
  techStatus: "em_detalhamento" as const,
  costStatus: "custo_concluido" as const,
  sizes: [
    { size: "M", quantity: 6 },
    { size: "G", quantity: 4 },
  ],
  options: [{ optionId: "op1", name: "Bordado escudo", quantity: 2 }],
};

const materials = [
  {
    id: "m1",
    kind: "tecido",
    material: "Dry 100% poliéster",
    unit: "m",
    consumption: 1.35,
    wastePct: 5,
    unitCost: 18,
  },
  {
    id: "m2",
    kind: "aviamento",
    material: "Ribana 1x1",
    unit: "kg",
    consumption: 0.08,
    wastePct: 3,
    unitCost: 32,
  },
  {
    id: "m3",
    kind: "linha",
    material: "Linha",
    unit: "m",
    consumption: 1,
    wastePct: 0,
    unitCost: 0.9,
  },
  {
    id: "m4",
    kind: "aviamento",
    material: "Papel + tinta",
    unit: "un",
    consumption: 1,
    wastePct: 0,
    unitCost: 3.2,
    source: "custo" as const,
  },
  {
    id: "m5",
    kind: "embalagem",
    material: "Embalagem",
    unit: "un",
    consumption: 1,
    wastePct: 0,
    unitCost: 1.6,
  },
];

const operations = [
  {
    id: "op-1",
    seq: 1,
    sector: "Corte",
    operation: "Corte",
    driver: "peca" as const,
    driverQty: 10,
    unitCost: 2.4,
    setupCost: 0,
    outsourced: false,
    source: "catalogo" as const,
  },
  {
    id: "op-2",
    seq: 2,
    sector: "Costura",
    operation: "Costura",
    driver: "minuto" as const,
    driverQty: 220,
    unitCost: 0.55,
    setupCost: 0,
    outsourced: false,
    source: "catalogo" as const,
  },
  {
    id: "op-3",
    seq: 3,
    sector: "Bordado",
    operation: "Bordado escudo",
    driver: "mil_pontos" as const,
    driverQty: 65,
    unitCost: 0.11,
    setupCost: 38,
    outsourced: true,
    source: "catalogo" as const,
  },
  {
    id: "op-4",
    seq: 4,
    sector: "Sublimação",
    operation: "Preparação",
    driver: "lote" as const,
    driverQty: 1,
    unitCost: 0,
    setupCost: 45,
    outsourced: false,
    source: "catalogo" as const,
  },
  {
    id: "op-5",
    seq: 5,
    sector: "Acabamento",
    operation: "Acabamento",
    driver: "peca" as const,
    driverQty: 10,
    unitCost: 2.8,
    setupCost: 0,
    outsourced: false,
    source: "catalogo" as const,
  },
  {
    id: "op-6",
    seq: 6,
    sector: "Expedição",
    operation: "QC",
    driver: "peca" as const,
    driverQty: 10,
    unitCost: 1.2,
    setupCost: 0,
    outsourced: false,
    source: "catalogo" as const,
  },
  {
    id: "op-7",
    seq: 7,
    sector: "Bordado",
    operation: "Reforço aplicado",
    driver: "cor" as const,
    driverQty: 2,
    unitCost: 4.5,
    setupCost: 0,
    outsourced: false,
    source: "custo" as const,
  },
];

const cost = {
  itemId: "i1",
  materialsTotal: 338.52,
  operationsTotal: 212.15,
  setupTotal: 83,
  overheadPct: 8,
  industrialCost: 684.36,
  unitCost: 68.44,
  marginPct: 30,
  suggestedPrice: 97.77,
  status: "custo_concluido" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getOrder.mockResolvedValue({ data: order, error: null });
  api.listItems.mockResolvedValue({ data: [item], error: null });
  api.listCosts.mockResolvedValue({ data: [cost], error: null });
  api.listOrderEvents.mockResolvedValue({
    data: [
      {
        id: "e1",
        eventType: "sales_order.submitted",
        toStatus: "enviado",
        createdAt: "2026-10-21T10:05:00Z",
      },
    ],
    error: null,
  });
  api.listMaterials.mockResolvedValue({ data: materials, error: null });
  api.listOperations.mockResolvedValue({ data: operations, error: null });
  api.listCatalog.mockResolvedValue({ data: [], error: null });
  api.updateOperation.mockResolvedValue({ data: {}, error: null });
  api.addOperation.mockResolvedValue({ data: {}, error: null });
  api.addMaterial.mockResolvedValue({ data: {}, error: null });
  api.updateMaterial.mockResolvedValue({ data: {}, error: null });
  api.deleteOperation.mockResolvedValue({ data: "ok", error: null });
  api.deleteMaterial.mockResolvedValue({ data: "ok", error: null });
  api.recalcItem.mockResolvedValue({ data: 68.44, error: null });
  detailsApi.startItemTechnicalDetails.mockResolvedValue({
    data: {
      initialized: true,
      base_ref: null,
      base_found: false,
      base: {},
      groups: [
        {
          id: "g1",
          name: "Costura",
          commercial_detail: "Gola azul solicitada",
          detail: "",
          revision: 2,
          sort_order: 10,
        },
      ],
    },
    error: null,
  });
  detailsApi.startCommercialItemDetails.mockResolvedValue({
    data: {
      initialized: true,
      base_found: false,
      base: {},
      groups: [
        {
          id: "g1",
          name: "Costura",
          commercial_detail: "",
          detail: "",
          revision: 1,
          sort_order: 10,
        },
      ],
    },
    error: null,
  });
  detailsApi.saveCommercialItemDetailGroup.mockResolvedValue({
    data: {
      id: "g1",
      name: "Costura",
      commercial_detail: "Pedido do cliente",
      detail: "",
      revision: 2,
      sort_order: 10,
    },
    error: null,
  });
  detailsApi.listItemConsumption.mockResolvedValue({ data: [], error: null });
});

describe("OrderDetail", () => {
  it("mostra pedido, cliente, grade e personalização", async () => {
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    expect(await screen.findByText("PED-2026-0001")).toBeTruthy();
    expect(screen.getByText("Laranja Mecânica EC", { exact: false })).toBeTruthy();
    expect(screen.getByText("Camisa futebol oficial")).toBeTruthy();
    expect(screen.getByText("×6")).toBeTruthy();
    expect(screen.getByText("Bordado escudo")).toBeTruthy();
    await waitFor(() => expect(api.listOperations).toHaveBeenCalledWith("i1"));
  });

  it("painel de custo fecha no motor puro (R$ 68,44/pç, margem 30%)", async () => {
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    await screen.findByText("PED-2026-0001");
    expect(await screen.findByText("Ficha do pedido · custo")).toBeTruthy();
    expect(screen.getAllByText("R$ 68,44").length).toBeGreaterThan(0);
    expect(screen.getByText("margem 30.0%")).toBeTruthy();
    expect(screen.getByText("R$ 338,52")).toBeTruthy();
    expect(screen.getByText("R$ 83,00")).toBeTruthy();
  });

  it("abre a tela de detalhes de produção para o item em custo", async () => {
    render(
      <OrderDetail
        orderId="o1"
        canSell={false}
        canCost
        canPlan={false}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Detalhar produção" }));
    expect(await screen.findByLabelText("Detalhes de Costura")).toBeTruthy();
    expect(detailsApi.startItemTechnicalDetails).toHaveBeenCalledWith("i1");
    expect(screen.getByText("Gola azul solicitada")).toBeTruthy();
    expect(screen.getAllByText(/Laranja\/Preto · 10 peças/).length).toBeGreaterThan(0);
    expect(await screen.findByText("Consumo dos materiais deste item")).toBeTruthy();
  });

  it("atualiza pedido e totais ao fechar o editor depois de recalcular consumo", async () => {
    const row = {
      id: "m1",
      kind: "tecido",
      material: "Malha",
      unit: "m",
      consumption: 1,
      waste_pct: 0,
      unit_cost: 10,
      total_cost: 100,
      source: "custo",
      revision: 1,
    };
    detailsApi.listItemConsumption.mockResolvedValue({ data: [row], error: null });
    detailsApi.saveItemConsumption.mockResolvedValue({
      data: { ...row, consumption: 2, revision: 2 },
      error: null,
    });
    render(
      <OrderDetail
        orderId="o1"
        canSell={false}
        canCost
        canPlan={false}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Detalhar produção" }));
    fireEvent.change(await screen.findByLabelText("Consumo por peça de Malha"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar consumo de Malha" }));
    await waitFor(() => expect(detailsApi.saveItemConsumption).toHaveBeenCalled());
    await screen.findByText("Consumo de Malha salvo e custo recalculado.");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(api.getOrder).toHaveBeenCalledTimes(2));
    expect(api.listCosts).toHaveBeenCalledTimes(2);
  });

  it("comercial registra observações gerais ao adicionar o item", async () => {
    api.getOrder.mockResolvedValue({ data: { ...order, status: "rascunho" }, error: null });
    api.listCatalog.mockResolvedValue({
      data: [
        {
          id: "p1",
          code: "CAM",
          name: "Camisa",
          status: "validado",
          minQty: 10,
          basePrice: 100,
          grade: [],
          options: [],
        },
      ],
      error: null,
    });
    api.addItem.mockResolvedValue({ data: {}, error: null });
    render(
      <OrderDetail
        orderId="o1"
        canSell
        canCost={false}
        canPlan={false}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar item" }));
    await screen.findByRole("option", { name: "CAM — Camisa" });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "p1" } });
    fireEvent.change(screen.getByLabelText("Observações gerais deste item"), {
      target: { value: "Entrega com embalagem especial" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    await waitFor(() =>
      expect(api.addItem).toHaveBeenCalledWith(
        expect.objectContaining({ notes: "Entrega com embalagem especial" }),
      ),
    );
  });

  it("comercial registra detalhes por grupo no rascunho sem acessar o custo", async () => {
    api.getOrder.mockResolvedValue({ data: { ...order, status: "rascunho" }, error: null });
    render(
      <OrderDetail
        orderId="o1"
        canSell
        canCost={false}
        canPlan={false}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Detalhes comerciais" }));
    const textarea = await screen.findByLabelText("Detalhes de Costura");
    fireEvent.change(textarea, { target: { value: "Pedido do cliente" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar detalhes" }));
    await waitFor(() =>
      expect(detailsApi.saveCommercialItemDetailGroup).toHaveBeenCalledWith({
        itemId: "i1",
        groupId: "g1",
        name: null,
        detail: "Pedido do cliente",
        revision: 1,
      }),
    );
    expect(detailsApi.startCommercialItemDetails).toHaveBeenCalledWith("i1");
    expect(detailsApi.listItemConsumption).not.toHaveBeenCalled();
  });

  it("esconde o painel de custo de quem não é de custo", async () => {
    render(
      <OrderDetail
        orderId="o1"
        canSell
        canCost={false}
        canPlan={false}
        onClose={() => undefined}
      />,
    );
    await screen.findByText("PED-2026-0001");
    expect(screen.queryByText("Ficha do pedido · custo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Detalhar produção" })).toBeNull();
    expect(api.listMaterials).not.toHaveBeenCalled();
  });

  it("sem a migration aplicada, explica em vez de quebrar", async () => {
    api.getOrder.mockResolvedValue({
      data: null,
      error: { message: 'relation "sales_orders" does not exist', code: "42P01" },
    });
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    expect(await screen.findByText(/Migration pendente/)).toBeTruthy();
  });

  it("custo corrige driver/valor de uma operação pelo painel (updateOperation + recalc)", async () => {
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    await screen.findByText("Ficha do pedido · custo");
    fireEvent.click(screen.getByRole("button", { name: /Editar linha Bordado escudo/i }));
    const qty = await screen.findByLabelText("Qtd do driver");
    fireEvent.change(qty, { target: { value: "70" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar linha" }));
    await waitFor(() =>
      expect(api.updateOperation).toHaveBeenCalledWith(
        expect.objectContaining({ id: "op-3", driverQty: 70, unitCost: 0.11, setupCost: 38 }),
      ),
    );
    expect(api.recalcItem).toHaveBeenCalledWith("i1");
  });

  it("custo insere material extra na ficha do item (delta detalhado)", async () => {
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    await screen.findByText("Ficha do pedido · custo");
    fireEvent.click(await screen.findByRole("button", { name: /Novo material/i }));
    fireEvent.change(await screen.findByLabelText("Material"), {
      target: { value: "Tela de seda 60g" },
    });
    fireEvent.change(screen.getByLabelText("Consumo por peça"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Custo unitário (R$)"), { target: { value: "3.2" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar material" }));
    await waitFor(() =>
      expect(api.addMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          itemId: "i1",
          material: "Tela de seda 60g",
          kind: "tecido",
          consumption: 1,
          unitCost: 3.2,
        }),
      ),
    );
    expect(api.recalcItem).toHaveBeenCalledWith("i1");
  });

  it("item sem explosão de ficha ainda pode ser detalhado pelo custo (setores)", async () => {
    api.getOrder.mockResolvedValue({ data: { ...order, status: "em_custo" }, error: null });
    api.listItems.mockResolvedValue({
      data: [{ ...item, costStatus: "aguardando_custo" }],
      error: null,
    });
    api.listCosts.mockResolvedValue({ data: [], error: null });
    api.listMaterials.mockResolvedValue({ data: [], error: null });
    api.listOperations.mockResolvedValue({ data: [], error: null });
    render(
      <OrderDetail
        orderId="o1"
        canSell={false}
        canCost
        canPlan={false}
        onClose={() => undefined}
      />,
    );
    await screen.findByText(/Sem linhas de custo ainda/);
    fireEvent.click(screen.getByRole("button", { name: "+ Bordado" }));
    expect(await screen.findByRole("button", { name: /Adicionar operação/i })).toBeTruthy();
    // o pré-preenchimento do chip precisa ser VISÍVEL no campo (input controlado)
    const setor = screen.getByLabelText("Setor") as HTMLInputElement;
    expect(setor.value).toBe("Bordado");
  });

  it("linha aprovada congela a edição (sem lápis, sem botões de delta)", async () => {
    api.listItems.mockResolvedValue({ data: [{ ...item, costStatus: "aprovado" }], error: null });
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    await screen.findByText("Ficha do pedido · custo");
    expect(screen.queryByRole("button", { name: /Editar linha/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Nova operação/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remover linha/i })).toBeNull();
  });

  it("custo remove só linhas que nasceram no custo (guard de source)", async () => {
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    await screen.findByText("Ficha do pedido · custo");
    fireEvent.click(screen.getByRole("button", { name: "Editar linha Reforço aplicado" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover linha" }));
    await waitFor(() => expect(api.deleteOperation).toHaveBeenCalledWith("op-7"));
    expect(api.recalcItem).toHaveBeenCalledWith("i1");
    fireEvent.click(screen.getByRole("button", { name: "Editar linha Corte" }));
    expect(screen.queryByRole("button", { name: "Remover linha" })).toBeNull();
  });

  it("custo corrige consumo de um material (updateMaterial + recalc)", async () => {
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    await screen.findByText("Ficha do pedido · custo");
    fireEvent.click(screen.getByRole("button", { name: "Editar linha Papel + tinta" }));
    fireEvent.change(screen.getByLabelText("Consumo do material"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Custo unitário do material (R$)"), {
      target: { value: "3.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar material" }));
    await waitFor(() =>
      expect(api.updateMaterial).toHaveBeenCalledWith(
        expect.objectContaining({ id: "m4", consumption: 2, wastePct: 0, unitCost: 3.5 }),
      ),
    );
    expect(api.recalcItem).toHaveBeenCalledWith("i1");
    fireEvent.click(screen.getByRole("button", { name: "Editar linha Papel + tinta" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover material" }));
    await waitFor(() => expect(api.deleteMaterial).toHaveBeenCalledWith("m4"));
    // material do catálogo (sem source='custo') não oferece remoção
    fireEvent.click(screen.getByRole("button", { name: "Editar linha Dry 100% poliéster" }));
    expect(screen.queryByRole("button", { name: "Remover material" })).toBeNull();
  });

  it("formulários expõem terceirizada e observações (campos que a API já aceitava)", async () => {
    render(<OrderDetail orderId="o1" canSell canCost canPlan={false} onClose={() => undefined} />);
    await screen.findByText("Ficha do pedido · custo");
    fireEvent.click(screen.getByRole("button", { name: /Nova operação/i }));
    fireEvent.change(screen.getByLabelText("Operação"), { target: { value: "Bainha" } });
    fireEvent.click(screen.getByLabelText("Terceirizada"));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar operação" }));
    await waitFor(() =>
      expect(api.addOperation).toHaveBeenCalledWith(
        expect.objectContaining({ operation: "Bainha", outsourced: true }),
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /Novo material/i }));
    fireEvent.change(screen.getByLabelText("Material"), { target: { value: "Etiqueta" } });
    fireEvent.change(screen.getByLabelText("Observações"), { target: { value: "tecida" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar material" }));
    await waitFor(() =>
      expect(api.addMaterial).toHaveBeenCalledWith(
        expect.objectContaining({ material: "Etiqueta", notes: "tecida" }),
      ),
    );
  });
});
