# Onda 47 — Documento não nasce da vitrine (e o pedido fala a língua do usuário)

**Escolhida por risco**, sem pedir confirmação, a partir do segundo `ok prossiga`.
Data: 06/11/2026 · **27ª medição**. Commit de código: `48f05c6`; este
arquivo e a medição seguem no commit de documentação do mesmo push. Suíte: **673/673** (661 da Onda 46 + 12 novos).

A regra que vinha das Ondas 22/23/27–46 continua integral: **só ficha, pedido,
campanha, OS, lote, evento, briefing, parceiro, molde ou piloto salvos entram em
número ou documento operacional**; ausência/vitrine vira `—` com aviso e CTA, não
zero apurado; **vitrine só é promovida por ação explícita**. Nenhuma asserção
antiga foi relaxada.

---

## 1. Por que esta onda e não outra

A revisão de UX da Onda 47 começou por medição, não por opinião. Três achados,
em ordem de risco:

1. **🔴 Documento emitido de dado que não existe.** Os 2 pedidos
   `demo: true` da fila de custos exibiam o badge "Demonstração" — mas mantinham
   **"Ficha Cega A4" ativa**. `buildBlindOrderProductionSheetHtml()` não tinha
   guarda de vitrine: um clique imprimia CNPJ, referência, grade, lista nominal
   e operações de um cliente de fábrica como se fosse uma ordem de produção.
   Era o último caminho da vitrine até um documento que escapa da tela.
2. **🟠 Formulário sem nome acessível.** `/orders` tinha 18 inputs, **15 sem
   rótulo acessível**, `required`/`aria-required` = **0**; o diálogo "Novo
   pedido" tinha 6 campos e **6 `<label htmlFor="">`**.
3. **🟡 Jargão fora da primeira dobra.** `/audit` exibia 9 siglas já na 1ª
   dobra (18 no total), `/route-engineering` PCP/SAM/GSD/CAD e `/suppliers` 11
   siglas — o glossário da Onda 45 existia, mas só no dashboard.

---

## 2. Medição ANTES (Chromium, sessão local, cliques reais)

Sessão simulada com token local e `ctx.route("**/rest/v1/user_roles*")`
devolvendo `[{"role":"admin"}]` — necessário porque `canSell`/`canCost` são
papéis. Os `401/403` dessa sessão são artefato local e não foram contados como
bug.

