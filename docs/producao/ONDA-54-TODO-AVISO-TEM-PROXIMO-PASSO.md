# Onda 54 — Todo aviso de vitrine tem um próximo passo (40ª e 41ª medições, 06/11/2026)

> **`lovable publicado, prossiga` = dois comandos.** Re-medir o marco (nunca
> confirmar cegamente) e escolher a onda seguinte pelo risco, sem perguntar.
> Este documento é uma **medição**, não um plano.

---

## 1. 40ª medição — a Onda 53 foi publicada e validada por cliques

BFS: entry **novo** `index-CFlhwbuy.js` / `index-CZvI_8s1.js`, **224 chunks /
3.187.305 bytes**, 0 falhas; `index-BEBmR4We.js` = 0. `roi-sem-lote` 2 (texto +
testid), `cta-roi-sem-lote` 1, `performance-sem-colecao` 2,
`cta-performance-sem-colecao` 1, `Estimativa sobre lotes salvos` 1,
`ticket médio de referência R$ 320` 1; marcadores 52 e 48/49 intactos,
`DEV000006` 20.

**Cliques reais em produção:** `/collections` com `roi-sem-lote` 1,
`cta-roi-sem-lote` 1, `performance-sem-colecao` 1,
`cta-performance-sem-colecao` 1, `colecoes-so-vitrine` 1, **nenhum número de
fábrica**, 17 travessões e a declaração de estimativa visível. Banco: view
`200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado. **Repo, ar e
banco alinhados na Onda 53.** Captura `/home/user/medicao40-collections.png`.

---

## 2. Correção de diagnóstico antes de escolher a onda

A Onda 53 registrou: _"não há caminho de UI para criar lote operacional"_.
A re-medição mostrou que essa leitura estava **incompleta**:

- `/orders → "Liberar p/ PCP"` **funciona**: clique real → toast `Pedido
PD-2026-802 liberado para programação no PCP!`. É o caminho oficial para
  produção real (a própria `/production` orienta isso).
- O passo **"8 · Lançar pedido / Cria lote no Kanban do PCP"** do
  `PCPFlowDiagram` é um **stepper de checklist**: o botão só seleciona a etapa
  e mostra o checklist. Não é (nem promete ser) um botão de criação — o texto
  descreve a etapa do processo.
- `criarLote()` existe em `src/lib/pcp/store.ts` e geraria lote sem `demo`, mas
  nenhum componente o chama: é código morto, não fluxo quebrado.

O risco real, portanto, não era "não dá para criar lote": era **o aviso que
explica o caminho não ter saída clicável**. Em `/production`, o texto
"Libere um pedido aprovado para o PCP (em Pedidos → Liberar para PCP)" não
tinha `data-testid`, nenhum CTA e nenhum link (`[data-passo] = 0`).

---

## 3. Como a Onda 54 foi escolhida

Varredura dos **avisos de vitrine** das 44 rotas em produção:

| Medida                                                          | Resultado                                 |
| --------------------------------------------------------------- | ----------------------------------------- |
| Rotas com aviso                                                 | **21**                                    |
| Rotas sem `CtaProximoPasso` (`[data-passo] = 0`)                | **12**                                    |
| ...que **já tinham saída própria** (botão/link dentro do aviso) | **9** — descartadas como falsos positivos |
| Avisos **sem nenhuma ação**                                     | **5**                                     |

Os 9 falsos positivos, confirmados lendo o texto e as ações de cada aviso:
`ai-center` ("Criar ficha técnica" → `/references`), `cad` ("Cadastrar meu
molde"), `development` (6 × "Criar ficha técnica" → `/tech-sheet?ref=…`),
`launch` ("Abrir Ficha Técnica"), `prototypes` ("Cadastrar meu piloto"),
`route-engineering`, `showroom`, `supplier-portal`, `tech-sheet`. **Não foi
confirmado cegamente pela métrica `[data-passo]`.**

Os 5 sem saída: `looks` (`look-sem-ficha`), `pieces-report`
(`dpp-sem-ficha`), `orders` (`ficha-cega-bloqueada` — só dizia "clone para
emitir" em texto), `/production` (aviso sem testid/CTA) e `collection-map`
(`line-sheet-bloqueado`, que tinha CTA no topo da rota mas não dentro dele).

---

## 4. O que foi entregue

| Arquivo                                          | CTA                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `src/routes/_authenticated.looks.tsx`            | `cta-look-sem-ficha` → `passo="ficha"`                              |
| `src/components/techsheet/DppPassportPanel.tsx`  | `cta-dpp-sem-ficha` → `passo="ficha"`                               |
| `src/routes/_authenticated.production.tsx`       | `producao-sem-op` + `cta-producao-sem-op` → `passo="pedido"`        |
| `src/components/sales/CostQueueNominalPanel.tsx` | `cta-ficha-cega-clonar` → botão "Clonar para emitir" (`cloneOrder`) |
| `src/routes/_authenticated.collection-map.tsx`   | `cta-line-sheet-sem-ficha` → `passo="ficha"`                        |

O `<span data-testid="ficha-cega-bloqueada">`, `FICHA_CEGA_DEMO_BLOQUEIO` e a
guarda `podeEmitirFichaCega()` (Onda 47) **permanecem intactos**: o novo botão
clona o pedido por ação explícita do usuário, **não emite** Ficha Cega A4 e não
promove a vitrine automaticamente. `LINE_SHEET_DEMO_BLOQUEIO` e
`line-sheet-bloqueado` idem (Onda 48). Nenhum store, cálculo, emissor ou
asserção anterior foi alterado; SQL SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f` inalterado.

