-- =============================================================================
-- CERTIFICACAO E2E 3/3 — paridade de arredondamento entre o motor TS e o SQL.
--
-- O motor src/lib/sales/cost.ts arredonda SOMENTE o total; o SQL fazia o mesmo
-- por linha (defeito corrigido em 20261021090200_sales_cost_rounding.sql).
-- Aqui a prova fica travada com 5 insumos de R$ 0,004 (cada um arredondaria
-- para ZERO se fosse arredondado por linha). Somados crus dao R$ 0,02: o total
-- vai de 338,518 para 338,538 e fecha em R$ 338,54. Arredondando por linha o
-- banco diria R$ 338,52 — e o portao acusa.
-- =============================================================================
\set ON_ERROR_STOP on

-- ---------- pedido novo (vendedor) ----------
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
SET ROLE authenticated;

INSERT INTO public.sales_orders (number, customer_id, is_quote, due_date)
SELECT public.next_sales_order_number(), c.id, true, '2026-06-01'
FROM public.customers c WHERE c.name = 'Laranja Mecânica EC';

INSERT INTO public.sales_order_items
  (order_id, line_no, catalog_product_id, description, quantity, unit_price)
SELECT o.id, 1, p.id, 'PROVA arredondamento', 10, 97.77
FROM public.sales_orders o, public.catalog_products p
WHERE p.code = 'CAM-FUT-2026' AND o.status = 'rascunho';

INSERT INTO public.sales_order_item_sizes (item_id, size, quantity)
SELECT i.id, s.size, s.qty FROM public.sales_order_items i,
  (VALUES ('M', 6), ('G', 4)) AS s(size, qty)
WHERE i.description = 'PROVA arredondamento';

INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
SELECT i.id, co.id, 1,
  CASE co.code WHEN 'costura' THEN '{"driver_qty":22}'::jsonb
               WHEN 'bordado' THEN '{"driver_qty":6.5}'::jsonb
               ELSE '{}'::jsonb END
FROM public.sales_order_items i, public.catalog_options co
WHERE i.description = 'PROVA arredondamento'
  AND co.code IN ('corte','costura','acabamento','bordado','sublimacao','nome','gola-v');

SELECT public.submit_sales_order((SELECT id FROM public.sales_orders WHERE status = 'rascunho'));
RESET ROLE;

-- ---------- engenharia de custo: 5 insumos de milhar de centavo ----------
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;

INSERT INTO public.sales_order_item_materials
  (item_id, kind, material, unit, consumption, waste_pct, unit_cost, source, notes)
SELECT i.id, 'aviamento', 'Insumo milhar ' || n, 'un', 0.0008, 0, 0.5, 'custo', 'prova de arredondamento'
FROM public.sales_order_items i, generate_series(1, 5) AS n
WHERE i.description = 'PROVA arredondamento';

SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_materials m
     JOIN public.sales_order_items i ON i.id = m.item_id
    WHERE i.description = 'PROVA arredondamento' AND m.material LIKE 'Insumo milhar%') = 5,
  '5 insumos de teste inseridos');

SELECT public.recalc_sales_order_item(
  (SELECT id FROM public.sales_order_items WHERE description = 'PROVA arredondamento'));

SELECT public.t_ok(
  (SELECT materials_total FROM public.sales_order_item_costs c
     JOIN public.sales_order_items i ON i.id = c.item_id
    WHERE i.description = 'PROVA arredondamento') = 338.54,
  'materiais = R$ 338,54 (338,538 arredondado no fim; por linha daria 338,52)');

SELECT public.t_ok(
  (SELECT round(sum(total_cost), 4) FROM public.sales_order_item_materials m
     JOIN public.sales_order_items i ON i.id = m.item_id
    WHERE i.description = 'PROVA arredondamento' AND m.material LIKE 'Insumo milhar%') = 0.0200,
  'linhas guardam 4 casas (0,0040 cada) e nao arredondam cada uma para zero');

-- PCP nao libera pedido que ainda esta em custo (gate de status)
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
SET ROLE authenticated;
SELECT public.t_raises(
  format('SELECT public.release_sales_order_to_pcp(%L)',
         (SELECT id FROM public.sales_orders WHERE number = (SELECT max(number) FROM public.sales_orders))),
  'precisa estar aprovado', 'PCP nao libera pedido em custo');
RESET ROLE;

SELECT 'CERTIFICACAO E2E 3/3: PARIDADE DE ARREDONDAMENTO OK' AS resultado;
