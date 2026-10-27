// @vitest-environment jsdom
// Contrato da ficha técnica do pedido: o que a produção recebe TEM de incluir
// quanto trabalho fazer, e NÃO pode incluir custo.
//
// O caso do bug (21/10): a RPC devolvia só setor + operação. O PCP via
// "Bordado escudo" sem saber que eram 65 mil pontos no pedido.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { TechnicalSheetDialog } from "./TechnicalSheetDialog";
import { TechnicalBaseView } from "./ProductionDetails";

const sheet = {
  order: {
    number: "PED-2026-0001",
    status: "liberado_pcp",
    due_date: "2026-03-12",
    customer: "Laranja Mecânica EC",
    released_at: "2026-10-21T17:44:26Z",
  },
  items: [
    {
      item_id: "i1",
      description: "Camisa futebol oficial",
      color: "Laranja/Preto",
      quantity: 10,
      reference_code: null,
      commercial_notes: "Cliente pediu gola azul",
      tech_status: "em_detalhamento",
      grade: { M: 6, G: 4 },
      detail_groups: [
        {
          name: "Costura",
          commercial_detail: "Costura reforçada conforme cliente",
          detail: "Seguir piloto aprovado\nAplicar etiqueta na gola",
        },
        { name: "Bordado", detail: "Logo no peito esquerdo" },
      ],
      base_snapshot: {
        ref: "REF-01",
        found: true,
        data: {
          materiais: [
            {
              tipo: "Tecido",
              material: "Malha base",
              consumo: "1",
              unidade: "m",
              custo: 9876.5,
              fornecedor: "Fornecedor base",
              lote: "L01",
            },
          ],
          operacoes: [{ setor: "Costura", etapa: "Fechar gola", responsavel: "Equipe base" }],
          aplicacoes: [],
          foto: "https://example.com/referencia.jpg",
        },
      },
      options: [{ name: "Gola V", sector: "Acabamento", quantity: 1, spec: {} }],
      operations: [
        {
          seq: 1,
          sector: "Bordado",
          operation: "Bordado escudo",
          outsourced: true,
          driver: "mil_pontos",
          driver_qty: 65,
          per_piece: 6.5,
        },
        {
          seq: 2,
          sector: "Sublimação",
          operation: "Preparação de sublimação",
          outsourced: false,
          driver: "lote",
          driver_qty: 1,
          per_piece: null,
        },
      ],
      materials: [
        {
          kind: "tecido",
          material: "Dry 100% poliéster",
          unit: "m",
          consumption: 1.35,
          waste_pct: 5,
          consumption_total: 14.175,
        },
      ],
    },
  ],
};

vi.mock("@/lib/sales/api", () => ({
  getTechnicalSheet: vi.fn(async () => ({ data: sheet, error: null })),
}));

describe("TechnicalSheetDialog", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("mostra quanto trabalho fazer por operação e por material", async () => {
    render(<TechnicalSheetDialog orderId="o1" open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Bordado escudo")).toBeTruthy());
    const text = document.body.textContent ?? "";

    expect(text).toContain("65"); // total de mil pontos no pedido
    expect(text).toContain("6,5"); // por peça
    expect(text).toContain("mil pontos"); // driver legível
    expect(text).toContain("14,175"); // consumo total do tecido com perda
    expect(text).toContain("10 pç");
    expect(text).toContain("M × 6");
    expect(text).toContain("Seguir piloto aprovado\nAplicar etiqueta na gola");
    expect(text).toContain("Costura reforçada conforme cliente");
    expect(text).toContain("Cliente pediu gola azul");
    expect(text).toContain("Materiais e consumo do item");
    expect(text).toContain("Logo no peito esquerdo");
    expect(text).toContain("Malha base");
    expect(text).toContain("Gola V");
    expect(text).toContain("Fornecedor base");
    expect(text).toContain("L01");
    expect(text).toContain("Equipe base");
    expect(screen.getByAltText("Foto de referência da ficha padrão").getAttribute("src")).toBe(
      "https://example.com/referencia.jpg",
    );
  });

  it("não vaza custo, preço nem margem", async () => {
    render(<TechnicalSheetDialog orderId="o1" open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Bordado escudo")).toBeTruthy());
    const text = document.body.textContent ?? "";

    for (const forbidden of ["R$", "68,44", "Custo/peça", "9876.5"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("ignora endereço de foto que não seja HTTPS", () => {
    render(<TechnicalBaseView base={{ foto: "javascript:alert(1)" }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("operação de lote não inventa valor por peça", async () => {
    render(<TechnicalSheetDialog orderId="o1" open onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText("Preparação de sublimação")).toBeTruthy());
    const row = screen.getByText("Preparação de sublimação").closest("tr");
    expect(row?.textContent).toContain("lote do pedido");
    expect(row?.textContent).toContain("—"); // por peça ausente
  });
});
