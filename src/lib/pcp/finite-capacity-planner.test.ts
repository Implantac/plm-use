import { describe, expect, it } from "vitest";
import {
  evaluateFiniteSectorCapacity,
  sequenceOrdersEdd,
  type SchedulableOrderInput,
} from "./finite-capacity-planner";

describe("Planejamento Finito Carga-Capacidade & Sequenciamento EDD", () => {
  const sampleOrders: SchedulableOrderInput[] = [
    {
      id: "1",
      orderNumber: "OP-2026-102",
      refCode: "V24-001",
      productName: "Polo Piquet Pima",
      pieces: 1800,
      dueDate: "2026-11-18",
      priority: "media",
      hasCustomApplication: true,
    },
    {
      id: "2",
      orderNumber: "OP-2026-101",
      refCode: "DEV000006",
      productName: "Camiseta Dry Pro",
      pieces: 900,
      dueDate: "2026-11-10",
      priority: "alta",
      hasCustomApplication: true,
    },
  ];

  it("detecta sobrecarga de Costura quando a carga semanal excede 95% da capacidade útil", () => {
    const loads = evaluateFiniteSectorCapacity(sampleOrders);
    const sewing = loads.find((l) => l.sector.sectorId === "costura");
    expect(sewing).toBeDefined();
    // 2700 pç * 11.5 min = 31050 min > 12 * 480 * 5 * 0.82 (23616 min)
    expect(sewing!.overloaded).toBe(true);
    expect(sewing!.recommendation).toContain("Facção Homologada");
  });

  it("sequencia primeiro a ordem com entrega mais próxima (EDD)", () => {
    const slots = sequenceOrdersEdd(sampleOrders, "2026-11-04", 12);
    expect(slots[0]?.order.orderNumber).toBe("OP-2026-101");
    expect(slots[1]?.order.orderNumber).toBe("OP-2026-102");
  });
});
