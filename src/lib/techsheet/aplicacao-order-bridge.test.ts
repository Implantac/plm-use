import { describe, expect, it } from "vitest";
import {
  aplicacaoParaOperacaoPedido,
  aplicacoesParaOperacoesPedido,
  driverDaAplicacao,
} from "./aplicacao-order-bridge";
import { custoAplicacoesPecasTotal, setupTotal, type Aplicacao } from "./aplicacoes";
import { driverQuantity } from "@/lib/sales/cost";

const ap = (over: Partial<Aplicacao> = {}): Aplicacao => ({
  id: "a1",
  tipo: "Bordado",
  posicao: "Peito esquerdo",
  larguraCm: 10,
  alturaCm: 10,
  pontos: 6.5,
  cores: 1,
  qtdPorPeca: 1,
  custoUnitario: 5.2,
  ...over,
});

describe("ponte de convenção ficha→pedido", () => {
  it("escolhe o driver pela técnica, com fallbacks defensivos", () => {
    expect(driverDaAplicacao(ap())).toBe("mil_pontos");
    expect(driverDaAplicacao(ap({ pontos: undefined }))).toBe("peca"); // sem pts não finge mil_ptos
    expect(driverDaAplicacao(ap({ tipo: "Silk", cores: 4 }))).toBe("cor");
    expect(driverDaAplicacao(ap({ tipo: "Silk", cores: 1 }))).toBe("peca");
    expect(driverDaAplicacao(ap({ tipo: "Sublimação" }))).toBe("m2");
  });

  it("IDENTIDADE: unitCost×driverQty (+setup) == custo da ficha×tiragem (+setup)", () => {
    const apps = [
      ap({ qtdPorPeca: 2 }),
      ap({ id: "a2", tipo: "Silk", cores: 4, custoUnitario: 2.4, custoSetup: 240 }),
      ap({ id: "a3", tipo: "Sublimação", custoUnitario: 1.9, larguraCm: 30, alturaCm: 40 }),
    ];
    const tiragem = 350;
    const ops = aplicacoesParaOperacoesPedido(apps, tiragem);
    const totalPonte = ops.reduce((acc, o) => acc + o.unitCost * o.driverQty + o.setupCost, 0);
    const totalFicha = custoAplicacoesPecasTotal(apps) * tiragem + setupTotal(apps);
    // 1 centavo de folga por arredondamento — a margem que os dois motores aceitam
    expect(Math.abs(totalPonte - totalFicha)).toBeLessThan(1);
  });

  it("sequência e rótulo prontos para a UI do custo", () => {
    const ops = aplicacoesParaOperacoesPedido([ap(), ap({ id: "x", posicao: "Costas" })], 100);
    expect(ops.map((o) => o.seq)).toEqual([1, 2]);
    expect(ops[0].operation).toContain("Peito esquerdo");
    expect(ops[0].source).toBe("custo");
  });

  it("tiragem 0 zera o variável sem esconder o setup (mesma filosofia da ficha)", () => {
    const o = aplicacaoParaOperacaoPedido(ap({ custoSetup: 120 }), 0);
    expect(o.driverQty).toBe(0);
    expect(o.unitCost).toBe(0);
    expect(o.setupCost).toBe(120);
  });

  it("driverQty bate com a fórmula do motor deles para 'peca'", () => {
    const a = ap({ pontos: undefined }); // → peca, qtdPorPeca 3
    const o = aplicacaoParaOperacaoPedido(a, 50);
    // eles: peca → quantidade do item × fator da opção; aqui fator = qtdPorPeca
    expect(o.driverQty).toBe(driverQuantity("peca", 50, a.qtdPorPeca));
  });
});
