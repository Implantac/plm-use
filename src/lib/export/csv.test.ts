import { describe, expect, it } from "vitest";
import { rowsToCsv } from "./csv";

describe("rowsToCsv (RFC 4180)", () => {
  it("cabeçalho pela união de chaves na ordem de aparição", () => {
    const csv = rowsToCsv([
      { b: 1, a: 2 },
      { a: 3, c: 4 },
    ]);
    expect(csv.split("\n")[0]).toBe("b,a,c");
    expect(csv.split("\n")[1]).toBe("1,2,");
    expect(csv.split("\n")[2]).toBe(",3,4");
  });

  it("colunas explícitas reordenam e descartam o resto", () => {
    const csv = rowsToCsv([{ x: 1, y: 2, z: 3 }], ["z", "x"]);
    expect(csv).toBe("z,x\n3,1");
  });

  it("escapa aspas duplicando e protege célula com vírgula/ponto-e-vírgula/quebra", () => {
    const rows = [{ nome: 'Blusa "Linho", Amalfi; v4', n: 1 }];
    const csv = rowsToCsv(rows);
    expect(csv.split("\n").slice(1).join("\n")).toBe('"Blusa ""Linho"", Amalfi; v4",1');
  });

  it("null/undefined viram célula vazia; 0 continua 0 e false continua false", () => {
    expect(rowsToCsv([{ a: null, b: undefined, c: 0, d: false }])).toBe("a,b,c,d\n,,0,false");
  });

  it("lista vazia é string vazia (ExportMenu desabilita o botão por cima)", () => {
    expect(rowsToCsv([])).toBe("");
  });
});
