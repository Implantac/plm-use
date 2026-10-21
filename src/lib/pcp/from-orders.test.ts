// Regras de conversão OP → Lote do Kanban. Sem banco: a função é pura e é aqui
// que mora o risco do erro (setor errado manda a peça para a coluna errada;
// perda contada como passagem infla a produção).
import { describe, expect, it } from "vitest";
import {
  currentStep,
  normalizePriority,
  normalizeSector,
  ordersToLotes,
  passagesToReferencia,
  itemToReferencia,
  type DbOrder,
  type DbPassage,
  type DbStep,
} from "./from-orders";

const steps: DbStep[] = [
  { id: "s1", sector: "Corte", sequence: 1 },
  { id: "s2", sector: "Costura", sequence: 2 },
  { id: "s3", sector: "Bordado", sequence: 3 },
  { id: "s4", sector: "Sublimação", sequence: 4 },
  { id: "s5", sector: "Acabamento", sequence: 5 },
  { id: "s6", sector: "Expedição", sequence: 6 },
];

const item = {
  id: "i1",
  reference_code: "CAM-FUT-2026",
  reference_name: "Camisa futebol oficial",
  color: "Laranja/Preto",
  quantity_planned: 10,
  quantity_produced: 0,
  quantity_lost: 0,
  status: "aguardando",
  balances: [
    { step_id: "s1", quantity: 0 },
    { step_id: "s2", quantity: 0 },
    { step_id: "s3", quantity: 10 },
    { step_id: "s4", quantity: 0 },
  ],
  grade: { M: 6, G: 4 },
};

describe("normalizeSector", () => {
  it("reconhece os setores reais das rotas, com acento ou sem", () => {
    expect(normalizeSector("Sublimação")).toBe("Sublimação");
    expect(normalizeSector("SUBLIMACAO")).toBe("Sublimação");
    expect(normalizeSector("Bordado")).toBe("Bordado");
    expect(normalizeSector(" costura ")).toBe("Costura");
  });

  it("junta apelidos de decoração e de facção", () => {
    expect(normalizeSector("Estamparia")).toBe("Silk");
    expect(normalizeSector("Serigrafia")).toBe("Silk");
    expect(normalizeSector("Facção")).toBe("Terceirizados");
    expect(normalizeSector("Lavanderia")).toBe("Terceirizados");
  });

  it("não descarta setor desconhecido", () => {
    expect(normalizeSector("Setor novo")).toBe("Terceirizados");
    expect(normalizeSector(null)).toBe("Compras");
  });
});

describe("normalizePriority", () => {
  it("converte o enum do banco para o rótulo da tela", () => {
    expect(normalizePriority("alta")).toBe("Alta");
    expect(normalizePriority("media")).toBe("Média");
    expect(normalizePriority("URGENTE")).toBe("Urgente");
    expect(normalizePriority(undefined)).toBe("Média");
  });
});

describe("currentStep", () => {
  it("a peça está na etapa mais avançada que ainda tem saldo", () => {
    expect(currentStep(item, steps).step?.sector).toBe("Bordado");
    expect(currentStep(item, steps).finished).toBe(false);
  });

  it("saldo só na primeira etapa = não começou", () => {
    const fresh = { ...item, balances: [{ step_id: "s1", quantity: 10 }] };
    const r = currentStep(fresh, steps);
    expect(r.step?.sector).toBe("Corte");
    expect(r.finished).toBe(false);
  });

  it("saldo só na última etapa e quantidade produzida = concluído", () => {
    const done = {
      ...item,
      quantity_produced: 10,
      balances: [{ step_id: "s6", quantity: 10 }],
    };
    expect(currentStep(done, steps).finished).toBe(true);
  });

  it("sem saldo nenhum, aponta a primeira etapa", () => {
    const empty = { ...item, balances: [] };
    expect(currentStep(empty, steps).step?.sector).toBe("Corte");
  });
});