| Tela / alvo             | Medição ANTES                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/orders`               | 18 inputs · **15 sem rótulo acessível** · `required` 0 · `aria-required` 0 · 59 botões                                                |
| Diálogo "Novo pedido"   | 6 campos · **6 `<label htmlFor="">`** · 0 obrigatórios marcados · toast `Selecione o cliente.`                                        |
| `CostQueueNominalPanel` | 2 pedidos `demo: true` com badge, **17 inputs inline**, "Lista Nominal", "Clonar Pedido", **"Ficha Cega A4"**, "Aprovar custo" ativos |
| `/audit`                | 9 `—` · 9 siglas na 1ª dobra (BOM/PCP/DPP/MRP/Kanban/CAD/EAN/GTIN/ABNT) · 18 no total                                                 |
| `/route-engineering`    | PCP 4 · SAM 1 · GSD 2 · CAD 1                                                                                                         |
| `/suppliers`            | 30 `—` · 11 siglas                                                                                                                    |

Capturas: `/home/user/onda47-orders-antes.png`,
`onda47-audit-antes.png`, `onda47-route-engineering-antes.png`,
`onda47-orders-dialogo-antes.png`.

---

## 3. O que mudou

### 3.1 Gate de emissão — o fecho da regra

- `src/lib/sales/private-label-queue.ts`: `podeEmitirFichaCega(order)` →
  `order.demo !== true`; `FICHA_CEGA_DEMO_BLOQUEIO` explica a saída.
- `CostQueueNominalPanel.printBlindSheet()` **retorna antes** de chamar
  `buildBlindOrderProductionSheetHtml()` quando a vitrine tenta emitir, com
  `toast.error`.
- Na UI o botão é substituído, só para `demo: true`, por
  `data-testid="ficha-cega-bloqueada"` com o texto
  **"Ficha Cega indisponível · clone para emitir"** — aviso com saída, como na
  Onda 44.
- **Promoção preservada (Onda 39):** `cloneOrder()`, `updateOrderPricing()`,
  `updateOperationFields()`, `setNominalRosterAndSyncGrade()` e
  `setOrderStatus()` continuam chamando `promover()`. Clonar ou editar é a ação
  explícita que torna o pedido real; a partir dela o documento volta a ser
  emitível. Não foi criada uma segunda categoria de "pedido quase real".

> `buildBlindOrderProductionSheetHtml()` permanece uma função pura sem efeito
> colateral — o gate fica no único chamador de UI. Alterar o contrato dela
> quebraria asserções da Onda 39; a guarda de fonte no teste novo verifica que
> não existe outro chamador sem gate.

### 3.2 Acessibilidade do fluxo de pedido

- 15 inputs numéricos da grade de custo ganharam `aria-label` específico
  (`Quantidade do driver · <operação> · pedido <número>`, e equivalentes para
  custo do driver e setup fixo); a tabela ganhou `<caption className="sr-only">`.
- Busca global de `ModuleLayout` ganhou `aria-label` derivado do placeholder —
  beneficia todos os módulos, não só `/orders`.
- `NewOrderDialog`: 5 `id`/`htmlFor` associados, `required` + `aria-required` no
  cliente, `aria-describedby` ligando ao aviso "Nenhum cliente cadastrado". O
  checkbox já estava dentro de um `<label>`, então tem nome acessível.
- `NewCustomerDialog`: 5 `id`/`htmlFor`, `required` + `aria-required` no nome,
  `autoComplete` em `organization`/`address-level2`/`address-level1`/`off`.
- As validações medidas continuam iguais (`Selecione o cliente.`,
  `Informe o nome do cliente.`); só a semântica mudou.

### 3.3 Glossário sai do dashboard

`glossario.ts` passou de **24 para 33 termos** com as 9 siglas que faltavam nas
telas internas: `CAD`, `EAN`, `GTIN`, `ABNT`, `CAPA`, `LGPD`, `XML`, `DRE`,
`POM`. `<GlossarioTermos>` (o mesmo `<details>` colapsado, `dl/dt/dd`) foi
montado com `siglas` e `testId` próprios em `/orders` (8), `/audit` (18),
`/route-engineering` (6) e `/suppliers` (10). `TERMOS_PRIMEIRA_DOBRA` e as 24
explicações da Onda 45 ficaram intactas.

Arquivos alterados: 9 fontes + 1 suíte nova
(`src/lib/onboarding/onda47-pedido.test.ts`, 10 testes) + 2 testes em
`GlossarioTermos.test.tsx`.

---

## 4. Medição DEPOIS (browser, cliques reais)

| Tarefa                                                  | Resultado medido                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/orders` base                                          | 18 inputs · **0 sem rótulo acessível** · 59 botões · `glossario-orders` com 8 termos                                          |
| Vitrine                                                 | **2** `ficha-cega-bloqueada` · **0** botões "Ficha Cega A4" · 2 badges "Demonstração"                                         |
| **Clicar no aviso da vitrine**                          | **0 popups** — nenhum documento foi aberto                                                                                    |
| **Clicar "Clonar Pedido"**                              | toast `Pedido clonado como PD-2026-803 (Recompra B2B)!`; 2 bloqueios + **1** botão "Ficha Cega A4"                            |
| **Clicar "Ficha Cega A4" no pedido promovido**          | **1 popup** com `FICHA DE PRODUÇÃO DO PEDIDO · CEGA DE CUSTO E PREÇO`, `PEDIDO PD-2026-803`, grade consolidada                |
| "Novo pedido"                                           | 6 campos · **6 com nome acessível** (5 `htmlFor` + 1 `<label>` envolvente) · 1 `aria-required` · toast `Selecione o cliente.` |
| "cadastrar" → "Novo cliente"                            | 5 campos · **5 com nome acessível** · 1 `aria-required` · `autoComplete` medidos · toast `Informe o nome do cliente.`         |
| Glossários `/audit`, `/route-engineering`, `/suppliers` | **18 / 6 / 10** `dt`+`dd`, `<details>` colapsado por padrão, **abre com 1 clique**                                            |

