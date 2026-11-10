# Onda 48 — A vitrine não importa número nem imprime em Coleção e GTM

**Escolhida por risco**, sem pedir confirmação, depois que o dono reportou
"tudo publicado pelo Lovable, prossiga". Data: 06/11/2026 · **28ª e 29ª
medições**. Commit de código **`5af3964`** + commit de documentação/29ª
medição no mesmo push. Suíte: **681/681** (673 da Onda 47 + 8 novos).

Regras que seguem integrais: **só ficha/pedido/campanha/OS/lote/evento/
briefing/parceiro/molde/piloto salvos entram em número ou documento
operacional**; ausência/vitrine vira `—` com aviso e CTA, não zero apurado;
**vitrine só é promovida por ação explícita**; nenhuma asserção antiga é
relaxada.

---

## 1. O marco do dono foi validado, não confirmado cegamente (28ª medição)

| Camada      | 27ª (antes)                       | 28ª (depois do "publicado")                  |
| ----------- | --------------------------------- | -------------------------------------------- |
| Repo `main` | Onda 47 `63656e8`                 | Onda 47 `63656e8`                            |
| Ar          | Onda 46 `index-CeAMfFot.js`       | **Onda 47 `index-CdXaXBJP.js`** (227 chunks) |
| Banco       | view `200 []`, 4 RPCs `401 42501` | idêntico                                     |

BFS: `index-CeAMfFot.js` **0**, `index-CdXaXBJP.js` **200**,
`ficha-cega-bloqueada` / `glossario-orders` / `glossario-audit` /
`glossario-route-engineering` / `glossario-suppliers` = **1** cada,
`novo-pedido-cliente` / `novo-cliente-nome` = **2**, `DEV000006` **20×**.

**Cliques reais contra `plmuse.lovable.app`** (Chromium, sessão local, papel
`admin` simulado): `/orders` com 18 inputs e **0 sem rótulo**, **2**
`ficha-cega-bloqueada`, **0** botões "Ficha Cega A4"; clicar no aviso →
**0 popups**; clicar "Clonar Pedido" → `PD-2026-803` + **1** botão; clicar
nesse botão → **1 popup** com `FICHA DE PRODUÇÃO DO PEDIDO · CEGA DE CUSTO E
PREÇO`. "Novo pedido": 6 campos com nome acessível, 1 `aria-required`, toast
`Selecione o cliente.`. Glossários `/audit` (18), `/route-engineering` (6),
`/suppliers` (10) colapsados e abrindo com 1 clique. **Repo, ar e banco
alinhados na Onda 47.**

Capturas: `/home/user/onda48-producao-orders.png`,
`onda48-producao-dialogo.png`, `onda48-producao-audit.png`.

---

## 2. Como a Onda 48 foi escolhida

Não foi opinião: **varredura de 44 rotas em produção** + **teste de 16 botões
emissores de documento com clique real** (popups, downloads e toasts). A
varredura também achou 11 rotas com campos sem rótulo acessível — dívida real,
mas de risco menor que documento impresso, e por isso ficou para a próxima.

Achados de risco:

