# Sincronia repo × ar × banco — 59ª medição, 06/11/2026

Este documento é uma **medição**, não um plano. Cada linha foi obtida executando
o comando indicado no fim. Se algo divergir do que você vê na tela, refaça a
medição antes de discordar — e lembre que **publicar o app não aplica SQL** e
que **um marco relatado pelo dono precisa ser medido antes de virar fato**.

---

## 1. O quadro (59ª medição, após fechar a Onda 65)

| Camada                                         | Estado medido                     | Como foi medido                     |
| ---------------------------------------------- | --------------------------------- | ----------------------------------- |
| **Repositório** (`Implantac/plm-use`, `main`)  | **Onda 65** — HEAD local = remoto | `git log` / `git ls-remote`         |
| **App publicado** (`plmuse.lovable.app`)       | **Onda 64** — `index-ClheCAuQ.js` | BFS + `DEV000006` `18` (§2-X)       |
| **Banco de produção** (`njmniwsqwohmigroswnl`) | **migrações 21 e 24 APLICADAS**   | `200` na view · `42501` nas funções |

A 59ª medição **re-mediu as três camadas** e validou a **publicação
relatada da Onda 64**: o entry avançou para `index-ClheCAuQ.js` /
`index-O58aczOi.js` (214 chunks / 3.203.213 bytes) e `DEV000006` caiu de
20 para **18** no bundle (os 2 padrões do formulário de marketing
removidos). Cliques em produção confirmaram — `/marketing` "Cadastrar
Drop" sem SKUs nem números inventados, 0 `pageerror`. A Onda 65 rotulou o
mock do cron na tela que consome: o cron já emitia `sell_through_pct:
null` com `fonte: "cron:mock"` (honesto), mas a aba Performance de
`/launch` só descrevia os KPIs sem mostrar dado nem rotular o placeholder.
Detalhe e prova em `ONDA-65-CRON-MOCK-ROTULADO.md`.

**Repo na Onda 65, ar na Onda 64, banco inalterado — há uma publicação
pendente (65), por deploy, não por defeito.** Publicar o app não aplica
SQL. Gates **801/801** (796 + 5). A 58ª medição (§2-W) e a 57ª (§2-V)
continuam válidas.

### 1-A. Push da Onda 54: credencial trocada e envio confirmado

O token então em uso expirou: `GET /user` → **`401 Bad credentials`** e o
`git push` falhou com `could not read Password`. `git ls-remote` (leitura
pública) mediu **`1fb232bf1d5ea81c994a6b0b6e380cd3b50cf0bc`** — remoto ainda
na **Onda 53** — e a onda foi documentada como **não empurrada** enquanto se
aguardava credencial. O dono forneceu um novo PAT; a re-medição confirmou
`GET /user` **`200` · login `Implantac`**, e o push foi
**`1fb232b..8fa6b1d  main -> main`**. `git ls-remote` passou a medir
**`8fa6b1db785e1e87dcad7315f629adedf2932899`**, idêntico ao HEAD local, com
working tree limpo.

O token nunca foi gravado em `.git/config` nem em arquivo versionado: a
verificação por prefixo de PAT retornou **0** em ambos depois de remover a
única ocorrência, que era o **próprio comando de verificação citado** neste
documento (falso positivo, não um segredo). Os commits `a3eecd6` (código) e
`8fa6b1d` (40ª/41ª + docs) estão no remoto. **A Onda 54 está empurrada**; os
check-runs do HEAD final são conferidos ao fim desta rodada.

---

## 2. Histórico do dia (28ª e 29ª medições)

### 28ª — o "tudo publicado" do dono foi confirmado

O dono reportou publicação; a medição **não confirmou cegamente**:

- entry saiu de `index-CeAMfFot.js` (Onda 46) para **`index-CdXaXBJP.js`**
  (Onda 47), **227 chunks**, ~3,69 MB de JS; `index-CeAMfFot.js` = **0**.
- `ficha-cega-bloqueada`, `glossario-orders`, `glossario-audit`,
  `glossario-route-engineering`, `glossario-suppliers`, `Ficha Cega indispon` =
  **1** cada; `novo-pedido-cliente` / `novo-cliente-nome` = **2**;
  `DEV000006` **20×** (vitrine declarada, sem literais executáveis).
- **Cliques reais contra produção** (Chromium, sessão local, papel `admin`
  simulado): `/orders` com 18 inputs e **0 sem rótulo**, **2**
  `ficha-cega-bloqueada`, **0** botões "Ficha Cega A4"; clique no aviso →
  **0 popups**; "Clonar Pedido" → `PD-2026-803` + **1** botão; clique →
  **1 popup** com `FICHA DE PRODUÇÃO DO PEDIDO · CEGA DE CUSTO E PREÇO`.
  "Novo pedido": 6 campos com nome acessível, 1 `aria-required`, toast
  `Selecione o cliente.`. Glossários `/audit` (18), `/route-engineering` (6),
  `/suppliers` (10) colapsados, abrindo com 1 clique.
- Banco: view `200 []`, 4 funções `401 42501`. **Repo, ar e banco alinhados
  na Onda 47.**

Capturas: `/home/user/onda48-producao-orders.png`,
`onda48-producao-dialogo.png`, `onda48-producao-audit.png`.

### 29ª — a Onda 48 fechou no repo, o ar segue na 47

Varredura de **44 rotas** e teste de **16 botões emissores de documento** com
clique real em produção revelaram dois emissores ainda nascendo da vitrine:

