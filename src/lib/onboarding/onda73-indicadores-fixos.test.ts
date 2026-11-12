// Onda 73 — 67ª medição. Depois de validar a publicação da Onda 72 com
// cliques reais em produção (`/colors`, `/prints` e `/display` com os avisos
// de demonstração, métricas em `—` e "Total look —", 0 `pageerror`), a
// varredura de risco mediu os **números fixos que sobraram fora dos seeds**:
// indicadores escritos à mão direto no JSX, lidos como realizado.
//
// O que foi medido, com cliques locais:
//
//   /commercial — "Taxa de Devolução Fit 2,4% / -0,8%"; "Vendas por Canal
//   Omnichannel" com R$ 540k/320k/210k/130k; "Logística Reversa" com 36
//   trocas abertas, 2,4% devoluções e 41% de motivo fit; o texto do "USE AI ·
//   Engenharia de Caimento" afirmando "41% das devoluções concentram-se em
//   folga de cintura no tamanho M"; e 4 "Conectores Fiscais & Canais"
//   marcados como **Ativo** sem nenhuma integração no código.
//
//   /analytics — "Penetração de Mercado por Região" fixa em Sudeste 42% /
//   R$ 1.2M, Sul 28% / R$ 840k, Nordeste 15% / R$ 450k; "Mix por canal" com
//   Meta 44% / Google 28% / Instagram 18% / TikTok 10%; "Performance por
//   coleção" com Verão 2027 R$ 189.000 ROI 5.01x e Inverno 2026 R$ 73.000 ROI
//   2.48x; barras de previsto x realizado com largura fixa 62%/78%; e o selo
//   "Realizado" no topo de um painel sem nenhuma campanha.
//
// Correção (mesma regra das ondas 50/53/56: ausência vira `—` com aviso e
// CTA, nunca zero apurado nem percentual inventado):
//   - as cinco listas fixas nascem vazias e mostram aviso com CTA para
//     pedidos salvos (`analytics-regioes-vazias`, `analytics-mix-vazio`,
//     `analytics-performance-vazia`, `commercial-canais-vazios`);
//   - os cards de logística reversa viram `—` e a taxa de devolução deixa de
//     ser KPI;
//   - o diagnóstico do "USE AI" declara a ausência em vez de afirmar 41%;
//   - os conectores passam a dizer **Não conectado**;
//   - as barras refletem a proporção real (0 sem campanha salva);
//   - o selo do painel vira "Sem campanha salva".
// Nenhuma asserção antiga relaxada.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 73 — números fixos de canal, região, devolução e conector", () => {
  it("/commercial não exibe mais canal, devolução ou conector inventados", () => {
    const page = ler("src/routes/_authenticated.commercial.tsx");
    expect(page).toContain('data-testid="commercial-canais-vazios"');
    expect(page).toContain(
      "const canaisVenda: { channel: string; val: string; perc: number }[] = [];",
    );
    expect(page).toContain("sem devolução registrada");
    expect(page).toContain("Não conectado");
    expect(page).toContain("era de demonstração e foi removido");
    // os valores fictícios não podem voltar como literal de dado
    expect(page).not.toContain('"R$ 540k"');
    expect(page).not.toContain('"R$ 320k"');
    expect(page).not.toContain('"R$ 210k"');
    expect(page).not.toContain('"R$ 130k"');
    expect(page).not.toContain('value: "2,4%"');
    expect(page).not.toContain('value: "41%"');
    expect(page).not.toContain('value: "36"');
    expect(page).not.toContain("folga de cintura no tamanho M");
  });

  it("/analytics não exibe mais região, mix de mídia nem performance de coleção inventados", () => {
    const page = ler("src/routes/_authenticated.analytics.tsx");
    expect(page).toContain('data-testid="analytics-regioes-vazias"');
    expect(page).toContain('data-testid="analytics-mix-vazio"');
    expect(page).toContain('data-testid="analytics-performance-vazia"');
    expect(page).toContain(
      "const regioesVenda: { region: string; val: string; count: string }[] = [];",
    );
    expect(page).toContain("const mixCanal: { label: string; pct: number; tone: string }[] = [];");
    expect(page).toContain(
      "const performanceColecao: { name: string; revenue: number; roi: number }[] = [];",
    );
    expect(page).not.toContain('count: "R$ 1.2M"');
    expect(page).not.toContain('count: "R$ 840k"');
    expect(page).not.toContain('count: "R$ 450k"');
    expect(page).not.toContain('label: "Meta Ads", pct: 44');
    expect(page).not.toContain("revenue: 189000");
    expect(page).not.toContain('style={{ width: "62%" }}');
    expect(page).not.toContain('style={{ width: "78%" }}');
  });

  it("as barras e o selo do painel refletem o dado real, não largura decorativa", () => {
    const page = ler("src/routes/_authenticated.analytics.tsx");
    expect(page).toContain("const pctPrevisto = marketingTotals.planned > 0 ? 100 : 0;");
    expect(page).toContain(
      "Math.min(100, Math.round((marketingTotals.real / marketingTotals.planned) * 100))",
    );
    expect(page).toContain('marketingMetrics.length > 0 ? "Realizado" : "Sem campanha salva"');
  });

  it("o aviso de ausência aponta para o caminho de saída (pedidos salvos)", () => {
    for (const arquivo of [
      "src/routes/_authenticated.analytics.tsx",
      "src/routes/_authenticated.commercial.tsx",
    ]) {
      expect(ler(arquivo)).toContain('href="/orders"');
    }
  });
});
