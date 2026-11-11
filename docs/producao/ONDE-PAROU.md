# Onde parou — plano concluído × pendente

**Data da auditoria:** 04/11/2026 18:20 UTC
**Repositório:** `Implantac/plm-use` — `main` = `693ec16`
**App publicado:** `https://plmuse.lovable.app` — **mesmo ponto do `main`**
(confirmado por marcadores de cada onda e paridade de rotas: 42 × 42, zero divergência)

---

## 1. Onde exatamente parou

|               |                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Último commit | **Onda 18**, 04/11/2026 **11:44** — _MRP I líquido, Torre S&OP automática, Seeding ROI CFOP 5910/6910_ |
| Ritmo         | **78 commits em 14 dias** (22/10 → 04/11), **266 arquivos** alterados                                  |
| Concentração  | Ondas 7 a 18 entregues em **~12 horas** (03/11 12:08 → 04/11 11:44)                                    |
| Código        | 44 telas, 42 rotas de navegação, **341 testes** vitest verdes                                          |
| Banco         | **78 tabelas** no repositório · **74 em produção**                                                     |

O projeto parou **no meio da Onda 18** apenas no sentido de que nenhuma onda 19
foi aberta. A Onda 18 está completa, publicada e com testes.

---

## 2. Plano A — FPEF: Ondas 0 a 5 (`.lovable/docs/00-fpef/AUDIT-2026-07.md`)

| Onda | Escopo previsto                                       | Status                             | Evidência                                                                                                                                                                                                                                        |
| ---- | ----------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0    | Auditoria (matriz rota → entidade → etapa)            | ✅ **concluída**                   | `AUDIT-2026-07.md`, 39 rotas mapeadas                                                                                                                                                                                                            |
| 1    | `ModuleTabs` por processo                             | ✅ **concluída por outro caminho** | Sidebar reorganizada em 9 grupos (`NAV_GROUPS`: geral, criação, coleção, engenharia, PCP, supply, GTM, insights, admin). O `ModuleTabs` só tem 3 grupos (collections, ai, admin) — a ideia de "abas por processo" foi resolvida na barra lateral |
| 2    | **Gate de Industrialização**                          | ✅ **concluída**                   | Rota `/approvals` + tabela `reference_gate` + hook `use-reference-gates`. Status `pendente/aprovado/reprovado/dispensado` com evento por trigger                                                                                                 |
| 3    | **Central de Necessidades**                           | 🟡 **parcial**                     | Não existe rota própria. O conceito virou painéis dentro de `/inventory`: `AbcCoveragePanel`, `ReservationsPanel`, `MrpNetExplosionPanel`, `FabricRollsShadePanel`                                                                               |
| 4    | Digital thread completa (backfill `entity_relations`) | 🟡 **parcial**                     | `entity_relations` + `use-entity-relations` + `LocalHistoryButton` existem; **o backfill não foi verificado nem documentado**                                                                                                                    |
| 5    | QA de regressão (39 rotas)                            | 🟡 **parcial**                     | **6 specs Playwright** existem (`tests/e2e/*.spec.py`), mas cobrem só acessibilidade de `field-message` — **nenhuma rota de negócio**. O job `e2e-staging` roda `skipped` (sem staging)                                                          |

---

## 3. Plano B — Venda → Estoque (`docs/producao/PLANO-VENDA-ESTOQUE.md`, 22/10)

Recomendação registrada no doc: **"C começando por A"** — reserva na liberação, depois MRP líquido.

| Fase  | Escopo                                     | Status                                 | Evidência                                                                                                                                                                                                                                                                     |
| ----- | ------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | Reserva de material na liberação do pedido | ✅ **concluída e em produção**         | `drizzle/migrations/0014_sales_release_reserves_stock.sql`: colunas `production_order_items.sales_order_item_id` e `sales_order_item_materials.stock_item_id` + criação de `stock_reservation` na RPC de release. Confirmei as colunas respondendo **200** na API de produção |
| **B** | MRP líquido / necessidade de compra        | 🟡 **entregue como UI, sem base real** | A Onda 18 criou `src/lib/inventory/mrp-explosion.ts` (215 linhas, com testes) e o painel `MrpNetExplosionPanel`. Mas a lib importa `seedFor` do `techsheet/store` — **calcula sobre dado semeado, não sobre `stock_balance`**                                                 |

> **Este é o ponto mais delicado do momento.** O painel se chama "MRP I Explosão
> Líquida de Materiais" e apresenta números com aparência de operação real, mas
> não há aviso de demonstração na tela nem leitura do estoque verdadeiro. A Fase A
> criou a reserva; a Fase B ainda não consome essa reserva como dado real.

---

## 4. Plano C — Multitenant + CAD + fila ERP (30/10)

`docs/producao/2026-10-30_PLM-FLUIDO-MULTITENANT.md` — declarado **opcional e 100% retrocompatível**.

| Item                                  | Status              | Evidência                                                                                      |
| ------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------- |
| SQL escrito, idempotente, documentado | ✅                  | `2026-10-30_PLM-FLUIDO-MULTITENANT.sql`                                                        |
| Aplicado em produção                  | ❌ **não**          | `tenants`, `tenant_memberships`, `cad_markers`, `erp_sync_outbox` → **404**                    |
| Front opera sem ele                   | ✅ degradação limpa | `src/lib/cad/store.ts` persiste local e faz upsert "oportunístico", tolerando a tabela ausente |

Consequência prática: **CAD não sincroniza entre máquinas** (só local) e a **fila
de exportação para o UseCloud ERP não existe** — o recurso está desenhado, não ligado.

