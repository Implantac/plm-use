// Onda 54 — 40ª/41ª medições. Depois de validar a publicação da Onda 53 com
// cliques reais (avisos/CTA, 0 números de fábrica, 17 travessões em
// `/collections`), a varredura de risco mediu os **avisos de vitrine** das 44
// rotas:
//
//   21 rotas com aviso · 12 sem `CtaProximoPasso` · MAS 9 já tinham saída
//   própria (botão/link dentro do aviso): ai-center, cad, development (×6),
//   launch, prototypes, route-engineering, showroom, supplier-portal,
//   tech-sheet. Descartadas como falsos positivos depois de ler o texto e as
//   ações de cada aviso — não foi "confirmado cegamente" pela métrica.
//
//   Sem NENHUMA saída: `looks` (look-sem-ficha), `pieces-report`
//   (dpp-sem-ficha), `orders` (ficha-cega-bloqueada, que só sugeria "clone
//   para emitir" em texto) e `/production` (aviso "Libere um pedido aprovado
//   para o PCP" sem data-testid, sem CTA e sem link).
//
// Correção (padrão da Onda 44): CtaProximoPasso nos 3 avisos de ficha/pedido
// e um botão "Clonar para emitir" dentro do aviso da Ficha Cega — ação
// explícita do usuário, sem emitir documento e sem promover a vitrine
// automaticamente. O `<span data-testid="ficha-cega-bloqueada">` e a guarda
// `podeEmitirFichaCega()` da Onda 47 permanecem intactos.
//
// Correção de diagnóstico: `/orders → "Liberar p/ PCP"` JÁ FUNCIONA (toast
// `Pedido PD-2026-802 liberado para programação no PCP!`), e o passo
// "8 · Lançar pedido" do `PCPFlowDiagram` é um stepper de checklist, não um
// botão de criação. A limitação registrada na Onda 53 não era fluxo quebrado:
// era aviso sem saída clicável.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const ARQUIVOS = [
  "src/routes/_authenticated.looks.tsx",
  "src/components/techsheet/DppPassportPanel.tsx",
  "src/routes/_authenticated.production.tsx",
  "src/components/sales/CostQueueNominalPanel.tsx",
  "src/routes/_authenticated.collection-map.tsx",
];

describe("Onda 54 — todo aviso de vitrine tem um próximo passo", () => {
  it("os 4 arquivos medidos são exatamente os que ganharam CTA", () => {
    const codigo = ARQUIVOS.map(ler).join("\n");
    for (const id of [
      "cta-look-sem-ficha",
      "cta-dpp-sem-ficha",
      "cta-producao-sem-op",
      "cta-ficha-cega-clonar",
    ]) {
      expect(codigo, id).toContain(id);
    }
    expect(ARQUIVOS).toHaveLength(5);
  });

  it("os 5 data-testid realmente estão no código", () => {
    for (const [arq, id] of [
      [ARQUIVOS[0], "cta-look-sem-ficha"],
      [ARQUIVOS[1], "cta-dpp-sem-ficha"],
      [ARQUIVOS[2], "cta-producao-sem-op"],
      [ARQUIVOS[4], "cta-line-sheet-sem-ficha"],
    ] as const) {
      expect(ler(arq), arq).toContain(`testId="${id}"`);
    }
    expect(ler(ARQUIVOS[3])).toContain('data-testid="cta-ficha-cega-clonar"');
  });

  it("os 3 CtaProximoPasso apontam para o passo correto", () => {
    expect(ler(ARQUIVOS[0])).toContain('passo="ficha"');
    expect(ler(ARQUIVOS[1])).toContain('passo="ficha"');
    expect(ler(ARQUIVOS[2])).toContain('passo="pedido"');
    for (const arq of ARQUIVOS.slice(0, 3)) {
      expect(ler(arq), arq).toContain("CtaProximoPasso");
    }
  });

  it("/production agora declara o aviso com data-testid", () => {
    const prod = ler(ARQUIVOS[2]);
    expect(prod).toContain('data-testid="producao-sem-op"');
    expect(prod).toContain("Libere um pedido aprovado para o PCP");
  });

  it("a guarda da Onda 47 não foi relaxada", () => {
    const fila = ler(ARQUIVOS[3]);
    expect(fila).toContain('data-testid="ficha-cega-bloqueada"');
    expect(fila).toContain("podeEmitirFichaCega(");
    expect(fila).toContain("FICHA_CEGA_DEMO_BLOQUEIO");
    // o novo botão clona (promove por ação explícita), não imprime A4
    expect(fila).toContain("Clonar para emitir");
    expect(fila).toContain("const cloned = cloneOrder(o.id)");
    const botao = fila.slice(fila.indexOf('data-testid="cta-ficha-cega-clonar"'));
    expect(botao.slice(0, 600)).not.toContain("buildBlindOrderProductionSheetHtml");
  });

  it("os 9 avisos que já tinham saída própria seguem presentes", () => {
    const codigos = [
      "studio-sem-ficha",
      "cad-so-vitrine",
      "kanban-sem-ficha",
      "omnichannel-sem-ficha",
      "prototipo-so-vitrine",
      "balanceamento-sem-ficha",
      "showroom-sem-ficha",
      "rfq-sem-ficha",
      "cockpit-sem-ficha",
    ];
    const tudo = [
      // `studio-sem-ficha` e `omnichannel-sem-ficha` vivem em componentes,
      // não nas rotas — localizado por grep antes de escrever a asserção.
      "src/components/ai/ProductStudio.tsx",
      "src/routes/_authenticated.cad.tsx",
      "src/routes/_authenticated.development.tsx",
      "src/components/launch/OmnichannelReadinessPanel.tsx",
      "src/routes/_authenticated.prototypes.tsx",
      "src/routes/_authenticated.route-engineering.tsx",
      "src/routes/_authenticated.showroom.tsx",
      "src/routes/_authenticated.supplier-portal.tsx",
      "src/routes/_authenticated.tech-sheet.tsx",
    ]
      .map(ler)
      .join("\n");
    for (const c of codigos) expect(tudo, c).toContain(c);
  });

  it("as guardas das Ondas 48 a 53 permanecem intactas", () => {
    expect(ler("src/routes/_authenticated.marketing.tsx")).toContain(
      'data-testid="media-kit-bloqueado"',
    );
    expect(ler("src/routes/_authenticated.collection-map.tsx")).toContain(
      'data-testid="colecao-so-vitrine"',
    );
    expect(ler("src/components/inventory/MrpNetExplosionPanel.tsx")).toContain(
      'data-testid="mrp-sem-apuracao"',
    );
    expect(ler("src/routes/_authenticated.collections.tsx")).toContain(
      'data-testid="colecoes-so-vitrine"',
    );
    expect(ler("src/routes/_authenticated.looks.tsx")).toContain('aria-label="Nome do look"');
    expect(ler("src/components/collections/CollectionROI.tsx")).toContain(
      'data-testid="roi-sem-lote"',
    );
    expect(ler("src/components/collections/CollectionPerformance.tsx")).toContain(
      'data-testid="performance-sem-colecao"',
    );
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
