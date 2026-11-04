# Onda 19 — Verdade dos Dados

**Data:** 04/11/2026 · **Base:** `main` = `693ec16` (Onda 18)
**Objetivo:** parar de apresentar número de ficha/se­ed como se fosse operação, e fechar
as lacunas de verificação que ficaram das ondas anteriores.

---

## 1. MRP I agora lê o almoxarifado de verdade

**Problema:** o painel "MRP I · Explosão Líquida de Materiais" calculava sobre
`seedFor()` do store da ficha técnica e, para o saldo, usava `bomFallbackStock`
(valores fixos 12 e 20). O motor já aceitava `cloudBalancesByName`, mas o painel
nunca passava nada — a prop nem era usada em `/inventory`.

**O que mudou:**

| Arquivo                                             | Mudança                                                                                                                                                                                                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/inventory/mrp-explosion.ts`                | cada linha ganhou `stockSource: "almoxarifado" \| "bom_referencia"`; o resumo ganhou `provenance` (linhas com saldo real, linhas de referência); novo `normalizeMaterialName()` casa ficha × almoxarifado sem acento/caixa; CSV ganhou a coluna `origem_saldo` |
| `src/hooks/use-stock.ts`                            | novo `useStockBalancesByName()` — lê `stock_balance`, soma por nome do item e entrega `qty_on_hand − qty_reserved` (o saldo **já líquido das reservas ativas** que a Fase A do plano Venda→Estoque passou a criar)                                             |
| `src/components/inventory/MrpNetExplosionPanel.tsx` | usa o hook; faixa de proveniência no topo (verde = saldo real, âmbar = sem estoque cadastrado) e etiqueta "referência BOM" na linha cujo saldo não veio do almoxarifado                                                                                        |

**Por que a coluna `origem_saldo` importa:** antes, um insumo sem cadastro no
almoxarifado aparecia com "12 kg" de saldo e a compra líquida saía menor do que a
real. Agora o mesmo caso aparece marcado como referência — o comprador vê que
precisa cadastrar o item antes de confiar no número.

**Testes:** 3 novos (origem por linha, CSV sem ambiguidade, normalização de nome)

- 1 asserção existente atualizada para o cabeçalho novo.

---

## 2. Selo de origem nos painéis analíticos

Novo `src/components/common/DataProvenanceBadge.tsx` com cinco origens:

| Selo           | Significado                                                            |
| -------------- | ---------------------------------------------------------------------- |
| `real`         | lê o banco em tempo real (RLS aplicada)                                |
| `parcial`      | parte do banco, parte referência — marcado linha a linha               |
| `referencia`   | derivado da ficha/BOM, não é estoque                                   |
| `local`        | dado digitado pelo usuário, no navegador, sincronizado quando possível |
| `demonstracao` | números de exemplo (seed) — **não usar para decidir**                  |

Aplicado em:

- **Torre S&OP** (`LiveSopBoard`) → `local` (lê os stores de pedidos/drops/facções)
- **Atribuição de Seeding** (`SeedingAttributionPanel`) → `local`, com detalhe "cachê e CMV vêm de campos do creator"
- **MRP** → faixa de proveniência própria, porque é o único caso misto

O selo some do caminho de leitura: é um `Badge` de 10 px no cabeçalho do painel,
com `title` explicando de onde vem o número.

---

## 3. Vulnerabilidades de dependência

| Antes                                 | Depois                                    |
| ------------------------------------- | ----------------------------------------- |
| 19 (1 crítica, 4 altas, 14 moderadas) | **12 (0 críticas, 1 alta, 11 moderadas)** |

`npm audit fix` (sem `--force`) resolveu a crítica (`dompurify`, transitiva) e três
das altas. Sobrou `zod < 4.6.6` (DoS ao validar coleções grandes): corrigir exige
`zod@4`, que é **breaking** e mudaria todos os schemas de formulário. Fica
registrado como dívida consciente — a exposição é validação client-side de
formulário, não superfície pública.

Validado depois do update: `tsc` limpo, **344/344 testes**.

---

## 4. Smoke E2E do app publicado

Novo `scripts/smoke-publico.mjs` — roda **sem credenciais**, contra o app no ar:

1. `/login` responde e serve HTML
2. as **42 rotas** do `ROUTE_REGISTRY` respondem (nunca 404/5xx)
3. o **bundle publicado contém todas as rotas do repositório** (pega "subiu no Git e não publicou")
4. o bundle aponta para o projeto Supabase correto
5. rota protegida não estoura

Ligado na CI como job `smoke-publico` (`continue-on-error`, porque o alvo é
externo). Execução local: **46 ok, 0 falhas**.

**Correção de um erro meu:** no relatório anterior eu escrevi "zero teste E2E".
Errado — existem **6 specs Playwright em Python** em `tests/e2e/`, cobrindo
acessibilidade e foco de `field-message`. O que não existe é E2E de **negócio**
(pedido → custo → PCP). O smoke novo cobre as rotas; o fluxo autenticado continua
como teste manual documentado.

---

## 5. Multitenant validado para aplicar

`docs/producao/2026-10-30_PLM-FLUIDO-MULTITENANT.sql` (o que faltava: 4 tabelas):

| Verificação                                                          | Resultado                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| Aplica em réplica de produção (73 tabelas)                           | **73 → 77**, exit 0                                     |
| Reaplicação (idempotência)                                           | exit 0, 0 erro                                          |
| `tenants` / `tenant_memberships` / `cad_markers` / `erp_sync_outbox` | **4 de 4**                                              |
| Tenant padrão                                                        | `default` / "Operacao Principal" criado                 |
| Colunas `tenant_id`                                                  | **10 tabelas**, todas com `DEFAULT current_tenant_id()` |
| Testes do fluxo de pedido **com** o multitenant                      | **139/139 asserções**                                   |

O único `tenant_id NOT NULL` sem default é `tenant_memberships.tenant_id` — tabela
que só as features de multitenant escrevem. Nenhuma query do app usa `tenant_id`,
então o INSERT do front continua funcionando (confirmado pelos 139 testes).

Adicionado bloco de **VERIFICACAO** comentado ao fim do arquivo.

---

## 6. Estado final

```
tsc          0 erros
eslint       0 erros (20 warnings preexistentes)
prettier     limpo
vitest       344/344
smoke público 46 ok
SQL          139 asserções no fluxo de pedido, com multitenant aplicado
npm audit    12 (de 19), 0 críticas
```

---

## 7. O que ainda falta (Onda 20)

1. **Aplicar em produção** — `2026-10-30_PLM-FLUIDO-MULTITENANT.sql` (opcional, 30 min).
   O CAD passa a sincronizar entre máquinas e a fila do ERP existe.
2. **E2E autenticado** — Playwright com usuário real nas 6 telas do fluxo.
   Precisa de um ambiente de staging (hoje `e2e-staging` fica `skipped`) ou
   usuário de teste com papéis.
3. **`zod@4`** — migração de schema, com o suite verde como rede.
4. **Domínio** — `usemoda.ai` continua apontando para `moda.dev` (fora do código).
5. **Telas com seed restantes** — `DppPassportPanel`, DRE (`/financial`),
   Line Sheet e Route Engineering ainda derivam de `seedFor()` quando não há ficha
   salva. Estão marcadas? Não ainda — é o próximo lote natural do selo.
