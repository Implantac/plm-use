// Guarda de regressão da Onda 32. Os testes de dpp-expedition provam o
// comportamento; este prova que ninguém reintroduz as fichas fabricadas nem
// volta a tratar `doc` como sempre presente nos consumidores.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const codigo = (f: string) =>
  f
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

describe("Onda 32 — o resolvedor de referência não inventa documento", () => {
  it("dpp-expedition não chama seedFor nem monta NCM/composição de exemplo", () => {
    const s = codigo(ler("src/lib/techsheet/dpp-expedition.ts"));
    expect(s).not.toContain("seedFor(");
    for (const ncm of ["6105.10.00", "6110.20.00", "6203.43.00"]) {
      expect(s).not.toContain(ncm);
    }
    expect(s).not.toContain("Camisa Polo Piquet Pima");
    expect(s).not.toContain("Moletom Raglan Tech Fleece");
    expect(s).toContain("doc: TechSheetData | null");
  });

  it("a linha de expedição aceita doc nulo e o filtro barra antes do cálculo", () => {
    const s = codigo(ler("src/lib/techsheet/dpp-expedition.ts"));
    expect(s).toContain("doc: TechSheetData | null");
    expect(s).toContain("i is LinhaValida");
    expect(s).toContain("!i.doc");
  });

  it.each([
    "src/lib/techsheet/outsourcing-os.ts",
    "src/lib/techsheet/research-gtm.ts",
    "src/components/pcp/OutsourcingServiceOrderPanel.tsx",
  ])("%s protege o uso de ref.doc antes de calcular", (arquivo) => {
    const s = codigo(ler(arquivo));
    expect(s.includes("!ref.doc") || s.includes("!r.doc")).toBe(true);
  });

  it("a home e a tela comercial tratam a ausência do documento", () => {
    expect(codigo(ler("src/routes/_authenticated.commercial.tsx"))).toContain("doc?");
    const home = codigo(ler("src/routes/_authenticated.dashboard.tsx"));
    expect(home).toContain("dppHero ?");
  });
});
