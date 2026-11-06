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

## 7-A. Ondas 19 a 34 (04–05/11/2026) — o que mudou depois deste documento

> **Atualização de 05/11 (10ª medição):** o app publicado **continua na
> Onda 29** (entry `index-1d8-RbIh.js`, 218 chunks; `Poliéster` ainda aparece
> 11 vezes no bundle; marcadores das Ondas 30 a 34 = 0 ocorrências); o
> repositório está na **Onda 34**. Nenhuma das cinco foi publicada. O banco de
> produção **continua sem as migrações das Ondas 21 e 24** (`PGRST205` na
> view, `PGRST202` nas três RPCs). Publicar app não aplica SQL. Medição
> completa: `docs/producao/SINCRONIA-2026-11-05.md`.

| Onda                         | Commit    | O que entregou                                                                                                                                                                                                                                                      | Está no ar?             |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 19 — Verdade dos Dados       | `ccb54e6` | MRP passou a ler `stock_balance` em vez de `seedFor()`; selo de proveniência nos painéis; 139 asserções SQL                                                                                                                                                         | ✅ confirmada no bundle |
| 20 — Ficha confiável         | `29ff4c6` | provenance em `/route-engineering` e `CuttingRoomPlanPanel`; E2E autenticado na CI (dá SKIP sem credencial)                                                                                                                                                         | ❌ não republicado      |
| 22 — Ficha fora da decisão   | `be4456a` | `ensure()` parou de converter demonstração em "ficha salva"; comitê de gate, esteira, looks e copiloto só decidem sobre ficha editada                                                                                                                               | ❌ não republicado      |
| 23 — Documento da ficha real | `9815e0c` | migração do store persistido (v0→v2) faz a correção chegar a quem já usava; as 5 telas que emitem documento deixam de nascer na ficha de demonstração                                                                                                               | ❌ não republicado      |
| 24 — Baixa de material da OP | `85b6820` | PCP registra o consumo dos insumos reservados pela OP (aba Material), com atribuição correta por OP; saída avulsa passa a vincular à OP                                                                                                                             | ❌ não republicado      |
| 25 — EBITDA da home          | `b61c724` | a DRE da coleção declara origem por SKU; home mostra `—` sem ficha salva; DRE impressa sai com tarja quando há SKU de demonstração                                                                                                                                  | ❌ não republicado      |
| 21 — Ciclo da reserva        | `72247cd` | reserva de estoque deixou de ficar `ativa` para sempre: saída consome em FIFO, OP encerrada libera o resto, view de aging                                                                                                                                           | ❌ não republicado      |
| 26 — Tela honesta sem banco  | `3cf30d0` | a UI deixa de prometer automação que o banco não tem: 3 estados na aba Material (migração pendente / erro real / vazio), sonda em cache por sessão; pacote `APLICAR-ONDA-21-24.sql`                                                                                 |
| 27 — Documento só com ficha  | `16361dd` | DPP, romaneio, pré-NFe, remessa, OS cega e media kit recusam ficha não salva; NCM default eliminado; `DocumentoNaoEmitivelError`                                                                                                                                    |
| 28 — Preço e NCM reais       | `bdfa024` | line sheet do look para de inventar preço (null + kit só se completo); NCM perde o default em 5 pontos; NCM vira veto no gate de catálogo                                                                                                                           |
| 29 — Demo fora da operação   | `23b01a3` | RFQ, MRP, showroom e display deixam de usar ficha de demonstração; suíte deixa de ser instável (flake do OrderDetail resolvido) — **no ar**                                                                                                                         |
| 30 — Fechando o gerador      | `5564956` | DRE para de somar os 4 SKUs do modelo; esteira para de fabricar ficha ao arrastar; gate omnichannel não exporta CSV/A4 sem ficha; 4 emissores restantes passam a usar só fichas salvas; guarda de regressão nos fontes                                              | ❌ não republicado      |
| 31 — Cockpit fora do modelo  | `5f41a95` | `/tech-sheet` deixa de nascer em `DEV000006`; `ensure()` sai do seletor do Zustand; 5 saídas (PDFs, Ordem de Corte, CSV MRP, publicação) exigem ficha salva; gêmeo digital, estúdio e GTM param de plantar refs; OS sem ficha fora das métricas                     | ❌ não republicado      |
| 32 — Resolvedor honesto      | `d08fccb` | `resolveReferenceTechSheet` deixa de fabricar 3 fichas com NCM/composição/BOM próprias: `ResolvedRef.doc` vira `null`; 8 consumidores ajustados; expedição barra `doc` nulo antes de ler NCM                                                                        | ❌ não republicado      |
| 33 — Nota ESG real           | `354fd27` | `dppRequirements` leva o veto de NCM/origem/composição/encaixe para dentro do DPP; sem `?? default*()`, sem "Feito no Brasil"; PDF e expedição exigem 8 dígitos; pendências objetivas na home e no painel                                                           | ❌ não republicado      |
| 34 — Molde não é engenharia  | `HEAD`    | `seedFor()` nasce sem composição, NCM, origem e risco CAD; moldes renomeados para `empty*Spec()`; plano de corte ganha `apuravel` e barra a A4; morrem os defaults numéricos escondidos (1,8 m / 5,35 m / 155 g); gate de estágio declara ausência; 14 testes novos | ❌ não republicado      |

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

### Duas pendências que só o dono resolve

1. **Aplicar a migration no Supabase hospedado** (`supabase db push`). Enquanto
   isso não acontece, o defeito continua ativo nos dados reais — e as reservas
   antigas já presas não são limpas sozinhas: use `stock_reservation_aging`
   (ordene por `dias_ativa`) para cancelar o que já foi consumido na prática.
2. **Republicar o app no Lovable na Onda 34.** O bundle em
   `plmuse.lovable.app` é o da **Onda 29** (10ª medição); as Ondas 20–29 já
   estão no ar, faltam a 30, a 31, a 32, a 33 e a 34. Isto é publicar —
   **não** aplica o SQL do item 1.

---

## 8. Como reverificar isto

> Este arquivo nasceu como entregável avulso (04/11/2026) e foi versionado aqui
> para não depender do sandbox. Números das suítes na seção 7-A.

```bash
bash scripts/check-sync.sh                 # repo × app × banco (rotas e tabelas)
cd plm-use && npx vitest run            # 495 testes
DATABASE_URL=postgres://... scripts/certify-db.sh   # 148 asserções SQL
git log --oneline -15                   # onde a história parou
```

Fonte das seções 1–7: código em `main@693ec16`, API REST do projeto
`njmniwsqwohmigroswnl`, bundle de `plmuse.lovable.app` (206 chunks baixados em
04/11 18:00 UTC) e `npm audit`.
Seção 7-A: `main@HEAD` (Onda 34; hash em `git log -1`),
`docs/producao/ONDA-19..34-*.md` e os números das suítes rodadas em 05/11
(vitest **495/495**, SQL 163/163, bundle relido com **218 chunks**: marcadores
das Ondas 24–29 presentes, marcadores das Ondas 30 a 34 com 0 ocorrências —
logo o ar é a Onda 29). Medição por camada em `SINCRONIA-2026-11-05.md`.
