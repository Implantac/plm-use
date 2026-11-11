# Onda 57 — O fluxo PCP não promete uma ação que não existe (48ª e 49ª medições, 06/11/2026)

> **`publicado no lovable, prossiga com as melhorias` = dois comandos.**
> Re-medir o marco (nunca confirmar cegamente) e escolher a melhoria seguinte
> pelo risco, sem perguntar. Este documento é uma **medição**, não um plano.

---

## 1. 48ª medição — a Onda 56 foi publicada e validada por cliques

BFS: entry **novo** `index-C64BHus3.js` / `index-D6lNmNPq.js`, **223 chunks /
3.190.257 bytes**, 0 falhas; `index-BlLjcjGi.js` = 0. Os **3 marcadores da
Onda 56 = 1** (`cta-gemeo-sem-ficha`, `cta-gemeo-abrir-ficha`, `Simulação
What-If`); marcadores 55 e 48/49 intactos, `DEV000006` 20.

**Cliques reais em produção:** `/digital-twin` sem ficha com **`h1 = 1`**
(`Gêmeo Digital & Simulador What-If`), `gemeo-sem-ficha` 1, os 2 CTAs, 4
travessões e `Abrir Ficha Técnica` → **`/tech-sheet`**. Banco: view `200 []`,
4 funções `401 42501`, SQL SHA `382f0f19…` inalterado. **Repo, ar e banco
alinhados na Onda 56.** Captura `/home/user/medicao48-digital-twin.png`.

---

## 2. Como a Onda 57 foi escolhida

Varredura de **emissores de documento e ações inertes** nas 44 rotas com clique
real. Quatro suspeitas foram **descartadas como falsos positivos** antes de
qualquer código:

| Suspeita                                                       | Medição dirigida                                       | Leitura                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `analytics` / `materials` / `production` "Exportar" sem efeito | abre `[role=menu]` com `Baixar CSV` / `Imprimir / PDF` | são `ExportMenu`, não botões mortos                                                                |
| `research "Gerar"`                                             | DOM muda                                               | não é inerte                                                                                       |
| `collections` / `planner "Exportar"`                           | `disabled=True`                                        | guardas das Ondas 51/50                                                                            |
| `planner "Mapa CRP A4"` com `DEV000006`                        | com sessão limpa: `disabled=True`, `crp-sem-op` = 1    | estado compartilhado da varredura (pedido promovido por clique anterior), não vitrine em documento |

O risco remanescente, **verificável no código**, era o **`criarLote()` órfão**:
declarado na interface `PCPState` e implementado em `src/lib/pcp/store.ts`
(validação, escrita local, `logActivity`), mas **nenhum componente nem teste o
chamava**. Ao mesmo tempo, o passo **"8 · Lançar pedido"** do
`PCPFlowDiagram` prometia _"Cria lote no Kanban do PCP"_, enquanto o Kanban de
`/production` lê OPs do banco via `usePcpLotes()` / `ordersToLotes` — ou seja,
uma escrita local no store nunca apareceria ali. **Promessa falsa + código
morto**, dívida registrada desde a Onda 53.

---

## 3. O que foi entregue

**`src/lib/pcp/store.ts`** — removidos a declaração e o corpo de `criarLote()`.
Um comentário declara o caminho real: o lote operacional nasce da OP liberada
em `/orders → Liberar p/ PCP` e chega ao Kanban por `usePcpLotes()` /
`ordersToLotes`. `lotesOperacionais()`, `lotesPorSetor()` e todo o resto do
store permanecem.

**`src/components/pcp/PCPFlowDiagram.tsx`** — passo 8 honesto e acionável:

- `detail`: `Libere o pedido aprovado para o PCP: o lote nasce da OP real`.
- Checklist: `Em Pedidos, libere o pedido aprovado para o PCP (Liberar p/ PCP)`,
  `O Kanban passa a mostrar a OP convertida em lote…`, distribuir/notificar.
- Ao selecionar a etapa, um `CtaProximoPasso passo="pedido"` com
  `testId="cta-lancar-pedido-pcp"` e label `Ir para Pedidos · Liberar para PCP`.

**O que NÃO mudou:** nenhuma asserção antiga foi relaxada; os **35 testes do
PCP** seguem verdes; `podeEmitirCrp()` (Onda 50), `crp-sem-op`, o CTA
`cta-producao-sem-op` (Onda 54), as guardas 47–56 e o SQL aplicado (SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`) intactos.

Teste novo: `src/lib/onboarding/onda57-fluxo-pcp-honesto.test.ts` (7 asserções).

---

## 4. Prova por cliques reais (browser local, Onda 57)

| Medida                                | Resultado                                                             |
| ------------------------------------- | --------------------------------------------------------------------- |
| `/production` → `cta-producao-sem-op` | **1** (preservado)                                                    |
| Clique no passo 8                     | painel com `Libere o pedido aprovado` e `Liberar p/ PCP` no checklist |
| `cta-lancar-pedido-pcp`               | **1**, clicável → navega para **`/orders`**                           |
| `/orders → "Liberar p/ PCP"`          | toast `Pedido PD-2026-802 liberado para programação no PCP!`          |

O fluxo oficial continua funcional **e agora está declarado no diagrama**, sem
inventar uma escrita local que o Kanban não leria. Captura
`/home/user/medicao49-production-passo8.png`.

---

## 5. Gates e 49ª medição

`tsc --noEmit` **0** · `eslint` **0 erros / 20 warnings** (os mesmos) ·
`prettier --check .` **limpo** · `vitest` **747/747** (740 + 7).

| Camada        | 49ª medição (após fechar a Onda 57)                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Repositório   | **Onda 57** — este commit                                                                                                    |
| App publicado | **Onda 56** — `index-C64BHus3.js` / `index-D6lNmNPq.js`, 223 chunks / 3.190.257 bytes, **3 marcadores exclusivos da 57 = 0** |
| Banco         | migrações 21/24 aplicadas — view `200 []`, 4 funções `401 42501`, SQL SHA inalterado                                         |

> `Ir para Pedidos · Liberar para PCP` = 1 no bundle **não é marcador da Onda
> 57**: é o label do CTA `cta-producao-sem-op` da Onda 54. `Cria lote no
Kanban do PCP` ainda = **1** no ar — a publicação da 57 será confirmada
> quando cair a **0**. Os exclusivos são `cta-lancar-pedido-pcp`, `Libere o
pedido aprovado para o PCP: o lote nasce da OP real` e `Em Pedidos, libere o
pedido aprovado para o PCP (Liberar p/ PCP)`.

Repo e ar **desalinhados em uma onda, por publicação pendente** — não por
defeito de código. Publicar a Onda 57 é a próxima ação do dono; **publicar o
app não aplica SQL** e o SQL já está aplicado desde a 24ª medição.

### Dívida que permanece

- `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` com o dono: os 2 jobs de e2e seguem
  `skipped` — única pendência que não é código depois desta onda.
- `DEV000006` 20× como vitrine declarada; jargão remanescente; revisar
  `stock_reservation_aging.dias_ativa` (hoje `200 []`).
- `CollectionROI` continua estimativa de referência (declarada), não BI/fiscal;
  o PLM deliberadamente não é ERP.
- A dívida "placeholder de primeiro frame em `photorealism.ts`" **não se
  confirma**: só há `frame` em prompts de fotografia, nenhum placeholder.
- Drawers acionados por ícone: sem novos achados, mas a varredura não cobre
  painéis que exigem sequência de cliques ou dados prévios.
- Sessão local simulada não prova login real: seus `401/403` e o banner
  "Verifique sua conexão" são artefato da medição.
