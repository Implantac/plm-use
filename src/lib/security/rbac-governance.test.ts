import { describe, expect, it } from "vitest";
import {
  INITIAL_GOVERNANCE_EVENTS,
  buildLgpdAuditCsv,
  simulateRoleAccess,
} from "./rbac-governance";

describe("Matriz RBAC, Isolamento RLS & Exportação LGPD", () => {
  it("bloqueia 100% de sales_order_item_costs para comercial e aplica Ficha Cega para fornecedor_externo", () => {
    const comercialSim = simulateRoleAccess("comercial");
    const costRow = comercialSim.find((r) => r.resource.id === "sales_order_item_costs");
    const orderRow = comercialSim.find((r) => r.resource.id === "sales_orders_commercial");

    expect(costRow?.allowed).toBe(false);
    expect(costRow?.effectiveOutcome).toBe("BLOQUEADO_RLS_0_LINHAS");
    expect(orderRow?.allowed).toBe(true);
    expect(orderRow?.effectiveOutcome).toBe("ACESSO_COMPLETO");

    const supplierSim = simulateRoleAccess("fornecedor_externo");
    const techRow = supplierSim.find((r) => r.resource.id === "tech_sheets_pre_cost");
    const supplierCostRow = supplierSim.find((r) => r.resource.id === "sales_order_item_costs");

    expect(techRow?.effectiveOutcome).toBe("FICHA_CEGA_SEM_CUSTO");
    expect(supplierCostRow?.effectiveOutcome).toBe("BLOQUEADO_RLS_0_LINHAS");
  });

  it("concede acesso irrestrito a admin e exporta CSV LGPD estruturado", () => {
    const adminSim = simulateRoleAccess("admin");
    expect(adminSim.every((r) => r.effectiveOutcome === "ACESSO_COMPLETO")).toBe(true);

    const csv = buildLgpdAuditCsv(INITIAL_GOVERNANCE_EVENTS);
    expect(csv).toContain("id;data_hora;ator;papel_rbac;acao_auditada;base_legal_lgpd");
    expect(csv).toContain("engenharia_custo");
    expect(csv).toContain("Lista Nominal por Peça");
  });
});
