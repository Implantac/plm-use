# Onda 58 — Glossário onde há jargão (50ª e 51ª medições, 06/11/2026)

> **`projeto publicado pelo lovable, continue com as melhorias` = dois
> comandos.** Re-medir o marco (nunca confirmar cegamente) e escolher a
> melhoria seguinte pelo risco, sem perguntar. Este documento é uma **medição**,
> não um plano.

---

## 1. 50ª medição — a Onda 57 foi publicada e validada por cliques

BFS: entry **novo** `index-D5xUbEBY.js` / `index-jPXI5Gle.js`, **214 chunks /
3.180.877 bytes**, 0 falhas; `index-C64BHus3.js` = 0. **9 chunks e ~9 KB a
menos** que a 49ª medição — coerente com a remoção de `criarLote()` morto na
Onda 57. Os 3 marcadores da 57 = **1**, `Cria lote no Kanban do PCP` caiu a
**0**, `ficha-cega-bloqueada` 1, `DEV000006` 20.

**Cliques reais em produção:** `/production` com `cta-producao-sem-op` 1;
passo 8 com `Libere o pedido aprovado`, checklist `Liberar p/ PCP` e texto
antigo ausente; `cta-lancar-pedido-pcp` → **`/orders`**; `/orders → "Liberar
p/ PCP"` → toast `Pedido PD-2026-802 liberado para programação no PCP!`. Banco:
view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado. **Repo, ar
e banco alinhados na Onda 57.** Captura
`/home/user/medicao50-production-passo8.png`.

---

## 2. Como a Onda 58 foi escolhida

Varredura de **jargão técnico no texto visível das 44 rotas** em produção:

| Medida                                | Resultado                                                                |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Rotas com siglas técnicas             | **41**                                                                   |
| Rotas com `GlossarioTermos` (Onda 47) | **5** — `audit`, `dashboard`, `orders`, `route-engineering`, `suppliers` |
| Rotas com siglas e sem glossário      | **36**                                                                   |

**Refinamento (antes de qualquer código):** `CAD` e `PCP` aparecem em _todas_
as rotas por causa da sidebar ("CAD & Modelagem", "PCP · PRODUÇÃO") — piso
falso de 2 por tela. Descontado isso, **20 rotas têm jargão real de conteúdo e
nenhuma tinha glossário**. Mais densas:

| Rota          | Jargão | Siglas                                      |
| ------------- | ------ | ------------------------------------------- |
| `financial`   | 21     | OTB 6, DRE 6, BOM 4, BOP 3, EBITDA, PV      |
| `analytics`   | 21     | ROI 10, ROAS 4, S&OP 4, GTM 2, CRP          |
| `security`    | 14     | LGPD 9, CFOP 2, BOM, AQL, ABNT              |
| `launch`      | 13     | NCM 3, GTIN 3, EAN 2, ABNT 2, BOM, BOP, GTM |
| `marketing`   | 13     | ROAS 7, ESG 2, GTM 2, DPP, SKU              |
| `development` | 12     | SAM 6, PV 6                                 |
| `commercial`  | 12     | CFOP 4, XML 3, NCM 2, POM 2, GTM            |
| `quality`     | 11     | AQL 6, CAPA 5                               |
| `collections` | 11     | ROI 9, ROAS 2                               |
| `planner`     | 10     | CRP 4, EDD 4, AQL, Kanban                   |
| `inventory`   | 6      | MRP 3, LEC 2, BOM                           |

Seis siglas frequentes **nem existiam** no dicionário de 33 termos da Onda 47:
`BOP`, `PV`, `GTM`, `CRP`, `EDD`, `LEC`. O usuário no primeiro dia — e o
vendedor, que opera sem dado técnico — encontrava siglas sem tradução.

---

## 3. O que foi entregue

**`src/lib/onboarding/glossario.ts`** — **+6 termos** (33 → **39**, sem
duplicatas), com explicações em português simples no mesmo formato:

| Sigla | Nome                          |
| ----- | ----------------------------- |
| `BOP` | Roteiro de produção           |
| `PV`  | Preço de venda                |
| `GTM` | Estratégia de ida ao mercado  |
| `CRP` | Planejamento de capacidade    |
| `EDD` | Sequência por data de entrega |
| `LEC` | Lote econômico de compra      |

