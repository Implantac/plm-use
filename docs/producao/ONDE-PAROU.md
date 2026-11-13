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

## 7-A. Ondas 19 a 58 (04–06/11/2026) — o que mudou depois deste documento

> **Atualização de 06/11 (52ª medição): "lovable não recebeu esse commit" —
> revisão por camada NÃO confirmou o relato.** Com o token informado
> (`GET /user` = `200 Implantac`), HEAD local = remoto =
> `fae2a93154919f41bcb42bf73e4f0a53423208b2`, working tree limpo, 781 arquivos
> todos `100644`, CI `quality`/`smoke-publico`/`db-certification` ✅. O ar
> havia avançado para entry **novo** `index-IvTyinWJ.js` / `index-pMXbg9-8.js`
> (214 chunks / 3.183.607 bytes) com os **9 marcadores da Onda 58 = 1** e o
> entry da 57 zerado. Cliques reais em produção: 7 glossários colapsados
> abrindo 3–7 termos (`financial` 6, `analytics` 7, `launch` 7, `inventory` 3
> com `LEC`, `quality` 4, `planner` 5, `collections` 4) e o passo 8 do PCP sem
> regressão. HTML com `no-cache, must-revalidate` e JS `immutable` por hash:
> não há stale por CDN — a percepção é compatível com timing do deploy ou
> aba/cache local do browser. Banco view `200 []` / 4 funções `401 42501` /
> SQL SHA inalterado; gates **754/754**. **Repo, ar e banco alinhados na Onda
> 58**, sem publicação pendente. Não havia código a corrigir: esta atualização
> do GitHub registra a revisão e corrige a sincronia, que ainda dizia "ar na
> Onda 57". Detalhes em `SINCRONIA-2026-11-05.md` § 2-Q.

