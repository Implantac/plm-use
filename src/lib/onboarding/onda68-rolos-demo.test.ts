// Onda 68 — 62ª medição. Depois de validar a publicação da Onda 67 com
// cliques reais em produção (`/commercial` com a carteira vazia,
// `/financial` com o fluxo vazio, 0 `pageerror`), a varredura de risco
// mediu os seeds restantes: `INITIAL_*` em stores (todos já `demo: true` —
// GTM, outsourcing, governança, private-label) e `SEED_ROLLS` no painel de
// rolos de tecido (`FabricRollsShadePanel`, em `/inventory`).
//
// Medição: o seed de 4 rolos (`RL-2601`…`RL-2604`, partidas `PT-8841`,
// `PT-8910`, `PT-7720`, nuances, ΔE CMC, pesos e metragens) era estoque de
// demonstração **sem nenhuma declaração** — e pior: a seleção inicial vinha
// com `rl-1`/`rl-2` marcados, então o laudo espectrofotométrico de
// homogeneidade e o saldo de **52,2 kg** já nasciam calculados sobre a
// vitrine. O botão "Vincular Saldo à BOM" gravava esse saldo fictício na
// ficha salva (`updateBomItem` com `estoqueDisponivel`) — dado de vitrine
// apurado como estoque real. Prova antes: `RL-2601`/`PT-8841` visíveis, 0
// menções a demonstração.
//
// Correção (mesmo contrato das coleções `demo: true` da Onda 51 e dos
// creators da Onda 59): o seed marca `demo: true`; a seleção inicial nasce
// vazia; o laudo e o saldo só consideram rolos reais (`!r.demo`); e a
// tabela mostra o aviso `fabric-rolls-demo`. Nenhuma asserção antiga
// relaxada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

describe("Onda 68 — rolos de demonstração fora do laudo e do saldo", () => {
  it("o seed marca os rolos de demonstração com demo: true", () => {
    const panel = ler("src/components/inventory/FabricRollsShadePanel.tsx");
    expect(panel).toContain("demo: true");
    // o tipo declara o contrato
    const cut = ler("src/lib/techsheet/cut-order.ts");
    expect(cut).toContain("demo?: boolean;");
  });

  it("a seleção inicial nasce vazia (sem laudo calculado sobre a vitrine)", () => {
    const panel = ler("src/components/inventory/FabricRollsShadePanel.tsx");
    expect(panel).toContain("const [selectedIds, setSelectedIds] = useState<string[]>([]);");
    expect(panel).not.toContain('useState<string[]>(["rl-1", "rl-2"])');
  });

  it("o laudo e o saldo só consideram rolos reais", () => {
    const panel = ler("src/components/inventory/FabricRollsShadePanel.tsx");
    expect(panel).toContain("selectedIds.includes(r.id) && !r.demo");
    // o aviso de demonstração está na tela
    expect(panel).toContain('data-testid="fabric-rolls-demo"');
    expect(panel).toContain("Rolos de demonstração na tabela");
    expect(panel).toContain("não entram no laudo de homogeneidade nem no saldo");
    expect(panel).toContain("O PLM não é ERP");
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
