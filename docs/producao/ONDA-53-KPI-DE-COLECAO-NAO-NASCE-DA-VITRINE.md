# Onda 53 — KPI de coleção não nasce da vitrine (38ª e 39ª medições, 06/11/2026)

> **`lovable publicado, prossiga` = dois comandos.** Re-medir o marco (nunca
> confirmar cegamente) e escolher a onda seguinte pelo risco, sem perguntar.
> Este documento é uma **medição**, não um plano.

---

## 1. 38ª medição — a Onda 52 foi publicada e validada por cliques

BFS: entry **novo** `index-BEBmR4We.js` / `index-BLCmNzL8.js`, **224 chunks /
3.185.303 bytes**, 0 falhas; `index-BVDv6rFg.js` = 0. Os **7 marcadores
exclusivos da Onda 52 = 1** (`Nome do look`, `Coleção do look`, `Cor do look`,
`Tags do look…`, `Ocasião do look`, `Pontos de bordado (milhares)`, `Número de
cores da aplicação`); marcadores 51 e 48/49 intactos, `DEV000006` 20.

**Cliques reais em produção:** reabertura dos diálogos de criação das 44 rotas
→ **15 diálogos, 0 campos expostos sem nome acessível** (a Onda 52 medira 19 no
browser local; nesta passagem o crawler encontrou 15 botões, todos corretos).
Banco: view `200 []`, 4 funções `401 42501`, SQL SHA `382f0f19…` inalterado.
**Repo, ar e banco alinhados na Onda 52.**

---

## 2. Como a Onda 53 foi escolhida

Varredura de **números de fábrica** no texto visível das 44 rotas em produção:
`/cad`, `/dashboard`, `/financial`, `/marketing`, `/orders`, `/prototypes`,
`/suppliers` e `/tech-sheet` só trazem `DEV000006` (vitrine **declarada**, com
avisos/CTAs nas rotas que apuram). O **único** painel com KPIs substantivos de
fábrica era `/collections`:

| Coleção         | Refs | Produzidas | Receita    | Investimento | Lucro      | ROI  | ROAS  |
| --------------- | ---- | ---------- | ---------- | ------------ | ---------- | ---- | ----- |
| Alto Verão 2026 | 8    | 1.490      | R$ 476.800 | R$ 208.000   | R$ 143.640 | 69%  | 2,29× |
| Pré-Verão 2026  | 1    | 120        | R$ 38.400  | R$ 94.800    | -R$ 66.480 | -70% | 0,41× |

O aviso `colecoes-so-vitrine` da Onda 51 fica no **topo da rota**; a tabela de
ROI e o painel "Meta × Realizado" não tinham nenhuma marcação, nenhum `—` e
nenhum aviso colado — os números apareciam como apuração operacional.

**Origem medida no código:**

- `CollectionROI` lia `usePCPStore((s) => s.lotes)` **direto**. Os 4 lotes do
  seed são `demo: true` e a Onda 40 já tinha criado `lotesOperacionais()` —
  o seletor existia, o painel não o usava. Além disso, `ticketMedio = 320`,
  `custoIndustrial = 84/peça` e `INVEST_BASE` (`185000` / `92000`) são
  constantes de fábrica.
- `CollectionPerformance` recebia `collections={collections}` da rota, ou seja,
  as 3 coleções de vitrine — a Onda 51 já tinha criado
  `colecoesOperacionais()`, mas só para o CSV/PDF e os KPIs do cabeçalho.

---

## 3. O que foi entregue

**`src/components/collections/CollectionROI.tsx`**

- `lotesOperacionais(lotesTodos)` antes de apurar; `apuravel = rows.length > 0`.
- Sem lote salvo: **tabela não renderizada**, aviso `roi-sem-lote` + CTA
  `cta-roi-sem-lote`, e os 3 `KpiTile` (Receita total / Investido / Lucro
  acumulado) em `—`.