| Tela              | ANTES (produção)                                                                                                                                                           | DEPOIS (repo, browser local)                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/marketing`      | 3 campanhas `demo: true` com "Media Kit A4" ativo (e no "Visualizar"); A4 com R$ 42.000 de mídia, R$ 18.500 de produção, R$ 218.400 de receita, 38.400 cliques, ROAS 5,20x | 3 `media-kit-bloqueado`, 0 botões, 0 popups; editar promove → 1 botão → 1 popup                                             |
| `/collection-map` | KPIs 6 modelos / 2.985 peças / R$ 1.233.665 / 77%; A4 e `line-sheet-verão-25.csv` com os mesmos números                                                                    | KPIs `—` + aviso/CTA, `line-sheet-bloqueado`, 0 botões, 0 apuráveis; ficha `CR27-101` salva → 1 apurável, A4/CSV só com ela |

Correção: `podeEmitirMediaKit()` (gate nos dois caminhos de UI),
`linhasApuraveis()` / `podeEmitirLineSheet()` (só ficha salva entra em KPI,
CSV e A4), KPIs `—` com `CtaProximoPasso`, e nome da coleção **declarado pelo
usuário** no documento ("Coleção em cadastro" enquanto não declarado). As
funções puras `buildDropMediaKitHtml`, `buildLineSheetPrintableHtml` e
`buildLineSheetCsvPtBr` **não foram alteradas** — nenhuma asserção das Ondas
27/30/33/36/38/47 foi relaxada. Detalhes em
`ONDA-48-A-VITRINE-NAO-IMPORTA-NEM-IMPRIME.md`.

Suíte: **681/681** (673 + 8), `tsc` 0, `eslint` 0 erros, `prettier` limpo.

---

## 2-A. 30ª e 31ª medições — publicação não relatada e Onda 49

### 30ª — a Onda 48 apareceu no ar sem ninguém anunciar

BFS: entry **`index-DPV0JUG6.js` / `index-DnKqdFO4.js`**, 227 chunks /
3.691.562 bytes na varredura parcial; `index-CdXaXBJP.js` = **0**.
`media-kit-bloqueado`, `colecao-so-vitrine`, `line-sheet-bloqueado`,
`cta-colecao-sem-ficha`, `Coleção em cadastro`, `Editar para emitir` = **1**
cada; `ficha-cega-bloqueada` 1, `glossario-orders` 1, `DEV000006` 20.

**Cliques reais em produção** (Chromium, sessão local, papel `admin`
simulado): `/marketing` com 3 bloqueios, 0 botões e 0 popups no aviso;
"Editar para emitir" → salvar → 1 botão → **1 popup** `RELEASE GTM & MEDIA
KIT · DROP 01`; `/collection-map` com `colecao-so-vitrine` 1, CTA 1,
`line-sheet-bloqueado` 1, 0 botões CSV/A4, **0 apuráveis**; clique no aviso
com contador de popups limpo → **0 popups, 0 downloads, 0 toasts**.
Regressão `/orders`: 2 `ficha-cega-bloqueada`, 0 botões Ficha Cega A4,
0 inputs sem rótulo. **Repo, ar e banco alinhados na Onda 48.**

> A primeira leitura do clique em `/collection-map` mostrou `popups: 1`,
> artefato de um contador compartilhado com a aba de `/marketing`. Refeito com
> contador próprio: **0**. Capturas: `/home/user/onda49-producao-marketing.png`,
> `/home/user/onda49-producao-collection-map.png`.

**Reconciliação de crawler:** o BFS da 31ª, mais estrito, alcançou **224
chunks / 3.175.104 bytes, 0 falhas** (CSS do HTML não referencia JS extra).
Como o entry tem **hash de conteúdo**, o mesmo entry significa **o mesmo
bundle** — a diferença 227 → 224 é amplitude do crawler, não republicação.

### 31ª — risco medido, Onda 49 fechada no repo

Re-probados os 5 emissores cujo clique falhara na 29ª: `/financial` "DRE
Gerencial (A4)", `/launch` "Exportar Feed CSV" e "Checklist Go/No-Go A4",
`/planner` e `/official-models` "Exportar" estão **`disabled` (protegidos)**.
Outros 5 clicaram sem popup/download/toast. **Nenhum emissor desprotegido
restou.** O risco medido passou a ser **campos sem nome acessível**:
**30 de 66 expostos** em 10 rotas (o 31º elemento do levantamento bruto da 29ª
era o `BubbleSelect` do Radix, `aria-hidden="true"`, não exposto).

Onda 49: 31 marcadores em 11 arquivos — 14 pares `id`/`htmlFor`, 16
`aria-label` em campos expostos + 1 no `SelectTrigger`, 6 `aria-required`.
Re-medido **ANTES (produção, Onda 48) e DEPOIS (local, Onda 49) com o mesmo
critério: 30/66 → 0/66**. Validações preservadas (`/launch` 4
`aria-invalid` + `Informe o código da wave.`; `/quality` 2 `aria-invalid`).
Gates: `tsc` 0, `eslint` 0 erros/20 warnings, `prettier` limpo, **686/686**.
Banco re-medido: view `200 []`, 4 funções `401 42501`, SHA do SQL inalterado.
Detalhe completo em `ONDA-49-TODO-CAMPO-TEM-NOME.md`.

---

## 2-B. 32ª medição — a Onda 49 no ar, validada por cliques

**BFS (mesmo crawler estrito da 31ª):** entry **`index--_hvA3Zc.js` /
`index-B-j1IXyJ.js`**, **224 chunks / 3.176.611 bytes**, **0 falhas**.
`index-DPV0JUG6.js` e `index-CdXaXBJP.js` = **0** no HTML. A diferença de
3.175.104 → 3.176.611 bytes (+1.507) é compatível com os 31 marcadores de
acessibilidade da Onda 49; o número de chunks não mudou.

| Marcador da Onda 49                   | 31ª | 32ª |
| ------------------------------------- | --- | --- |
| `Buscar ficha PLM ou referência`      | 0   | 1   |
| `Defeito ou problema da CAPA`         | 0   | 1   |
| `wave-codigo`                         | 0   | 2   |
| `lojista-razao`                       | 0   | 2   |
| `URL da imagem de referência visual`  | 0   | 1   |
| `Descrição da peça para gerar croqui` | 0   | 1   |
| `Mensagem para`                       | 0   | 1   |
| `custo-fixo-colecao`                  | 0   | 2   |
| `novo-rolo-codigo`                    | 0   | 2   |
| `aria-required` (total no bundle)     | —   | 13  |

Os **6 marcadores da Onda 48** seguem **1** cada; `ficha-cega-bloqueada` 1,
`glossario-orders` 1, `DEV000006` **20**.

**Cliques reais em produção** (Chromium, sessão local, papel `admin`
simulado, contador de popups por página): 12 rotas medidas → **0/66 campos
expostos sem nome**, `aria-required` **4 em `/launch` e 2 em `/quality`**.

| Tarefa                                                                            | Resultado                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `/launch` → "Criar" vazio                                                         | **4** `aria-invalid`, `Informe o código da wave.`, 0 popups                          |
| `/quality` → "Abrir CAPA" vazio                                                   | **2** `aria-invalid`, 0 popups                                                       |
| `/financial`                                                                      | `95000` / `180000` lidos por `get_by_label`                                          |
| `/showroom`                                                                       | `Lojista 32a medicao` / `12345678000199`                                             |
| `/inventory` · `/ai-agents` · `/research` · `/display` · `/references` · `/looks` | `RL-32`, `Qual o SAM da peca?`, URL + descrição 1/1, `RL`, `REF`, `Blusa teste`      |
| Regressão `/marketing`                                                            | 3 `media-kit-bloqueado`, 0 botões A4, aviso → **0 popups**                           |
| Regressão `/collection-map`                                                       | CTA 1, bloqueio 1, 0 botões CSV, **0 apuráveis**, aviso → **0 popups / 0 downloads** |
| Regressão `/orders`                                                               | 2 `ficha-cega-bloqueada`, 0 botões Ficha Cega A4, 0 popups                           |

Capturas: `/home/user/medicao32-launch.png`, `medicao32-quality.png`,
`medicao32-marketing.png`, `medicao32-collection-map.png`,
`medicao32-orders.png`. **`0/66` medido no ar, não só no browser local.**

---

## 2-C. 33ª medição — risco medido, Onda 50 fechada no repo

**Escolha por risco (cliques reais em produção, Onda 49):**

| Emissor                            | Resultado                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `/ai-agents` `Imprimir Parecer A4` | ✅ `sem ficha salva · SAM médio —`                                           |
| `/analytics` `Book S&OP A4`        | ✅ 6 travessões + aviso de pedidos/campanhas/OS de demonstração              |
| `/inventory` `CSV Compras ERP`     | ❌ CSV só com cabeçalho + toast de **sucesso**                               |
| `/inventory` `Requisição MRP A4`   | ❌ `ORÇAMENTO TOTAL R$ 0.00`, tabela vazia, sem aviso                        |
| `/planner` `Mapa CRP A4`           | ❌ 4 setores `0 min` / `0%` + "Folga operacional disponível", fila EDD vazia |

Documentos capturados: `/home/user/medicao33-doc-mrp.txt`,
`medicao33-doc-crp.txt`, `medicao33-doc-sop.txt`, `medicao33-doc-parecer.txt`.
Os demais emissores estavam `disabled` ou bloqueados por toast.

**Correção:** funções puras de elegibilidade + gates nos handlers, botões
`disabled` com `title`, `—` nos KPIs, avisos `mrp-sem-apuracao` / `crp-sem-op`
com `CtaProximoPasso` (`cta-mrp-sem-pedido`, `cta-crp-sem-op`), tabelas vazias
não renderizadas. `buildMrpCsv`, `buildMrpPurchaseRequisitionHtml` e
`buildFiniteCapacityScheduleHtml` **não foram alterados** — o teste novo prova
que, sem gate, ainda produziriam `R$ 0.00` (a decisão é do chamador).

**Cliques reais no browser local:** sem carteira, os 3 emissores estão
`disabled` e **0 popups / 0 downloads / 0 toasts mesmo com clique forçado**.
Promoção real por cliques — `/research` converter briefing → `CR27-101`,
`/orders` clonar → `PD-2026-803` (`demo: false`, ref `DEV000006`),
`/tech-sheet` "Nova Ref." → duplicar para `DEV000006` — liberou os 3: CSV com
**3 insumos**, A4 MRP com **8 linhas**, A4 CRP com **11 / 92 / 38 / 21 min**,
ocupação **0,2–0,5%**, `0%` = **0 ocorrências** e fila EDD
`1º PD-2026-803 · DEV000006`. O `R$ 0.00` que resta no A4 MRP **depois** da
promoção é apuração real (saldo de referência do BOM cobre a necessidade), não
ausência — antes vinha de `rows = []`. Detalhe em
`ONDA-50-ZERO-APURADO-NAO-VIRA-DOCUMENTO.md`.

**Ar (33ª):** entry `index--_hvA3Zc.js` / `index-B-j1IXyJ.js`, 224 chunks /
3.176.611 bytes, 0 falhas; marcadores 48 e 49 inalterados; **8 marcadores da
Onda 50 = 0**. **Banco:** view `200 []`, 4 funções `401 42501` (assinaturas
corretas), SQL SHA inalterado. **Gates:** `tsc` 0, `eslint` 0/20, `prettier`
limpo, **694/694** (686 + 8).

---

## 2-D. 34ª medição — "publicado" validado, repo/ar/banco na Onda 50

BFS: entry **`index-Ctoln0KB.js` / `index-QjNtTEcp.js`**, 224 chunks /
**3.179.918 bytes**, 0 falhas; `index--_hvA3Zc.js` = 0. `mrp-sem-apuracao` 1,
`cta-mrp-sem-pedido` 1, `crp-sem-op` 2, `cta-crp-sem-op` 1, os dois motivos 2
cada; marcadores 48/49 inalterados, `DEV000006` 20. (`podeEmitirMrp` /
`podeEmitirCrp` = 0 é minificação; a prova são os marcadores de tela.)

**Cliques reais em produção:** `/inventory` aviso 1 + CTA 1, `CSV Compras ERP`
e `Requisição MRP A4` **`disabled=True`** com `title`; `/planner` aviso 1 + CTA
1, `Mapa CRP A4` **`disabled=True`**. Clique forçado nos 3 → **0 popups, 0
downloads, 0 toasts**; 4 travessões em `/inventory` e 12 em `/planner`.
Banco: view `200 []`, 4 funções `401 42501`, SHA do SQL inalterado.
Capturas `/home/user/medicao34-inventory.png`, `medicao34-planner.png`.

## 2-E. 35ª medição — risco medido, Onda 51 fechada no repo

**Correção de diagnóstico:** o `Exportar` de `/collections` **não é botão
morto** — é o `ExportMenu` (DropdownMenu do Radix). A primeira leitura só
contava popups/downloads/toasts no clique do trigger; clicando nos `menuitem`
apareceram **"Baixar CSV"** (`colecoes-2026-11-11.csv`, 3 linhas, toast de
sucesso) e **"Imprimir / PDF"** (A4 `3 REGISTROS`), ambos com KPIs de fábrica:
`R$ 1,8 mi / 24.000 peças / ROI 3.4x`, `R$ 920 mil / 16.500 peças / 2.7x`,
`R$ 640 mil / 11.200 peças / 4.1x`. O subtítulo da tela avisava; **o arquivo
não**.

**Correção:** `demo?: boolean` + `demo: true` nas 3 do `collectionsSeed`;
`upsertCollection()` promove a `demo: false` (Onda 39);
`colecoesOperacionais()` / `podeExportarColecoes()` / `COLECOES_SEM_APURACAO`;
`ExportMenu` com `rows={operacionais.map(...)}` (zero linhas já desabilita o
botão compartilhado); 4 KPIs `—`; aviso `colecoes-so-vitrine` + CTA
`cta-colecoes-sem-colecao`; **7 campos do diálogo "Nova coleção"** com
`id`/`htmlFor` (medidos **7/7 → 0/7** sem nome acessível). `filterCollections`,
o `ExportMenu` compartilhado, `creative-sync` e as guardas 47/48/49/50 não
foram alterados; SQL SHA inalterado.

**Cliques reais no browser local:** com só vitrine, `Exportar`
`disabled=True` e 0 downloads/popups/toasts; CTA abre o diálogo, criar coleção
`Outono 27 - Onda 51` libera o menu → CSV com **1 linha** e PDF **`1
REGISTROS`**, **sem** `Amalfi`/`Urban Resort`/`Essentials`. Gates: `tsc` 0,
`eslint` 0/20, `prettier` limpo, **702/702** (694 + 8). Detalhe em
`ONDA-51-A-VITRINE-NAO-ENTRA-NO-CSV-NEM-NO-PDF.md`.

**Ar (35ª):** entry `index-Ctoln0KB.js` / `index-QjNtTEcp.js`, 224 chunks /
3.179.918 bytes; marcadores 48/49/50 inalterados; **6 marcadores da 51 = 0**.
**Banco:** view `200 []`, 4 funções `401 42501`, SQL SHA inalterado.

---

## 2-F. 36ª medição — "publicado" validado, repo/ar/banco na Onda 51

BFS: entry **`index-BVDv6rFg.js` / `index-VytO5e2k.js`**, 224 chunks /
**3.181.542 bytes**, 0 falhas; `index-Ctoln0KB.js` = 0. `colecoes-so-vitrine`
1, `cta-colecoes-sem-colecao` 1, `Só há coleções de demonstração` 1,
`Cadastrar coleção` 1; marcadores 50 e 48/49 intactos, `DEV000006` 20.
(`COLECOES_SEM_APURACAO`/`colecao-name` = 0 é minificação/constante.)

**Cliques reais em produção:** `/collections` com aviso 1 + CTA 1, `Exportar`
**`disabled=True`**, 6 travessões, clique forçado → **0 downloads, 0 popups, 0
toasts**; **0 campos sem nome na tela** e **0 no diálogo** (7 `label[for]`).
Banco: view `200 []`, 4 funções `401 42501`, SHA inalterado. Captura
`/home/user/medicao36-collections.png`.

## 2-G. 37ª medição — diálogos medidos, Onda 52 fechada no repo

**ANTES (produção, Onda 51):** varredura com clique real em botões de criação
de 44 rotas → **19 diálogos em 13 rotas, 107 campos expostos sem nome
acessível**. Maiores incidências: `cad` 11, `research` 11, `marketing` 10 (×2),
`suppliers` 10, `tech-sheet` 2 + 10 (`AplicacoesPanel`), `catalog` 9,
`prototypes` 5 (×2), `commercial` 5, `looks` 5. Já corretos: `collections`
(51), `orders` (47), `references` (49).

**Correção:** 114 `aria-label` em 13 rotas +
`src/components/techsheet/AplicacoesPanel.tsx`, derivados do `<Label>`/`<label>`
visível; 6 textos reescritos à mão (`Nome do look`, `Coleção do look`, `Cor do
look`, `Tags do look…`, `Pontos de bordado (milhares)`, `Número de cores da
aplicação`) e `SelectTrigger` "Ocasião do look". Nenhum `id` inventado, nenhum
`<Label>` alterado. **DEPOIS (browser local, mesmo script/critério): 19
diálogos, 0 campos sem nome, 0 rotas com problema.** O inventário estático
achara 98; a diferença vinha de `DialogContent` em componente separado —
corrigida e **re-medida com cliques**, não presumida.

Gates: `tsc` 0, `eslint` 0/20, `prettier` limpo, **710/710** (702 + 8).
**Ar (37ª):** entry `index-BVDv6rFg.js` / `index-VytO5e2k.js`, 224 chunks /
3.181.542 bytes; marcadores 48/49/50/51 inalterados; **7 marcadores exclusivos
da 52 = 0** (`Nome do look`, `Coleção do look`, `Cor do look`, `Tags do look…`,
`Ocasião do look`, `Pontos de bordado…`, `Número de cores…`). `Arte (cartela de
estampas)` = 1 **não é marcador**: é o `<Label>` pré-existente. **Banco:** view
`200 []`, 4 funções `401 42501`, SQL SHA inalterado. Detalhe em
`ONDA-52-DIALOGOS-TEM-NOME.md`.

---

## 2-H. 38ª medição — "publicado" validado, repo/ar/banco na Onda 52

BFS: entry **`index-BEBmR4We.js` / `index-BLCmNzL8.js`**, 224 chunks /
**3.185.303 bytes**, 0 falhas; `index-BVDv6rFg.js` = 0. Os 7 marcadores
exclusivos da 52 = **1** (`Nome do look`, `Coleção do look`, `Cor do look`,
`Tags do look…`, `Ocasião do look`, `Pontos de bordado (milhares)`, `Número de
cores da aplicação`); marcadores 51 e 48/49 intactos, `DEV000006` 20.

**Cliques reais em produção:** reabertura dos diálogos de criação das 44 rotas
→ **15 diálogos, 0 campos expostos sem nome** (a 37ª medira 19 no browser
local; nesta passagem o crawler encontrou 15 botões, todos corretos). Banco:
view `200 []`, 4 funções `401 42501`, SHA do SQL inalterado.

## 2-I. 39ª medição — KPI de coleção não nasce da vitrine

**Varredura de números de fábrica (texto visível das 44 rotas):** `/cad`,
`/dashboard`, `/financial`, `/marketing`, `/orders`, `/prototypes`,
`/suppliers`, `/tech-sheet` só trazem `DEV000006` (vitrine declarada). O único
painel com KPIs substantivos era `/collections`: `Alto Verão 2026` com
`R$ 476.800 / R$ 208.000 / R$ 143.640 / 1.490 / 69% / 2,29×` e `Pré-Verão
2026` com `R$ 38.400 / -70% / 0,41×`. O aviso da Onda 51 fica no topo da rota;
a tabela de ROI não tinha aviso colado nem `—`.

**Origem:** `CollectionROI` lia `usePCPStore((s) => s.lotes)` direto (4 lotes
`demo: true`) com `ticketMedio = 320`, custo `84/peça` e `INVEST_BASE` fixos;
`CollectionPerformance` recebia as 3 coleções de vitrine. Os seletores
`lotesOperacionais()` (Onda 40) e `colecoesOperacionais()` (Onda 51) **já
existiam** e não eram usados por esses painéis.

**Correção:** filtrar a vitrine nos dois; `apuravel` → `—` nos 3 KPIs de ROI,
em Plan./Real./Sell-Th. e na curva ABC; tabelas e barras não renderizadas;
avisos `roi-sem-lote` / `performance-sem-colecao` com CTAs; declaração
permanente de estimativa de referência. Nenhuma função pura, store ou guarda
anterior alterada; SQL SHA inalterado.

**Cliques reais no browser local:** com só vitrine → avisos 1/1, **nenhum
número de fábrica**, 17 travessões. Criar coleção `Inverno 28 - Onda 53` pelo
CTA → `performance-sem-colecao` **0**, `colecoes-so-vitrine` **0**;
`roi-sem-lote` permanece **1** (correto: ainda sem lote real). Gates: `tsc` 0,
`eslint` 0/20, `prettier` limpo, **718/718** (710 + 8). Detalhe em
`ONDA-53-KPI-DE-COLECAO-NAO-NASCE-DA-VITRINE.md`.

> **Limitação registrada:** `criarLote()` existe no store PCP e produz lote sem
> `demo`, mas **nenhum componente o chama**; "8 · Lançar pedido" em
> `/production` é apenas diagrama de fluxo. A liberação do ROI foi provada
> pelo teste unitário de `lotesOperacionais()` e pelo código, **não** por um
> clique inexistente. Achado de fluxo, não corrigido nesta onda.

**Ar (39ª):** entry `index-BEBmR4We.js` / `index-BLCmNzL8.js`, 224 chunks /
3.185.303 bytes; marcadores 48/49/50/51/52 inalterados; **6 marcadores da 53 =
0**. **Banco:** view `200 []`, 4 funções `401 42501`, SQL SHA inalterado.

---

## 2-J. 40ª medição — "publicado" validado, repo/ar/banco na Onda 53

BFS: entry **`index-CFlhwbuy.js` / `index-CZvI_8s1.js`**, 224 chunks /
**3.187.305 bytes**, 0 falhas; `index-BEBmR4We.js` = 0. `roi-sem-lote` 2,
`cta-roi-sem-lote` 1, `performance-sem-colecao` 2,
`cta-performance-sem-colecao` 1, `Estimativa sobre lotes salvos` 1,
`ticket médio de referência R$ 320` 1; marcadores 52 e 48/49 intactos,
`DEV000006` 20.

**Cliques reais em produção:** `/collections` com os 5 avisos/CTA e
**nenhum número de fábrica**, 17 travessões, declaração de estimativa visível.
Banco: view `200 []`, 4 funções `401 42501`, SHA do SQL inalterado. Captura
`/home/user/medicao40-collections.png`.

## 2-K. 41ª medição — todo aviso de vitrine tem um próximo passo

**Correção de diagnóstico:** a Onda 53 registrara "sem caminho de UI para criar
lote". Re-medindo, `/orders → "Liberar p/ PCP"` **funciona** (toast `Pedido
PD-2026-802 liberado para programação no PCP!`); o passo "8 · Lançar pedido"
do `PCPFlowDiagram` é um **stepper de checklist**; `criarLote()` é código morto
sem chamador. O risco não era fluxo quebrado, era **aviso sem saída clicável**:
`/production` dizia "Libere um pedido aprovado para o PCP" sem `data-testid`,
sem CTA e sem link.

**Varredura:** 21 rotas com aviso · 12 com `[data-passo] = 0` · **9 falsos
positivos** (`ai-center`, `cad`, `development` ×6, `launch`, `prototypes`,
`route-engineering`, `showroom`, `supplier-portal`, `tech-sheet` já tinham
botão/link próprio) · **5 sem nenhuma ação**: `looks`, `pieces-report`,
`orders`, `production`, `collection-map/line-sheet-bloqueado`.

**Correção:** `cta-look-sem-ficha`, `cta-dpp-sem-ficha`,
`cta-producao-sem-op` (+ `producao-sem-op`), `cta-ficha-cega-clonar` e
`cta-line-sheet-sem-ficha`. O `ficha-cega-bloqueada`,
`FICHA_CEGA_DEMO_BLOQUEIO`, `podeEmitirFichaCega()` (Onda 47),
`line-sheet-bloqueado` e `LINE_SHEET_DEMO_BLOQUEIO` (Onda 48) seguem intactos;
o novo botão apenas **clona por ação explícita**, sem emitir A4. Nenhum store,
cálculo ou asserção anterior alterado; SQL SHA inalterado.

**Cliques reais no browser local:** `/looks` e `/pieces-report` → `/references`;
`/production` → `/orders`; `/orders` → toast `Pedido clonado como PD-2026-803`
e 1 botão "Ficha Cega A4" liberado. **Varredura final com contexto limpo e
seletor que olha o pai: 0 rotas com aviso sem saída** (antes: 5).

> A primeira varredura "final" acusou `production`/`inventory`/`orders` porque
> rodou **depois** de clonar um pedido: `CtaProximoPasso` desaparece quando o
> passo está concluído (Onda 44). Refeita com contexto novo — artefato de
> estado, não regressão.

Gates: `tsc` 0, `eslint` 0/20, `prettier` limpo, **726/726** (718 + 8).
**Ar (41ª):** entry `index-CFlhwbuy.js` / `index-CZvI_8s1.js`, 224 chunks /
3.187.305 bytes; marcadores 48/49/50/51/52/53 inalterados; **6 marcadores da
54 = 0**. **Banco:** view `200 []`, 4 funções `401 42501`, SQL SHA inalterado.
Detalhe em `ONDA-54-TODO-AVISO-TEM-PROXIMO-PASSO.md`.

---

## 2-L. 43ª medição — publicação não relatada da Onda 54, validada por cliques

**BFS:** entry **`index-CgpxQvgj.js` / `index-CyHoINKY.js`**, **223 chunks /
3.188.203 bytes**, 0 falhas; `index-CFlhwbuy.js` = **0**. Marcadores da Onda
54: `cta-look-sem-ficha` 1, `cta-dpp-sem-ficha` 1, `cta-producao-sem-op` 1,
`cta-ficha-cega-clonar` 1, `cta-line-sheet-sem-ficha` 1, `producao-sem-op` 2;
marcadores da 53 (`roi-sem-lote` 2, `cta-roi-sem-lote` 1,
`performance-sem-colecao` 2, `Estimativa sobre lotes salvos` 1) e
`ficha-cega-bloqueada` intactos, `DEV000006` 20.

**Cliques reais em produção** (contexto novo por rota, porque
`CtaProximoPasso` desaparece quando o passo está concluído):

| Rota              | Aviso / CTA                                            | Resultado                                                                                                          |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `/looks`          | `look-sem-ficha` / `cta-look-sem-ficha`                | navega para **`/references`**                                                                                      |
| `/pieces-report`  | `dpp-sem-ficha` / `cta-dpp-sem-ficha`                  | navega para **`/references`**                                                                                      |
| `/production`     | `producao-sem-op` / `cta-producao-sem-op`              | navega para **`/orders`**                                                                                          |
| `/collection-map` | `line-sheet-bloqueado` / `cta-line-sheet-sem-ficha`    | navega para **`/references`**                                                                                      |
| `/orders`         | `ficha-cega-bloqueada` ×2 / `cta-ficha-cega-clonar` ×2 | toast `Pedido clonado como PD-2026-803 (Recompra B2B)!`; **1** botão Ficha Cega A4 liberado, 2 bloqueios restantes |

**Varredura final com contexto limpo:** **0 rotas com aviso sem saída** em 22
rotas medidas. Capturas `/home/user/medicao43-*.png`. Banco re-medido: view
`200 []`, 4 funções `401 42501` (assinaturas corretas), SQL SHA `382f0f19…`
inalterado. Gates re-medidos **726/726**.

> Foi uma publicação **detectada por BFS**, não confirmada a partir de um aviso
> do dono — o mesmo padrão da 30ª medição.

---

## 2-M. 44ª e 45ª medições — marco redundante e Onda 55

**44ª (marco re-medido):** `projeto publicado no lovable` → entry, chunks,
bytes e marcadores **idênticos** aos da 43ª medição; `index-CFlhwbuy.js` = 0.
Repo `c2a2b5d` limpo; banco view `200 []`, 4 funções `401 42501`, SHA do SQL
inalterado. **Repo, ar e banco alinhados na Onda 54** — nenhuma publicação nova.

**Escolha por risco:** varredura genérica de drawers nas 44 rotas deu 0 (**falso
negativo**: botões ícone). Medição dirigida ao `CapaDrawer` de `/quality`, com
clique real para criar/abrir a CAPA em produção:

| Aba          | Campos | Sem nome |
| ------------ | ------ | -------- |
| Investigação | 7      | **7**    |
| Ações        | 5      | **5**    |
| Evidências   | 3      | **3**    |
| Timeline     | 1      | **1**    |

Causa: `Field` renderiza `<label>` **irmão** do campo (sem `htmlFor`/`id`) e os
campos avulsos não tinham `aria-label`. Correção: **11 `aria-label`** em
`src/components/quality/CapaDrawer.tsx`; o `ActionField` usa `${label} da CAPA`
e cobre 3 instâncias. **Não** se trocou `<div>` por `<label>` wrapper porque
alguns `Field` contêm botões. Estrutura, `persistPatch`, `setLocal`, `onSave`,
validações da Onda 49 e guardas 47–54 intactas; SQL SHA inalterado.

**Cliques reais no browser local:** Investigação 7 / **0 sem nome**, Ações 5 /
**0**, Evidências 3 / **0**, Timeline 1 / **0**; "Abrir CAPA" vazio continua
com **2** `aria-invalid`; criar CAPA válida → toast `CAPA aberta`. Nota
metodológica: `get_by_label` de campos de outras abas retorna 0 porque o
`TabsContent` do Radix desmonta a aba inativa — a medição correta é por aba.

Gates: `tsc` 0, `eslint` 0/20, `prettier` limpo, **733/733** (726 + 7).
**Ar (45ª):** mesmo entry, 223 chunks / 3.188.203 bytes; marcadores 48–54
inalterados; **5 marcadores exclusivos da 55 = 0**. **Banco:** view `200 []`,
4 funções `401 42501`, SQL SHA inalterado. Detalhe em
`ONDA-55-CAPA-DRAWER-TEM-NOME.md`.

---

## 2-N. 46ª e 47ª medições — publicação da 55 e Onda 56

**46ª (publicação validada):** BFS → entry **`index-BlLjcjGi.js` /
`index-CfT3W1YT.js`**, 223 chunks / **3.188.613 bytes**, 0 falhas;
`index-CgpxQvgj.js` = 0. Os 5 marcadores exclusivos da 55 = **1**, marcadores
54 e 48/49 intactos, `DEV000006` 20. Cliques reais em `/quality`: 0 campos sem
nome na carga inicial, "Abrir CAPA" vazio → **2** `aria-invalid`, criação
válida → `CAPA aberta`, drawer com **0 sem nome** em Investigação (7), Ações
(5), Evidências (3) e Timeline (1). Banco view `200 []`, 4 funções `401 42501`,
SHA inalterado. **Repo/ar/banco na Onda 55.**

**Escolha por risco:** varredura de `<h1>` nas 43 rotas com espera fixa de
2,5 s e sem `wait_for_selector` → **42 com `<h1>`, 1 sem: `/digital-twin`**.
Medição dirigida: `h1 = 0`, `h2 = 1`, body ~1.034 caracteres, nenhum
`pageerror`, só `gemeo-sem-ficha`. **Não era artefato do crawler** (registrado
assim desde a Onda 31): sem ficha salva a rota devolvia apenas um `<Card>` com
`<h2>`, sem o `<header>`/`<h1>` do caminho normal. A varredura de botões-ícone
não achou novos drawers com campos sem nome.

**Correção:** `src/routes/_authenticated.digital-twin.tsx` passa a renderizar o
mesmo cabeçalho no estado de vitrine, KPIs `Simulação What-If — · Render IA — ·
Tiragem planejada —`, o Link `/tech-sheet` original com
`cta-gemeo-abrir-ficha` e um `CtaProximoPasso` `cta-gemeo-sem-ficha`. Caminho
normal (`simulateDigitalTwinScenario`, select, 7 cards), guarda da Onda 31 e
guardas 47–55 intactas; SQL SHA inalterado.

**Cliques reais no browser local:** sem ficha → **`h1 = 1`**, aviso 1, 2 CTAs,
3 travessões, Link → `/tech-sheet`. Promoção real: `/research` → converter
briefing → `CR27-101` → sidebar **Digital Twin** (SPA) → **`h1 = 1`,
`gemeo-sem-ficha = 0`, 7 cards e select de fichas**. Gates: `tsc` 0, `eslint`
0/20, `prettier` limpo, **740/740** (733 + 7).

**Ar (47ª):** mesmo entry, 223 chunks / 3.188.613 bytes; marcadores 48–55
inalterados; **3 marcadores exclusivos da 56 = 0**. **Banco:** view `200 []`,
4 funções `401 42501`, SQL SHA inalterado. Detalhe em
`ONDA-56-DIGITAL-TWIN-TEM-TITULO.md`.

---

## 2-O. 48ª e 49ª medições — publicação da 56 e Onda 57

**48ª (publicação validada):** BFS → entry **`index-C64BHus3.js` /
`index-D6lNmNPq.js`**, 223 chunks / **3.190.257 bytes**, 0 falhas;
`index-BlLjcjGi.js` = 0. Os 3 marcadores da 56 = **1**, marcadores 55 e 48/49
intactos, `DEV000006` 20. Cliques reais em `/digital-twin`: **`h1 = 1`**
(`Gêmeo Digital & Simulador What-If`), `gemeo-sem-ficha` 1, 2 CTAs, 4
travessões, `Abrir Ficha Técnica` → `/tech-sheet`. Banco view `200 []`, 4
funções `401 42501`, SHA inalterado. **Repo/ar/banco na Onda 56.**

**Escolha por risco:** varredura de emissores/ações inertes nas 44 rotas.
Falsos positivos descartados com medição dirigida: `analytics`/`materials`/
`production "Exportar"` são `ExportMenu` (abrem `Baixar CSV` / `Imprimir /
PDF`); `research "Gerar"` muda o DOM; `collections`/`planner "Exportar"` estão
`disabled`; `planner "Mapa CRP A4"` com `DEV000006` vinha de **estado
compartilhado** (pedido promovido por clique anterior) — com sessão limpa está
`disabled` e `crp-sem-op` = 1. Nenhuma vitrine em documento, nenhum botão morto.

Risco real: `criarLote()` declarado/implementado em `src/lib/pcp/store.ts` sem
**nenhum chamador nem teste**, enquanto o passo "8 · Lançar pedido" prometia
criar lote no Kanban — que na verdade lê OPs do banco via `usePcpLotes()` /
`ordersToLotes`. **Correção:** remover o código morto (comentário declara o
caminho real), `detail`/checklist do passo 8 apontando para `/orders → Liberar
p/ PCP`, e `CtaProximoPasso` `cta-lancar-pedido-pcp`. Os **35 testes do PCP**
seguem verdes; `podeEmitirCrp()`, `crp-sem-op`, `cta-producao-sem-op` e guardas
47–56 intactas; SQL SHA inalterado.

**Cliques reais no browser local:** `/production` mantém
`cta-producao-sem-op` = 1; passo 8 mostra `Libere o pedido aprovado` e
`Liberar p/ PCP` no checklist; `cta-lancar-pedido-pcp` = 1 e navega para
**`/orders`**; `/orders → "Liberar p/ PCP"` → toast `Pedido PD-2026-802
liberado para programação no PCP!`. Gates: `tsc` 0, `eslint` 0/20, `prettier`
limpo, **747/747** (740 + 7).

**Ar (49ª):** mesmo entry, 223 chunks / 3.190.257 bytes; marcadores 48–56
inalterados; **3 marcadores exclusivos da 57 = 0** e `Cria lote no Kanban do
PCP` ainda = **1**. **Banco:** view `200 []`, 4 funções `401 42501`, SQL SHA
inalterado. Detalhe em `ONDA-57-FLUXO-PCP-HONESTO.md`.

---

## 2-P. 50ª e 51ª medições — publicação da 57 e Onda 58

**50ª (publicação validada):** BFS → entry **`index-D5xUbEBY.js` /
`index-jPXI5Gle.js`**, **214 chunks / 3.180.877 bytes**, 0 falhas;
`index-C64BHus3.js` = 0. 3 marcadores da 57 = **1**, texto antigo `Cria lote
no Kanban do PCP` = **0**, `DEV000006` 20. Cliques reais: `/production` com
`cta-producao-sem-op` = 1; passo 8 com `Libere o pedido aprovado`, checklist
`Liberar p/ PCP`, `cta-lancar-pedido-pcp` → `/orders`; `/orders → "Liberar
p/ PCP"` → toast `Pedido PD-2026-802 liberado para programação no PCP!`.
Banco view `200 []`, 4 funções `401 42501`, SHA inalterado. **Repo/ar/banco na
Onda 57.**

