// Guarda de regressão da Onda 33: o DPP não pode voltar a calcular nota ESG
// com defaults de demonstração. `dpp-expedition.test.ts` prova o comportamento;
// este impede que os atalhos sejam reintroduzidos sem querer.

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

describe("Onda 33 — passaporte ESG sem conteúdo de demonstração", () => {
  it("o motor do DPP não usa mais defaults do modelo", () => {
    const s = codigo(ler("src/lib/techsheet/dpp-expedition.ts"));
    expect(s).not.toContain("defaultEtiquetagemFor(");
    expect(s).not.toContain("defaultEncaixeCadFor(");
    expect(s).not.toContain("Feito no Brasil");
    expect(s).not.toContain("Composição não informada na ficha");
  });

  it("o cálculo passa pelo veto de requisitos e o PDF exige 8 dígitos", () => {
    const s = codigo(ler("src/lib/techsheet/dpp-expedition.ts"));
    expect(s).toContain("dppRequirements(ref).ok");
    expect(s).toContain("ncm.replace(");
    expect(s).toContain("length !== 8");
  });

  it("as telas dizem o que falta, não só 'demonstração'", () => {
    expect(codigo(ler("src/components/techsheet/DppPassportPanel.tsx"))).toContain(
      "DPP_PENDENCIA_LABEL",
    );
    expect(codigo(ler("src/routes/_authenticated.dashboard.tsx"))).toContain("DPP_PENDENCIA_LABEL");
  });

  it("o media kit nomeia os requisitos do passaporte", () => {
    expect(ler("src/lib/techsheet/research-gtm.ts")).toContain(
      "Nenhuma referência da campanha tem passaporte apurável",
    );
  });
});