Teste novo: `src/lib/onboarding/onda54-aviso-tem-saida.test.ts` (8 asserções).

---

## 5. Prova por cliques reais (browser local, Onda 54)

| Rota              | Aviso                    | CTA | Clique                                                                                                               |
| ----------------- | ------------------------ | --- | -------------------------------------------------------------------------------------------------------------------- |
| `/looks`          | `look-sem-ficha` 1       | 1   | navega para **`/references`**                                                                                        |
| `/pieces-report`  | `dpp-sem-ficha` 1        | 1   | navega para **`/references`**                                                                                        |
| `/production`     | `producao-sem-op` 1      | 1   | navega para **`/orders`**                                                                                            |
| `/orders`         | `ficha-cega-bloqueada` 2 | 2   | toast `Pedido clonado como PD-2026-803 (Recompra B2B)!`; **1** botão "Ficha Cega A4" liberado, 2 bloqueios restantes |
| `/collection-map` | `line-sheet-bloqueado` 1 | 1   | CTA presente                                                                                                         |

**Varredura final (contexto limpo, seletor que olha o elemento e seu pai):
0 rotas com aviso sem saída**, contra 5 antes da onda.

> **Correção metodológica:** a primeira varredura "final" rodou **depois** de eu
> clonar um pedido e acusou `production`, `inventory` e `orders` como sem
> saída. É artefato de estado: `CtaProximoPasso` **desaparece quando o passo
> está concluído** (comportamento documentado desde a Onda 44). Refeita com
> contexto novo e com o seletor ajustado para incluir CTAs irmãos: **0**.

Capturas: `/home/user/medicao41-looks.png`, `medicao41-pieces-report.png`,
`medicao41-production.png`, `medicao41-orders.png`,
`medicao41-collection-map.png`.

---

## 6. Gates e 41ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **726/726** (718 + 8).

| Camada        | 41ª medição (após fechar a Onda 54)                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 54** — este commit                                                                                         |
| App publicado | **Onda 53** — `index-CFlhwbuy.js` / `index-CZvI_8s1.js`, 224 chunks / 3.187.305 bytes, **6 marcadores da 54 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                              |

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 54 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

> **Push concluído após troca de credencial:** o token anterior expirou
> (`GET /user` = `401 Bad credentials`) e `git ls-remote` media `1fb232b`
> (remoto na Onda 53). Com o novo PAT fornecido pelo dono, `GET /user` passou a
> **`200` · `Implantac`**, o push foi **`1fb232b..8fa6b1d  main -> main`** e
> `git ls-remote` confirmou **`8fa6b1db785e1e87dcad7315f629adedf2932899`**,
> idêntico ao HEAD local. Token fora de `.git/config` e dos arquivos
> versionados (verificação por prefixo = 0). **A Onda 54 está empurrada.**

### Dívida que permanece

- `criarLote()` segue **sem chamador na UI** (código morto no store PCP); o
  caminho oficial é `/orders → Liberar p/ PCP`, agora com CTA a partir de
  `/production`.
- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped`.
- `DEV000006` 20× como vitrine declarada; `ensure()` ainda cria modelo e
  `materializadas` se chamado; placeholder de primeiro frame em
  `photorealism.ts`; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- `CollectionROI` continua estimativa de referência (declarada), não BI/fiscal;
  o PLM deliberadamente não é ERP.
- Diálogos que não abrem por botão de criação (drawers, sheets, menus) seguem
  fora da varredura; `digital-twin` não responde ao `h1` no tempo limite do
  crawler.
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
