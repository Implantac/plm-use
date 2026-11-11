# Sincronia repo × ar × banco — 45ª medição, 06/11/2026

Este documento é uma **medição**, não um plano. Cada linha foi obtida executando
o comando indicado no fim. Se algo divergir do que você vê na tela, refaça a
medição antes de discordar — e lembre que **publicar o app não aplica SQL** e
que **um marco relatado pelo dono precisa ser medido antes de virar fato**.

---

## 1. O quadro (45ª medição, após fechar a Onda 55)

| Camada                                         | Estado medido                       | Como foi medido                     |
| ---------------------------------------------- | ----------------------------------- | ----------------------------------- |
| **Repositório** (`Implantac/plm-use`, `main`)  | **Onda 55** — código + docs 44ª/45ª | `git log` / `git ls-remote`         |
| **App publicado** (`plmuse.lovable.app`)       | **Onda 54** — `index-CgpxQvgj.js`   | BFS (seção 2-M)                     |
| **Banco de produção** (`njmniwsqwohmigroswnl`) | **migrações 21 e 24 APLICADAS**     | `200` na view · `42501` nas funções |

O dono relatou **"projeto publicado no lovable"**. A **44ª medição** re-mediu e
**não confirmou cegamente**: o ar segue com o **mesmo** entry
`index-CgpxQvgj.js` / `index-CyHoINKY.js`, 223 chunks / 3.188.203 bytes e os
mesmos 6 marcadores da Onda 54 — a publicação já havia sido detectada e
validada na 43ª medição. Não houve nova publicação.

Com `prossiga`, a varredura de risco abriu os **drawers** (fora do alcance das
Ondas 49 e 52) e achou o `CapaDrawer` de `/quality` com **11 campos sem nome
acessível** em 4 abas. **Onda 55**: 11 `aria-label`, sem alterar estrutura,
handlers, validações ou guardas anteriores. Re-medido com cliques: **0 campos
sem nome nas 4 abas**.

O ar **não mudou**: **5 marcadores exclusivos da Onda 55 = 0** (`Responsável
pela CAPA` = 1 é pré-existente da Onda 49). Repo e ar desalinhados em **uma
onda, por publicação pendente** — não por defeito de código. O banco não
precisava avançar: **publicar o app não aplica SQL**. Gates: `tsc` 0, `eslint`
0 erros / 20 warnings, `prettier` limpo, **733/733**.

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
- **entry medido na 43ª, 44ª e 45ª: `index-CgpxQvgj.js` /
  `index-CyHoINKY.js` (Onda 54)** — 223 chunks / **3.188.203 bytes**, 0
  falhas; 6 marcadores da 54 = **1** (`producao-sem-op` = 2), marcadores 53 e
  48/49/50/51/52 intactos; **5 marcadores exclusivos da 55 = 0** na 45ª
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

| Sonda (sem sessão, 45ª medição)            | Resposta     | Interpretação                                |
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
- **Se a Onda 55 funciona em produção.** Ainda não foi publicada: os 5
  marcadores exclusivos da 55 são **0** no bundle. A prova com cliques reais da
  45ª foi **local** (`127.0.0.1:8080`, papel `admin` simulado); não é
  evidência de comportamento do domínio publicado.
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
| **Ar uma onda atrás do repo (55)**              | **publicar a Onda 55** e refazer BFS + cliques em produção (46ª medição)                                         | dono do projeto |
| E2E autenticado nunca roda                      | fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`                                                                    | dono do projeto |
| Cancelar reservas presas                        | só **depois** da migration, usando `stock_reservation_aging.dias_ativa`                                          | dono do projeto |

SQL aplicado, Ondas 44/45/46/47/48/49/50/51/52/53/54 publicadas e **Onda 55
fechada no repo**. Há **uma publicação pendente** (a 55). Restam duas ações que
não são código: publicar a Onda 55 e dar a credencial de e2e (e, se houver,
revisar reservas presas com `stock_reservation_aging.dias_ativa`).

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
Onda 55 ainda não está no ar (`Responsável pela CAPA` = 1 é da Onda 49). A 45ª
é a medição corrente: repo na Onda 55, ar na Onda 54, banco aplicado.
