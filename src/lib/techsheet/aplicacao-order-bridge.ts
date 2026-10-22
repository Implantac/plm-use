// Ponte de CONVENÇÃO (não de escrita): projeta as aplicações da ficha PLM no
// formato de OperationLine do motor de custo do pedido (lib/sales), sem tocar
// em nenhuma tabela dele. Por que existe: os dois mundos calculam "setup
// amortizado na tiragem" e arredondam a 2 casas — se a convenção divergir, o
// pedido e a ficha mostram números diferentes para o mesmo bordado e ninguém
// sabe qual é o errado. Este módulo + o teste são o lacre; a ponte de verdade
// (pedido herdar aplicações do catálogo/ficha) é decisão de produto, não daqui.
import type { CostDriver, OperationLine } from "@/lib/sales/types";
import { areaCm2, type Aplicacao } from "./aplicacoes";

/** Aplicação da ficha → driver do pedido, espelhando a hint dos DRIVERS deles. */
export function driverDaAplicacao(a: Aplicacao): CostDriver {
  if (a.tipo === "Bordado") return a.pontos && a.pontos > 0 ? "mil_pontos" : "peca";
  if (a.tipo === "Silk") return a.cores > 1 ? "cor" : "peca";
  return "m2"; // Sublimação / Transfer — área manda
}

/** Grandeza por peça na unidade do driver (mil pts/peça, cores-passagem/peça, m²/peça). */
function perPiece(a: Aplicacao): number {
  if (a.tipo === "Bordado") return Math.max(0, a.pontos ?? 0);
  if (a.tipo === "Silk") return Math.max(1, a.cores);
  return Math.max(0, areaCm2(a)) / 10000; // cm² → m²
}

const SECTOR: Record<Aplicacao["tipo"], string> = {
  Bordado: "Bordado computadorizado",
  Silk: "Estamparia",
  Sublimação: "Estamparia",
  Transfer: "Estamparia",
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const round4 = (n: number) => Math.round((Number(n) || 0) * 10000) / 10000;

/**
 * Uma aplicação da ficha → uma operação de pedido para `qtdPedido` peças.
 * unitCost é DERIVADO para preservar a identidade do total:
 * unitCost × driverQty + setup == custoPorPosição×tiragem + setup, com a
 * mesma margem de 1 centavo que os dois motores já aceitam.
 */
export function aplicacaoParaOperacaoPedido(a: Aplicacao, qtdPedido: number): OperationLine {
  const driver = driverDaAplicacao(a);
  const qtd = Math.max(0, qtdPedido || 0);
  const por = perPiece(a);
  // driverQty na unidade do driver, ×quantidade de aplicações por peça:
  const factor = driver === "peca" ? 1 : por;
  const driverQty = round4(factor * Math.max(1, a.qtdPorPeca) * qtd);
  const totalPecas = a.custoUnitario * Math.max(1, a.qtdPorPeca) * qtd;
  const unitCost = driverQty > 0 ? round4(totalPecas / driverQty) : 0;
  return {
    seq: 0, // preenchido pelo chamador (ordem das aplicações)
    sector: SECTOR[a.tipo],
    operation: `${a.tipo} · ${a.posicao}${a.arte ? ` (${a.arte})` : ""}`,
    driver,
    driverQty,
    unitCost,
    setupCost: round2(Math.max(0, a.custoSetup ?? 0)),
    outsourced: false,
    source: "custo", // linha manual do custo, não explosão do catálogo
  };
}

export function aplicacoesParaOperacoesPedido(
  apps: Aplicacao[],
  qtdPedido: number,
): OperationLine[] {
  return apps.map((a, i) => ({ ...aplicacaoParaOperacaoPedido(a, qtdPedido), seq: i + 1 }));
}
