import { describe, expect, it } from "vitest";

import {
  computeGradedMatrix,
  computeGradedRow,
  gradedMatrixToCsv,
  type MeasurementPomRow,
  type TechSheetMeasurementSpec,
} from "./textile";

const row = (over: Partial<MeasurementPomRow> = {}): MeasurementPomRow => ({
  id: "a",
  codigo: "A",
  nome: "Tórax",
  valorBase: 50,
  regraGraduacaoCm: 2,
  toleranciaCm: 1,
  ...over,
});
const tamanhos = ["PP", "P", "M", "G", "GG", "XG"];

describe("Onda 124 — graduação por faixa (fatoresSalto)", () => {
  it("sem fatores continua linear (compatível com fichas antigas)", () => {
    expect(computeGradedRow(row(), tamanhos, "M")).toEqual({
      PP: 46,
      P: 48,
      M: 50,
      G: 52,
      GG: 54,
      XG: 56,
    });
  });

  it("fator do salto até um tamanho se acumula para os seguintes", () => {
    const r = computeGradedRow(row(), tamanhos, "M", { GG: 1.5, XG: 2 });
    expect(r.G).toBe(52); // salto normal
    expect(r.GG).toBe(55); // 52 + 2×1.5
    expect(r.XG).toBe(59); // 55 + 2×2
    expect(r.P).toBe(48); // para baixo não muda
  });

  it("aplica também para baixo do base e respeita overrides manuais", () => {
    const r = computeGradedRow(row({ overrides: { XG: 70 } }), tamanhos, "M", { PP: 0.5, GG: 1.5 });
    expect(r.P).toBe(48);
    expect(r.PP).toBe(47); // 48 − 2×0.5
    expect(r.XG).toBe(70);
  });

  it("computeGradedMatrix repassa os fatores do spec", () => {
    const spec: TechSheetMeasurementSpec = {
      tamanhoBase: "M",
      tamanhos,
      unidade: "cm",
      pontos: [row()],
      fatoresSalto: { GG: 1.5 },
    };
    expect(computeGradedMatrix(spec)[0]!.values.GG).toBe(55);
  });
});

describe("Onda 124 — exportação CSV da tabela de medidas", () => {
  const spec: TechSheetMeasurementSpec = {
    tamanhoBase: "M",
    tamanhos: ["P", "M", "G"],
    unidade: "cm",
    pontos: [row({ nome: "Tórax; busto", regraGraduacaoCm: 1.5, toleranciaCm: 0.5 })],
    fatoresSalto: { G: 2 },
  };

  it("gera CSV com BOM, ponto-e-vírgula, vírgula decimal e cabeçalho", () => {
    const csv = gradedMatrixToCsv(spec, "REF-1");
    expect(csv.startsWith("\ufeff")).toBe(true);
    const linhas = csv.replace("\ufeff", "").trim().split("\r\n");
    expect(linhas[0]).toBe("Referência;REF-1;Tamanho base;M;Unidade;cm");
    expect(linhas[1]).toBe("Código;Ponto de medida;Como medir;Tolerância;P;M;G");
    const dados = linhas.find((l) => l.startsWith("A;"))!;
    expect(dados).toContain('"Tórax; busto"'); // campo com ; vem entre aspas
    expect(dados).toContain("±0,50;48,50;50,00;53,00"); // G = 50 + 1.5×2
    expect(gradedMatrixToCsv(spec).replace("\ufeff", "").startsWith("Código;")).toBe(true);
  });
});
