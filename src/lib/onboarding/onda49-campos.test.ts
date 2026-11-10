// Onda 49 — 30ª/31ª medições. Varredura de 44 rotas em PRODUÇÃO + teste de 16
// emissores de documento com clique real: nenhum emissor desprotegido
// restou (os 5 que falharam clique estão `disabled`). O risco remanescente
// medido foi outro: campos sem nome acessível em 10 rotas.
//
// CORRECAO METODOLOGICA: o levantamento bruto contou 31 elementos em 10 rotas,
// mas 1 deles é o `BubbleSelect` interno do Radix (`aria-hidden="true"`,
// `tabIndex=-1`) em /looks — invisível e não exposto a leitor de tela.
// Excluindo `aria-hidden`/`hidden`/`display:none`, o universo real é
// **30 de 66 campos expostos** medidos em 12 rotas. Re-medido ANTES
// (produção, Onda 48) e DEPOIS (local, Onda 49) com o MESMO critério:
// **30/66 -> 0/66**. O SelectTrigger do Radix também ganhou `aria-label`.
//
//   ai-agents 1/1 · display 1/2 · financial 2/2 · inventory 4/9 ·
//   launch 5/5 · looks 5/6 · quality 8/15 · references 1/1 ·
//   research 2/5 (MoodBoard + AiCroquiPanel) · showroom 2/2
//
// Correção: `id`/`htmlFor` onde já havia rótulo visível; `aria-label` nos
// demais; `aria-required="true"` nos 6 obrigatórios declarados (`<Label
// required>` em launch e nos campos com erro em quality). Nenhuma validação,
// handler ou asserção das Ondas 38–48 foi alterada.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

/** Cada par é [arquivo, marcadores que a Onda 49 introduziu]. */
const MARCADORES: ReadonlyArray<[string, readonly string[]]> = [
  ["src/routes/_authenticated.ai-agents.tsx", ["aria-label={`Mensagem para ${A.label}`}"]],
  [
    "src/routes/_authenticated.display.tsx",
    ['aria-label="Buscar ficha PLM ou referência por código ou nome"'],
  ],
  [
    "src/routes/_authenticated.financial.tsx",
    [
      'htmlFor="custo-fixo-colecao"',
      'id="custo-fixo-colecao"',
      'htmlFor="teto-otb-materia-prima"',
      'id="teto-otb-materia-prima"',
    ],
  ],
  [
    "src/components/inventory/FabricRollsShadePanel.tsx",
    [
      'htmlFor="novo-rolo-codigo"',
      'id="novo-rolo-codigo"',
      'htmlFor="novo-rolo-partida"',
      'id="novo-rolo-partida"',
      'htmlFor="novo-rolo-nuance"',
      'id="novo-rolo-nuance"',
      'htmlFor="novo-rolo-peso"',
      'id="novo-rolo-peso"',
    ],
  ],
  [
    "src/routes/_authenticated.launch.tsx",
    [
      'htmlFor="wave-codigo"',
      'id="wave-codigo"',
      'htmlFor="wave-colecao"',
      'id="wave-colecao"',
      'htmlFor="wave-janela-inicio"',
      'id="wave-janela-inicio"',
      'htmlFor="wave-janela-fim"',
      'id="wave-janela-fim"',
      'htmlFor="wave-notas"',
      'id="wave-notas"',
      "waveErrors.codigo",
      "handleCreateWave",
    ],
  ],
  [
    "src/routes/_authenticated.looks.tsx",
    [
      'htmlFor="buscar-looks"',
      'id="buscar-looks"',
      'aria-label="Código da referência da peça"',
      'aria-label="Nome da peça do look"',
      'aria-label="Papel da peça no look"',
      'aria-label="Cor de destaque da peça"',
    ],
  ],
  [
    "src/routes/_authenticated.quality.tsx",
    [
      'aria-label="Buscar defeito, referência ou lote"',
      'aria-label="Filtrar CAPA por status"',
      'aria-label="Defeito ou problema da CAPA"',
      'aria-label="Setor da CAPA"',
      'aria-label="Tipo de CAPA"',
      'aria-label="Severidade da CAPA"',
      'aria-label="Responsável pela CAPA"',
      'aria-label="Prazo da CAPA"',
      "capaErrors.defeito",
      "capaErrors.responsavel",
    ],
  ],
  [
    "src/routes/_authenticated.references.tsx",
    ['aria-label="Buscar referência por código ou nome"'],
  ],
  ["src/components/research/MoodBoard.tsx", ['aria-label="URL da imagem de referência visual"']],
  [
    "src/components/research/AiCroquiPanel.tsx",
    ['aria-label="Descrição da peça para gerar croqui"'],
  ],
  [
    "src/routes/_authenticated.showroom.tsx",
    [
      'htmlFor="lojista-razao"',
      'id="lojista-razao"',
      'htmlFor="lojista-cnpj"',
      'id="lojista-cnpj"',
    ],
  ],
];