**Escolha por risco:** varredura de jargão no texto visível das 44 rotas →
**41 com siglas**, só **5 com `GlossarioTermos`** (Onda 47: `audit`,
`dashboard`, `orders`, `route-engineering`, `suppliers`). Correção
metodológica: `CAD`/`PCP` aparecem em todas por causa da sidebar; descontado o
piso, **20 rotas com jargão real, 0 com glossário**. Mais densas: `financial`
21 (OTB/DRE/BOM/BOP), `analytics` 21 (ROI/ROAS/S&OP), `security` 14 (LGPD),
`launch` 13 (NCM/GTIN/EAN/ABNT), `marketing` 13 (ROAS), `development` 12
(SAM/PV), `commercial` 12 (CFOP/XML/NCM/POM), `quality` 11 (AQL/CAPA),
`collections` 11 (ROI), `planner` 10 (CRP/EDD), `inventory` 6 (MRP/LEC).
Seis siglas nem existiam no dicionário: `BOP`, `PV`, `GTM`, `CRP`, `EDD`, `LEC`.

**Correção:** `src/lib/onboarding/glossario.ts` +6 termos (**39**, sem
duplicatas) e `GlossarioTermos` com `siglas` medidas + `testId` próprio em 11
rotas. Os **20 testes do glossário** seguem verdes; `TERMOS_PRIMEIRA_DOBRA`,
`explicacaoDe`, `termosPorSigla`, os 5 glossários da Onda 47, as guardas 47–57
e o SQL SHA permanecem intactos.

