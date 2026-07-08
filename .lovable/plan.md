# Resumo dos 3 documentos

**1. `calculo_estoque.xlsx`** e **2. `LEC_e_estoque_máximo_calculo-2.xlsx`** — mesma planilha (16 SKUs). Traz o **modelo quantitativo de estoque**:
- Estoque mínimo, máximo e de segurança
- LEC (Lote Econômico) / lote para cobertura mínima
- Ponto do Pedido (PP)
- Demanda média mensal/anual, consumo diário, lead time, desvio padrão
- Fator de serviço (1,65 = 95% · 1,28 = 90%)
- Custo anual de armazenagem: **R$ 753.908,73**
- Placeholder "Produto A / B / C" → intenção de cruzar com Curva ABC

**3. `Vendas_abc_classificado_por_valor_atualizado.xlsx`** — **Curva ABC** de 34 produtos com faturamento, ranking, % participação e classe:

| Classe | Produtos | Faturamento | Participação |
|---|---|---|---|
| A | 8 | R$ 117,1 mi | 79,4% |
| B | 7 | R$ 21,9 mi | 14,9% |
| C | 19 | R$ 8,5 mi | 5,7% |

Regra: A ≤ 80% · B ≤ 95% · C > 95%.

---

# Análise do projeto atual

O módulo `/inventory` (`_authenticated.inventory.tsx`) hoje é **100% mock em memória** — array `initialItems`, sem tabela no banco. O Doc 06.2 já define o contrato (`stock_item`, `stock_movement`, `stock_reservation`, `warehouse`, `inventory_count`), mas **nada disso existe no schema**. As tabelas atuais são todas de produto/PCP/qualidade/lançamento — nenhuma de estoque.

Então **não há o que "quebrar"**: a evolução é aditiva.

---

# Plano de implementação (5 ondas incrementais)

## Onda 1 — Schema base de estoque (migração única)
Criar as tabelas do Doc 06.2 §2 no schema `public`, seguindo o padrão H2-03 (RLS + GRANT + policies escopadas por papel, não `is_member` amplo — reaproveitando `has_role`):

- `stock_item` — com campos ABC/LEC embutidos desde o início:
  - operacional: `code`, `name`, `category`, `unit`, `is_active`
  - ABC: `abc_class` (enum A/B/C), `annual_revenue`, `annual_qty`
  - LEC: `lead_time_days`, `demand_avg_daily`, `demand_stddev`, `service_factor` (default 1,65), `safety_stock`, `reorder_point`, `eoq`, `min_qty`, `max_qty`, `coverage_days`
- `warehouse` (central/celula/expedicao/quarentena)
- `stock_movement` (in/out/transfer_in/transfer_out/adjust/count + ref_type/ref_id)
- `stock_reservation` (ativa/consumida/cancelada, vinculada a `pcp_lots`/`pilotos`)
- `stock_balance` como **view materializada** derivada dos movimentos

Policies: leitura para `admin/manager/pcp/almoxarifado/coordenador_produto`; escrita só almox+admin; ajuste só admin+gestor.

## Onda 2 — Cálculo automático (functions SQL + trigger)
- `public.calc_stock_params(item_id)` — SECURITY DEFINER, calcula `safety_stock = fator × desvio × √lead_time`, `reorder_point = consumo_diário × lead_time + safety_stock`, `eoq` (fórmula de Wilson), `min_qty`/`max_qty`/`coverage_days`.
- Trigger em `stock_item` que recalcula quando `demand_avg_daily`, `demand_stddev`, `lead_time_days` ou `service_factor` mudam.
- `public.classify_abc()` — recalcula `abc_class` de todos os itens por `annual_revenue` acumulado (80/95).
- Emitir `stock.low_balance_alert` via trigger quando `saldo ≤ reorder_point`.

## Onda 3 — Server functions (`src/lib/inventory/*.functions.ts`)
Seguindo H3-02 (`createServerFn` + `requireSupabaseAuth` + Zod):
- `listStockItems`, `getStockItem`
- `upsertStockItem` (admin/almox)
- `registerMovement` (validação: saldo ≥ 0, item ativo, quarentena via QC)
- `createReservation` / `consumeReservation` / `cancelReservation`
- `recalcParams(itemId?)` — dispara `calc_stock_params`
- `runAbcClassification` — job manual + cron opcional

Testes RLS espelhando `use-pilotos.rls.test.tsx`.

## Onda 4 — Seed dos dados das planilhas
Migração de seed idempotente (`ON CONFLICT (code) DO UPDATE`):
- 16 SKUs da planilha LEC com todos os parâmetros
- 34 produtos da planilha ABC (com `annual_revenue`, `annual_qty`, `abc_class`)
- Cruzamento automático por `code` quando bater (CM, CF, Boné, etc.)

## Onda 5 — UI evoluída em `/inventory`
**Sem recriar o layout** — evoluir o `_authenticated.inventory.tsx` atual:
- Trocar `useState(initialItems)` por `useSuspenseQuery(listStockItems)` (padrão TanStack Query já usado no projeto)
- Adicionar colunas: **Classe ABC** (badge A/B/C colorido), **PP**, **Cobertura (dias)**, **LEC**
- Painel lateral novo `ABCCoveragePanel` (irmão do `ConsumoPanel` já existente) mostrando distribuição A/B/C e itens abaixo do PP
- Reaproveitar `Rupturas previstas` mudando critério: `saldo ≤ reorder_point` em vez de `saldo ≤ min`
- Dialog de edição ganha aba "Parâmetros" (lead time, demanda, desvio, fator serviço) que dispara `recalcParams`

---

## Detalhes técnicos

**Fórmulas SQL (Onda 2):**
```text
safety_stock   = service_factor * demand_stddev * sqrt(lead_time_days)
reorder_point  = demand_avg_daily * lead_time_days + safety_stock
eoq            = sqrt( 2 * annual_demand * order_cost / holding_cost_unit )
min_qty        = safety_stock
max_qty        = safety_stock + eoq
coverage_days  = current_balance / demand_avg_daily
```

**Curva ABC (Onda 2):**
```text
ORDER BY annual_revenue DESC → cumulative %
  ≤ 80%  → A
  ≤ 95%  → B
  > 95%  → C
```

**Eventos emitidos:** `stock.item.abc_reclassified`, `stock.item.params_recalculated`, `stock.movement.registered`, `stock.reservation.*`, `stock.low_balance_alert` — todos via trigger em `entity_events` (padrão H2-04 já usado).

**Compatibilidade:** nada quebra. Rotas, componentes e stores existentes permanecem; apenas `_authenticated.inventory.tsx` e o mock desaparecem em favor das queries reais na Onda 5.

---

**Confirma iniciar pela Onda 1 (migração do schema)?** Cada onda é uma migração/PR separado, aprovado antes da próxima.