---

## 5. Plano D — Ondas 6 a 18 (executadas desde 22/10)

| Onda   | Data      | Entrega                                                                           |
| ------ | --------- | --------------------------------------------------------------------------------- |
| —      | 22/10     | Reserva na liberação (Fase A), KARILU-BASE/ROTAS/SEED, elos pedido ↔ OP ↔ estoque |
| 5      | 30/10     | Balanceamento de célula, make-or-buy facção, Pantone TCX, AQL 2.5                 |
| —      | 30/10     | MRP líquido + ordem de corte A4, rastreabilidade "onde-usado", consumo real CAD   |
| 7      | 03/11     | Gêmeo digital What-If, análise química de estampas, ponte com Aplicações          |
| 8      | 03/11     | Coordenados IA com custeio de kit B2B, displayagem, Line Sheet A4                 |
| 9      | 03/11     | Sourcing RFQ TCO na BOM, vínculo POM bidirecional, vitrine Showroom B2B           |
| 10     | 03/11     | Cronoanálise GSD/Yamazumi, DRE Gerencial Têxtil, OTB no Financeiro                |
| 11     | 03/11     | Sala de Corte & Enfesto, rastreabilidade de rolos (ΔE CMC), Stage-Gate            |
| 12     | 03/11     | Passaporte Digital DPP + QR, Packing List B2B, Pré-XML NFe 4.00, Torre Executiva  |
| 13     | 03/11     | Facções, Lavanderia, Kardex CFOP 5901/5902/5124, OS Cega A4, ABVTEX               |
| 14     | 03/11     | Pesquisa Criativa → Engenharia em 1 clique, MoodBoard lightbox, Hub GTM           |
| 15/16  | 03/11     | Fila private label, lista nominal, ficha cega A4, matriz RBAC/LGPD                |
| 17     | 03/11     | CRP finito, Gate Omnichannel GTIN, Copiloto 4 agentes                             |
| **18** | **04/11** | **MRP I líquido, Torre S&OP automática, Seeding ROI CFOP**                        |

Padrão das ondas: **lógica pura em `src/lib/` + painel de UI + testes unitários**.
33 libs novas e 16 arquivos de teste em 4 dias. É entrega real — o que varia é a
**fonte do dado**, e é aí que está a dívida.

---

## 6. O que falta — em ordem de risco

### 🔴 1. Painéis executivos com dado semeado, sem aviso

| Painel                         | Lib                                  | Fonte hoje                     |
| ------------------------------ | ------------------------------------ | ------------------------------ |
| MRP I líquido                  | `inventory/mrp-explosion.ts`         | `seedFor()` do techsheet store |
| Torre S&OP                     | `analytics/live-sop.ts`              | derivado em memória            |
| DRE Gerencial                  | `techsheet/cfo-dre.ts`               | seed                           |
| Passaporte Digital / Linesheet | `dpps-expedition.ts`, `linesheet.ts` | seed                           |
| Seeding ROI                    | `influencers/seeding-attribution.ts` | seed                           |

**Risco de negócio:** alguém decide compra ou preço olhando um número que não veio
do banco. Precedente ruim: foi exatamente esse tipo de tela que gerou a confusão
de "não encontro a emissão de pedido".

### 🟠 2. Quatro tabelas ausentes em produção

Multitenant + CAD + fila ERP. Bloqueia CAD multiusuário e integração ERP.

### 🟠 3. E2E não cobre o negócio

Existem 6 specs Playwright (em Python, `tests/e2e/`), mas todos sobre
acessibilidade de `field-message` — nenhum toca pedido, custo ou PCP. O
`e2e-staging` fica `skipped` porque não há ambiente de staging. A garantia real
hoje é vitest (lógica pura) + 6 testes SQL do fluxo + o smoke público novo.

### 🟡 4. Dependências com vulnerabilidade

`npm audit`: **19** (1 crítica, 4 altas, 14 moderadas). A crítica é `dompurify`
(transitiva, não importada diretamente em `src`) — exposição baixa, mas fora de dia.

### 🟡 5. Domínio próprio fora do ar