describe("itemToReferencia", () => {
  it("leva grade, quantidade e setor para o modelo da tela", () => {
    const ref = itemToReferencia(item, steps, []);
    expect(ref.ref).toBe("CAM-FUT-2026");
    expect(ref.qtd_programada).toBe(10);
    expect(ref.setor_atual).toBe("Bordado");
    expect(ref.status).toBe("Em produção");
    expect(ref.grade).toEqual({ M: 6, G: 4 });
  });

  it("item concluído vira status Concluído", () => {
    const done = { ...item, quantity_produced: 10, quantity_lost: 0 };
    expect(itemToReferencia(done, steps, []).status).toBe("Concluído");
  });

  it("perda marca o item como Ocorrência", () => {
    const lost = { ...item, quantity_lost: 2 };
    expect(itemToReferencia(lost, steps, []).status).toBe("Ocorrência");
  });
});

describe("passagesToReferencia", () => {
  const p = (over: Partial<DbPassage>): DbPassage => ({
    id: "p1",
    production_order_item_id: "i1",
    origin_step_id: "s2",
    destination_step_id: "s3",
    quantity: 4,
    type: "parcial",
    responsible_name: "Sandra",
    observation: null,
    created_at: "2026-10-21T10:00:00Z",
    ...over,
  });

  it("passagem vira passagem, com setores legíveis", () => {
    const { passagens, ocorrencias } = passagesToReferencia([p({})], steps);
    expect(ocorrencias).toHaveLength(0);
    expect(passagens[0]).toMatchObject({
      tipo: "parcial",
      setor_origem: "Costura",
      setor_destino: "Bordado",
      qtd: 4,
    });
  });

  it("perda NÃO é passagem — vira ocorrência negativa com o motivo", () => {
    const { passagens, ocorrencias } = passagesToReferencia(
      [p({ type: "perda", quantity: 2, observation: "mancha de tinta" })],
      steps,
    );
    expect(passagens).toHaveLength(0);
    expect(ocorrencias[0]).toMatchObject({
      tipo: "negativa",
      qtd: 2,
      motivo: "mancha de tinta",
      setor: "Costura",
    });
  });

  it("perda sem motivo não inventa justificativa", () => {
    const { ocorrencias } = passagesToReferencia([p({ type: "perda" })], steps);
    expect(ocorrencias[0].motivo).toBe("perda sem motivo registrado");
  });
});

describe("ordersToLotes", () => {
  const order: DbOrder = {
    id: "o1",
    number: "OP-PED-2026-0001",
    status: "em_producao",
    priority: "alta",
    planned_start: "2026-02-20",
    planned_end: "2026-03-05",
    created_at: "2026-10-21T17:44:26Z",
    items: [{ ...item, route_id: "r1" } as DbOrder["items"][number]],
  };

  it("uma OP vira um lote; cada item, uma referência", () => {
    const [lote] = ordersToLotes([order], { r1: steps }, []);
    expect(lote.numero).toBe("OP-PED-2026-0001");
    expect(lote.prioridade).toBe("Alta");
    expect(lote.data_prevista).toBe("2026-03-05");
    expect(lote.referencias).toHaveLength(1);
    expect(lote.referencias[0].setor_atual).toBe("Bordado");
  });

  it("passagens são ligadas ao item certo da OP", () => {
    const passage: DbPassage = {
      id: "p1",
      production_order_item_id: "i1",
      origin_step_id: "s2",
      destination_step_id: "s3",
      quantity: 10,
      type: "total",
      responsible_name: "Sandra",
      observation: null,
      created_at: "2026-10-21T10:00:00Z",
    };
    const [lote] = ordersToLotes([order], { r1: steps }, [passage]);
    expect(lote.referencias[0].passagens).toHaveLength(1);
  });

  it("item com rota diferente usa os passos da própria rota", () => {
    const outraRota: DbStep[] = [
      { id: "x1", sector: "Corte", sequence: 1 },
      { id: "x2", sector: "Acabamento", sequence: 2 },
    ];
    const comOutraRota: DbOrder = {
      ...order,
      items: [
        { ...item, route_id: "r1" } as DbOrder["items"][number],
        {
          ...item,
          id: "i2",
          route_id: "r2",
          balances: [{ step_id: "x2", quantity: 10 }],
        } as DbOrder["items"][number],
      ],
    };
    const [lote] = ordersToLotes([comOutraRota], { r1: steps, r2: outraRota }, []);
    expect(lote.referencias.map((r) => r.setor_atual)).toEqual(["Bordado", "Acabamento"]);
  });
});
