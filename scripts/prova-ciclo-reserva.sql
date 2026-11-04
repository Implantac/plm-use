-- =============================================================================
-- PROVA DO DEFEITO — ciclo de vida da reserva de estoque
--
-- Roda o caminho REAL (`release_sales_order_to_pcp` de drizzle/0014) e mostra o
-- que acontece com a reserva quando o PCP consome o material e quando a OP
-- termina. Feito para rodar em dois bancos: um sem a migration
-- 20261104120000_stock_reservation_lifecycle.sql (ANTES) e outro com ela
-- (DEPOIS). A diferença entre as duas saídas é a evidência.
--
-- Uso (banco descartável já com o schema aplicado):
--   psql "$URL" -v ON_ERROR_STOP=1 -f scripts/prova-ciclo-reserva.sql
-- =============================================================================

\set QUIET on
SET client_min_messages = warning;

-- Reinicia o proprio fixture: o roteiro e para rodar mais de uma vez no mesmo
-- banco descartavel (a liberacao exige o pedido em 'aprovado', status que o
-- proprio release muda).
DELETE FROM public.stock_movement
 WHERE item_id IN (SELECT id FROM public.stock_item WHERE code = 'INS-PROVA');
DELETE FROM public.stock_reservation
 WHERE item_id IN (SELECT id FROM public.stock_item WHERE code = 'INS-PROVA');
DELETE FROM public.production_orders WHERE number = 'OP-PED-PROVA';
UPDATE public.sales_orders SET status = 'aprovado', released_at = NULL
 WHERE id = '00000000-0000-0000-0000-0000000000f1';

-- ---------- fixture mínima ----------
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-0000000000aa', 'prova@plm.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES ('00000000-0000-0000-0000-0000000000aa', 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.customers (id, name) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Cliente Prova')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_configurations (id, base_product, name)
VALUES ('00000000-0000-0000-0000-0000000000d1', 'CAM-PROVA', 'Padrao')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catalog_products (id, code, name, status, configuration_id)
VALUES ('00000000-0000-0000-0000-0000000000b1', 'CAM-PROVA', 'Camisa prova', 'validado',
        '00000000-0000-0000-0000-0000000000d1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.production_routes (id, code, name)
VALUES ('00000000-0000-0000-0000-0000000000e1', 'ROTA-PROVA', 'Rota prova')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.production_route_steps (route_id, sequence, sector, operation)
SELECT '00000000-0000-0000-0000-0000000000e1', 1, 'costura', 'Fechar manga'
WHERE NOT EXISTS (SELECT 1 FROM public.production_route_steps
                   WHERE route_id = '00000000-0000-0000-0000-0000000000e1');

-- garante o vinculo mesmo quando o produto ja existia de uma execucao anterior
UPDATE public.catalog_products SET configuration_id = '00000000-0000-0000-0000-0000000000d1'
 WHERE id = '00000000-0000-0000-0000-0000000000b1';

INSERT INTO public.configuration_routes (configuration_id, route_id, is_default)
VALUES ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.warehouse (code, name, created_by)
VALUES ('ALM-CENTRAL', 'Almoxarifado central', '00000000-0000-0000-0000-0000000000aa')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.stock_item (code, name, unit, is_active, created_by)
VALUES ('INS-PROVA', 'Tecido prova', 'm', true, '00000000-0000-0000-0000-0000000000aa')
ON CONFLICT (code) DO NOTHING;

-- 100 m em estoque
INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, created_by)
SELECT i.id, w.id, 'in', 100, 'recebimento', '00000000-0000-0000-0000-0000000000aa'
  FROM public.stock_item i, public.warehouse w
 WHERE i.code = 'INS-PROVA' AND w.code = 'ALM-CENTRAL'
   AND NOT EXISTS (SELECT 1 FROM public.stock_movement m WHERE m.item_id = i.id);

-- pedido aprovado: 10 pecas x 2 m/pc = 20 m reservados
INSERT INTO public.sales_orders (id, number, customer_id, status, created_by)
VALUES ('00000000-0000-0000-0000-0000000000f1', 'PED-PROVA', '00000000-0000-0000-0000-0000000000c1', 'aprovado',
        '00000000-0000-0000-0000-0000000000aa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sales_order_items (id, order_id, catalog_product_id, description, quantity, cost_status)
VALUES ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1',
        '00000000-0000-0000-0000-0000000000b1', 'Camisa prova', 10, 'aprovado')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sales_order_item_materials (item_id, material, consumption, waste_pct, stock_item_id)
SELECT '00000000-0000-0000-0000-0000000000f2', 'Tecido prova', 2, 0, i.id
  FROM public.stock_item i WHERE i.code = 'INS-PROVA'
  AND NOT EXISTS (SELECT 1 FROM public.sales_order_item_materials
                   WHERE item_id = '00000000-0000-0000-0000-0000000000f2');

-- ---------- caminho real: liberar pedido para o PCP ----------
SET request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
SET ROLE authenticated;
SELECT public.release_sales_order_to_pcp('00000000-0000-0000-0000-0000000000f1') AS op_gerada \gset
RESET ROLE;

\echo ''
\echo '### 1) depois da liberacao do pedido'
SELECT r.status AS reserva, r.qty AS qty_reservada,
       (SELECT qty_on_hand FROM public.stock_balance b WHERE b.item_id = r.item_id) AS em_estoque,
       (SELECT qty_reserved FROM public.stock_balance b WHERE b.item_id = r.item_id) AS reservado,
       (SELECT qty_on_hand - qty_reserved FROM public.stock_balance b WHERE b.item_id = r.item_id) AS disponivel
  FROM public.stock_reservation r
  JOIN public.sales_orders o ON o.id = '00000000-0000-0000-0000-0000000000f1'
 WHERE r.ref_id = :'op_gerada';

-- ---------- PCP consome o material (saída física de 20 m) ----------
INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, ref_id, created_by)
SELECT i.id, w.id, 'out', 20, 'production_order', :'op_gerada', '00000000-0000-0000-0000-0000000000aa'
  FROM public.stock_item i, public.warehouse w
 WHERE i.code = 'INS-PROVA' AND w.code = 'ALM-CENTRAL';

\echo '### 2) PCP consumiu 20 m (stock_movement kind=out)'
SELECT r.status AS reserva, r.qty AS qty_reservada, r.consumed_at IS NOT NULL AS marcada_consumida,
       (SELECT qty_on_hand - qty_reserved FROM public.stock_balance b WHERE b.item_id = r.item_id) AS disponivel
  FROM public.stock_reservation r WHERE r.ref_id = :'op_gerada';

-- ---------- OP concluida ----------
UPDATE public.production_orders SET status = 'concluida' WHERE id = :'op_gerada';

\echo '### 3) OP concluida'
SELECT r.status AS reserva, r.qty AS qty_reservada,
       (SELECT qty_on_hand - qty_reserved FROM public.stock_balance b WHERE b.item_id = r.item_id) AS disponivel
  FROM public.stock_reservation r WHERE r.ref_id = :'op_gerada';

\echo '### resumo'
SELECT status, count(*) FROM public.stock_reservation GROUP BY status ORDER BY 1;