| Tela                                                                | Medição ANTES (produção)                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/marketing`                                                        | 3 campanhas `demo: true` com badge "Demonstração"; **"Media Kit A4" ativo** e também no "Visualizar" do menu. O A4 saía com `RELEASE GTM & MEDIA KIT · DROP 01 · ALTO VERÃO PERFORMANCE & PIMA`, R$ **42.000** de mídia, R$ **18.500** de produção, R$ **218.400** de receita atribuída, **38.400** cliques e ROAS **5,20x** — todos de fábrica |
| `/collection-map`                                                   | KPIs **Modelos 6**, **Unidades 2.985**, **Receita alvo R$ 1.233.665**, **Margem 77%** derivados do mock `collectionMap.rows`; "Line Sheet A4" imprimia `Modelos: 6 · Peças Planejadas: 2.985 · Receita Alvo PVP: R$ 1.233.665`; "CSV B2B" baixava `line-sheet-verão-25.csv`                                                                     |
| `/security`, `/showroom`, `/commercial`, `/analytics`, `/ai-agents` | **já protegidos**: toasts de bloqueio ou tarja "não apurável" (Ondas 27–41) — nenhuma ação necessária                                                                                                                                                                                                                                           |

Ou seja: a Onda 47 fechou a Ficha Cega do pedido, mas **ainda havia dois
emissores de documento nascendo da vitrine** — o mesmo defeito, em outras
telas. Esse foi o risco escolhido.

---

## 3. O que mudou

### 3.1 Media Kit de campanha (`/marketing`)

- `src/lib/techsheet/research-gtm.ts`: `podeEmitirMediaKit(camp)` →
  `camp.demo !== true`; `MEDIA_KIT_DEMO_BLOQUEIO` explica a saída.
- `printMediaKit()` **retorna antes** de `buildDropMediaKitHtml()` se a
  campanha for vitrine, com `toast.error`. Como o "Visualizar" do
  `ModuleActionMenu` chama a mesma função, **os dois caminhos** foram fechados
  por um gate só; `onView` fica `undefined` para vitrine (o item some do menu).
- No card de vitrine, o botão é substituído por
  `data-testid="media-kit-bloqueado"` + **"Editar para emitir"**, que abre o
  diálogo de edição. `upsertCampaign` → `promoverCampanha()` remove `demo`
  (Onda 38): **editar é a promoção explícita**.
- `buildDropMediaKitHtml()` **não foi alterada**: continua função pura, e as
  asserções das Ondas 27/33/38 (`Release GTM & Media Kit`,
  `Nenhuma referência da campanha tem passaporte apurável`) seguem passando.

### 3.2 Line Sheet, CSV e KPIs (`/collection-map`)

- `src/lib/collection-map/store.ts`: `linhasApuraveis(rows, sheetsMap)` mantém
  só as linhas cuja referência tem **ficha técnica salva**;
  `podeEmitirLineSheet()` exige ao menos uma; `COLECAO_DEMO_LABEL` e
  `LINE_SHEET_DEMO_BLOQUEIO` nomeiam o motivo.
- `exportCsv()` e `printLineSheetA4()` usam **apenas `apuraveis`** e retornam
  com toast se não houver nenhuma. A matriz continua exibindo a vitrine, mas
  ela não cruza a fronteira do documento.
- KPIs: com `soVitrine`, os 4 viram **`—`** ("só demonstração", "não
  apurável", "sem ficha salva"); com ficha salva, calculam só sobre
  `apuraveis`. Aviso `colecao-so-vitrine` + CTA
  `cta-colecao-sem-ficha` (`CtaProximoPasso passo="ficha"`) e badge
  "Demonstração" ao lado do título da matriz.
- **Metadado também fechado:** o A4 e o nome do CSV levavam
  "Verão 2025 · Amalfi / Verão 25" da vitrine. Agora o usuário declara o nome
  em um campo com `aria-label`; sem declaração o título é
  **"Coleção em cadastro"** e a estação **`—`**.
- `buildLineSheetPrintableHtml()` e `buildLineSheetCsvPtBr()` **não foram
  alteradas** — o gate e os argumentos ficam no chamador, preservando os
  testes das Ondas 30/36.
- O campo de busca desta tela ganhou `aria-label` (1 → 0 sem rótulo).

Promoção explícita: converter um briefing em ficha técnica em `/research`
(`Converter em Ficha Técnica`) escreve no store; `allSourceRows` já deriva
`plmRows` de `sheetsMap`, então a linha passa a ser apurável sem seed
silencioso.

Arquivos: 4 fontes alteradas + 1 suíte nova
(`src/lib/onboarding/onda48-colecao-gtm.test.ts`, 8 testes).

---

## 4. Medição DEPOIS (browser local, cliques reais)

| Tarefa                                          | Resultado medido                                                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/marketing` base                               | **3** `media-kit-bloqueado`, **0** botões "Media Kit A4", aviso + CTA presentes                                                                                       |
| Clicar no aviso da vitrine                      | **0 popups**                                                                                                                                                          |
| Clicar "Editar para emitir" → "Salvar Drop GTM" | toast `Drop GTM atualizado e persistido!`; **2** bloqueados + **1** botão                                                                                             |
| Clicar "Media Kit A4" na campanha promovida     | **1 popup** com `RELEASE GTM & MEDIA KIT · ...`                                                                                                                       |
| `/collection-map` base                          | `colecao-so-vitrine` 1, CTA 1, `line-sheet-bloqueado` 1, **0** botões CSV/A4, **0 apuráveis**, 0 inputs sem rótulo                                                    |
| `/research` → "Converter em Ficha Técnica"      | toast `Ficha Técnica CR27-101 gerada...`; store com `['CR27-101']`                                                                                                    |
| `/collection-map` depois                        | `colecao-so-vitrine` **0**, `line-sheet-bloqueado` **0**, **1 apuráveis**, **1** botão CSV + **1** botão A4                                                           |
| Declarar nome "Colecao Outono 48" e emitir      | **1 popup** com `Colecao Outono 48 — —`, `Modelos: 1`, `Peças Planejadas: 432`, `CR27-101`, **sem** "Blusa Linho Amalfi"; download `line-sheet-colecao-outono-48.csv` |

