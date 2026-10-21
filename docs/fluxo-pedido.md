# Fluxo de Pedido (produto personalizado) — fase 1

Pedido comercial com produto **já validado**, que entra na engenharia de custo e
depois no PCP. Este documento é o manual operacional; o parecer que originou o
desenho está em `entrega/fluxo-pedido/REVISAO-FLUXO-PEDIDO.md` (fora do repo).

> **Por que existe:** o vendedor não tem informação técnica de consumo e custo.
> Ele emite o pedido com os dados comerciais; o custo detalha as operações
> (bordado, silk, costura, acabamento) só no que for específico do pedido.

---

## 1. Ordem de aplicação (obrigatória)

```sql
-- 1) valores de enum (papel + entidades de evento)
20261021090000_sales_orders_enums.sql
-- 2) tabelas, RLS, funções, gatilhos e seeds de workflow
20261021090100_sales_orders.sql
```

São arquivos separados de propósito: o Postgres não deixa **usar** um valor de
enum na mesma transação em que ele é criado.

⚠️ A liberação para PCP usa `production_orders`/`configuration_routes`, que
vivem em `drizzle/migrations/0002_pcp_op_routes.sql` (trilha Drizzle). Em
ambiente novo, aplique as **duas** trilhas.

## 2. Papéis

| Papel                                      | Pode                                                 |
| ------------------------------------------ | ---------------------------------------------------- |
| `comercial` / `diretor_produto`            | criar pedido, itens, enviar para custo               |
| `engenharia_custo` / `coordenador_produto` | catálogo, detalhar ficha, recalcular e aprovar custo |
| `pcp`                                      | liberar pedido aprovado para o PCP                   |
| `admin` / `manager`                        | tudo + aprovar margem abaixo do mínimo               |

`can_sell()`, `can_cost()` e `can_edit_sales_order()` moram no banco — a UI só
espelha (mesma doutrina das três camadas do README).

## 3. Caminho do pedido

```
/catalog   produto + opções (driver, custo, setup)  → status "validado"
   ↓
/orders    vendedor: cliente, prazo, itens (grade + personalização + preço)
   ↓       "Enviar para custo"  → submit_sales_order()
   ↓       o banco explode o catálogo em sales_order_item_materials/operations
   ↓
/orders?pedido=<id>   engenharia de custo: ajusta driver_qty, unit_cost, setup
   ↓                  recalc_sales_order_item() → custo/peça + margem
   ↓                  approve_sales_order_item()  (margem < mínimo exige gestor)
   ↓
                       pedido "aprovado"
   ↓
                       release_sales_order_to_pcp() → OP + itens com rota
```

Estados do pedido: `rascunho → enviado → em_custo → custo_concluido → aprovado
→ liberado_pcp` (+ `cancelado`). Por item: `tech_status` e `cost_status`.

## 4. Motor de custo

```
custo_direto = Σ material [consumo × (1+perda%) × custo] × quantidade
             + Σ operação [custo_unit × driver_qty] + Σ setup
industrial   = custo_direto × (1 + overhead%)
custo/peça   = industrial ÷ quantidade
margem       = (preço − custo/peça) ÷ preço
```

Drivers: `peca`, `mil_pontos` (bordado), `m2` (sublimação), `cor` (silk),
`minuto` (costura) e `lote` (fixo do pedido). O **setup** é do pedido e precisa
ser amortizado: em 10 peças, ignorar os R$ 83 de setup subprecifica 13,1%.

O mesmo cálculo existe em dois lugares e **precisa concordar**:
`src/lib/sales/cost.ts` (UI/teste) e `public.recalc_sales_order_item()` (banco).
O teste `cost.test.ts` usa o exemplo da camisa futebol (10 peças = R$ 68,44/pç e
R$ 97,77 com 30% de margem) como contrato.

## 5. Isolamento de custo (não é botão escondido)

| Objeto                                       | `comercial`     | `engenharia_custo`                        |
| -------------------------------------------- | --------------- | ----------------------------------------- |
| `sales_order_item_costs`                     | 0 linhas (RLS)  | leitura completa; escrita só por RPC      |
| `sales_order_item_materials` / `_operations` | sem GRANT (403) | leitura e ajuste                          |
| `order_item_technical_sheet()`               | —               | devolve ficha **sem custo** para produção |

`cost_settings` guarda `min_margin_pct` (25%), `default_overhead_pct` (8%) e
`default_markup_pct`.

## 6. RPCs

| Função                              | Regra que aplica                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `next_sales_order_number()`         | `PED-2026-0001` com advisory lock                                                            |
| `submit_sales_order(order)`         | produto validado, mínimo, grade = quantidade, opção obrigatória, preço > 0; explode catálogo |
| `recalc_sales_order_item(item)`     | materiais × quantidade + operações + setup + overhead → custo/peça e margem                  |
| `approve_sales_order_item(item)`    | exige `concluido`; margem < mínimo exige admin/manager                                       |
| `release_sales_order_to_pcp(order)` | só `aprovado`; todos os itens aprovados; cria OP com rota da configuração                    |
| `order_item_technical_sheet(order)` | ficha do pedido **sem nenhum valor de custo**                                                |

## 7. Telas

| Rota                  | O que faz                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `/catalog`            | produto (código, mínimo, grade, configuração de rota) + grupos e opções com custeio; botão **Validar** |
| `/orders`             | lista com filtros por status, métricas e criação de pedido/orçamento + cadastro rápido de cliente      |
| `/orders?pedido=<id>` | detalhe: itens, grade, personalização, ficha do pedido e painel de custo (gate por papel), timeline    |

Rotas registradas em `src/lib/nav/routes.ts`; `routeTree.gen.ts` regenerado no
padrão do repo. O teste `src/lib/nav/routes.test.ts` cobre a divergência.

## 8. Status da implementação

| Fase  | Escopo                                                                                                             | Estado                  |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| **1** | migrations, catálogo, pedidos, itens/grade/opções, explosão, custo por item, aprovação com gate de margem          | ✅ implementada (21/10) |
| 2     | fila de custo dedicada (`/cost-queue`), edição inline de driver/custo, teste de RLS com JWT `comercial` na CI      | pendente                |
| 3     | liberação para PCP com **grade** (`production_order_item_sizes`), PDF da ficha sem custo                           | pendente                |
| 4     | clonar pedido anterior, lista nominal (nome/número por peça), OS de terceirizado, substituir `/commercial` vitrine | pendente                |

O detalhe do pedido já expõe “Recalcular” e “Aprovar” para quem tem papel de
custo: é o mínimo para o fluxo rodar ponta a ponta antes da fila dedicada.

## 9. Como testar sem banco

```bash
npm run test                 # inclui cost.test.ts (motor puro) e OrderDetail.test.tsx
npm run typecheck
npm run dev                  # /catalog e /orders mostram o aviso de migration até aplicar o SQL
```

Com o SQL aplicado: crie um produto no `/catalog`, adicione duas opções
(ex.: “Bordado escudo” driver `mil_pontos`, “Gola V” driver `peca`), clique em
**Validar**, crie um pedido com 10 peças e grade, envie para custo e confira as
operações geradas na ficha.
