import { describe, expect, it } from "vitest";
import { podeEmitirDocumento, resolveCockpitRef } from "./cockpit-entry";

describe("Onda 31 — o cockpit não abre mais no produto de demonstração", () => {
  it("sem ?ref= e sem ficha salva, não escolhe produto nenhum", () => {
    expect(resolveCockpitRef(undefined, [])).toBeNull();
    expect(resolveCockpitRef("", [])).toBeNull();
    expect(resolveCockpitRef("   ", [])).toBeNull();
  });

  it("sem ?ref= abre a primeira ficha salva — nunca DEV000006 plantado", () => {
    expect(resolveCockpitRef(undefined, ["V24-001", "REAL-9"])).toBe("V24-001");
    expect(resolveCockpitRef(undefined, ["DEV000006"])).toBe("DEV000006");
    // Só devolve a ref do modelo se ela estiver realmente salva no store.
  });

  it("?ref= tem precedência e é normalizado", () => {
    expect(resolveCockpitRef("  abc123 ", ["V24-001"])).toBe("ABC123");
    expect(resolveCockpitRef("NOVA-777", [])).toBe("NOVA-777");
  });

  it("documento só sai de ficha salva", () => {
    expect(podeEmitirDocumento("salva")).toBe(true);
    expect(podeEmitirDocumento("template")).toBe(false);
    expect(podeEmitirDocumento("referencia")).toBe(false);
  });
});