**Cliques reais no browser local:** 10/10 rotas com `<details>` colapsado
abrindo 4–7 `<dt>` (mais `inventory` para `LEC`), com os termos novos
renderizados. `/launch` apareceu como 0 na primeira passagem — artefato de
tempo de renderização/HMR; com 3 s e `wait_for_selector` confirmado, nenhum
`pageerror`. Gates: `tsc` 0, `eslint` 0/20, `prettier` limpo, **754/754**
(747 + 7).

**Ar (51ª):** mesmo entry, 214 chunks / 3.180.877 bytes; marcadores 48–57
inalterados; **7 marcadores da 58 = 0**. **Banco:** view `200 []`, 4 funções
`401 42501`, SQL SHA inalterado. Detalhe em
`ONDA-58-GLOSSARIO-ONDE-HA-JARGAO.md`.

---

## 2-Q. 52ª medição — "lovable não recebeu esse commit" não se confirma

**Revisão por camada (com o token informado pelo dono, `GET /user` `200 Implantac`):**

| Camada           | Medição                                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo             | HEAD local = remoto = **`fae2a93154919f41bcb42bf73e4f0a53423208b2`**, `main`, working tree limpo, 781 arquivos todos `100644`, token fora de `.git/config` e dos arquivos versionados                                                          |
| GitHub API       | commit `fae2a93` com 3 arquivos (+281/−48); `check-runs`: `quality`, `smoke-publico`, `db-certification` ✅, 2 e2e `skipped`                                                                                                                   |
| Ar               | entry **`index-IvTyinWJ.js` / `index-pMXbg9-8.js`**, 214 chunks / **3.183.607 bytes**, 0 falhas; `index-D5xUbEBY.js` = **0**                                                                                                                   |
| Marcadores 58    | `glossario-financial`, `glossario-analytics`, `glossario-security`, `glossario-launch`, `glossario-marketing`, `glossario-inventory`, `Lote econômico de compra`, `Estratégia de ida ao mercado`, `O que significam essas siglas` = **1** cada |
| Marcadores 57/47 | `cta-lancar-pedido-pcp` 1, `Cria lote no Kanban do PCP` **0**, `glossario-orders`/`audit`/`suppliers` 1, `ficha-cega-bloqueada` 1, `DEV000006` 20                                                                                              |
| Banco            | view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado                                                                                                                                                                           |
| Gates            | `tsc` 0, `eslint` 0 erros/20 warnings, `prettier` limpo, **754/754**                                                                                                                                                                           |

**Cliques reais em produção:** `financial` (6 `dt`), `analytics` (7), `launch`
(7), `inventory` (3 — `MRP`/`LEC`/`BOM`), `quality` (4), `planner` (5),
`collections` (4): todos os `<details>` colapsados abriram com os termos
medidos. Regressão da Onda 57 conferida: passo 8 com
`cta-lancar-pedido-pcp` = 1 e o texto antigo ausente. Captura
`/home/user/medicao52-glossario.png`.

**Diagnóstico de cache/CDN:** o HTML responde
`Cache-Control: no-cache, must-revalidate, max-age=0` e os JS com hash de
conteúdo respondem `public, max-age=31536000, immutable`. Não há stale por CDN:
um HTML sempre revalidado aponta para o entry novo. A percepção de "não
recebeu" é compatível com **timing do deploy** ou **aba/cache local do browser**
(hard refresh resolve), não com commit ausente no GitHub.

**Conclusão:** não havia o que corrigir no código nem o que reenviar — o push
da rodada anterior (`0d8eb95..fae2a93`) estava completo. Atualizamos o GitHub
com a **52ª medição** (este documento, `ONDE-PAROU.md` e o doc da Onda 58),
que também serve de novo commit caso o dono queira re-disparar o deploy.

---

## 2-R. 53ª medição — Onda 59 escolhida pelo risco, vitrine não emite guia fiscal

**Re-medição inicial (o turno anterior não havia concluído ar/banco):**
repo `f551a83` local = remoto, limpo, token 0/0; ar
`index-IvTyinWJ.js` / `index-pMXbg9-8.js` com **214 chunks / 3.183.607
bytes**, 0 falhas e 6 marcadores da 58 = 1; banco view `200 []`, 4 funções
`401 42501`, SQL SHA `382f0f19…` inalterado. **Repo/ar/banco na Onda 58.**