> **Atualização de 06/11 (50ª e 51ª medições): "projeto publicado pelo
> lovable, continue com as melhorias" — publicação da 57 validada e Onda 58
> escolhida pelo risco.** A **50ª medição** achou entry novo
> `index-D5xUbEBY.js` / `index-jPXI5Gle.js` (214 chunks / 3.180.877 bytes,
> 9 chunks e ~9 KB a menos pela remoção do código morto), 3 marcadores da 57
> = 1 e `Cria lote no Kanban do PCP` = 0; cliques reais confirmaram passo 8
> → CTA → `/orders` e `Liberar p/ PCP` → toast. **Repo, ar e banco alinhados
> na Onda 57.** A varredura de jargão achou 41 rotas com siglas, só 5 com
> glossário; descontado o piso `CAD`/`PCP` da sidebar, **20 rotas com jargão
> real e nenhuma com glossário**, e 6 siglas ausentes do dicionário. **Onda
> 58**: +6 termos (33 → 39, sem duplicatas) e `GlossarioTermos` com `siglas`
> medidas + `testId` em 11 rotas. 20 testes do glossário seguem verdes;
> guardas 47–57 intactas. Browser local: 10/10 `<details>` colapsados abrindo
> 4–7 termos (mais `inventory` para `LEC`), com `/launch` re-medido após
> artefato de HMR. Gates **754/754**, `tsc` 0, `eslint` 0 erros, `prettier`
> limpo. **51ª medição: repo Onda 58, ar Onda 57** (7 marcadores da 58 = 0),
> banco view `200 []` / 4 funções `401 42501` / SQL SHA inalterado. Publicar a
> Onda 58 é a próxima ação do dono. Detalhes em
> `ONDA-58-GLOSSARIO-ONDE-HA-JARGAO.md` e `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (48ª e 49ª medições): "publicado no lovable,
> prossiga com as melhorias" — publicação da 56 validada e Onda 57 escolhida
> pelo risco.** A **48ª medição** achou entry novo `index-C64BHus3.js` /
> `index-D6lNmNPq.js` (223 chunks / 3.190.257 bytes) com os 3 marcadores da
> 56; cliques reais em `/digital-twin` confirmaram **`h1 = 1`** sem ficha,
> aviso/CTAs e Link → `/tech-sheet`. **Repo, ar e banco alinhados na Onda 56.**
> A varredura de emissores/ações inertes descartou 4 falsos positivos (3
> `ExportMenu`, 1 estado compartilhado da própria varredura, botões já
> `disabled`). O risco real era **`criarLote()` órfão**: declarado e
> implementado no store PCP sem nenhum chamador nem teste, enquanto o passo
> "8 · Lançar pedido" prometia "Cria lote no Kanban do PCP" — mas o Kanban lê
> OPs do banco via `usePcpLotes()`/`ordersToLotes`. **Onda 57**: remover o
> código morto, corrigir `detail`/checklist do passo 8 e acrescentar
> `CtaProximoPasso cta-lancar-pedido-pcp` → `/orders`. Os 35 testes do PCP
> seguem verdes; guardas 47–56 intactas. Browser local: passo 8 com CTA →
> `/orders` e `Liberar p/ PCP` → toast `Pedido PD-2026-802 liberado…`. Gates
> **747/747**, `tsc` 0, `eslint` 0 erros, `prettier` limpo. **49ª medição:
> repo Onda 57, ar Onda 56** (3 marcadores exclusivos da 57 = 0), banco view
> `200 []` / 4 funções `401 42501` / SQL SHA inalterado. Publicar a Onda 57 é
> a próxima ação do dono. Detalhes em `ONDA-57-FLUXO-PCP-HONESTO.md` e
> `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (46ª e 47ª medições): "lovable publicado, prossiga" —
> publicação da 55 validada e Onda 56 escolhida pelo risco.** A **46ª medição**
> achou entry novo `index-BlLjcjGi.js` / `index-CfT3W1YT.js` (223 chunks /
> 3.188.613 bytes) com os 5 marcadores da 55; cliques reais em `/quality`
> confirmaram **0 campos sem nome nas 4 abas** do drawer CAPA, 2 `aria-invalid`
> e toast `CAPA aberta`. **Repo, ar e banco alinhados na Onda 55.** Varredura
> de `<h1>` nas 43 rotas: **42 com título, 1 sem — `/digital-twin`**. Correção
> de diagnóstico: não era timeout do crawler (espera fixa, nenhum `pageerror`),
> era o retorno antecipado de vitrine que devolvia só um `<Card>` com `<h2>`.
> **Onda 56**: mesmo `<header>`/`<h1>` do caminho normal, KPIs `—`, Link
> `/tech-sheet` preservado e `CtaProximoPasso`; simulação e guardas 31/47–55
> intactas. Browser local: sem ficha **`h1 = 1`** + 2 CTAs; criar `CR27-101` e
> voltar por SPA → **`h1 = 1`, aviso 0, 7 cards**. Gates **740/740**, `tsc` 0,
> `eslint` 0 erros, `prettier` limpo. **47ª medição: repo Onda 56, ar Onda 55**
> (3 marcadores exclusivos da 56 = 0), banco view `200 []` / 4 funções
> `401 42501` / SQL SHA inalterado. Publicar a Onda 56 é a próxima ação do
> dono. Detalhes em `ONDA-56-DIGITAL-TWIN-TEM-TITULO.md` e
> `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (44ª e 45ª medições): "projeto publicado no lovable,
> prossiga" — marco redundante e Onda 55 escolhida pelo risco.** A **44ª
> medição re-mediu** o relato e **não confirmou cegamente**: o ar segue com o
> mesmo entry `index-CgpxQvgj.js` / `index-CyHoINKY.js` (223 chunks /
> 3.188.203 bytes) e os mesmos 6 marcadores da Onda 54 — a publicação já
> havia sido detectada e validada na 43ª medição, não houve nova publicação.
> A varredura de risco abriu os **drawers** (fora das Ondas 49/52): o
> `CapaDrawer` de `/quality` tinha **11 campos sem nome acessível** em 4 abas
> (Investigação 7/7, Ações 5/5, Evidências 3/3, Timeline 1/1), porque `Field`
> renderiza `<label>` irmão sem `htmlFor`/`id`. **Onda 55**: 11 `aria-label`,
> sem trocar `<div>` por `<label>` wrapper (alguns `Field` contêm botões) e sem
> mexer em estrutura, handlers, validações ou guardas 47–54. Browser local:
> **0 campos sem nome nas 4 abas**, 2 `aria-invalid` preservados, toast `CAPA
aberta`. Gates **733/733**, `tsc` 0, `eslint` 0 erros, `prettier` limpo.
> **45ª medição: repo Onda 55, ar Onda 54** (5 marcadores exclusivos da 55 =
> 0), banco view `200 []` / 4 funções `401 42501` / SQL SHA inalterado.
> Publicar a Onda 55 é a próxima ação do dono. Detalhes em
> `ONDA-55-CAPA-DRAWER-TEM-NOME.md` e `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (43ª medição): "atualize o github" revelou uma
> publicação não relatada da Onda 54.** O token novo validou (`GET /user` =
> `200 Implantac`) e HEAD local/remoto já era `fb46267` — nenhum commit
> pendente. A re-medição por camada, porém, achou o ar em entry novo
> `index-CgpxQvgj.js` / `index-CyHoINKY.js` (223 chunks / 3.188.203 bytes)
> com os 6 marcadores da Onda 54 = 1 e `index-CFlhwbuy.js` = 0. **Cliques
> reais em produção** confirmaram os 5 CTAs (`/references` ×3, `/orders`,
> toast `Pedido clonado como PD-2026-803` com 1 Ficha Cega A4 liberada) e
> **0 rotas com aviso sem saída** em 22 rotas. Banco view `200 []` / 4 funções
> `401 42501` / SQL SHA inalterado; gates **726/726**. **Repo, ar e banco
> alinhados na Onda 54**, sem publicação pendente. Esta atualização do GitHub
> registra a 43ª medição. Detalhes em `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (40ª e 41ª medições): "lovable publicado, prossiga" —
> marco validado e Onda 54 escolhida pelo risco.** A **40ª medição re-mediu**
> o relato: entry novo `index-CFlhwbuy.js` / `index-CZvI_8s1.js` (224 chunks /
> 3.187.305 bytes) com os 6 marcadores da Onda 53; cliques reais em
> `/collections` confirmaram avisos/CTA, **0 números de fábrica** e 17
> travessões. **Repo, ar e banco alinhados na Onda 53.** Correção de
> diagnóstico: `/orders → "Liberar p/ PCP"` já funciona (toast de liberação) e
> o passo 8 do fluxo PCP é stepper de checklist — a limitação da Onda 53 era
> **aviso sem saída clicável**, não fluxo quebrado. Varredura: 21 rotas com
> aviso, 12 sem `CtaProximoPasso`, mas 9 já tinham saída própria (falsos
> positivos descartados) → **5 avisos sem nenhuma ação**. **Onda 54**: 5 CTAs
> (`looks`, `pieces-report`, `production`, `orders`, `collection-map`),
> guardas 47/48 intactas, nenhum documento emitido nem vitrine promovida
> automaticamente. Cliques reais: navegação para `/references` e `/orders`,
> toast `Pedido clonado como PD-2026-803`; varredura final com contexto limpo
> → **0 rotas com aviso sem saída**. Gates **726/726**, `tsc` 0, `eslint` 0
> erros, `prettier` limpo. **41ª medição: repo Onda 54, ar Onda 53** (6
> marcadores da 54 = 0), banco view `200 []` / 4 funções `401 42501` / SQL SHA
> inalterado. Publicar a Onda 54 é a próxima ação do dono. **Push concluído:** o token
> anterior expirou (`401`), o dono forneceu PAT novo (`GET /user` = `200 Implantac`),
> push `1fb232b..8fa6b1d` e `git ls-remote` = `8fa6b1db785e1e87dcad7315f629adedf2932899`
> = HEAD local; token fora do config e dos arquivos versionados. Detalhes em
> `ONDA-54-TODO-AVISO-TEM-PROXIMO-PASSO.md` e `SINCRONIA-2026-11-05.md`.

> **Atualização de 06/11 (38ª e 39ª medições): "lovable publicado, prossiga" —
> marco validado e Onda 53 escolhida pelo risco.** A **38ª medição re-mediu**
> o relato: entry novo `index-BEBmR4We.js` / `index-BLCmNzL8.js` (224 chunks /
> 3.185.303 bytes) com os 7 marcadores exclusivos da Onda 52; reabertura dos
> diálogos em produção → **15 diálogos, 0 campos sem nome acessível**.
> **Repo, ar e banco alinhados na Onda 52.** A varredura de números de fábrica
> nas 44 rotas achou **um** painel ainda apurando vitrine: o ROI de
> `/collections` exibia `R$ 476.800 / 1.490 / 69% / 2,29×` sobre os 4 lotes
> `demo: true` e constantes de referência; "Meta × Realizado" apurava as 3
> coleções de vitrine. **Onda 53**: `lotesOperacionais()` (Onda 40) e
> `colecoesOperacionais()` (Onda 51) aplicados aos dois painéis, `—` + avisos
> `roi-sem-lote` / `performance-sem-colecao` com CTAs, tabelas/barras não
> renderizadas e declaração permanente de estimativa (ticket médio R$ 320).
> Browser local: 0 números de fábrica, 17 travessões; criar coleção libera o
> painel de performance e mantém `roi-sem-lote` (correto, sem lote real).
> Gates **718/718**, `tsc` 0, `eslint` 0 erros, `prettier` limpo. **39ª
> medição: repo Onda 53, ar Onda 52** (6 marcadores da 53 = 0), banco view
> `200 []` / 4 funções `401 42501` / SQL SHA inalterado. Publicar a Onda 53 é
> a próxima ação do dono. Detalhes em
> `ONDA-53-KPI-DE-COLECAO-NAO-NASCE-DA-VITRINE.md` e
> `SINCRONIA-2026-11-05.md`.

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
10. **~~Publicar a Onda 52~~ — concluído (38ª medição), marco relatado e
    validado.** Entry `index-BEBmR4We.js` / `index-BLCmNzL8.js` com os 7
    marcadores exclusivos da 52; 15 diálogos reabertos em produção com **0
    campos sem nome**. **Repo, ar e banco alinhados na Onda 52.**
11. **~~Publicar a Onda 53~~ — concluído (40ª medição), marco relatado e
    validado.** Entry `index-CFlhwbuy.js` / `index-CZvI_8s1.js` com os 6
    marcadores da 53; cliques reais em produção confirmaram avisos/CTA, 0
    números de fábrica e 17 travessões. **Repo, ar e banco alinhados na Onda 53.**
12. **~~Publicar a Onda 54~~ — concluído (43ª medição), sem marco relatado.**
    Publicação **detectada por BFS** (`index-CgpxQvgj.js` /
    `index-CyHoINKY.js`, 6 marcadores da 54 = 1) e validada por cliques reais
    em produção: os 5 CTAs funcionam e 0 avisos sem saída. **Repo, ar e banco
    alinhados na Onda 54.** Aqui foi **só publicar**: o SQL já estava aplicado
    desde a 24ª medição.
13. **~~Publicar a Onda 55~~ — concluído (46ª medição), marco relatado e
    validado.** Entry `index-BlLjcjGi.js` / `index-CfT3W1YT.js` com os 5
    marcadores da 55; cliques reais em produção confirmaram 0 campos sem nome
    nas 4 abas do drawer CAPA e validações preservadas. **Repo, ar e banco
    alinhados na Onda 55.** Aqui foi **só publicar**: o SQL já estava aplicado
    desde a 24ª medição.
14. **~~Publicar a Onda 56~~ — concluído (48ª medição), marco relatado e
    validado.** Entry `index-C64BHus3.js` / `index-D6lNmNPq.js` com os 3
    marcadores da 56; cliques reais em produção confirmaram `h1 = 1` em
    `/digital-twin` sem ficha, aviso/CTAs e Link → `/tech-sheet`. **Repo, ar
    e banco alinhados na Onda 56.** Aqui foi **só publicar**: o SQL já
    estava aplicado desde a 24ª medição.
15. **~~Publicar a Onda 57~~ — concluído (50ª medição), marco relatado e
    validado.** Entry `index-D5xUbEBY.js` / `index-jPXI5Gle.js` com os 3
    marcadores da 57 e `Cria lote no Kanban do PCP` = 0; cliques reais em
    produção confirmaram o passo 8 com CTA → `/orders` e o toast de
    liberação. **Repo, ar e banco alinhados na Onda 57.** Aqui foi **só
    publicar**: o SQL já estava aplicado desde a 24ª medição.
16. **~~Publicar a Onda 58~~ — concluído antes da 52ª medição.** O dono
    relatou que o Lovable não teria recebido o commit; a re-medição achou
    entry `index-IvTyinWJ.js` / `index-pMXbg9-8.js` com os 9 marcadores da
    58 e os glossários funcionando por cliques reais em produção. **Repo, ar
    e banco alinhados na Onda 58.** Relato não confirmado; nenhuma publicação
    pendente. Publicar app **não aplica SQL**.
17. **Publicar a Onda 59 — PENDENTE (53ª medição).** O repo já tem a correção
    de `/influencers` (vitrine não apura ROI/ROAS/CAC/CFOP nem emite Guia de
    Remessa Bonificação A4; promoção explícita por "Registrar creator real";
    0 campos sem nome nos 2 diálogos). O ar segue no entry
    `index-IvTyinWJ.js` / `index-pMXbg9-8.js` (Onda 58), com os **6
    marcadores da 59 = 0**. **Só publicar**: nenhuma migration foi escrita e
    o SQL aplicado desde a 24ª medição permanece com SHA
    `382f0f19…`. Gates **763/763**.
18. **Publicar as Ondas 59 e 60 — FEITO (55ª medição).** O entry avançou sem
    relato para `index-BQ5zgD_R.js` / `index-Bt3hn52q.js` (214 chunks /
    3.198.301 bytes) com os 6 marcadores da 60 = 1 e os 3 da 59 = 1; cliques
    em produção confirmaram (`/influencers` sem guias/linhas,
    `/supplier-portal` diálogo 0/11). Repo, ar e banco alinhados na Onda 60.
19. **Publicar a Onda 61 — FEITO (56ª medição).** O entry avançou para
    `index-BOthbvNE.js` / `index-fT4j6Can.js` (214 chunks / 3.199.677 bytes)
    com os 6 marcadores da 61 = 2 (rótulo + `aria-label`); cliques em
    produção confirmaram (`/references` filtro "Filtrar por status" nomeado,
    0 campos sem nome). Repo, ar e banco alinhados na Onda 61.
20. **Publicar as Ondas 62 e 63 — FEITO (58ª medição).** O entry avançou
    para `index-B0uxa54F.js` / `index-CSDnutoy.js` (214 chunks /
    3.204.004 bytes) com os marcadores das duas ondas; cliques em produção
    confirmaram (`/materials` glossário MOQ/SKU, `/tech-sheet` 9 termos).
    Repo, ar e banco alinhados na Onda 63.
21. **Publicar a Onda 64 — FEITO (59ª medição).** O entry avançou para
    `index-ClheCAuQ.js` / `index-O58aczOi.js` (214 chunks / 3.203.213
    bytes) e `DEV000006` caiu de 20 para 18 no bundle; cliques em produção
    confirmaram (`/marketing` "Cadastrar Drop" sem SKUs nem números
    inventados). Repo, ar e banco alinhados na Onda 64.
22. **Publicar a Onda 65 — FEITO (60ª medição).** O entry avançou para
    `index-CIimYX9w.js` / `index-CkWW-tU5.js` (214 chunks / 3.204.381
    bytes) e o marcador da 65 passou a 1 no bundle; cliques em produção
    confirmaram (`/launch` aba Performance com o aviso do mock de
    sell-through, 0 `pageerror`). Repo, ar e banco alinhados na Onda 65.
23. **Publicar a Onda 66 — FEITO (61ª medição).** O entry avançou para
    `index--0psZgO_.js` / `index-DXm9SpcR.js` (214 chunks / 3.206.452
    bytes) e os marcadores da 66 passaram a 1/1/1 no bundle; cliques em
    produção confirmaram (`/pieces-report` com as 4 métricas em `—`,
    `/development` com filtros em `—`, 0 `pageerror`). Repo, ar e banco
    alinhados na Onda 66.
24. **Publicar a Onda 67 — FEITO (62ª medição).** O entry avançou para
    `index-CLjgwWOV.js` / `index-ycw9M82U.js` (214 chunks / 3.206.878
    bytes) e os marcadores da 67 passaram a 1/1/1 no bundle (`DEV000006`
    18 → 16); cliques em produção confirmaram (`/commercial` com a
    carteira vazia, `/financial` com o fluxo vazio, 0 `pageerror`). Repo,
    ar e banco alinhados na Onda 67.
25. **Publicar a Onda 68 — FEITO (63ª medição).** O entry avançou para
    `index-B7N3Kx8W.js` / `index-D5RjA1I7.js` (214 chunks / 3.207.507
    bytes) e os marcadores da 68 passaram a 1/1 no bundle; cliques em
    produção confirmaram (`/inventory` com o aviso `fabric-rolls-demo`,
    sem o saldo de 52,2 kg da vitrine, 0 `pageerror`). Repo, ar e banco
    alinhados na Onda 68.
26. **Publicar a Onda 69 — FEITO (64ª medição).** O entry avançou para
    `index-BAtJAsw_.js` / `index-fMU01YJV.js` (214 chunks / 3.208.689
    bytes) e os marcadores da 69 passaram a 1/1 no bundle; cliques em
    produção confirmaram (`/materials` com o aviso `materials-demo` e
    métricas em `—`, 0 `pageerror`). Repo, ar e banco alinhados na Onda 69.
27. **Publicar a Onda 70 — FEITO (65ª medição).** O entry avançou para
    `index-2dv7dmw9.js` / `index-DLRhaQ6f.js` (214 chunks / 3.208.700
    bytes) e os marcadores da 70 passaram a 1/1 no bundle; cliques em
    produção confirmaram (`/analytics` com o aviso `analytics-demo`,
    métricas em `—`, sem "R$ 84k" nem "Vestido Floral (Ref. 302)", 0
    `pageerror`). Repo, ar e banco alinhados na Onda 70.
28. **Publicar a Onda 71 — FEITO (66ª medição).** O entry avançou para
    `index-C3d8pptI.js` / `index-u4Iw8psQ.js` (214 chunks / 3.210.018
    bytes) e os marcadores da 71 passaram a 1/1 no bundle; cliques em
    produção confirmaram (`/measurements` com o aviso `measurements-demo`,
    `TM-BLU-01` ilustrando e métricas em `—`, 0 `pageerror`). Repo, ar e
    banco alinhados na Onda 71.
29. **Publicar a Onda 72 — FEITO (67ª medição).** O entry avançou para
    `index-D_UpdGgf.js` / `index-DhLVnsAI.js` (214 chunks / 3.213.008
    bytes) e os marcadores da 72 passaram a 3 avisos + 2 textos no bundle;
    cliques em produção confirmaram (`/colors`, `/prints` e `/display` com
    aviso, métricas em `—` e "Total look —", 0 `pageerror`). Repo, ar e
    banco alinhados na Onda 72.
30. **Publicar a Onda 73 — FEITO (68ª medição).** O entry avançou para
    `index-B3N8wckQ.js` / `index-BOENdFiM.js` (214 chunks / 3.214.460
    bytes) e os marcadores da 73 passaram a 4 avisos no bundle, com os
    valores fictícios (`R$ 540k`, `R$ 1.2M`) em 0; cliques em produção
    confirmaram (`/analytics` com os 3 avisos, `/commercial` com o aviso
    de canais, nenhum valor fictício no DOM, 0 `pageerror`). Repo, ar e
    banco alinhados na Onda 73.
31. **Publicar a Onda 74 — FEITO (69ª medição).** O entry avançou para
    `index-BD66Tt8V.js` / `index-BvWpaUVG.js` (215 chunks / 3.215.513
    bytes) com os marcadores da 74 e o texto antigo "Ecossistema CAD
    Homologado" em 0; cliques em produção confirmaram (`/cad` com o aviso
    e sem "HOMOLOGADO", `/marketing` com 3× "Não conectado", `/inventory`
    com "— · sem insumo cadastrado", 0 `pageerror`). Repo, ar e banco
    alinhados na Onda 74.
32. **Publicar a Onda 75 — FEITO (70ª medição).** O entry avançou para
    `index-CrfM-y0A.js` / `index-Ders0_Vm.js` (215 chunks / 3.215.352
    bytes) com o toast antigo "Registrar: " em 0; cliques em produção
    confirmaram (`/analytics` "Adicionar" → URL `/marketing`,
    `/collections` sem "Visualizar", 0 `pageerror`). Repo, ar e banco
    alinhados na Onda 75.
33. **Publicar a Onda 76 — FEITO (71ª medição).** O entry avançou para
    `index-BM7DVjzB.js` / `index-CcdnHn4d.js` (215 chunks / 3.215.270
    bytes) com o código do feed de atividade; clique em produção confirmou
    (botão de atividade abre o popover, 0 `pageerror`). Repo, ar e banco
    alinhados na Onda 76.
34. **Publicar a Onda 77 — FEITO (72ª medição).** O entry avançou para
    `index-Ch3jaE6q.js` / `index-D_PLqD8X.js` (215 chunks / 3.215.270
    bytes, idênticos — a onda foi só teste/docs); cliques em produção
    confirmaram (`/dashboard`, `/collections`, `/analytics` renderizam,
    0 `pageerror`). Repo, ar e banco alinhados na Onda 77.
35. **Publicar a Onda 78 — FEITO (73ª medição).** O entry avançou para
    `index-BrSbSsMk.js` / `index-Xk9-f91r.js` (215 chunks / 3.215.751
    bytes) com os marcadores da 78; cliques em produção confirmaram
    (`/orders` e `/catalog` com os avisos de permissão, 0 `pageerror`).
    Repo, ar e banco alinhados na Onda 78.
36. **Publicar a Onda 79 — PENDENTE (73ª medição).** O repo já tem o fluxo
    operacional de ponta a ponta verificado e travado como regressão
    (teste do fluxo de criação no store local). O ar segue no entry
    `index-BrSbSsMk.js` / `index-Xk9-f91r.js` (Onda 78) — entry e bytes
    inalterados. **Só publicar**: nenhuma migration foi escrita e o SQL
    aplicado desde a 24ª medição permanece com SHA `382f0f19…`. Gates
    **858/858**.

---

## 8. Como reverificar isto

> Este arquivo nasceu como entregável avulso (04/11/2026) e foi versionado aqui
> para não depender do sandbox. Números das suítes na seção 7-A.

```bash
bash scripts/check-sync.sh                 # repo × app × banco (rotas e tabelas)
cd plm-use && npx vitest run            # 754 testes
DATABASE_URL=postgres://... scripts/certify-db.sh   # 148 asserções SQL
git log --oneline -15                   # onde a história parou
```

Fonte das seções 1–7: código em `main@693ec16`, API REST do projeto
`njmniwsqwohmigroswnl`, bundle de `plmuse.lovable.app` (206 chunks baixados em
04/11 18:00 UTC) e `npm audit`.
Seção 7-A: código das Ondas 47/48/49 em `main` (`48f05c6` é a 47,
`5af3964` a 48) + commits de medição, `docs/producao/ONDA-19..49-*.md` e os
números das suítes (vitest **754/754**, SQL 163/163). 28ª medição: bundle
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
(7 marcadores exclusivos da 52 = 0), banco re-medido e inalterado. **38ª
medição: "lovable publicado" re-medido e validado** — entry `index-BEBmR4We.js`
/ `index-BLCmNzL8.js` (224 chunks / 3.185.303 bytes), 7 marcadores da 52 = 1,
15 diálogos com 0 campos sem nome por cliques reais em produção;
**repo/ar/banco na Onda 52**. **39ª medição: Onda 53 escolhida pelo risco**
(KPIs de ROI/ROAS de coleção nascendo de lotes `demo: true`), gates
**718/718**; ar ainda na Onda 52 (6 marcadores da 53 = 0), banco re-medido e
inalterado. **40ª medição: "lovable publicado" re-medido e validado** — entry
`index-CFlhwbuy.js` / `index-CZvI_8s1.js` (224 chunks / 3.187.305 bytes), 6
marcadores da 53 presentes, avisos/CTA e 0 números de fábrica por cliques
reais em produção; **repo/ar/banco na Onda 53**. **41ª medição: Onda 54
escolhida pelo risco** (5 avisos de vitrine sem saída → 0 após 5 CTAs), gates
**726/726**; ar ainda na Onda 53 (6 marcadores da 54 = 0), banco re-medido e
inalterado. **42ª medição: push confirmado após troca de credencial** — token
anterior `401`, novo PAT `200 Implantac`, push `1fb232b..8fa6b1d` e depois
`8fa6b1d..fb46267`, `git ls-remote` = HEAD local. **43ª medição: publicação
não relatada da Onda 54 detectada por BFS e validada por cliques reais**;
repo, ar e banco alinhados na Onda 54, sem publicação pendente. **44ª
medição: "projeto publicado" re-medido e considerado redundante** (mesmo entry
e marcadores da 43ª). **45ª medição: Onda 55 escolhida pelo risco** (11 campos
do drawer CAPA sem nome → 0 após 11 `aria-label`), gates **733/733**; ar ainda
na Onda 54 (5 marcadores exclusivos da 55 = 0), banco re-medido e inalterado.
Há **uma publicação pendente** (a 55). **46ª medição: "lovable publicado"
re-medido e validado** — entry `index-BlLjcjGi.js` / `index-CfT3W1YT.js`
(223 chunks / 3.188.613 bytes), 5 marcadores da 55 = 1 e 0 campos sem nome nas
4 abas do drawer CAPA por cliques reais em produção; **repo/ar/banco na Onda
55**. **47ª medição: Onda 56 escolhida pelo risco** (única rota sem `<h1>` →
`h1 = 1` com KPIs `—` e 2 CTAs; caminho normal intacto com 7 cards), gates
**740/740**; ar ainda na Onda 55 (3 marcadores exclusivos da 56 = 0), banco
re-medido e inalterado. Há **uma publicação pendente** (a 56). **48ª
medição: "publicado no lovable" re-medido e validado** — entry
`index-C64BHus3.js` / `index-D6lNmNPq.js` (223 chunks / 3.190.257 bytes), 3
marcadores da 56 = 1 e `h1 = 1` em `/digital-twin` por cliques reais em
produção; **repo/ar/banco na Onda 56**. **49ª medição: Onda 57 escolhida pelo
risco** (`criarLote()` órfão removido e passo 8 do fluxo PCP agora honesto e
com CTA real), gates **747/747**; ar ainda na Onda 56 (3 marcadores exclusivos
da 57 = 0), banco re-medido e inalterado. **50ª medição: "projeto publicado"
re-medido e validado** — entry `index-D5xUbEBY.js` / `index-jPXI5Gle.js`
(214 chunks / 3.180.877 bytes), 3 marcadores da 57 = 1 e passo 8 com CTA →
`/orders` por cliques reais em produção; **repo/ar/banco na Onda 57**. **51ª
medição: Onda 58 escolhida pelo risco** (20 rotas com jargão sem glossário →
11 cobertas e 6 novos termos), gates **754/754**; ar ainda na Onda 57 (7
marcadores da 58 = 0), banco re-medido e inalterado. **52ª medição: relato
"lovable não recebeu esse commit" revisado e NÃO confirmado** — HEAD
local/remoto `fae2a93`, CI verde, entry novo `index-IvTyinWJ.js` /
`index-pMXbg9-8.js` com os 9 marcadores da 58 = 1 e 7 glossários validados
por cliques reais em produção; gates **754/754**. **Repo, ar e banco alinhados
na Onda 58, sem publicação pendente.** Medição por camada em
`SINCRONIA-2026-11-05.md`. **53ª medição: Onda 59 escolhida pelo risco e
fechada no repo** — re-medição inicial confirmou repo/ar/banco na Onda 58;
varredura por cliques achou em `/influencers` 5 guias fiscais A4 habilitadas
sobre creators de demonstração (434 vendas, ROI 563%, 5 linhas de
ROAS/CAC/CFOP) e 2 campos sem nome no diálogo oculto. Correção: `demo: true`
nos 5 seeds, `influencersOperacionais()`, `podeEmitirGuiaBonificacao()`,
`—` + avisos/CTAs, diálogo de 11 campos para registrar creator real, filtros
em `CollectionROI`, copiloto e hidratações cloud. Prova por cliques: **5 → 0
guias** na vitrine e, após registrar `Ana Real` + `VT900`, **1 guia A4 com o
creator salvo e sem `Marina Costa`**; 0/2 e 0/11 campos sem nome. Gates
**763/763**; SQL intacto; banco re-medido e inalterado. **Ar ainda na Onda
58 (6 marcadores da 59 = 0): há uma publicação pendente, não um defeito.**
Documento da onda: `ONDA-59-A-VITRINE-NAO-EMITE-GUIA-FISCAL.md`. **54ª
medição: Onda 60 escolhida pelo risco e fechada no repo** — re-medição
inicial confirmou repo na 59, ar na 58 (6 marcadores da 59 = 0) e banco
inalterado; varredura com cliques nas 42 rotas achou **43 campos sem nome
acessível** na carga inicial e **180 na fonte**. Correção: `aria-label`
derivado do rótulo visível (ou da coluna, com índice) em 8 arquivos
(`supplier-portal`, `BomBopPanel`, `GarmentSketchStudio`, `showroom`,
`OutsourcingServiceOrderPanel`, `OrderDetail`, `ReservationDialog`,
`GradedMeasurementsPanel`); fonte **180 → 78** (7 de `materials` são falso
positivo de `<label>` envolvente). Prova por cliques: diálogo "Cadastrar
fornecedor" **0/11** sem nome, showroom **0/2**, 0 `pageerror`. Gates
**770/770**; SQL intacto; banco re-medido e inalterado. **Ar ainda na Onda
58 (6 marcadores exclusivos da 60 = 0): há duas publicações pendentes (59 e
60), não um defeito.** Documento da onda:
`ONDA-60-CAMPOS-TEM-NOME-SEQUENCIA.md`.
