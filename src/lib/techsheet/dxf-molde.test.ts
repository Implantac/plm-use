import { describe, expect, it } from "vitest";

import { estimarConsumoMetros, parseDxfMolde, tamanhosDoMolde } from "./dxf-molde";

const pares = (...itens: (string | number)[]) => itens.map(String).join("\n") + "\n";

/** LWPOLYLINE fechada (retângulo) no layer dado. */
const retangulo = (layer: string, w: number, h: number) =>
  pares(
    0,
    "LWPOLYLINE",
    8,
    layer,
    90,
    4,
    70,
    1,
    10,
    0,
    20,
    0,
    10,
    w,
    20,
    0,
    10,
    w,
    20,
    h,
    10,
    0,
    20,
    h,
  );

const texto = (layer: string, t: string) => pares(0, "TEXT", 8, layer, 1, t);

const dxfAama = (insUnits?: number) =>
  pares(0, "SECTION", 2, "HEADER") +
  (insUnits != null ? pares(9, "$INSUNITS", 70, insUnits) : "") +
  pares(0, "ENDSEC") +
  pares(0, "SECTION", 2, "BLOCKS") +
  pares(0, "BLOCK", 2, "FRENTE") +
  retangulo("1", 500, 700) +
  retangulo("8", 50, 50) + // costura interna, não é contorno
  texto("1", "PIECE NAME: Frente") +
  texto("1", "SIZE: M") +
  texto("1", "QUANTITY: 1") +
  pares(0, "ENDBLK") +
  pares(0, "BLOCK", 2, "MANGA") +
  retangulo("1", 300, 400) +
  texto("1", "PIECE NAME: Manga") +
  texto("1", "SIZE: M") +
  texto("1", "QUANTITY: 2") +
  pares(0, "ENDBLK") +
  pares(0, "ENDSEC") +
  pares(0, "EOF");

describe("Onda 124 — parseDxfMolde", () => {
  it("lê blocos AAMA com nome, tamanho, quantidade e área em cm (mm declarado)", () => {
    const r = parseDxfMolde(dxfAama(4), "molde.dxf");
    expect(r.unidade).toBe("mm");
    expect(r.unidadeDeclarada).toBe(true);
    expect(r.avisos).toEqual([]);
    expect(r.pecas.map((p) => p.nome)).toEqual(["Frente", "Manga"]);
    const frente = r.pecas[0]!;
    expect(frente.tamanho).toBe("M");
    expect(frente.quantidade).toBe(1);
    expect(frente.areaCm2).toBe(3500); // 50 × 70 cm
    expect(frente.larguraCm).toBe(50);
    expect(frente.alturaCm).toBe(70);
    expect(frente.perimetroCm).toBe(240);
    expect(r.pecas[1]!.quantidade).toBe(2);
    expect(r.pecas[1]!.areaCm2).toBe(1200);
  });

  it("respeita $INSUNITS cm e polegada", () => {
    expect(parseDxfMolde(dxfAama(5)).pecas[0]!.areaCm2).toBe(350000);
    const pol = parseDxfMolde(dxfAama(1)).pecas[1]!;
    expect(pol.larguraCm).toBe(762); // 300 in × 2.54
  });

  it("sem $INSUNITS, assume pela magnitude e avisa; unidadeForcada vence", () => {
    const r = parseDxfMolde(dxfAama());
    expect(r.unidade).toBe("cm"); // maior coordenada 700 → entre 120 e 1000
    expect(r.unidadeDeclarada).toBe(false);
    expect(r.avisos[0]).toMatch(/Unidade não declarada/);
    expect(parseDxfMolde(dxfAama(), "x.dxf", "mm").unidade).toBe("mm");
  });

  it("sem blocos: cada contorno solto vira uma peça; sem contornos: aviso e zero peças", () => {
    const solto =
      pares(0, "SECTION", 2, "ENTITIES") +
      retangulo("0", 20, 30) +
      retangulo("0", 10, 10) +
      pares(0, "ENDSEC", 0, "EOF");
    const r = parseDxfMolde(solto);
    expect(r.pecas).toHaveLength(2);
    expect(r.pecas[0]!.nome).toBe("Peça 1");
    expect(r.avisos.some((a) => a.includes("sem blocos AAMA"))).toBe(true);

    const vazio = parseDxfMolde(pares(0, "SECTION", 2, "ENTITIES", 0, "ENDSEC", 0, "EOF"));
    expect(vazio.pecas).toEqual([]);
    expect(vazio.avisos[0]).toMatch(/Nenhum contorno/);
  });
});

describe("Onda 124 — consumo estimado pelo molde", () => {
  const pecas = parseDxfMolde(dxfAama(4)).pecas;

  it("Σ(área×qtd) ÷ (largura × eficiência) em metros", () => {
    // 3500 + 2×1200 = 5900 cm² ; largura 150 cm × 85% = 127.5 ; 5900/127.5 = 46.27 cm = 0.463 m
    const c = estimarConsumoMetros(pecas, 150, 85, "M");
    expect(c.areaCm2).toBe(5900);
    expect(c.pecasConsideradas).toBe(2);
    expect(c.metros).toBe(0.463);
  });

  it("filtra por tamanho (case-insensitive) e devolve 0 sem largura", () => {
    expect(estimarConsumoMetros(pecas, 150, 85, "g").pecasConsideradas).toBe(0);
    expect(estimarConsumoMetros(pecas, 0, 85).metros).toBe(0);
    expect(tamanhosDoMolde(pecas)).toEqual(["M"]);
  });
});