**Risco medido por cliques em `/influencers` (ANTES):** 5 creators de fábrica
sem selo → KPIs `5 / 6 / 434 / 8,6%`, ROI `563%`, **5 linhas** de
custo/receita/ROAS/CAC/CFOP, **5 botões `Guia 6910` habilitados** e A4 com
`NATUREZA FISCAL: REMESSA EM BONIFICAÇÃO · Marina Costa`; 0 avisos de vitrine;
**2 campos sem nome acessível** no diálogo "Registrar envio" (card → "Novo
envio"). Os mesmos seeds contaminavam `CollectionROI` e o contexto do
copiloto (`resumoInfluencers`). Jargão sem glossário era a dívida mais visível,
mas **nenhuma outra emitia documento fiscal a partir de demonstração**.

**Correção:** `demo: true` nos 5 seeds, `influencersOperacionais()`,
`podeEmitirGuiaBonificacao()` (salvo **e** com remessa),
`linhasSeedingOperacionais()`, `—` + avisos/CTAs, diálogo de 11 campos para
registrar creator real, filtro em `CollectionROI`, `resumoInfluencers()` e nas
hidratações `cloud-sync`/`creative-sync`. As funções puras de cálculo e HTML
seguem intactas; o teste antigo do cupom `USEMARINACO10` segue verde.

**DEPOIS (mesmos cliques):** `434`/`563%` ausentes, 2 avisos + 2 CTAs, selo
`demonstracao`, **0 linhas e 0 guias**, heat map 5× `—`, 5 selos
"Demonstração", drawer da vitrine com "Novo envio" `disabled`, **0/2** campos
sem nome no diálogo de envio e **0/11** no novo diálogo. Registrando
`Ana Real` + `VT900`: 1 linha, 1 guia habilitada e A4 com `Ana Real`/`VT900`
**sem `Marina Costa`**, 0 `pageerror`. Capturas `/home/user/medicao53-*.png`.

| Camada | 53ª medição (depois)                                                                      |
| ------ | ----------------------------------------------------------------------------------------- |
| Repo   | **Onda 59** — HEAD local = remoto, limpo, token fora do config e dos arquivos             |
| Ar     | **Onda 58** — mesmo entry/bytes; 6 marcadores da 59 = **0**; marcadores 58/57/47 intactos |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                  |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **763/763**                   |

**Há uma publicação pendente (a 59).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-S. 54ª medição — Onda 60 escolhida pelo risco, campos de sequência nomeados

**Re-medição inicial:** repo `8c7f6a6` local = remoto, limpo, token 0/0; ar
`index-IvTyinWJ.js` / `index-pMXbg9-8.js` com **214 chunks / 3.183.607
bytes**, 0 falhas, 6 marcadores da 59 = **0** (publicação da 59 ainda
pendente, sem publicação não relatada); banco view `200 []`, 4 funções
`401 42501`, SQL SHA `382f0f19…` inalterado.

**Risco medido:** varredura com cliques nas 42 rotas — **43 campos sem nome
acessível** na carga inicial (`tech-sheet` 23/29, `supplier-portal` 16/17,
`looks` 3/9, `references` 1/2) e **180 na fonte** (critério 49/52). Nenhum
emissor de documento sem guarda foi achado (todos os `window.open`/print
medidos têm guarda ou leem dado real). Os 7 de `materials` são falso positivo
(`<label>` envolve o campo). Escolhida a acessibilidade em telas de operação
(portal do fornecedor, ficha técnica, reserva de estoque, OS de facção) em vez
do jargão de menor densidade, que não impede a operação.

**Correção:** `aria-label` derivado do rótulo visível (ou da coluna, com
índice da linha) em 8 arquivos — `supplier-portal` (20), `BomBopPanel` (18),
`GarmentSketchStudio` (16), `showroom` (12),
`OutsourcingServiceOrderPanel` (9), `OrderDetail` (8), `ReservationDialog`
(7), `GradedMeasurementsPanel` (7). Nenhum handler, validação ou store mudou.
Um `aria-label` duplicado no input inline de NCM foi removido antes dos gates.

**DEPOIS (mesmos cliques):** fonte **180 → 78** (8 arquivos zerados; 71
restantes em outros arquivos, candidatos à Onda 61); DOM `/supplier-portal`
diálogo "Cadastrar fornecedor" **0/11** sem nome; `/showroom` **0/2**; 0
`pageerror`. Capturas `/home/user/medicao54-*.png`.

| Camada | 54ª medição (depois)                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 60** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                                |
| Ar     | **Onda 58** — mesmo entry/bytes; 6 marcadores exclusivos da 60 = **0**; 6 marcadores da 59 = 0; marcadores 58/57/47 intactos |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                                     |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **770/770**                                                      |

**Há duas publicações pendentes (59 e 60).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-T. 55ª medição — Onda 61 escolhida pelo risco, fechamento dos campos sem nome

**Re-medição inicial:** repo `f01ab51` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-BQ5zgD_R.js` / `index-Bt3hn52q.js` (**214 chunks /
3.198.301 bytes**, 0 falhas) com 6 marcadores da 60 = **1**, 3 da 59 = 1,
marcadores da 58 = 1 — **publicações das Ondas 59 e 60 ocorreram sem relato**
e foram validadas por cliques em produção (`/influencers` sem guias/linhas,
`/supplier-portal` diálogo 0/11); banco view `200 []`, 4 funções `401 42501`,
SQL SHA `382f0f19…` inalterado.

**Risco medido:** contagem estática na fonte (critério 49/52/60) — **78**
campos sem nome no contador bruto; classificados um a um: falsos positivos
de `<label>` envolvente (`materials` 7, `OpWorkspace` 3, `planner` 3, `looks`
3, `compare` 2), comentários/definições e `aria-label` após `=>`, restando
**48 reais em 18 arquivos**. Nenhum emissor de documento sem guarda foi
achado. Escolhido o fechamento da acessibilidade em telas de operação (PCP,
rota, corte, financeiro, estoque) em vez do jargão de menor densidade, que
não impede a operação.

**Correção:** `aria-label` derivado do `<Label>` visível (ou da coluna, com
índice) em 18 arquivos — `PassagemForm` (6), `OcorrenciaForm` (5),
`route-engineering` (4), `CuttingRoomPlanPanel` (4), `financial` (4),
`measurements` (4), `ProductStudio` (3), `MovementDialog` (3), `analytics`
(3), `CommentsPanel` (2), `PreCostPanel` (2), `TechSheetVersions` (2),
`CostQueueNominalPanel`, `collection-map`, `inventory`, `launch`, `prints`,
`references` (1 cada). Nenhum handler, validação ou store mudou.

**DEPOIS (mesmos cliques):** fonte **78 → 30** no contador bruto, **0 reais**
(18 arquivos zerados); DOM `/financial` **0/2**, `/measurements` **0/26**,
`/references` **0/2** (filtro nomeado), `/analytics` **0/1**; 0 `pageerror`.
Captura `/home/user/medicao55-references-depois.png`.

| Camada | 55ª medição (depois)                                                                               |
| ------ | -------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 61** — HEAD local = remoto, limpo, token fora do config e dos arquivos                      |
| Ar     | **Onda 60** — mesmo entry/bytes; 6 marcadores da 60 = 1, 3 da 59 = 1; marcadores 58/57/47 intactos |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                           |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **777/777**                            |

**Há uma publicação pendente (61).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-U. 56ª medição — Onda 62 escolhida pelo risco, glossário cobre o jargão restante

**Re-medição inicial:** repo `c68c2c1` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-BOthbvNE.js` / `index-fT4j6Can.js` (**214 chunks /
3.199.677 bytes**, 0 falhas) com 6 marcadores da 61 = **2** (rótulo visível

- `aria-label`), 6 da 60 = 1, 3 da 59 = 1 — **publicação da Onda 61 relatada
  pelo dono e validada por cliques em produção** (`/references` com o filtro
  "Filtrar por status" nomeado, 0 campos sem nome, 0 `pageerror`); banco view
  `200 []`, 4 funções `401 42501` (com parâmetros corretos — a primeira sonda
  com `{}` devolveu `404 PGRST202`, erro da sonda), SQL SHA `382f0f19…`
  inalterado.

**Risco medido:** varredura de siglas no texto visível das 44 rotas —
**OP 32×**, B2B 15×, ERP 9×, ABC 7×, OS 6×, MOQ 3×, RLS 5×, RBAC 2×, além
dos 4 da dívida (MOQ/UTM/CAC/CMV) confirmados em texto visível. **9 termos
fora do glossário** (OP, MOQ, TCO, UTM, CAC, CMV, ABC, OS, ERP) e **4 rotas**
que os usavam sem `GlossarioTermos` (materials, supplier-portal,
influencers, production). Nenhum emissor de documento sem guarda foi
achado. Escolhido o jargão sem tradução em telas de operação em vez de
`DEV000006`/`CollectionROI` (vitrine/estimativa já declaradas) ou de
`dias_ativa` (view `200 []` é o comportamento correto sem reservas).

**Correção:** +9 termos no `glossario.ts` (39 → **48**, sem duplicatas) e
`GlossarioTermos` com `siglas` medidas por tela + `testId` próprio nas 4
rotas — materials (`MOQ`, `SKU`), supplier-portal (`MOQ`, `TCO`, `OP`,
`BOM`, `OTIF`, `RFQ`), influencers (`UTM`, `CAC`, `ROAS`, `CFOP`),
production (`OP`, `PCP`). **20 rotas com glossário.** Nenhum rótulo de
módulo, handler ou store mudou. O teste da Onda 58 só teve a contagem
39 → 48 atualizada.

**DEPOIS (mesmos cliques):** dicionário **39 → 48**; rotas com glossário
**16 → 20**; `/materials` 2 termos, `/supplier-portal` 6, `/influencers` 4,
`/production` 2; 0 `pageerror`. Captura
`/home/user/medicao56-supplier-portal-glossario.png`.

| Camada | 56ª medição (depois)                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 62** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                   |
| Ar     | **Onda 61** — mesmo entry/bytes; 6 marcadores da 61 = 2, 6 da 60 = 1, 3 da 59 = 1; marcadores 58/57/47 intactos |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                        |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **783/783**                                         |

**Há uma publicação pendente (62).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-V. 57ª medição — Onda 63 escolhida pelo risco, glossário em todas as rotas com jargão

**Re-medição inicial:** repo `d822c86` local = remoto, limpo, token 0/0; ar
`index-BOthbvNE.js` / `index-fT4j6Can.js` com **214 chunks / 3.199.677
bytes**, 0 falhas, 6 marcadores da 61 = **2**, 6 da 60 = 1, 3 da 59 = 1 e
**marcadores da 62 = 0** (entry/bytes idênticos ao início da 56ª — a Onda
62 ainda não foi publicada, por deploy); banco view `200 []`, 4 funções
`401 42501` (com parâmetros corretos), SQL SHA `382f0f19…` inalterado.

**Risco medido:** re-varredura de siglas no texto visível das 24 rotas sem
glossário — **12 com jargão** (tech-sheet 9, approvals 5, research 5,
digital-twin 4, cad 2, catalog/flow/looks/measurements/prototypes/
references/showroom 1 cada) e **3 termos fora do dicionário** (B2B 15×,
RLS 5×, RBAC 2×, em audit/security). Nenhum emissor de documento sem
guarda foi achado. Escolhido o jargão sem tradução nas rotas de operação
restantes em vez da auditoria `DEV000006` (guardas já existem, risco
menor) ou do cron mock (fronteira do ERP, sem dado real para medir).

**Correção:** +3 termos no `glossario.ts` (48 → **51**, sem duplicatas,
respeitando a regra da Onda 45: sem "conforme o" nem "ver ") e
`GlossarioTermos` com `siglas` medidas por tela + `testId` próprio nas 12
rotas. B2B/RLS/RBAC somados aos arrays de audit e security. **32 rotas
com glossário** — todas as rotas com jargão; as 12 restantes têm 0 siglas
e não precisam. Detalhe: `/tech-sheet` tem retorno antecipado de estado
vazio (`cockpit-sem-ficha`) — o glossário foi adicionado também nesse
ramo, porque é a primeira tela de quem chega. Nenhum rótulo de módulo,
handler ou store mudou. Os testes das Ondas 58 e 62 só tiveram a contagem
48 → 51 atualizada.

**DEPOIS (mesmos cliques):** dicionário **48 → 51**; rotas com glossário
**20 → 32**; rotas com jargão sem glossário **12 → 0**; `/tech-sheet` 9
termos no estado vazio, `/approvals` 5, `/research` 5, `/digital-twin` 4,
8 rotas com 1–2; 0 `pageerror`. Captura
`/home/user/medicao57-tech-sheet-glossario.png`.

| Camada | 57ª medição (depois)                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 63** — HEAD local = remoto, limpo, token fora do config e dos arquivos                           |
| Ar     | **Onda 61** — mesmo entry/bytes; 6 marcadores da 61 = 2, 6 da 60 = 1, 3 da 59 = 1; marcadores da 62 = 0 |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **790/790**                                 |

**Há duas publicações pendentes (62 e 63).** Nenhuma migration foi escrita
nem aplicada; publicar o app não aplica SQL.

---

## 2-W. 58ª medição — Onda 64 escolhida pelo risco, auditoria DEV000006 ponta a ponta

**Re-medição inicial:** repo `a714972` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-B0uxa54F.js` / `index-CSDnutoy.js` (**214 chunks /
3.204.004 bytes**, 0 falhas) com 3 marcadores da 63 = **1**, 5 da 62 = 1,
3 da 61 = 2 — **publicações das Ondas 62 e 63 relatadas pelo dono e
validadas por cliques em produção** (`/materials` glossário MOQ/SKU,
`/tech-sheet` 9 termos, 0 `pageerror`); banco view `200 []`, 4 funções
`401 42501` (com parâmetros corretos), SQL SHA `382f0f19…` inalterado.

**Risco medido:** auditoria das **47 ocorrências** de `DEV000006` na fonte
(20 no bundle), classificadas uma a uma — ~20 em comentários, seeds com
`demo: true` seladas/filtradas, `cfo-dre` fora dos acumuladores, tech-sheet
e dashboard declarando, looks filtrando, research/marketing/showroom/
commercial honestos. E **3 vazamentos** do padrão "formulário
pré-preenchido com dado de demonstração": marketing (SKUs `DEV000006` +
R$ 115.000 inventados → campanha operacional), suppliers (parceiro
fictício → fornecedor homologado), research (briefing de exemplo →
briefing operacional). Nenhum emissor de documento sem guarda foi achado.
Escolhida a honestidade de dado em formulários em vez do cron mock (sem
dado real para medir) ou de `dias_ativa` (view `200 []` é o correto).

**Correção:** padrões visíveis esvaziados + fallbacks do save
neutralizados nos 3 formulários (marketing: SKUs/números vazios; suppliers:
campos vazios, compliance "Em Auditoria", fallbacks `""`/mínimos; research:
campos vazios, fallbacks `""`/`0`). Nenhum handler, validação ou store
mudou além disso. Campanha/briefing/fornecedor salvos pelo usuário
continuam operacionais — com dado digitado, não de fábrica.

**DEPOIS (mesmos cliques):** `/marketing` "Cadastrar Drop" só com
data/coleção/canal/formato pré-preenchidos (SKUs e números **vazios**);
`/suppliers` "Adicionar" **vazio**; 0 `pageerror`. Capturas
`/home/user/medicao58-marketing-dialogo-antes.png` (vazamento) e
`/home/user/medicao58-marketing-depois-salvar.png`.

| Camada | 58ª medição (depois)                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 64** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                   |
| Ar     | **Onda 63** — mesmo entry/bytes; 3 marcadores da 63 = 1, 5 da 62 = 1, 3 da 61 = 2; marcadores 60/59/58 intactos |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                        |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **796/796**                                         |

**Há uma publicação pendente (64).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-X. 59ª medição — Onda 65 escolhida pelo risco, cron mock rotulado na tela que consome

**Re-medição inicial:** repo `d4b1bb2` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-ClheCAuQ.js` / `index-O58aczOi.js` (**214 chunks /
3.203.213 bytes**, 0 falhas) com 3 marcadores da 63 = **1**, 2 da 62 = 1,
2 da 61 = 2 e **`DEV000006` 20 → 18** — **publicação da Onda 64 relatada
pelo dono e validada por cliques em produção** (`/marketing` "Cadastrar
Drop" sem SKUs nem números inventados, 0 `pageerror`); banco view
`200 []`, 4 funções `401 42501` (com parâmetros corretos), SQL SHA
`382f0f19…` inalterado.

**Risco medido:** o único `TODO` real da fonte — o mock de sell-through do
cron `launch-performance.ts`. O cron já era honesto no dado (emite
`sell_through_pct: null` com `fonte: "cron:mock"`, nunca percentual
inventado), mas a tela que consome (`/launch` aba Performance) só
descrevia os KPIs ("`sell_through_D30`", "o cron alimenta esta aba
diariamente") sem mostrar dado nenhum e sem rotular o placeholder; o mapa
`performance` do `useLaunch` era buscado e nunca renderizado. Nenhum
emissor de documento sem guarda foi achado. Escolhido o rótulo honesto na
tela que consome em vez de `dias_ativa` (view `200 []` é o correto) ou de
`CollectionROI` (estimativa já declarada). Nota: o `TODO` dizia
"substituir por `ErpAdapter.getSellThrough`" — o PLM não é ERP, não há
`ErpAdapter` para ligar; a correção correta é rotular, não inventar.

**Correção:** a aba Performance agora renderiza o dado real do evento —
aviso `performance-sellthrough-mock` ("Sell-through ainda não apurável…
O PLM não é ERP: nenhum percentual é inventado aqui") e lista de waves com
badge **"sell-through —"** (null) e fonte `cron:mock`. O mapa `performance`
passou a ser consumido. O comentário do cron reflete o estado honesto
atual. Nenhum número novo é emitido; quando houver integração real, o
badge mostra o percentual sem mudar a tela.

**DEPOIS (mesmos cliques):** `/launch` aba Performance com o aviso do mock
renderizado, estado vazio honesto ("Nenhuma wave ainda"), **0 números de
sell-through inventados**, 0 `pageerror`. Captura
`/home/user/medicao59-launch-performance.png`.

| Camada | 59ª medição (depois)                                                                              |
| ------ | ------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 65** — HEAD local = remoto, limpo, token fora do config e dos arquivos                     |
| Ar     | **Onda 64** — mesmo entry/bytes; 3 marcadores da 63 = 1, 2 da 62 = 1, 2 da 61 = 2; `DEV000006` 18 |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                          |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **801/801**                           |

**Há uma publicação pendente (65).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-Y. 60ª medição — Onda 66 escolhida pelo risco, demonstração rotulada e fora das métricas

**Re-medição inicial:** repo `ad54a8f` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-CIimYX9w.js` / `index-CkWW-tU5.js` (**214 chunks /
3.204.381 bytes**, 0 falhas) com marcador da 65 = 1, da 64 = 6, da 63 = 1,
da 62 = 1 e **`DEV000006` 18** — **publicação da Onda 65 relatada pelo dono
e validada por cliques em produção** (`/launch` aba Performance com o aviso
do mock de sell-through, 0 `pageerror`); banco view `200 []`, 4 funções
`401 42501` (com parâmetros corretos), SQL SHA `382f0f19…` inalterado.

**Risco medido:** as outras referências de demonstração — `V24-001` (18
ocorrências), `U25-014` (8), `I25-088` (5) fora de testes. O seed de ciclo
de vida (`src/lib/reference/store.ts`, 6 referências de demonstração)
alimentava três superfícies operacionais sem nenhuma declaração de
demonstração: `/pieces-report` (as 6 refs entravam nas 4 métricas do topo
como peças reais), o Centro de Desenvolvimento de `/development` (contagens
dos filtros contavam a demonstração como referência real) e o Kanban da
esteira (a ref de demonstração podia ser promovida a "ficha salva" se
existisse documento com o mesmo código; a timeline do `ReferenciaDrawer`
mostrava progresso de demonstração sem rótulo). Contrapontos: `/references`
usa `useReferences` (Supabase), não o seed; `collection-map` declara
vitrine; `cad/store.ts` marca `demo: true`.

**Correção:** mesmo contrato das coleções `demo: true` (Onda 51) e dos
creators (Onda 59) — o seed marca `demo: true`; as métricas e contagens
operacionais ignoram `demo`; sem peça real, a métrica vira **`—`** com
detalhe "só demonstração na lista" (nunca zero apurado; `ModuleLayout`
ganhou o campo `demo` na métrica); a demonstração continua ilustrando a
lista com aviso visível (`pieces-report-demo`,
`centro-desenvolvimento-demo`, `referencia-drawer-demo`); e a ref de
demonstração nunca vira ficha nem avança de estágio (`buildKanbanRefItems`
força `doc: undefined` para `demo`). Nenhuma asserção antiga relaxada.

**DEPOIS (mesmos cliques):** `/pieces-report` com o aviso renderizado e as 4
métricas em `—`; `/development` com o aviso do Centro, filtros em `—` e
`V24-001` ilustrando a esteira como cartão sem ficha (não arrastável);
0 `pageerror`. Capturas `/home/user/medicao60-pieces-report-depois.png` e
`/home/user/medicao60-development-depois.png`.

| Camada | 60ª medição (depois)                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 66** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                         |
| Ar     | **Onda 65** — entry novo `index-CIimYX9w.js` / `index-CkWW-tU5.js`; marcadores 65=1, 64=6, 63=1, 62=1; `DEV000006` 18 |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                              |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **809/809**                                               |

**Há uma publicação pendente (66).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-Z. 61ª medição — Onda 67 escolhida pelo risco, carteira B2B, fluxo e sacola nascem vazios

**Re-medição inicial:** repo `478df53` local = remoto, limpo, token 0/0; ar
com entry **novo** `index--0psZgO_.js` / `index-DXm9SpcR.js` (**214 chunks /
3.206.452 bytes**, 0 falhas) com marcadores da 66 = 1/1/1, "só demonstração
na lista" = 4, marcador da 65 = 1 e **`DEV000006` 18** — **publicação da
Onda 66 relatada pelo dono e validada por cliques em produção**
(`/pieces-report` com as 4 métricas em `—`, `/development` com filtros em
`—`, 0 `pageerror`); banco view `200 []`, 4 funções `401 42501` (com
parâmetros corretos), SQL SHA `382f0f19…` inalterado.

**Risco medido:** as outras referências de demonstração — `U25-014` (8
ocorrências), `I25-088` (5) fora de testes. Nas camadas de cálculo elas já
estavam cobertas (GTM `demo: true`, OS `demo: true`, `cfo-dre` MODELO_REFS
fora dos acumuladores, `resolveReferenceTechSheet` sem ficha inventada
desde a Onda 32). Mas a varredura de **formulários pré-preenchidos** — o
mesmo padrão das Ondas 64/66 — achou três vazamentos restantes, provados
por cliques antes de corrigir: `/commercial` com 4 lojistas fictícios
("Luxury Boutique SP", CNPJ, 24 pedidos, "R$ 124k") e `qtyByRef`
pré-preenchido com `DEV000006: 72, V24-001: 48, U25-014: 24` (dava para
exportar romaneio e pré-NFe para cliente que não existe); `/financial` com
3 títulos fictícios ("Contas a Receber (B2B) R$ 342k" etc.) lidos como
fluxo real; `/showroom` (aba B2B) com pack de `DEV000006` e comprador
"Boutique Multimarcas Jardins" com CNPJ fictício no espelho B2B.

**Correção:** mesmo contrato das Ondas 64/66 — carteira, títulos, sacola e
comprador nascem vazios; sem lojista cadastrado, romaneio e pré-NFe não
são emitidos; sem lojista digitado, o espelho B2B não é emitido; avisos
`commercial-carteira-vazia` e `financial-fluxo-vazio` ("O PLM não é ERP").
Nenhuma asserção antiga relaxada.

**DEPOIS (mesmos cliques):** `/commercial` com o aviso renderizado e sem
lojistas fictícios; `/financial` com o aviso e sem títulos fictícios;
`/showroom` (aba B2B) com inputs de lojista/CNPJ vazios; 0 `pageerror`.
Capturas `/home/user/medicao61-commercial-depois.png`,
`/home/user/medicao61-financial-depois.png` e
`/home/user/medicao61-showroom-depois.png`.

| Camada | 61ª medição (depois)                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 67** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                 |
| Ar     | **Onda 66** — entry novo `index--0psZgO_.js` / `index-DXm9SpcR.js`; marcadores 66=1/1/1, 65=1; `DEV000006` 18 |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                      |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **814/814**                                       |

**Há uma publicação pendente (67).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-AA. 62ª medição — Onda 68 escolhida pelo risco, rolos de demonstração fora do laudo e do saldo

**Re-medição inicial:** repo `221ebd5` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-CLjgwWOV.js` / `index-ycw9M82U.js` (**214 chunks /
3.206.878 bytes**, 0 falhas) com marcadores da 67 = 1/1/1, marcador da 66
= 1, da 65 = 1 e **`DEV000006` 18 → 16** — **publicação da Onda 67 relatada
pelo dono e validada por cliques em produção** (`/commercial` com a
carteira vazia, `/financial` com o fluxo vazio, 0 `pageerror`); banco view
`200 []`, 4 funções `401 42501` (com parâmetros corretos), SQL SHA
`382f0f19…` inalterado.

**Risco medido:** os seeds restantes — os `INITIAL_*` em stores (todos já
`demo: true`: GTM, outsourcing, governança, private-label) e o `SEED_ROLLS`
do painel de rolos de tecido (`FabricRollsShadePanel`, em `/inventory`). O
seed de 4 rolos era estoque de demonstração sem nenhuma declaração — e a
seleção inicial vinha com `rl-1`/`rl-2` marcados, então o laudo de
homogeneidade e o saldo de **52,2 kg** já nasciam calculados sobre a
vitrine; "Vincular Saldo à BOM" gravava esse saldo fictício na ficha salva
(`updateBomItem` com `estoqueDisponivel`). Contrapontos:
`DEFAULT_FACTORY_SECTORS` é configuração (não dado apurado;
`podeEmitirCrp` barra a emissão sem OP); `CollectionROI` já declara a
estimativa e vira `—` sem lote real.

**Correção:** mesmo contrato das coleções `demo: true` (Onda 51) e dos
creators (Onda 59) — o seed marca `demo: true`; a seleção inicial nasce
vazia; o laudo e o saldo só consideram rolos reais (`!r.demo`); a tabela
mostra o aviso `fabric-rolls-demo`. Nenhuma asserção antiga relaxada.

**DEPOIS (mesmos cliques):** `/inventory` com o aviso renderizado, `RL-2601`
ilustrando a tabela, laudo com "Selecione rolos para validar
homogeneidade" e sem o saldo de 52,2 kg da vitrine; 0 `pageerror`. Captura
`/home/user/medicao62-inventory-depois.png`.

| Camada | 62ª medição (depois)                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 68** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                       |
| Ar     | **Onda 67** — entry novo `index-CLjgwWOV.js` / `index-ycw9M82U.js`; marcadores 67=1/1/1, 66=1, 65=1; `DEV000006` 16 |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                            |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **818/818**                                             |

**Há uma publicação pendente (68).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-AB. 63ª medição — Onda 69 escolhida pelo risco, materiais de demonstração fora das métricas, do BOM e do banco

**Re-medição inicial:** repo `d78e4dd` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-B7N3Kx8W.js` / `index-D5RjA1I7.js` (**214 chunks /
3.207.507 bytes**, 0 falhas) com marcadores da 68 = 1/1, da 67 = 1, da 66 =
1 e **`DEV000006` 16** — **publicação da Onda 68 relatada pelo dono e
validada por cliques em produção** (`/inventory` com o aviso
`fabric-rolls-demo`, sem o saldo de 52,2 kg da vitrine, 0 `pageerror`);
banco view `200 []`, 4 funções `401 42501` (com parâmetros corretos), SQL
SHA `382f0f19…` inalterado.

**Risco medido:** os seeds restantes — o `MoodBoard` (imagens/paleta/tecidos
de referência: vitrine criativa, sem número operacional) e o
`materialsSeed` (biblioteca de materiais, módulo 11 do creative-sync). O
seed de 6 materiais era catálogo de demonstração sem nenhuma declaração —
e entrava em número operacional em três lugares: as 4 métricas de
`/materials` ("Materiais 6", "Custo médio R$ 22,97"), o diálogo "Inserir da
Biblioteca" do `BomBopPanel` (inseria custo/fornecedor/SKU fictícios no BOM
de ficha salva) e o `creative-sync` (`listMaterials` sincronizava o seed
inteiro para a tabela `materials` do Supabase).

**Correção:** mesmo contrato das coleções `demo: true` (Onda 51) e dos
creators (Onda 59) — o seed marca `demo: true`; as métricas do catálogo
ignoram `demo` (sem material real, viram `—`); o botão de inserção no BOM
fica desabilitado para demonstração; o engine só sincroniza materiais
operacionais; a biblioteca mostra o aviso `materials-demo`. Nenhuma
asserção antiga relaxada.

**DEPOIS (mesmos cliques):** `/materials` com o aviso renderizado,
`Linho Puro Off-White` ilustrando a biblioteca e as métricas em `—`
("só demonstração na lista"); 0 `pageerror`. Captura
`/home/user/medicao63-materials-depois.png`.

| Camada | 63ª medição (depois)                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 69** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                     |
| Ar     | **Onda 68** — entry novo `index-B7N3Kx8W.js` / `index-D5RjA1I7.js`; marcadores 68=1/1, 67=1, 66=1; `DEV000006` 16 |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                          |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **823/823**                                           |

**Há uma publicação pendente (69).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-AC. 64ª medição — Onda 70 escolhida pelo risco, BI de demonstração fora das métricas e do banco

**Re-medição inicial:** repo `e0d7579` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-BAtJAsw_.js` / `index-fMU01YJV.js` (**214 chunks /
3.208.689 bytes**, 0 falhas) com marcadores da 69 = 1/1, da 68 = 1, da 67 =
1 e **`DEV000006` 16** — **publicação da Onda 69 relatada pelo dono e
validada por cliques em produção** (`/materials` com o aviso
`materials-demo` e métricas em `—`, 0 `pageerror`); banco view `200 []`, 4
funções `401 42501` (com parâmetros corretos), SQL SHA `382f0f19…`
inalterado.

**Risco medido:** os seeds restantes — o `analyticsKpisSeed` (BI Executivo,
módulo 8 do creative-sync) e o dashboard de marketing hardcoded em
`/analytics`. O seed de 3 KPIs era BI de demonstração sem nenhuma
declaração — e entrava em número operacional em três lugares: os cards de
KPI e as 5 métricas literais do topo ("Investimento (real) R$ 84k", "ROI
médio 3.4x", "ROAS 5.8x", "Ruptura 4.2%", "Giro 7.1x"); o dashboard de
marketing com 4 produtos fictícios ("Vestido Floral (Ref. 302)" ROI
5.69x, receita R$ 262.000) e penetração por região ("Sudeste R$ 1.2M"); e
o `creative-sync` (`listAnalyticsKpis` sincronizava o seed inteiro para a
tabela `analytics_kpis` do Supabase).

**Correção:** mesmo contrato das coleções `demo: true` (Onda 51) e dos
creators (Onda 59) — o seed marca `demo: true`; as métricas do topo viram
`—` ("sem campanha salva"); o dashboard de marketing nasce vazio; o engine
só sincroniza KPIs operacionais; a tela mostra o aviso `analytics-demo`.
Nenhuma asserção antiga relaxada.

**DEPOIS (mesmos cliques):** `/analytics` com o aviso renderizado, `2.4M`
ilustrando os cards, métricas em `—` e sem "R$ 84k" nem "Vestido Floral
(Ref. 302)"; 0 `pageerror`. Captura `/home/user/medicao64-analytics-depois.png`.

| Camada | 64ª medição (depois)                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 70** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                     |
| Ar     | **Onda 69** — entry novo `index-BAtJAsw_.js` / `index-fMU01YJV.js`; marcadores 69=1/1, 68=1, 67=1; `DEV000006` 16 |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                          |
| Gates  | `tsc` 0 · `eslint` 0 erros/20 warnings · `prettier` limpo · **828/828**                                           |

**Há uma publicação pendente (70).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 2-AD. 65ª medição — Onda 71 escolhida pelo risco, tabelas de medidas de demonstração fora das métricas, da ficha e do banco

**Re-medição inicial:** repo `74010a1` local = remoto, limpo, token 0/0; ar
com entry **novo** `index-2dv7dmw9.js` / `index-DLRhaQ6f.js` (**214 chunks /
3.208.700 bytes**, 0 falhas) com marcadores da 70 = 1/1, da 69 = 1, da 68 =
1 e **`DEV000006` 16** — **publicação da Onda 70 relatada pelo dono e
validada por cliques em produção** (`/analytics` com o aviso
`analytics-demo`, `2.4M` ilustrando os cards, métricas em `—`, sem "R$ 84k"
nem "Vestido Floral (Ref. 302)", 0 `pageerror`); banco view `200 []`, 4
funções `401 42501` (com parâmetros corretos), SQL SHA `382f0f19…`
inalterado.

**Risco medido:** o `measurementsSeed` (biblioteca de tabelas de medidas) —
3 tabelas fictícias sem nenhuma declaração de demonstração (`TM-BLU-01`
"Blusas Slim Feminino" aprovada com 18 refs, `TM-CAL-02` "Calças
Alfaiataria Feminino" aprovada com 9 refs, `TM-VES-01` "Vestidos Longos
Premium" rascunho). A vitrine entrava em número operacional em quatro
lugares: as métricas de `/measurements` ("Grades 3", "Aprovadas 2",
"Rascunho 1", "Refs vinculadas 32"); o "Aplicar na Ficha" (aplicava
POMs/medidas fictícias numa ficha salva, `setMedidas` + `linkedRefs + 1`);
a importação na ficha técnica (`GradedMeasurementsPanel`); e o
`creative-sync` (`listCharts` sincronizava o seed inteiro para a tabela
`measurement_charts` do Supabase).

**Correção:** mesmo contrato das coleções `demo: true` (Onda 51) e dos
materiais (Onda 69) — o seed marca `demo: true`; as métricas viram `—`
("só demonstração na lista"); "Aplicar na Ficha" e a importação na ficha
ficam desabilitados para demonstração; o engine só sincroniza tabelas
operacionais; a tela mostra o aviso `measurements-demo`. Nenhuma asserção
antiga relaxada.

**DEPOIS (mesmos cliques):** `/measurements` com o aviso renderizado,
`TM-BLU-01` ilustrando a lista, métricas em `—`; 0 `pageerror`. Captura
`/home/user/medicao65-measurements-depois.png`.

| Camada | 65ª medição (depois)                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| Repo   | **Onda 71** — HEAD local = remoto, limpo, token fora do config e dos arquivos                                     |
| Ar     | **Onda 70** — entry novo `index-2dv7dmw9.js` / `index-DLRhaQ6f.js`; marcadores 70=1/1, 69=1, 68=1; `DEV000006` 16 |
| Banco  | view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                                          |
| Gates  | `tsc` 0 · `eslint` 0 erros · `prettier` limpo · **833/833**                                                       |

**Há uma publicação pendente (71).** Nenhuma migration foi escrita nem
aplicada; publicar o app não aplica SQL.

---

## 3. App publicado — qual onda está no ar

Método: baixar `/`, extrair `assets/index-*.js`, seguir os imports em BFS por
todos os chunks e contar **texto de tela** (nunca comentário) em todo o bundle.

- entry medido nas 28ª e 29ª: **`index-CdXaXBJP.js`** (histórico recente:
  `index-CPZSdWEg.js` = Ondas 44/45, `index-CeAMfFot.js` = Onda 46)
- entry medido nas 30ª e 31ª: `index-DPV0JUG6.js` / `index-DnKqdFO4.js`
  (Onda 48) — 224 chunks / 3.175.104 bytes, 6 marcadores da 49 = **0**
- entry medido na 32ª e 33ª: `index--_hvA3Zc.js` / `index-B-j1IXyJ.js`
  (Onda 49) — 224 chunks / 3.176.611 bytes, 8 marcadores da 50 = **0**
- entry medido na 34ª e 35ª: `index-Ctoln0KB.js` / `index-QjNtTEcp.js`
  (Onda 50) — 224 chunks / 3.179.918 bytes, 6 marcadores da 51 = **0**
- entry medido na 36ª e 37ª: `index-BVDv6rFg.js` / `index-VytO5e2k.js`
  (Onda 51) — 224 chunks / 3.181.542 bytes, 7 marcadores da 52 = **0**
- entry medido na 38ª e 39ª: `index-BEBmR4We.js` / `index-BLCmNzL8.js`
  (Onda 52) — 224 chunks / 3.185.303 bytes, 6 marcadores da 53 = **0**
- entry medido na 40ª e 41ª: `index-CFlhwbuy.js` / `index-CZvI_8s1.js`
  (Onda 53) — 224 chunks / 3.187.305 bytes, 6 marcadores da 54 = **0**
- entry medido na 43ª, 44ª e 45ª: `index-CgpxQvgj.js` / `index-CyHoINKY.js`
  (Onda 54) — 223 chunks / 3.188.203 bytes, 5 marcadores da 55 = **0**
- entry medido na 46ª e 47ª: `index-BlLjcjGi.js` / `index-CfT3W1YT.js`
  (Onda 55) — 223 chunks / 3.188.613 bytes, 3 marcadores da 56 = **0**
- entry medido na 48ª e 49ª: `index-C64BHus3.js` / `index-D6lNmNPq.js`
  (Onda 56) — 223 chunks / 3.190.257 bytes, 3 marcadores da 57 = **0**
- entry medido na 50ª e 51ª: `index-D5xUbEBY.js` / `index-jPXI5Gle.js`
  (Onda 57) — 214 chunks / 3.180.877 bytes, 7 marcadores da 58 = **0**
- **entry medido na 52ª: `index-IvTyinWJ.js` / `index-pMXbg9-8.js`
  (Onda 58)** — 214 chunks / **3.183.607 bytes**, 0 falhas; 9 marcadores da
  58 = **1**, marcadores 57 e 47 intactos, entry da 57 zerado
- **entry re-medido na 53ª: o mesmo `index-IvTyinWJ.js` /
  `index-pMXbg9-8.js` (Onda 58)** — 214 chunks / 3.183.607 bytes, 0 falhas;
  **6 marcadores da 59 = 0** e 6 marcadores da 58 = 1. O repo já está na
  Onda 59; **publicação pendente, não defeito**
- **entry re-medido na 54ª: o mesmo `index-IvTyinWJ.js` /
  `index-pMXbg9-8.js` (Onda 58)** — 214 chunks / 3.183.607 bytes, 0 falhas;
  **6 marcadores exclusivos da 60 = 0** e 6 marcadores da 59 = 0. O repo já
  está na Onda 60; **duas publicações pendentes (59 e 60), não defeito**
- `DEV000006` **20×**

| Onda   | Marcador procurado                                                                             | Ocorrências | Leitura          |
| ------ | ---------------------------------------------------------------------------------------------- | ----------- | ---------------- |
| 24     | `Dar baixa do material`                                                                        | 1           | ✅               |
| 25     | `Documento com dados de demonstra`                                                             | 2           | ✅               |
| 27     | `Custeio incompleto`                                                                           | 1           | ✅               |
| 27     | `Composição não informada`                                                                     | 5           | ✅               |
| 28     | `sem NCM`                                                                                      | 5           | ✅               |
| 29     | `pedidosSemFicha`                                                                              | 4           | ✅               |
| 29     | `rfq-sem-ficha`                                                                                | 1           | ✅               |
| 29     | `showroom-sem-ficha`                                                                           | 1           | ✅               |
| 30     | `DRE não apurável`                                                                             | 4           | ✅               |
| 30     | `omnichannel-sem-ficha`                                                                        | 1           | ✅               |
| 30     | `kanban-sem-ficha`                                                                             | 1           | ✅               |
| 31     | `cockpit-sem-ficha`                                                                            | 1           | ✅               |
| 31     | `gemeo-sem-ficha`                                                                              | 1           | ✅               |
| 31     | `os-sem-ficha`                                                                                 | 2           | ✅               |
| 32     | `Passaporte ESG`                                                                               | 2           | ✅               |
| 33     | `país de origem declarado`                                                                     | 1           | ✅               |
| 33     | `composição ABNT declarada`                                                                    | 1           | ✅               |
| 34     | `Risco CAD não declarado`                                                                      | 1           | ✅               |
| 34     | `Plano de corte não apurável`                                                                  | 3           | ✅               |
| 35     | `A referência de origem não tem ficha salva`                                                   | 1           | ✅               |
| 36     | `Fichas sem engenharia`                                                                        | 1           | ✅               |
| 36     | `sem engenharia custeada`                                                                      | 3           | ✅               |
| 37     | `reserva-migracao-pendente`                                                                    | 1           | ✅               |
| 38     | `gtm-so-vitrine` / `sop-sem-drops`                                                             | 1           | ✅               |
| 39     | `sop-sem-pedidos`                                                                              | 1           | ✅               |
| 40     | `sop-sem-faccao` / `apuravelFaccao`                                                            | 1           | ✅               |
| 41     | `lgpd-so-vitrine` / `briefing-so-vitrine`                                                      | 1           | ✅               |
| 42     | `supplier-so-vitrine` / `scoreboard-so-vitrine`                                                | 1           | ✅               |
| 43     | `comece-por-aqui` / `progresso-onboarding`                                                     | 1           | ✅               |
| 44     | `cta-supplier-so-vitrine` / `CtaProximoPasso`                                                  | 1           | ✅               |
| 45     | `glossario-termos` / `Ferramentas do produto`                                                  | 1           | ✅               |
| 46     | `cad-so-vitrine` / `prototipo-so-vitrine`                                                      | 1           | ✅               |
| 46     | `studio-sem-ficha` / `Cadastrar meu molde`                                                     | 1           | ✅               |
| 46     | `toaster group`                                                                                | 1           | ✅               |
| 47     | `ficha-cega-bloqueada`                                                                         | **1**       | ✅               |
| 47     | `glossario-orders` / `glossario-audit` / `glossario-route-engineering` / `glossario-suppliers` | **1**       | ✅               |
| 47     | `novo-pedido-cliente` / `novo-cliente-nome`                                                    | **2**       | ✅               |
| **48** | `media-kit-bloqueado`                                                                          | **0**       | ⏳ não publicado |
| **48** | `colecao-so-vitrine` / `line-sheet-bloqueado`                                                  | **0**       | ⏳ não publicado |
| **48** | `cta-colecao-sem-ficha` / `Coleção em cadastro` / `Editar para emitir`                         | **0**       | ⏳ não publicado |

**Conclusão:** o **ar é a Onda 47** e o **repo é a Onda 48**. O bloqueio da
Ficha Cega, os rótulos e os 4 glossários internos já estão no ar; o que
**ainda não está** é o bloqueio do Media Kit, o `—` nos KPIs de coleção e o
nome declarado no Line Sheet. A frase "Consumo e liberação são automáticos"
deixou de ser falsa em produção desde a 24ª medição. O que ainda **não** foi
provado: o fluxo autenticado de ponta a ponta — sem
`PLM_E2E_EMAIL`/`PLM_E2E_PASSWORD` os dois specs de e2e seguem `skipped`.

---

## 4. Banco de produção — aplicado (24ª medição)

`APLICAR-ONDA-21-24.sql` (473 linhas, 163 asserções exit 0) foi aplicado no SQL
Editor do Lovable. Resultado: **view criada, 6 funções, 2 triggers instalados**,
com `GRANT EXECUTE` apenas a `authenticated`/`service_role`. SHA-256 do arquivo
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`, guardado
por teste.

| Sonda (sem sessão, 52ª medição)            | Resposta     | Interpretação                                |
| ------------------------------------------ | ------------ | -------------------------------------------- |
| `GET /stock_reservation_aging?limit=1`     | **`200 []`** | view existe e é legível; sem reservas presas |
| `POST /rpc/op_reserved_materials`          | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/record_op_material_consumption` | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/cancel_reservations_for_ref`    | `401 42501`  | função existe, `anon` barrado                |
| `POST /rpc/stock_on_hand`                  | `401 42501`  | função existe, `anon` barrado                |

**Não confundir `401` com falha:** com a chave publicável e sem JWT de usuário,
`401 42501` é exatamente o comportamento desejado — RLS/grants funcionando. O
que encerrou foi o `PGRST205`/`PGRST202` de "objeto não encontrado".

> **Assinaturas importam:** sondar as RPCs com `{}` devolve `PGRST202`
> ("função sem parâmetros") **mesmo com a migration aplicada**. A 31ª usou os
> parâmetros reais (`_order_id`; `_ref_type`/`_ref_id`;
> `_item_id`/`_warehouse_id`) e obteve os 4 `401 42501` acima. `PGRST202` com
> `{}` não é regressão.

---

## 5. O que **não** foi medido (e por quê)

- **Volume de dados em produção.** As tabelas respondem `200` com `[]` para a
  chave publishable — esperado com RLS ligada e indistinguível de tabela vazia.
- **Se há login funcionando.** Exige credencial; `e2e-autenticado` segue
  `skipped` na CI.
- ~~Se a Onda 49 funciona em produção~~ **medido na 32ª**: `0/66` campos
  expostos sem nome, 6 `aria-required`, validações e guardas 47/48 preservadas
  **com cliques reais contra `plmuse.lovable.app`**. A prova local da 31ª
  deixou de ser a única evidência.
- ~~As 10 rotas com campos sem rótulo~~ **corrigidas na Onda 49**: **30/66 →
  0/66** campos expostos, medidos com o mesmo critério antes/depois. O 31º
  elemento do levantamento bruto da 29ª era o `BubbleSelect` oculto do Radix
  (`aria-hidden="true"`), que nunca esteve exposto a leitor de tela.
- ~~Se a Onda 50 funciona em produção~~ **medido na 34ª**: 3 emissores
  `disabled`, 0 popups/downloads e KPIs `—` **com cliques reais contra
  `plmuse.lovable.app`**.
- ~~Se a Onda 51 funciona em produção~~ **medido na 36ª**: `Exportar`
  `disabled`, 0 downloads/popups e 0 campos sem nome no diálogo **com cliques
  reais contra `plmuse.lovable.app`**.
- ~~Se a Onda 52 funciona em produção~~ **medido na 38ª**: 15 diálogos
  reabertos em produção, **0 campos sem nome acessível**.
- ~~Se a Onda 53 funciona em produção~~ **medido na 40ª**: avisos/CTA de
  ROI e Meta × Realizado, **0 números de fábrica** e 17 travessões **com
  cliques reais contra `plmuse.lovable.app`**.
- ~~Se a Onda 54 funciona em produção~~ **medido na 43ª**: os 5 CTAs
  navegam/clonam corretamente e **0 avisos sem saída** com cliques reais contra
  `plmuse.lovable.app`. A prova local da 41ª deixou de ser a única evidência.
- ~~Se a Onda 55 funciona em produção~~ **medido na 46ª**: 0 campos sem nome
  nas 4 abas do drawer CAPA e validações preservadas **com cliques reais contra
  `plmuse.lovable.app`**.
- ~~Se a Onda 56 funciona em produção~~ **medido na 48ª**: `h1 = 1` em
  `/digital-twin` sem ficha, aviso/CTAs e Link → `/tech-sheet` **com cliques
  reais contra `plmuse.lovable.app`**.
- ~~Se a Onda 57 funciona em produção~~ **medido na 50ª**: passo 8 do PCP
  com CTA → `/orders`, texto antigo zerado e `Liberar p/ PCP` → toast **com
  cliques reais contra `plmuse.lovable.app`**.
- ~~Se a Onda 58 funciona em produção~~ **medido na 52ª**: entry novo com
  os 9 marcadores da 58 e 7 glossários abrindo com 3–7 termos **com cliques
  reais contra `plmuse.lovable.app`**. O relato "lovable não recebeu o commit"
  não se confirmou (seção 2-Q).
- **Login de usuário real.** Exige credencial; `e2e-autenticado` segue
  `skipped` na CI. Sessão local simulada gera `401/403` e banner "Verifique
  sua conexão": artefato da medição, não bug.

---

## 6. O que destrava cada lacuna

| Lacuna                                          | Ação                                                                                                             | Quem faz        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------- |
| ~~Ar duas ondas atrás do repo~~ **zerado**      | ~~republicar~~ concluído na 23ª medição (`index-CPZSdWEg.js`)                                                    | dono do projeto |
| ~~Banco sem as migrações 21 e 24~~ **aplicado** | ~~colar SQL~~ concluído na 24ª medição: view `200 []`, funções `401 42501`                                       | dono do projeto |
| ~~Ar uma onda atrás (46)~~ **zerado**           | ~~republicar~~ concluído na 26ª medição (`index-CeAMfFot.js`)                                                    | dono do projeto |
| ~~Ar uma onda atrás (47)~~ **zerado**           | ~~republicar~~ concluído na **28ª medição** (`index-CdXaXBJP.js`)                                                | dono do projeto |
| ~~Ar uma onda atrás (48)~~ **zerado**           | ~~publicar~~ concluído na **30ª medição** (`index-DPV0JUG6.js`), sem marco relatado — achado por BFS + cliques   | dono do projeto |
| ~~Ar uma onda atrás (49)~~ **zerado**           | ~~publicar~~ concluído na **32ª medição** (`index--_hvA3Zc.js`), marco relatado e **validado** por BFS + cliques | dono do projeto |
| ~~Ar uma onda atrás (50)~~ **zerado**           | ~~publicar~~ concluído na **34ª medição** (`index-Ctoln0KB.js`), marco relatado e **validado** por BFS + cliques | dono do projeto |
| ~~Ar uma onda atrás (51)~~ **zerado**           | ~~publicar~~ concluído na **36ª medição** (`index-BVDv6rFg.js`), marco relatado e **validado** por BFS + cliques | dono do projeto |
| ~~Ar uma onda atrás (52)~~ **zerado**           | ~~publicar~~ concluído na **38ª medição** (`index-BEBmR4We.js`), marco relatado e **validado** por BFS + cliques | dono do projeto |
| ~~Ar uma onda atrás (53)~~ **zerado**           | ~~publicar~~ concluído na **40ª medição** (`index-CFlhwbuy.js`), marco relatado e **validado** por BFS + cliques | dono do projeto |
| ~~Ar uma onda atrás (54)~~ **zerado**           | ~~publicar~~ concluído na **43ª medição** (`index-CgpxQvgj.js`), sem marco relatado — achado por BFS + cliques   | dono do projeto |
| ~~Ar uma onda atrás (55)~~ **zerado**           | ~~publicar~~ concluído na **46ª medição** (`index-BlLjcjGi.js`), marco relatado e **validado** por BFS + cliques | dono do projeto |
| ~~Ar uma onda atrás (56)~~ **zerado**           | ~~publicar~~ concluído na **48ª medição** (`index-C64BHus3.js`), marco relatado e **validado** por BFS + cliques | dono do projeto |
| ~~Ar uma onda atrás (57)~~ **zerado**           | ~~publicar~~ concluído na **50ª medição** (`index-D5xUbEBY.js`), marco relatado e **validado** por BFS + cliques | dono do projeto |
| ~~Ar uma onda atrás (58)~~ **zerado**           | ~~publicar~~ concluído antes da **52ª medição** (`index-IvTyinWJ.js`); relato de deploy não confirmado           | dono do projeto |
| E2E autenticado nunca roda                      | fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`                                                                    | dono do projeto |
| Cancelar reservas presas                        | só **depois** da migration, usando `stock_reservation_aging.dias_ativa`                                          | dono do projeto |

SQL aplicado e **Ondas 44/45/46/47/48/49/50/51/52/53/54/55/56/57/58
publicadas — repo, ar e banco alinhados na Onda 58**. Não há publicação
pendente. Resta uma ação que não é código: dar a credencial de e2e (e, se
houver, revisar reservas presas com `stock_reservation_aging.dias_ativa`).

---

## 7. Como refazer esta medição

```bash
# 1. repositório
git ls-remote https://github.com/Implantac/plm-use.git main
git ls-tree -r HEAD | wc -l

# 2. ar — BFS pelos chunks do bundle e contagem de marcadores de tela
python3 - <<'PY'
import urllib.request, re, collections
b='https://plmuse.lovable.app'
g=lambda u: urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20).read().decode('utf8','replace')
h=g(b+'/'); q=collections.deque(dict.fromkeys(re.findall(r'assets/([A-Za-z0-9_.-]+\.js)',h))); v=set(); t=''
while q and len(v)<400:
    c=q.popleft()
    if c in v: continue
    v.add(c)
    try: s=g(b+'/assets/'+c)
    except Exception: continue
    t+=s
    for n in re.findall(r'assets/([A-Za-z0-9_.-]+\.js)',s):
        if n not in v: q.append(n)
print('entry:', re.findall(r'assets/(index-[A-Za-z0-9_.-]+\.js)',h)[0], '| chunks:', len(v))
for m in ['ficha-cega-bloqueada','glossario-orders','media-kit-bloqueado','colecao-so-vitrine',
          'line-sheet-bloqueado','cta-colecao-sem-ficha','Coleção em cadastro','DEV000006',
          'Buscar ficha PLM ou referência','Defeito ou problema da CAPA','wave-codigo','lojista-razao']:
    print(f'  {m:30} {t.count(m)}')
PY

# 3. banco — a chave publishable está no bundle; a URL é a do projeto
KEY=sb_publishable_...   # extrair do JS acima (ou de .env)
URL=https://njmniwsqwohmigroswnl.supabase.co
curl -s -H "apikey: $KEY" "$URL/rest/v1/stock_reservation_aging?select=*&limit=1"
curl -s -X POST -H "apikey: $KEY" -H "Content-Type: application/json" \
     -d '{"_order_id":"00000000-0000-0000-0000-000000000000"}' \
     "$URL/rest/v1/rpc/op_reserved_materials"
```

`PGRST205` na view e `PGRST202` nas RPCs = migrações 21/24 fora do ar.
`200 []` na view e `401 42501` nas RPCs = migrações aplicadas e grants corretos.
Marcadores da 48 diferentes de `0` = Onda 48 publicada. Marcadores da 49
diferentes de `0` = Onda 49 publicada (**0 na 31ª, 1 na 32ª**). Marcadores da
50 = `mrp-sem-apuracao`, `cta-mrp-sem-pedido`, `crp-sem-op`,
`cta-crp-sem-op` — **0 na 33ª, presentes na 34ª**. Marcadores da 51 =
`colecoes-so-vitrine`, `cta-colecoes-sem-colecao`, `Só há coleções de
demonstração`, `Cadastrar coleção` — **0 na 35ª, presentes na 36ª**. Marcadores
exclusivos da 52 = `Nome do look`, `Coleção do look`, `Cor do look`, `Tags do
look, separadas por vírgula`, `Ocasião do look`, `Pontos de bordado
(milhares)`, `Número de cores da aplicação` — **0 na 37ª, 1 na 38ª**.
Marcadores da 53 = `roi-sem-lote`, `cta-roi-sem-lote`,
`performance-sem-colecao`, `cta-performance-sem-colecao`, `Estimativa sobre
lotes salvos`, `ticket médio de referência R$ 320` — **0 na 39ª, presentes na
40ª**. Marcadores da 54 = `cta-look-sem-ficha`, `cta-dpp-sem-ficha`,
`cta-producao-sem-op`, `cta-ficha-cega-clonar`, `cta-line-sheet-sem-ficha`,
`producao-sem-op` — **0 na 41ª, 1 na 43ª**. Marcadores exclusivos da 55 =
`Causa-raiz da CAPA`, `Novo porquê da CAPA`, `Eficácia verificada da CAPA`,
`URL da evidência da CAPA`, `Nota da transição da CAPA` — **0 na 45ª**, logo a
Onda 55 publicada na 46ª (`Responsável pela CAPA` = 1 é da Onda 49).
Marcadores exclusivos da 56 = `cta-gemeo-sem-ficha`, `cta-gemeo-abrir-ficha`,
`Simulação What-If` — **0 na 47ª**, logo a Onda 56 ainda não está no ar
(`Tiragem planejada` e o título já existiam no caminho normal; a Onda 56 foi
publicada na 48ª). Marcadores exclusivos da 57 = `cta-lancar-pedido-pcp`,
`Libere o pedido aprovado para o PCP: o lote nasce da OP real`, `Em Pedidos,
libere o pedido aprovado para o PCP (Liberar p/ PCP)` — **0 na 49ª**; o texto
antigo `Cria lote no Kanban do PCP` caiu a **0** na 50ª. Marcadores da 58 =
`glossario-financial`, `glossario-analytics`, `glossario-security`,
`glossario-launch`, `glossario-inventory`, `Lote econômico de compra`,
`Estratégia de ida ao mercado` — **0 na 51ª, 1 na 52ª**. Marcadores exclusivos
da 59 = `influencer-so-vitrine`, `seeding-so-vitrine`,
`dialogo-registrar-creator`, `btn-salvar-creator`, `cta-influencer-registrar`,
`drawer-vitrine-sem-envio` — **0 na 53ª**, logo a Onda 59 ainda não está no ar.
Marcadores exclusivos da 60 = `Fornecedor da cotação`, `Tipo do item BOM`,
`Etapa BOP`, `Nº do callout`, `Referência da peça-mãe`, `Código do ponto` —
**0 na 54ª**, logo a Onda 60 ainda não está no ar. A 54ª é a medição
corrente: **repo na Onda 60, ar na Onda 58 e banco com as migrações 21/24
aplicadas — duas publicações pendentes**.
