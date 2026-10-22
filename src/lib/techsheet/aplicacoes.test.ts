import { describe, expect, it } from "vitest";
import {
  areaCm2,
  custoAplicacoesPecasTotal,
  custoPeca,
  custoPorPecaComSetup,
  resumoAplicacao,
  setupTotal,
  validateAplicacaoDraft,
  type Aplicacao,
  type AplicacaoDraft,
} from "./aplicacoes";

const ap = (over: Partial<Aplicacao> = {}): Aplicacao => ({
  id: "a1",
  tipo: "Silk",
  posicao: "Costas central",
  larguraCm: 30,
  alturaCm: 40,
  cores: 4,
  qtdPorPeca: 1,
  custoUnitario: 3,
  ...over,
});

describe("aplicações (domínio de custo de uniforme)", () => {
  it("área vem de L×A e ignora lixo negativo", () => {
    expect(areaCm2(ap())).toBe(1200);
    expect(areaCm2(ap({ larguraCm: -5, alturaCm: 10 }))).toBe(0);
  });

  it("custo/peça multiplica posições e o total soma a ficha", () => {
    expect(custoPeca(ap({ qtdPorPeca: 3 }))).toBe(9);
    expect(custoAplicacoesPecasTotal([ap(), ap({ id: "a2", custoUnitario: 5 })])).toBe(8);
  });

  it("setup entra diluído na tiragem — o número que a régua do lote cobra", () => {
    const apps = [ap({ custoSetup: 240 }), ap({ id: "a2", custoUnitario: 1.5, qtdPorPeca: 2 })];
    // peças = 3 + 3 = 6; setup 240/250 = 0,96
    expect(setupTotal(apps)).toBe(240);
    expect(custoPorPecaComSetup(apps, 250)).toBeCloseTo(6.96);
    expect(custoPorPecaComSetup(apps, 1000)).toBeCloseTo(6.24);
    // tiragem inválida NÃO esconde o setup silenciosamente: devolve sem diluir
    expect(custoPorPecaComSetup(apps, 0)).toBe(6);
  });

  it("validação pega os erros que estouram a planilha", () => {
    expect(
      validateAplicacaoDraft({
        tipo: "Bordado",
        posicao: "Peito",
        larguraCm: 9,
        alturaCm: 9,
        cores: 1,
        qtdPorPeca: 1,
        custoUnitario: 4,
      }),
    ).toEqual({});
    // tipo fora da união: cast declarado é o ponto — é dado de import/colagem,
    // e a validação de borda tem que pegar ANTES do tipo do tsc fingir que existe
    const e = validateAplicacaoDraft({
      tipo: "Tattoo" as AplicacaoDraft["tipo"],
      posicao: "x",
      larguraCm: 0,
      alturaCm: -1,
      cores: 0,
      qtdPorPeca: 1.5,
      custoUnitario: -2,
    });
    expect(Object.keys(e).length).toBeGreaterThanOrEqual(6);
    expect(e.tipo).toBeTruthy();
    expect(e.qtdPorPeca).toContain("inteiro");
  });

  it("rótulo compacto usa pontos no bordado e cores no resto", () => {
    expect(resumoAplicacao(ap({ tipo: "Bordado", pontos: 8 }))).toContain("8k pts");
    expect(resumoAplicacao(ap({ cores: 4 }))).toContain("4 cores");
    expect(resumoAplicacao(ap({ cores: 1 }))).toMatch(/1 cor$/); // singular, não prefixo de "1 cores"
  });
});