Capturas: `/home/user/onda47-orders-depois.png`,
`onda47-orders-dialogo-depois.png`, `onda47-cliente-dialogo-depois.png`,
`onda47-audit-depois.png`, `onda47-route-engineering-depois.png`.

Scripts: `/tmp/ux47_antes.py`, `/tmp/ux47_orders.py`, `/tmp/ux47_depois.py`,
`/tmp/ux47_depois2.py` (o ambiente Playwright é recriado a cada turno; os
scripts não são versionados).

---

## 5. Gates

| Gate                     | Resultado                                  |
| ------------------------ | ------------------------------------------ |
| `npx tsc --noEmit`       | **0 erros**                                |
| `npx eslint .`           | **0 erros**, 20 warnings (preexistentes)   |
| `npx prettier --check .` | limpo                                      |
| `npx vitest run`         | **673/673**, 101 arquivos (661 + 12 novos) |

O Vite de desenvolvimento foi **parado antes dos gates** para não repetir o OOM
de ondas anteriores. `git ls-tree -r HEAD` e o token fora de `.git/config` /
arquivos versionados são conferidos no push.

---

## 6. 27ª medição — repo × ar × banco

| Camada                                      | Estado medido                                                        |
| ------------------------------------------- | -------------------------------------------------------------------- |
| **Repositório** `Implantac/plm-use`, `main` | **Onda 47** — `48f05c6` + commit de docs/27ª medição                 |
| **App publicado** `plmuse.lovable.app`      | **Onda 46** — entry `index-CeAMfFot.js`; 226 chunks visitados no BFS |
| **Banco** `njmniwsqwohmigroswnl`            | **migrações 21/24 aplicadas** — view `200 []`, 4 funções `401 42501` |

Marcadores da Onda 46 seguem presentes no ar: `cad-so-vitrine`,
`prototipo-so-vitrine`, `studio-sem-ficha`, `cta-cad-sem-molde`,
`Cadastrar meu molde`, `toaster group`, `glossario-termos` = **1** cada;
`DEV000006` **20×** (vitrine declarada, sem literais executáveis).

Marcadores da Onda 47 no ar = **0**: `ficha-cega-bloqueada`, `glossario-orders`,
`glossario-audit`, `glossario-route-engineering`, `glossario-suppliers`,
`novo-pedido-cliente`, `novo-cliente-nome`, `podeEmitirFichaCega`. **Isto é
esperado e honesto:** publicar o app é ação do dono; nenhuma medição foi
apresentada como "publicado". O banco **não mudou** e não precisava mudar — o
SQL foi aplicado na 24ª medição e `APLICAR-ONDA-21-24.sql` segue com SHA-256
`382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f`, guardado
por teste.

Sondas do banco (chave publishable, sem sessão): `GET /stock_reservation_aging`
→ `200 []`; `op_reserved_materials`, `record_op_material_consumption`,
`cancel_reservations_for_ref`, `stock_on_hand` → `401 42501 permission denied
for function` = objetos existentes, `anon` barrado. Detalhe por camada em
`SINCRONIA-2026-11-05.md`.

---

## 7. O que **não** foi feito

- **Não publicamos a Onda 47.** O ar continua na 46 até o dono publicar; a 28ª
  medição deve procurar os 8 marcadores acima.
- **Não aplicamos SQL novo.** A migration 21/24 já está em produção desde a
  24ª medição; publicar app não aplica SQL e vice-versa.
- **Não fornecemos `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD`.** Os 2 specs de e2e
  seguem `skipped`; a prova de fluxo autenticado contra produção continua
  pendente e não foi substituída por sessão local.
- **Não relaxamos asserções antigas.** As suítes 38–46 continuam passando
  dentro das 673.

## 8. Dívida seguinte, em ordem de risco

1. **Publicar a Onda 47** e refazer a medição de bundle/cliques em produção.
2. `PLM_E2E_EMAIL` / `PLM_E2E_PASSWORD` para destravar o e2e autenticado.
3. `ensure()` ainda cria modelo/`materializadas` se chamado (dívida histórica,
   hoje sem chamador de rota).
4. `photorealism.ts` / placeholder do primeiro frame e jargão remanescente em
   telas ainda não medidas.
5. Revisar `stock_reservation_aging.dias_ativa` — a view responde `200 []`.