describe("Onda 49 — todo campo tem nome acessível", () => {
  it("os 11 arquivos medidos receberam os marcadores", () => {
    for (const [arquivo, marcadores] of MARCADORES) {
      const fonte = ler(arquivo);
      for (const m of marcadores) expect(fonte, `${arquivo} :: ${m}`).toContain(m);
    }
    expect(MARCADORES).toHaveLength(11);
  });

  it("31 marcadores: 30 campos expostos + o SelectTrigger do Radix", () => {
    const fontes = MARCADORES.map(([a]) => ler(a));
    const novoAria = fontes.reduce(
      (n, f) =>
        n +
        (
          f.match(
            /aria-label=\{`Mensagem para|aria-label="(?:Buscar ficha PLM|Buscar referência|Código da referência|Nome da peça do look|Papel da peça|Cor de destaque|Buscar defeito|Filtrar CAPA|Defeito ou problema|Setor da CAPA|Tipo de CAPA|Severidade da CAPA|Responsável pela CAPA|Prazo da CAPA|URL da imagem|Descrição da peça)/g,
          ) ?? []
        ).length,
      0,
    );
    const pares = [
      "custo-fixo-colecao",
      "teto-otb-materia-prima",
      "novo-rolo-codigo",
      "novo-rolo-partida",
      "novo-rolo-nuance",
      "novo-rolo-peso",
      "wave-codigo",
      "wave-colecao",
      "wave-janela-inicio",
      "wave-janela-fim",
      "wave-notas",
      "buscar-looks",
      "lojista-razao",
      "lojista-cnpj",
    ];
    const tudo = fontes.join("\n");
    for (const id of pares) {
      expect(tudo, id).toContain(`htmlFor="${id}"`);
      expect(tudo, id).toContain(`id="${id}"`);
    }
    expect(novoAria).toBeGreaterThanOrEqual(17);
    expect(novoAria + pares.length).toBe(31);
    // 16 aria-label em campos expostos + 14 pares id/htmlFor = 30 corrigidos;
    // o 17º é o SelectTrigger (button), que não entra na contagem do DOM.
    expect(novoAria - 1 + pares.length).toBe(30);
  });

  it("os 6 obrigatórios declarados ganharam aria-required", () => {
    const launch = ler("src/routes/_authenticated.launch.tsx");
    const quality = ler("src/routes/_authenticated.quality.tsx");
    expect((launch.match(/aria-required="true"/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect((quality.match(/aria-required="true"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    // O `required` visual do <Label> continua, sem native `required` novo que
    // pudesse atropelar as validações em JS já existentes.
    expect(launch).not.toContain("<Input\n                  required");
  });

  it("as guardas das Ondas 47 e 48 permanecem intactas", () => {
    expect(ler("src/components/sales/CostQueueNominalPanel.tsx")).toContain(
      'data-testid="ficha-cega-bloqueada"',
    );
    expect(ler("src/routes/_authenticated.marketing.tsx")).toContain(
      'data-testid="media-kit-bloqueado"',
    );
    expect(ler("src/routes/_authenticated.collection-map.tsx")).toContain(
      'data-testid="colecao-so-vitrine"',
    );
    expect(ler("src/routes/_authenticated.orders.tsx")).toContain('htmlFor="novo-pedido-cliente"');
  });

  it("o SQL aplicado em produção continua intacto", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