Capturas: `/home/user/onda48-marketing-depois.png`,
`onda48-collection-map-antes.png`, `onda48-collection-map-depois.png`.

Scripts (não versionados, ambiente recriado a cada turno):
`/tmp/ux48_bfs.py`, `ux48_producao.py`, `ux48_varredura.py`,
`ux48_documentos.py`, `ux48_local.py`, `ux48_local2.py`, `ux48_bfs2.py`.

---

## 5. Gates

| Gate                     | Resultado                              |
| ------------------------ | -------------------------------------- |
| `npx tsc --noEmit`       | **0 erros**                            |
| `npx eslint .`           | **0 erros**, 20 warnings preexistentes |
| `npx prettier --check .` | limpo                                  |
| `npx vitest run`         | **681/681**, 102 arquivos (673 + 8)    |

Vite parado antes dos gates (evita o OOM de ondas anteriores).

---

## 6. 29ª medição — repo × ar × banco (após fechar a Onda 48)

| Camada                               | Estado medido                                                     |
| ------------------------------------ | ----------------------------------------------------------------- |
| **Repo** `Implantac/plm-use`, `main` | **Onda 48** — `5af3964` + docs/29ª medição                        |
| **Ar** `plmuse.lovable.app`          | **Onda 47** — `index-CdXaXBJP.js` / 227 chunks                    |
| **Banco** `njmniwsqwohmigroswnl`     | **migrações 21/24 aplicadas** — view `200 []`, 4 RPCs `401 42501` |

Marcadores da Onda 48 no ar = **0**: `media-kit-bloqueado`,
`colecao-so-vitrine`, `line-sheet-bloqueado`, `cta-colecao-sem-ficha`,
`Coleção em cadastro`, `Editar para emitir`. Marcadores da Onda 47 seguem
presentes (`ficha-cega-bloqueada` 1, `glossario-orders` 1,
`DEV000006` 20×). **Não houve novo marco de publicação** — portanto o ar está
uma onda atrás do repo por publicação pendente, não por defeito de código.

Banco re-medido sem mudança; `APLICAR-ONDA-21-24.sql` segue com SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`, guardado
por teste. Publicar app não aplica SQL e vice-versa.

---

## 7. O que **não** foi feito

- **Não publicamos a Onda 48.** A 30ª medição deve procurar os 6 marcadores
  acima e repetir os cliques em produção.
- **Não aplicamos SQL novo** (já aplicado na 24ª medição).
- **Não fornecemos `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`** — os 2 specs de e2e
  seguem `skipped`; a prova com sessão local não substitui login real.
- **Não corrigimos as 11 rotas com campos sem rótulo** medidas na varredura
  (`quality` 8, `launch` 5, `looks` 5, `inventory` 4, `financial` 2,
  `showroom` 2, `research` 2, `ai-agents`, `collection-map`, `display`,
  `references`). É a dívida de maior volume agora.
- **Não relaxamos asserções antigas**: as suítes 27–47 continuam dentro das 681.

## 8. Dívida seguinte, em ordem de risco

1. **Publicar a Onda 48** e refazer BFS + cliques em produção (30ª medição).
2. **`PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`** para destravar e2e autenticado.
3. **Acessibilidade dos 11 formulários restantes** (continuação da Onda 47).
4. `ensure()` ainda cria modelo/`materializadas` se chamado; `photorealism.ts`
   / placeholder do primeiro frame; jargão remanescente fora das 4 telas com
   glossário.
5. Revisar `stock_reservation_aging.dias_ativa` — a view responde `200 []`.
