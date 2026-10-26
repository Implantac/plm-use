import { describe, expect, it } from "vitest";
import { canAnyRole, hasAppRole } from "./authz";
import type { AppRole } from "./authz";

const R = (...roles: AppRole[]) => roles;

describe("authz: admin = superadmin wildcard", () => {
  it("admin passa em qualquer checagem de papel", () => {
    expect(hasAppRole(R("admin"), "estilista")).toBe(true);
    expect(canAnyRole(R("admin"), ["pcp", "qualidade"])).toBe(true);
  });
  it("sem admin, vale a lista exata", () => {
    expect(hasAppRole(R("viewer"), "operator")).toBe(false);
    expect(canAnyRole(R("operator"), ["manager", "pcp"])).toBe(false);
    expect(canAnyRole(R("operator"), ["manager", "operator"])).toBe(true);
  });
  it("papeis funcionais continuam independentes", () => {
    expect(hasAppRole(R("comercial"), "admin")).toBe(false);
    expect(canAnyRole(R("almoxarifado"), ["admin"])).toBe(false);
  });
});
