import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { nextStep, type ProdRoute } from "@/hooks/use-production-orders";
import { opPermissions } from "./op-permissions";

const step = (id: string, sequence: number, sector: string) => ({
  id,
  route_id: "r",
  sequence,
  sector,
  operation: sector,
  mandatory: true,
  outsourced: false,
});
const silk: ProdRoute = {
  id: "r1",
  code: "R01",
  name: "Silk",
  description: null,
  active: true,
  steps: [step("c", 1, "Corte"), step("k", 2, "Costura"), step("s", 3, "Silk")],
};
const bordado: ProdRoute = {
  id: "r2",
  code: "R02",
  name: "Bordado",
  description: null,
  active: true,
  steps: [step("c2", 1, "Corte"), step("b", 2, "Bordado")],
};

describe("próxima etapa pela rota", () => {
  it("segue a sequência da rota", () => {
    expect(nextStep(silk, "c")?.sector).toBe("Costura");
    expect(nextStep(silk, "k")?.sector).toBe("Silk");
  });
  it("última etapa não tem próxima (concluído)", () => expect(nextStep(silk, "s")).toBeNull());
  it("item com rota diferente segue a própria rota", () =>
    expect(nextStep(bordado, "c2")?.sector).toBe("Bordado"));
  it("etapa desconhecida retorna null", () => expect(nextStep(silk, "x")).toBeNull());
});

describe("permissões por papel", () => {
  it("PCP e líder planejam e passam", () => {
    expect(opPermissions(["pcp"])).toEqual({ canPlan: true, canMove: true });
    expect(opPermissions(["manager"])).toEqual({ canPlan: true, canMove: true });
  });
  it("operador só passa", () =>
    expect(opPermissions(["operator"])).toEqual({ canPlan: false, canMove: true }));
  it("visualizador só lê", () =>
    expect(opPermissions(["viewer"])).toEqual({ canPlan: false, canMove: false }));
});