- Declaração permanente no cabeçalho: _"Estimativa sobre lotes salvos: receita
  a ticket médio de referência R$ 320, custo industrial R$ 84/peça e
  investimento de marketing de referência. Não é dado de BI nem apuração
  fiscal."_ — mesmo com lotes reais, o número continua sendo estimativa
  declarada, não apuração fiscal.

**`src/components/collections/CollectionPerformance.tsx`**

- `apuravel = collections.length > 0`; sem coleção salva: `—` em Plan./Real./
  Sell-Th., curva ABC em `—`, barras e lista não renderizadas, aviso
  `performance-sem-colecao` + CTA `cta-performance-sem-colecao`.

**`src/routes/_authenticated.collections.tsx`**

- `<CollectionPerformance collections={operacionais} />`.

**O que NÃO mudou:** `lotesOperacionais()` (Onda 40),
`colecoesOperacionais()` (Onda 51), `podeExportarColecoes()`, o store PCP, o
`ExportMenu`, as guardas das Ondas 47–52 e o SQL aplicado (SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`). Nenhuma
asserção antiga foi relaxada.

Teste novo: `src/lib/onboarding/onda53-kpi-colecao.test.ts` (8 asserções).

---

## 4. Prova por cliques reais (browser local, Onda 53)

| Medida                          | ANTES (só vitrine) | DEPOIS de criar coleção `Inverno 28 - Onda 53` |
| ------------------------------- | ------------------ | ---------------------------------------------- |
| `roi-sem-lote` / CTA            | **1 / 1**          | **1 / 1** (correto: ainda não há lote real)    |
| `performance-sem-colecao` / CTA | **1 / 1**          | **0 / 0** (liberado)                           |
| `colecoes-so-vitrine`           | 1                  | **0**                                          |
| Números de fábrica no texto     | **nenhum**         | **nenhum**                                     |
| Travessões                      | 17                 | 6                                              |
| Declaração de estimativa        | visível            | visível                                        |

A promoção foi feita **por cliques**: CTA da Onda 51 → diálogo "Nova coleção"
(7 campos nomeados) → preencher → `Salvar coleção` → toast `Nova coleção
criada`. Capturas `/home/user/medicao39-collections-antes.png` e
`medicao39-collections-depois-colecao.png`.

> **Limitação da medição (registrada, não inventada):** não há, na UI atual,
> botão que crie um lote operacional. `criarLote()` existe em
> `src/lib/pcp/store.ts` e produz lote sem `demo`, mas **nenhum componente o
> chama** (grep em `src`: só a definição). `/production` mostra o passo
> "8 · Lançar pedido / Cria lote no Kanban" apenas como **diagrama de fluxo**.
> Por isso a liberação do `CollectionROI` foi provada pelo teste unitário de
> `lotesOperacionais()` e pela leitura do código, **não** por um clique que não
> existe. O `roi-sem-lote` permanecer após criar só a coleção é o comportamento
> correto, não um defeito.

---

## 5. Gates e 39ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **718/718** (710 + 8).

| Camada        | 39ª medição (após fechar a Onda 53)                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 53** — este commit                                                                                         |
| App publicado | **Onda 52** — `index-BEBmR4We.js` / `index-BLCmNzL8.js`, 224 chunks / 3.185.303 bytes, **6 marcadores da 53 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                              |

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 53 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Dívida que permanece

- **Sem caminho de UI para criar lote/OP operacional** (`criarLote()` órfão):
  o fluxo "Lançar pedido → lote no Kanban" é hoje só diagrama. Achado desta
  rodada, não corrigido.
- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped`.
- `DEV000006` 20× como vitrine declarada; `ensure()` ainda cria modelo e
  `materializadas` se chamado; placeholder de primeiro frame em
  `photorealism.ts`; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- Diálogos que não abrem por botão de criação (drawers, sheets, menus) seguem
  fora da varredura; `digital-twin` não responde ao `h1` no tempo limite do
  crawler.
- Mesmo com lotes reais, `CollectionROI` continua sendo **estimativa** de
  referência (ticket médio/investimento fixos), agora declarada na tela — não
  integração BI/fiscal. O PLM deliberadamente não é ERP.
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