**`GlossarioTermos` em 11 rotas**, cada uma com `siglas` **medidas no próprio
texto** e `testId` próprio (`glossario-financial`, `glossario-analytics`,
`glossario-security`, `glossario-launch`, `glossario-marketing`,
`glossario-development`, `glossario-commercial`, `glossario-quality`,
`glossario-planner`, `glossario-collections`, `glossario-inventory`). O
componente segue um `<details>` colapsado com `<dl>/<dt>/<dd>`, para não
atrapalhar quem já opera.

**O que NÃO mudou:** os **20 testes do glossário** seguem verdes,
`TERMOS_PRIMEIRA_DOBRA`, `explicacaoDe()`, `termosPorSigla()`, os 5 glossários
da Onda 47, as guardas 47–57 e o SQL aplicado (SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`).

Teste novo: `src/lib/onboarding/onda58-glossario-jargao.test.ts` (7 asserções).

---

## 4. Prova por cliques reais (browser local, Onda 58)

| Rota          | Glossário | Colapsado | Termos (`dt`)                           |
| ------------- | --------- | --------- | --------------------------------------- |
| `financial`   | 1         | sim       | 6 — OTB, DRE, BOM, BOP, EBITDA, PV      |
| `analytics`   | 1         | sim       | 7 — ROI, ROAS, S&OP, GTM, CRP, MRP, PCP |
| `security`    | 1         | sim       | 6 — LGPD, CFOP, BOM, AQL, ABNT, XML     |
| `launch`      | 1         | sim       | 7 — NCM, GTIN, EAN, ABNT, BOM, BOP, GTM |
| `marketing`   | 1         | sim       | 6 — ROAS, ESG, GTM, DPP, SKU, ROI       |
| `development` | 1         | sim       | 5 — SAM, PV, BOM, BOP, PCP              |
| `commercial`  | 1         | sim       | 6 — CFOP, XML, NCM, POM, GTM, NF-e      |
| `quality`     | 1         | sim       | 4 — AQL, CAPA, PCP, BOM                 |
| `planner`     | 1         | sim       | 5 — CRP, EDD, AQL, Kanban, PCP          |
| `collections` | 1         | sim       | 4 — ROI, ROAS, PCP, BOM                 |

Os 6 termos novos aparecem renderizados nas telas correspondentes (`BOP`/`PV`
em financial/development/launch, `GTM` em analytics/marketing/commercial/launch,
`CRP` em analytics/planner, `EDD` em planner, `LEC` em inventory).

> **Correção metodológica:** a primeira passagem marcou `/launch` como
> `glossario = 0`. Com espera de 3 s e `wait_for_selector` ele aparece
> normalmente (`data-testid="glossario-launch"`, nenhum `pageerror`) — era
> artefato de tempo de renderização/HMR, não ausência. Re-medido: **10/10**;
> `inventory` foi incluído depois para não deixar `LEC` órfão.

Captura `/home/user/medicao51-financial-glossario.png`.

---

## 5. Gates e 51ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **754/754** (747 + 7).

| Camada        | 51ª medição (após fechar a Onda 58)                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 58** — este commit                                                                                         |
| App publicado | **Onda 57** — `index-D5xUbEBY.js` / `index-jPXI5Gle.js`, 214 chunks / 3.180.877 bytes, **7 marcadores da 58 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                              |

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 58 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Publicação validada em produção (52ª medição)

O dono relatou que o Lovable não teria recebido o commit. A re-medição por
camada **não confirmou o relato**: HEAD local/remoto `fae2a93` com CI verde, e
o ar em entry **novo** `index-IvTyinWJ.js` / `index-pMXbg9-8.js` (214 chunks /
3.183.607 bytes) com os 9 marcadores da Onda 58 = 1 e `index-D5xUbEBY.js` = 0.
Cliques reais em produção confirmaram 7 glossários (3–7 termos cada) e o passo
8 do PCP sem regressão. O HTML usa `Cache-Control: no-cache,
must-revalidate, max-age=0` e os JS `immutable` por hash de conteúdo — não há
stale por CDN; a percepção é compatível com timing do deploy ou aba/cache local
do browser (hard refresh). **Repo, ar e banco alinhados na Onda 58.**

### Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código.
- `DEV000006` 20× como vitrine declarada; jargão remanescente em rotas de
  menor densidade (`ai-agents`, `pieces-report`, `research`, `supplier-portal`,
  `digital-twin`, `influencers`, `approvals`, `flow`) ainda sem glossário;
  revisar `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- `CollectionROI` continua estimativa de referência (declarada), não BI/fiscal;
  o PLM deliberadamente não é ERP.
- Drawers acionados por ícone: sem novos achados, mas a varredura não cobre
  painéis que exigem sequência de cliques ou dados prévios.
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
