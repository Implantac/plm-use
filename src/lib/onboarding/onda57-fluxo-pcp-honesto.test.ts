// Onda 57 — 48ª/49ª medições. Depois de validar a publicação da Onda 56 com
// cliques reais (`h1 = 1` em `/digital-twin` sem ficha), a varredura de risco
// mediu emissores e ações inertes em produção:
//
//   - `analytics/materials/production "Exportar"` pareciam mortos, mas são
//     `ExportMenu` (dropdown "Baixar CSV" / "Imprimir / PDF") — falso positivo.
//   - `research "Gerar"` muda o DOM; `collections`/`planner "Exportar"` estão
//     `disabled` (guardas das Ondas 51/50).
//   - `planner "Mapa CRP A4"` com `DEV000006` numa varredura de contexto
//     compartilhado: com sessão limpa está `disabled` e `crp-sem-op` = 1. O
//     código da vitrine entrou porque um clique anterior promoveu um pedido no
//     mesmo contexto. Falso positivo, não violação.
//
// O risco remanescente e verificável: **`criarLote()` órfão**. Declarado na
// interface `PCPState` e implementado em `src/lib/pcp/store.ts` (com validação,
// `logActivity` e escrita local), mas **nenhum componente nem teste o chamava**.
// Ao mesmo tempo, o passo "8 · Lançar pedido" do `PCPFlowDiagram` prometia
// "Cria lote no Kanban do PCP" — e o Kanban de `/production` lê OPs do banco
// via `usePcpLotes()` / `ordersToLotes`, não o store local. Promessa falsa.
//
// Correção: remover o código morto e tornar o passo 8 honesto e acionável —
// texto/checklist apontando para `/orders → Liberar p/ PCP` e um
// `CtaProximoPasso` com `cta-lancar-pedido-pcp`. Nenhuma asserção antiga é
// relaxada; os 35 testes do PCP seguem verdes.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");
const STORE = "src/lib/pcp/store.ts";
const FLUXO = "src/components/pcp/PCPFlowDiagram.tsx";

describe("Onda 57 — o fluxo PCP não promete uma ação que não existe", () => {
  it("criarLote saiu do código executável (sobrevive só em comentário)", () => {
    const fonte = ler(STORE);
    const linhas = fonte.split("\n").filter((l) => l.includes("criarLote"));
    expect(linhas.length).toBeGreaterThan(0);
    for (const linha of linhas) expect(linha.trim().startsWith("*"), linha).toBe(true);
    expect(fonte).not.toContain("criarLote(args:");
    expect(fonte).not.toContain("criarLote({ grupo");
  });

  it("o store declara o caminho real da OP", () => {
    const fonte = ler(STORE);
    expect(fonte).toContain("/orders → Liberar p/ PCP");
    expect(fonte).toContain("usePcpLotes()");
    expect(fonte).toContain("ordersToLotes");
    expect(fonte).toContain("export function lotesOperacionais(");
  });

  it("o passo 8 deixou de prometer que o diagrama cria o lote", () => {
    const fonte = ler(FLUXO);
    expect(fonte).not.toContain("Cria lote no Kanban do PCP");
    expect(fonte).not.toContain("Criar lote no Kanban (setor Corte/Compras)");
    expect(fonte).toContain("Libere o pedido aprovado para o PCP: o lote nasce da OP real");
    expect(fonte).toContain("Em Pedidos, libere o pedido aprovado para o PCP (Liberar p/ PCP)");
  });

  it("o passo 8 agora tem saída clicável com data-testid", () => {
    const fonte = ler(FLUXO);
    expect(fonte).toContain('testId="cta-lancar-pedido-pcp"');
    expect(fonte).toContain('passo="pedido"');
    expect(fonte).toContain("Ir para Pedidos · Liberar para PCP");
    expect(fonte).toContain('active.id === "lancar"');
    expect(fonte).toContain("CtaProximoPasso");
  });

  it("o seletor de lotes e a guarda do CRP (Ondas 40/50) permanecem", () => {
    expect(ler(STORE)).toContain("export function lotesPorSetor(");
    expect(ler("src/lib/pcp/finite-capacity-planner.ts")).toContain(
      "export function podeEmitirCrp(",
    );
    expect(ler("src/components/pcp/FiniteCapacityPanel.tsx")).toContain('data-testid="crp-sem-op"');
  });

  it("as guardas das Ondas 47 a 56 permanecem intactas", () => {
    expect(ler("src/components/sales/CostQueueNominalPanel.tsx")).toContain(
      'data-testid="ficha-cega-bloqueada"',
    );
    expect(ler("src/routes/_authenticated.marketing.tsx")).toContain(
      'data-testid="media-kit-bloqueado"',
    );
    expect(ler("src/components/inventory/MrpNetExplosionPanel.tsx")).toContain(
      'data-testid="mrp-sem-apuracao"',
    );
    expect(ler("src/routes/_authenticated.collections.tsx")).toContain(
      'data-testid="colecoes-so-vitrine"',
    );
    expect(ler("src/components/collections/CollectionROI.tsx")).toContain(
      'data-testid="roi-sem-lote"',
    );
    expect(ler("src/components/quality/CapaDrawer.tsx")).toContain(
      'aria-label="Causa-raiz da CAPA"',
    );
    expect(ler("src/routes/_authenticated.digital-twin.tsx")).toContain(
      'data-testid="gemeo-sem-ficha"',
    );
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