`usemoda.ai` e `www.usemoda.ai` → **`https://moda.dev`** (outro produto, "Moda —
production monitoring for AI agents"). O PLM só responde em `plmuse.lovable.app`.

### 🟡 6. Telas sem persistência

`/production/today` usa `pcp/store` **em memória** (zustand sem persist): perde
tudo ao recarregar. `/research` e `/security` são estáticas.

### ⚪ 7. Onda 3 do FPEF e backfill da Onda 4

Central de Necessidades: existe como painéis, não como tela. Digital thread:
backfill em `entity_relations` não foi feito nem documentado.

---

## 7. Próxima onda sugerida — "Onda 19: Verdade dos Dados"

Nesta ordem, porque cada passo destrava o seguinte:

1. **Badge "demonstração" nos 6 painéis com seed** (1 dia). Não é maquiagem: separa
   o que é decisão do que é vitrine. Alternativa melhor — trocar `seedFor()` por
   `stock_balance` no MRP, que já tem a reserva da Fase A disponível.
2. **Aplicar `2026-10-30_PLM-FLUIDO-MULTITENANT.sql`** (30 min, idempotente, já
   documentado como retrocompatível) → fecha as 4 tabelas e liga CAD + fila ERP.
3. **E2E de fumaça nas 6 rotas do fluxo** (login → catálogo → pedido → custo →
   PCP → ficha). Playwright já está no projeto e a CI tem o job pronto.
4. **`npm audit fix` + atualizar `dompurify`/`undici`** com o suite verde.
5. **Reapontar `usemoda.ai`** no Lovable → Publicar → Domínios.

---

## 7-A. Ondas 19 a 52 (04–06/11/2026) — o que mudou depois deste documento

> **Atualização de 06/11 (36ª e 37ª medições): "publicado, prossiga" — marco
> validado e Onda 52 escolhida pelo risco.** A **36ª medição re-mediu** o
> relato: entry novo `index-BVDv6rFg.js` / `index-VytO5e2k.js` (224 chunks /
> 3.181.542 bytes) com os marcadores da Onda 51; cliques reais em produção
> confirmaram `Exportar disabled`, 0 downloads/popups e 0 campos sem nome no
> diálogo de `/collections`. **Repo, ar e banco alinhados na Onda 51.** A
> varredura de risco seguinte **abriu os diálogos** das 44 rotas com clique
> real (a Onda 49 medira só campos da carga inicial): **19 diálogos em 13
> rotas com 107 campos sem nome acessível**. **Onda 52**: 114 `aria-label` em
> 14 arquivos, derivados do rótulo visível, 6 textos reescritos à mão e
> `SelectTrigger` "Ocasião do look"; nenhum handler, validação, store ou
> guarda anterior alterado. Re-medido com o mesmo script: **19 diálogos, 0
> campos sem nome, 0 rotas com problema**. Gates **710/710**, `tsc` 0,
> `eslint` 0 erros, `prettier` limpo. **37ª medição: repo Onda 52, ar Onda
> 51** (7 marcadores exclusivos da 52 = 0), banco view `200 []` / 4 funções
> `401 42501` / SQL SHA inalterado. Publicar a Onda 52 é a próxima ação do
> dono. Detalhes em `ONDA-52-DIALOGOS-TEM-NOME.md` e
> `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (34ª e 35ª medições): "publicado, prossiga" — marco
> validado e Onda 51 escolhida pelo risco.** A **34ª medição não confirmou
> cegamente** o relato: BFS achou entry novo `index-Ctoln0KB.js` /
> `index-QjNtTEcp.js` (224 chunks / 3.179.918 bytes) com os marcadores da
> Onda 50, e cliques reais em produção mediram os 3 emissores `disabled`, 0
> popups/downloads e KPIs `—`. **Repo, ar e banco alinhados na Onda 50.**
> Em seguida, a varredura de risco achou `/collections`: `Exportar` é um
> `ExportMenu` (não botão morto — correção de diagnóstico) e seus itens
> "Baixar CSV" / "Imprimir / PDF" emitiam **3 coleções de fábrica** (`Verão 25
>
> - Amalfi`, `Urban Resort`, `Essentials Atemporal`) sem aviso no arquivo.
**Onda 51**: `demo: true`no seed,`upsertCollection()`promove para`demo: false`, `colecoesOperacionais()`/`podeExportarColecoes()`, CSV/PDF
só com coleções salvas, 4 KPIs `—`, aviso `colecoes-so-vitrine`+ CTA, e os
**7 campos do diálogo "Nova coleção" rotulados** (7/7 → 0/7). Browser
local: com só vitrine 0 downloads/popups; criar`Outono 27 - Onda 51`→
CSV com 1 linha e PDF`1 REGISTROS`, sem as 3 de fábrica. `filterCollections`,
`ExportMenu`e`creative-sync`intactos. Gates **702/702**,`tsc`0,`eslint`0 erros,`prettier`limpo. **35ª medição: repo Onda 51, ar Onda
50** (6 marcadores da 51 = 0), banco view`200 []`/ 4 funções`401 42501`/
SQL SHA inalterado. Publicar a Onda 51 é a próxima ação do dono. Detalhes em`ONDA-51-A-VITRINE-NAO-ENTRA-NO-CSV-NEM-NO-PDF.md`e`SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (33ª medição): `ok prossiga` → Onda 50 escolhida
> pelo risco, fechada no repo.** Com repo/ar/banco alinhados na Onda 49, a
> varredura de 44 rotas + cliques reais em 16 emissores em produção mostraram
> que `/ai-agents` e `/analytics` já emitiam A4 protegidos, mas **`/inventory`
> baixava CSV só com cabeçalho e emitia "Requisição MRP A4" com `R$ 0,00`, e
> `/planner` emitia "Mapa CRP A4" com 4 setores `0 min` / `0%`** — ausência
> de carteira apurada como zero, sem aviso nem CTA. **Onda 50**:
> `podeEmitirMrp()` / `podeEmitirCrp()`, gates nos 3 handlers, botões
> `disabled` com `title`, KPIs `—`, avisos `mrp-sem-apuracao` / `crp-sem-op`
> com CTA, tabelas vazias não renderizadas; formatadores puros preservados.
> Browser local: sem carteira, **0 popups / 0 downloads mesmo com clique
> forçado**; promoção real por cliques (briefing → `CR27-101`, clonar pedido →
> `PD-2026-803`, "Nova Ref." → `DEV000006`) liberou CSV com 3 insumos, A4 MRP
> com 8 linhas e A4 CRP com 11/92/38/21 min e fila EDD `PD-2026-803`.
> Gates **694/694**, `tsc` 0, `eslint` 0 erros, `prettier` limpo. **33ª
> medição: repo Onda 50, ar Onda 49** (mesmo entry, 8 marcadores da 50 = 0),
> banco view `200 []` / 4 funções `401 42501` / SQL SHA inalterado. Publicar a
> Onda 50 é a próxima ação do dono. Detalhes em
> `ONDA-50-ZERO-APURADO-NAO-VIRA-DOCUMENTO.md` e
> `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (32ª medição): "publicado pelo lovable" validado —
> repo, ar e banco alinhados na Onda 49.** O dono relatou o marco; a medição
> **não confirmou cegamente**. BFS achou entry **novo** `index--_hvA3Zc.js` /
> `index-B-j1IXyJ.js`, 224 chunks / 3.176.611 bytes (0 falhas), com os
> marcadores da Onda 49 de **0 → 1** (`wave-codigo`, `lojista-razao`,
> `custo-fixo-colecao`, `novo-rolo-codigo` = 2; `aria-required` = 13), os 6
> marcadores da 48 ainda = 1 e `DEV000006` 20. **Cliques reais em produção**:
> **0/66 campos expostos sem nome** nas 12 rotas, `aria-required` 4 em
> `/launch` + 2 em `/quality`, `/launch` com 4 `aria-invalid` e `Informe o
código da wave.`, `/quality` com 2 `aria-invalid`, preenchimento por rótulo
> em `/financial`, `/showroom`, `/inventory`, `/ai-agents`, `/research`,
> `/display`, `/references` e `/looks`. Regressão: `/marketing` 3 bloqueios /
> 0 botões / 0 popups no aviso, `/collection-map` 0 botões CSV / **0
> apuráveis** / 0 downloads, `/orders` 2 bloqueios / 0 botões Ficha Cega A4.
> Banco re-medido: view `200 []`, 4 funções `401 42501`, SQL SHA inalterado.
> Gates re-medidos: `tsc` 0, `eslint` 0 erros/20 warnings, `prettier` limpo,
> **686/686**. **Não há publicação pendente**; resta a credencial de e2e.
> Capturas `/home/user/medicao32-*.png` e detalhe em
> `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (30ª e 31ª medições): publicação não relatada
> detectada, Onda 49 fechada no repo.** O dono disse apenas `ok prossiga` e
> **não anunciou publicação**; a re-medição por camada achou o ar em
> **`index-DPV0JUG6.js` / `index-DnKqdFO4.js`** com os **6 marcadores da Onda
> 48 = 1**. Cliques reais em produção confirmaram: `/marketing` 3 bloqueios,
> 0 botões, 0 popups no aviso, editar → 1 popup de Media Kit;
> `/collection-map` 0 botões CSV/A4, **0 apuráveis**, aviso sem popup nem
> download; `/orders` sem regressão. **Repo, ar e banco alinhados na Onda 48.** Escolha da onda seguinte por risco: os **5 emissores** cujo clique
> falhara na 29ª estão **`disabled` (protegidos)** e não restou nenhum
> desprotegido; o risco medido passou a ser **campos sem nome acessível**.
> **Onda 49**: 31 marcadores em 11 arquivos (14 pares `id`/`htmlFor`, 16
> `aria-label` + 1 `SelectTrigger`, 6 `aria-required`), com correção
> metodológica — o 31º elemento bruto era o `BubbleSelect` oculto do Radix.
> Medido ANTES (produção) e DEPOIS (local) com o mesmo critério:
> **30/66 → 0/66**; validações `waveErrors`/`capaErrors` preservadas. Gates
> **686/686**, `tsc` 0, `eslint` 0 erros, `prettier` limpo. **31ª medição:
> repo Onda 49, ar Onda 48** (6 marcadores da 49 = 0), banco com view `200 []`
> e 4 funções `401 42501`. Publicar a Onda 49 é a próxima ação do dono.
> Detalhes em `ONDA-49-TODO-CAMPO-TEM-NOME.md` e
> `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (28ª e 29ª medições): publicação validada, Onda 48
> fechada no repo.** O dono reportou "tudo publicado" e a **28ª medição
> confirmou**: entry `index-CdXaXBJP.js` (227 chunks), marcadores da Onda 47
> = 1, `DEV000006` 20×, e cliques reais em produção (0 popups na vitrine, 1
> ficha após clonar, 0 inputs sem rótulo, 4 glossários abrindo). Repo, ar e
> banco alinhados na Onda 47. Em seguida, varredura de **44 rotas** e teste de
> **16 emissores de documento** acharam o risco seguinte: `/marketing` ainda
> imprimia Media Kit A4 de campanha `demo: true` (R$ 42.000 de mídia, R$
> 218.400 de receita, 38.400 cliques) e `/collection-map` apurava/imprimia 6
> modelos, 2.985 peças e R$ 1.233.665 do mock de fábrica. **Onda 48**: gate
> `podeEmitirMediaKit()` nos dois caminhos (botão e "Visualizar"),
> `linhasApuraveis()` + `podeEmitirLineSheet()` para KPIs/CSV/A4, KPIs `—`
> com aviso/CTA, e nome da coleção declarado pelo usuário no documento.
> Promoção real medida: converter briefing em ficha `CR27-101` → **1
> apurável**, A4 e CSV só com ela. Gates **681/681**. **29ª medição: repo
> Onda 48, ar ainda Onda 47** (6 marcadores da 48 = 0), banco inalterado.
> Publicar a Onda 48 é a próxima ação do dono. Detalhes em
> `ONDA-48-A-VITRINE-NAO-IMPORTA-NEM-IMPRIME.md` e `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (27ª medição): Onda 47 fechada no repo, ainda não
> publicada.** Escolhida por risco: os 2 pedidos `demo: true` da fila de custos
> exibiam badge "Demonstração" mas **emitiam Ficha Cega A4** com CNPJ/grade de
> um cliente que não existe. Entraram `podeEmitirFichaCega()`, aviso com saída
> `ficha-cega-bloqueada` e gate antes de imprimir; clonar/editar continua
> promovendo (Onda 39). No mesmo fluxo: `/orders` foi de **15 inputs sem rótulo
> para 0**, os 2 diálogos ganharam `id`/`htmlFor`/`aria-required`, e o glossário
> da Onda 45 saiu do dashboard para `/orders`, `/audit`,
> `/route-engineering` e `/suppliers` (33 termos). Browser com cliques reais:
> **0 popups ao clicar na vitrine**, **1 popup** com a ficha após clonar, toasts
> de validação preservados, glossários colapsados que abrem com 1 clique.
> Gates **673/673**. 27ª medição: **repo Onda 47**, **ar ainda Onda 46**
> (`index-CeAMfFot.js`, 8 marcadores da 47 = 0), **banco inalterado**
> (view `200 []`, 4 funções `401 42501`). Publicar é a próxima ação do dono.
> Detalhes em `ONDA-47-DOCUMENTO-NAO-NASCE-DA-VITRINE.md` e
> `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (26ª medição):** o dono reportou
> **"publicado"** e a medição **confirmou de duas formas**. (1) Bundle: saiu
> `index-CPZSdWEg.js` e entrou **`index-CeAMfFot.js`** (223 chunks), com
> `cad-so-vitrine`, `prototipo-so-vitrine`, `studio-sem-ficha`,
> `cta-cad-sem-molde`, `cta-prototipo-sem-piloto`, `"Cadastrar meu molde"` e
> `"toaster group"` = **1**, `"Demonstração · não apurado"` = **2**.
> **`DEV000006` caiu de 27× para 20×** — os 7 literais executáveis saíram;
> os 20 restantes são a vitrine declarada nos stores. (2) Browser com cliques
> reais **contra `plmuse.lovable.app`**: `/cad` e `/prototypes` com KPIs `—`,
> avisos + CTAs, 2 syncs bloqueados, formulário zerado e **toast de validação
> aparecendo**; `/ai-center` com `studio-sem-ficha`, 1 opção e botão
> desabilitado. **Repo, ar e banco alinhados na Onda 46.** Banco re-medido:
> view `200 []`, 4 funções `401 42501`. Resta apenas a credencial de e2e.
> Medição em `SINCRONIA-2026-11-05.md`; adendo em
> `ONDA-46-A-VITRINE-NAO-APURA-O-NUMERO.md`.

| Onda                                     | Commit    | O que entregou                                                                                                                                                                                                                                                                                                                                           | Está no ar?                       |
| ---------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 19 — Verdade dos Dados                   | `ccb54e6` | MRP passou a ler `stock_balance` em vez de `seedFor()`; selo de proveniência nos painéis; 139 asserções SQL                                                                                                                                                                                                                                              | ✅ confirmada no bundle           |
| 20 — Ficha confiável                     | `29ff4c6` | provenance em `/route-engineering` e `CuttingRoomPlanPanel`; E2E autenticado na CI (dá SKIP sem credencial)                                                                                                                                                                                                                                              | ❌ não republicado                |
| 22 — Ficha fora da decisão               | `be4456a` | `ensure()` parou de converter demonstração em "ficha salva"; comitê de gate, esteira, looks e copiloto só decidem sobre ficha editada                                                                                                                                                                                                                    | ❌ não republicado                |
| 23 — Documento da ficha real             | `9815e0c` | migração do store persistido (v0→v2) faz a correção chegar a quem já usava; as 5 telas que emitem documento deixam de nascer na ficha de demonstração                                                                                                                                                                                                    | ❌ não republicado                |
| 24 — Baixa de material da OP             | `85b6820` | PCP registra o consumo dos insumos reservados pela OP (aba Material), com atribuição correta por OP; saída avulsa passa a vincular à OP                                                                                                                                                                                                                  | ❌ não republicado                |
| 25 — EBITDA da home                      | `b61c724` | a DRE da coleção declara origem por SKU; home mostra `—` sem ficha salva; DRE impressa sai com tarja quando há SKU de demonstração                                                                                                                                                                                                                       | ❌ não republicado                |
| 21 — Ciclo da reserva                    | `72247cd` | reserva de estoque deixou de ficar `ativa` para sempre: saída consome em FIFO, OP encerrada libera o resto, view de aging                                                                                                                                                                                                                                | ❌ não republicado                |
| 26 — Tela honesta sem banco              | `3cf30d0` | a UI deixa de prometer automação que o banco não tem: 3 estados na aba Material (migração pendente / erro real / vazio), sonda em cache por sessão; pacote `APLICAR-ONDA-21-24.sql`                                                                                                                                                                      |
| 27 — Documento só com ficha              | `16361dd` | DPP, romaneio, pré-NFe, remessa, OS cega e media kit recusam ficha não salva; NCM default eliminado; `DocumentoNaoEmitivelError`                                                                                                                                                                                                                         |
| 28 — Preço e NCM reais                   | `bdfa024` | line sheet do look para de inventar preço (null + kit só se completo); NCM perde o default em 5 pontos; NCM vira veto no gate de catálogo                                                                                                                                                                                                                |
| 29 — Demo fora da operação               | `23b01a3` | RFQ, MRP, showroom e display deixam de usar ficha de demonstração; suíte deixa de ser instável (flake do OrderDetail resolvido) — **no ar**                                                                                                                                                                                                              |
| 30 — Fechando o gerador                  | `5564956` | DRE para de somar os 4 SKUs do modelo; esteira para de fabricar ficha ao arrastar; gate omnichannel não exporta CSV/A4 sem ficha; 4 emissores restantes passam a usar só fichas salvas; guarda de regressão nos fontes                                                                                                                                   | ❌ não republicado                |
| 31 — Cockpit fora do modelo              | `5f41a95` | `/tech-sheet` deixa de nascer em `DEV000006`; `ensure()` sai do seletor do Zustand; 5 saídas (PDFs, Ordem de Corte, CSV MRP, publicação) exigem ficha salva; gêmeo digital, estúdio e GTM param de plantar refs; OS sem ficha fora das métricas                                                                                                          | ❌ não republicado                |
| 32 — Resolvedor honesto                  | `d08fccb` | `resolveReferenceTechSheet` deixa de fabricar 3 fichas com NCM/composição/BOM próprias: `ResolvedRef.doc` vira `null`; 8 consumidores ajustados; expedição barra `doc` nulo antes de ler NCM                                                                                                                                                             | ❌ não republicado                |
| 33 — Nota ESG real                       | `354fd27` | `dppRequirements` leva o veto de NCM/origem/composição/encaixe para dentro do DPP; sem `?? default*()`, sem "Feito no Brasil"; PDF e expedição exigem 8 dígitos; pendências objetivas na home e no painel                                                                                                                                                | ❌ não republicado                |
| 34 — Molde não é engenharia              | `c06e3f3` | `seedFor()` nasce sem composição, NCM, origem e risco CAD; moldes renomeados para `empty*Spec()`; plano de corte ganha `apuravel` e barra a A4; morrem os defaults numéricos escondidos (1,8 m / 5,35 m / 155 g); gate de estágio declara ausência; 14 testes novos                                                                                      | ❌ não republicado                |
| 35 — Criar ficha é criar                 | `c145545` | Medição executada: o briefing 1-clique virava ficha salva com BOM, BOP, colorways e custos do modelo. Entram `blankFor()` e `criarFicha()`; os 20 updaters deixam de cair no seed; `ensure()` sai de rotas e dos 6 painéis; MRP e UseCloud não emprestam variantes. 16 testes novos                                                                      | ❌ não republicado                |
| 36 — DRE não apura o vazio               | `1694e3d` | Medição com overhead padrão: ficha vazia gerava EBITDA -R$ 85.000, 50 peças inventadas e A4 sem aviso. Entram `pendenciasEngenhariaDre` e `origem.semEngenharia`; só BOM custeada, preço e tiragem declarados entram na soma; morrem o piso de 50 e o fallback de 600. 11 testes novos                                                                   | ❌ não republicado                |
| 37 — UI não promete o banco              | `6d3000e` | Medição do bundle publicado: `ReservationsPanel` importava `useStockLifecycle` desde a Onda 26 mas nunca lia `ciclo`. Agora três estados (verificando / pendente / ativa), aviso âmbar nomeando `APLICAR-ONDA-21-24.sql`, e a promessa de automação só no ramo ativo. 4 testes novos                                                                     | ❌ não republicado                |
| 38 — Vitrine fora do número              | `903727c` | Medição: copiloto respondia "2 fichas ativas · SAM médio 13.5 min/peça" com `seedFor` e as 3 campanhas de fábrica injetavam R$ 218.400 no ROAS/S&OP. `demo?: boolean` + `campanhasOperacionais`, resumo filtra internamente, copiloto declara `—`, AI Agents sem `seedFor`, Marketing e Live S&OP com `—` e selo. 12 testes novos                        | ❌ não republicado                |
| 39 — Pedido de papel não é carteira      | `7526080` | Medição: 2 pedidos de fábrica (CNPJ 14.890.300/0001-22) geravam R$ 9.867,20 de carteira B2B, 112 peças e "preço mínimo R$ 90,62". `demo?: boolean` + `pedidosOperacionais`, 5 updaters promovem a vitrine a carteira, filtros em S&OP/MRP/copiloto/capacidade, A4 e KPIs com `—`, selo na Fila de Custos. 12 testes novos                                | ❌ não republicado                |
| 40 — Chão de fábrica não é vitrine       | `3b33065` | Medição: 3 OS de fábrica geravam 656 peças "em voo" no Book S&OP A4 e 4 lotes PCP viravam "4 lotes monitorados" no copiloto. `demo?: boolean` em OS e Lote, `servicosOperacionais`/`lotesOperacionais`, 3 updaters promovem a vitrine, `apuravelFaccao`, A4 e KPIs com `—`. 12 testes novos                                                              | ❌ não republicado                |
| 41 — Trilha LGPD sem ficção              | `334d672` | Medição: `buildLgpdAuditCsv` e o A4 de governança exportavam 4 eventos fabricados (Helena Prado, PD-2026-802, bases legais LGPD); 4 briefings geravam "Aderência Comercial 92%". `demo?: boolean` + `eventosAuditaveis`/`briefingsOperacionais`, CSV só com cabeçalho, A4 com aviso, KPIs `—`, botões bloqueados, selos, edição promove. 12 testes novos | ❌ não republicado                |
| 42 — Fornecedor de papel não homologa    | `7b11535` | Medição: 4 parceiros com CNPJ/certificação ABVTEX/scores inventados geravam ranking 93/A+ > 92/A+ > 90/A+ > 88/A, "4 homologados", OTIF 90% e podiam assinar XML NF-e/Guia A4. `demo?: boolean`, `parceirosOperacionais`, `apuravel`, KPIs e scoreboard com `—`, bloqueio de XML/A4, edição promove. 12 testes novos                                     | ❌ não republicado                |
| 43 — Revisão de UX ponta a ponta         | `ee97e4f` | Teste real no browser (17 rotas, 4 tarefas): sidebar 4→19 links, Ficha Técnica 2→1 clique, `aria-required` 0→2, fluxo de 6 etapas colapsado. `ComecePorAqui` com 4 passos e progresso derivado de `operationalCodes`/`pedidosOperacionais`/`parceirosOperacionais`/`campanhasOperacionais`. 24 testes novos                                              | ❌ não republicado                |
| 44 — Todo aviso tem uma saída            | `030ca6c` | Medição: 9 avisos de vitrine, 0 com botão. `CtaProximoPasso` + `usePasso` derivados do onboarding: 4 CTAs abrem diálogo/modal local, 5 navegam. Passo concluído → CTA desaparece. 9 `data-testid` antigos preservados. Validação no browser: 9/9 com saída, clique abre "Homologar Novo Fornecedor" e navega para `/orders`. 14 testes novos             | ✅ confirmada no bundle           |
| 45 — Primeira dobra em linguagem simples | `65df431` | 35 rotas medidas no DOM: 15 siglas na 1ª dobra. Glossário com 24 termos (`dl/dt/dd`, colapsado), 17 na 1ª dobra; título "Ferramentas do produto"; `title` nos 5 links técnicos; `h1` em `/tech-sheet`; fim da promessa "XML SEFAZ prontos" sem ficha. 18 testes novos                                                                                    | ✅ confirmada no bundle           |
| 46 — Vitrine não apura número            | `2ef69b5` | Browser mediu KPIs de `/cad` (2 moldes/86,4%) e `/prototypes` (23 evidências) vindos de fábrica. `demo` + filtros operacionais, `—` com aviso/CTA, sync e lacre bloqueados, promoção explícita, estúdio sem default e `<Toaster />` montado. 19 testes, 661/661                                                                                          | ✅ confirmada no bundle           |
| 47 — Documento não nasce da vitrine      | `48f05c6` | Medição: 2 pedidos `demo: true` com badge, mas "Ficha Cega A4" ativa e `buildBlindOrderProductionSheetHtml()` sem guarda. Gate de emissão + aviso com saída; `/orders` 15→**0** inputs sem rótulo, 10 `id`/`htmlFor`, `aria-required`, `autoComplete`; glossário 24→**33** termos em 4 telas internas. 12 testes, **673/673**                            | ✅ confirmada no bundle (28ª)     |
| 48 — Vitrine não imprime em Coleção/GTM  | `5af3964` | Varredura de 44 rotas + 16 emissores: Media Kit A4 de campanha `demo` com R$ 218.400 inventados e Line Sheet/CSV/KPIs de coleção de fábrica (6 modelos/2.985 peças/R$ 1.233.665). Gates de emissão, `linhasApuraveis`, KPIs `—` + CTA, nome da coleção declarado. 8 testes, **681/681**                                                                  | ❌ não republicado (ação do dono) |

### Onda 21 — o defeito que valia mais que qualquer feature

`release_sales_order_to_pcp` criava reserva `'ativa'` e **nada** a encerrava —
só o clique manual em `/inventory`. Como `stock_balance` subtrai as reservas
ativas, o disponível caía a cada liberação e nunca voltava; pior, a saída física
do material descontava o mesmo item **duas vezes**.

Prova no caminho real da RPC (`scripts/prova-ciclo-reserva.sql`), estoque físico
de 100 m e pedido de 20 m:

| Momento           | ANTES                      | DEPOIS            |
| ----------------- | -------------------------- | ----------------- |
| Depois de liberar | disponível 80              | disponível 80     |
| PCP consumiu 20 m | disponível **60** (errado) | disponível **80** |
| OP concluída      | **60** para sempre         | **80**            |

Corrigido por `supabase/migrations/20261104120000_stock_reservation_lifecycle.sql`

- teste `supabase/tests/60_reserva_lifecycle.sql` (9 asserções). Suíte SQL: 148
  asserções, exit 0. Vitest 349/349.

### Pendências que só o dono resolve

1. **~~Aplicar a migration no Supabase hospedado~~ — concluído (24ª medição).**
   `APLICAR-ONDA-21-24.sql` aplicado no SQL Editor do Lovable: view `200 []`,
   funções `401 42501`, triggers instalados. A automação de reservas deixou de
   ser promessa falsa.
2. **~~Republicar as Ondas 44 e 45~~ — concluído (23ª medição).**
   `index-CPZSdWEg.js` (223 chunks). Atenção histórica: publicar app não
   aplicou SQL — o banco só foi alinhado depois, pela ação do item 1.
3. **~~Publicar a Onda 46~~ — concluído (26ª medição).** `index-CeAMfFot.js`
   com todos os marcadores, confirmado também por cliques reais em produção.
   Aqui foi **só publicar**: o SQL já estava aplicado desde a 24ª medição.
4. **~~Publicar a Onda 47~~ — concluído (28ª medição).** Entry
   `index-CdXaXBJP.js` (227 chunks) com todos os marcadores, confirmado por
   cliques reais em produção. Aqui foi **só publicar**: o SQL já estava
   aplicado desde a 24ª medição.
5. **~~Publicar a Onda 48~~ — concluído (30ª medição), sem marco relatado.**
   Entry `index-DPV0JUG6.js` / `index-DnKqdFO4.js` com os 6 marcadores da 48,
   confirmado por cliques reais em produção. A publicação foi **detectada por
   BFS**, não confirmada cegamente a partir de um aviso do dono. Aqui foi
   **só publicar**: o SQL já estava aplicado desde a 24ª medição.
6. **~~Publicar a Onda 49~~ — concluído (32ª medição), marco relatado e
   validado.** Entry `index--_hvA3Zc.js` / `index-B-j1IXyJ.js` com os 10
   marcadores da 49, confirmado por BFS e por **cliques reais em produção**
   (0/66 campos sem nome, 6 `aria-required`, validações e guardas 47/48
   preservadas). Aqui foi **só publicar**: o SQL já estava aplicado desde a
   24ª medição, e o banco foi re-medido (view `200 []`, 4 funções
   `401 42501`). **Repo, ar e banco alinhados na Onda 49.**
7. **Fornecer `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`.** Sem a credencial os dois
   specs de e2e seguem `skipped` e não há prova de fluxo autenticado contra
   produção (baixa de material, cancelamento de reservas, sync CAD → ficha).
8. **~~Publicar a Onda 50~~ — concluído (34ª medição), marco relatado e
   validado.** Entry `index-Ctoln0KB.js` / `index-QjNtTEcp.js` com os
   marcadores da 50; cliques reais em produção confirmaram os 3 botões
   `disabled` e 0 popups/downloads. **Repo, ar e banco alinhados na Onda 50.**
9. **~~Publicar a Onda 51~~ — concluído (36ª medição), marco relatado e
   validado.** Entry `index-BVDv6rFg.js` / `index-VytO5e2k.js` com os
   marcadores da 51; cliques reais em produção confirmaram `Exportar`
   `disabled`, 0 downloads/popups e 0 campos sem nome no diálogo. **Repo, ar e
   banco alinhados na Onda 51.**
10. **Publicar a Onda 52.** O ar segue em `index-BVDv6rFg.js` (Onda 51). A 38ª
    medição deve achar `Nome do look`, `Coleção do look`, `Cor do look`, `Tags
do look, separadas por vírgula`, `Ocasião do look`, `Pontos de bordado
(milhares)` e `Número de cores da aplicação` no bundle, e reabrir os
    diálogos em produção medindo 0 campos sem nome. Publicar app **não aplica
    SQL**.

---

## 8. Como reverificar isto

> Este arquivo nasceu como entregável avulso (04/11/2026) e foi versionado aqui
> para não depender do sandbox. Números das suítes na seção 7-A.

```bash
bash scripts/check-sync.sh                 # repo × app × banco (rotas e tabelas)
cd plm-use && npx vitest run            # 710 testes
DATABASE_URL=postgres://... scripts/certify-db.sh   # 148 asserções SQL
git log --oneline -15                   # onde a história parou
```

Fonte das seções 1–7: código em `main@693ec16`, API REST do projeto
`njmniwsqwohmigroswnl`, bundle de `plmuse.lovable.app` (206 chunks baixados em
04/11 18:00 UTC) e `npm audit`.
Seção 7-A: código das Ondas 47/48/49 em `main` (`48f05c6` é a 47,
`5af3964` a 48) + commits de medição, `docs/producao/ONDA-19..49-*.md` e os
números das suítes (vitest **710/710**, SQL 163/163). 28ª medição: bundle
`index-CdXaXBJP.js` com 227 chunks e todos os marcadores da Onda 47 —
repo/ar/banco alinhados. 29ª medição: os 6 marcadores da 48 = 0 (ar na 47).
**30ª medição: publicação não relatada da Onda 48 detectada por BFS**
(`index-DPV0JUG6.js` / `index-DnKqdFO4.js`) e validada por cliques reais em
produção. **31ª medição: repo Onda 49, ar Onda 48** (224 chunks / 3.175.104
bytes no BFS estrito, 6 marcadores da 49 = 0); `DEV000006` **20**; banco com
as migrações 21/24 aplicadas desde a 24ª medição, view `200 []` e 4 funções
`401 42501`. **32ª medição: o dono relatou "publicado pelo lovable" e a
medição validou** — entry `index--_hvA3Zc.js` / `index-B-j1IXyJ.js`
(224 chunks / 3.176.611 bytes), marcadores da 49 = 1, `0/66` campos sem nome
medidos **no ar** por cliques reais, guardas 47/48 intactas; gates
**686/686**. **33ª medição: Onda 50 fechada no repo por escolha de risco**
(`R$ 0,00` / `0%` apurados de carteira vazia em `/inventory` e `/planner`),
gates **694/694**; ar ainda na Onda 49 (8 marcadores da 50 = 0), banco
re-medido e inalterado. **34ª medição: "publicado" re-medido e validado** —
entry `index-Ctoln0KB.js` / `index-QjNtTEcp.js` (224 chunks / 3.179.918
bytes), marcadores da 50 presentes, 3 emissores `disabled` e 0
popups/downloads por cliques reais em produção; **repo/ar/banco na Onda 50**.
**35ª medição: Onda 51 escolhida pelo risco** (CSV/PDF de coleções de fábrica
em `/collections`), gates **702/702**; ar ainda na Onda 50 (6 marcadores da 51
= 0), banco re-medido e inalterado. **36ª medição: "publicado" re-medido e
validado** — entry `index-BVDv6rFg.js` / `index-VytO5e2k.js` (224 chunks /
3.181.542 bytes), marcadores da 51 presentes, `Exportar disabled` e 0 campos
sem nome no diálogo por cliques reais em produção; **repo/ar/banco na Onda
51**. **37ª medição: Onda 52 escolhida pelo risco** (107 campos sem nome em 19
diálogos → 0 após 114 `aria-label`), gates **710/710**; ar ainda na Onda 51
(7 marcadores exclusivos da 52 = 0), banco re-medido e inalterado. Há **uma
publicação pendente** (a 52). Medição por camada em
`SINCRONIA-2026-11-05.md`.
