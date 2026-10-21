-- =============================================================================
-- CERTIFICACAO E2E 1/3 — catalogo, pedido comercial e isolamento de custo.
-- Roda como usuario real (SET ROLE authenticated + JWT claim), entao RLS,
-- grants e triggers sao exercitados de verdade — nao e superusuario.
-- =============================================================================
-- ---------- helpers de asserção ----------
CREATE OR REPLACE FUNCTION public.t_ok(cond boolean, msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT cond THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF;
  RAISE NOTICE '  ok  %', msg;
END $$;

CREATE OR REPLACE FUNCTION public.t_raises(stmt text, expected text, msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF position(expected in SQLERRM) = 0 THEN
      RAISE EXCEPTION 'FALHOU: % (esperava "%", veio "%")', msg, expected, SQLERRM;
    END IF;
    RAISE NOTICE '  ok  % (bloqueou: %)', msg, expected;
    RETURN;
  END;
  RAISE EXCEPTION 'FALHOU: % — a operação passou quando deveria bloquear', msg;
END $$;

-- ---------- fixtures (como superusuário) ----------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000000a','admin@karilu.test'),
  ('00000000-0000-0000-0000-00000000000b','vendedor@karilu.test'),
  ('00000000-0000-0000-0000-00000000000c','custo@karilu.test'),
  ('00000000-0000-0000-0000-00000000000d','gestor@karilu.test'),
  ('00000000-0000-0000-0000-00000000000e','pcp@karilu.test');

INSERT INTO public.profiles (id, full_name) VALUES
  ('00000000-0000-0000-0000-00000000000a','Admin Karilu'),
  ('00000000-0000-0000-0000-00000000000b','Vendedor Karilu'),
  ('00000000-0000-0000-0000-00000000000c','Eng. Custo Karilu'),
  ('00000000-0000-0000-0000-00000000000d','Gestor Karilu'),
  ('00000000-0000-0000-0000-00000000000e','PCP Karilu')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000000a','admin'),
  ('00000000-0000-0000-0000-00000000000b','comercial'),
  ('00000000-0000-0000-0000-00000000000c','engenharia_custo'),
  ('00000000-0000-0000-0000-00000000000d','manager'),
  ('00000000-0000-0000-0000-00000000000e','pcp')
ON CONFLICT DO NOTHING;

-- rota de produção: Corte → Costura → Bordado → Sublimação → Acabamento → Expedição
INSERT INTO public.production_routes (code, name) VALUES ('R01','Rota camisa sublimada')
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.production_route_steps (route_id, sequence, sector, operation)
SELECT r.id, s.seq, s.setor, s.op FROM public.production_routes r,
  (VALUES (1,'Corte','Corte'),(2,'Costura','Costura reta'),
          (3,'Bordado','Bordado escudo'),(4,'Sublimação','Sublimação'),
          (5,'Acabamento','Acabamento'),(6,'Expedição','QC e expedição')) AS s(seq,setor,op)
WHERE r.code='R01'
ON CONFLICT (route_id, sequence) DO NOTHING;

INSERT INTO public.product_configurations (base_product, name) VALUES ('Camisa','Camisa futebol sublimada')
ON CONFLICT DO NOTHING;
INSERT INTO public.configuration_routes (configuration_id, route_id, is_default)
SELECT c.id, r.id, true FROM public.product_configurations c, public.production_routes r
WHERE c.name='Camisa futebol sublimada' AND r.code='R01'
ON CONFLICT DO NOTHING;

GRANT EXECUTE ON FUNCTION public.t_ok(boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.t_raises(text, text, text) TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

-- =============================================================================
-- 1. CATÁLOGO (engenharia de custo)
-- =============================================================================
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;
SELECT public.t_ok(public.can_cost(auth.uid()), 'engenheiro de custo tem can_cost');

INSERT INTO public.catalog_products (code, name, family, configuration_id, base_price, min_qty, grade)
SELECT 'CAM-FUT-2026','Camisa futebol oficial','Camisa', c.id, 97.77, 10, '["P","M","G","GG","3G"]'::jsonb
FROM public.product_configurations c WHERE c.name='Camisa futebol sublimada';

INSERT INTO public.catalog_option_groups (product_id, code, name, selection, required, sort)
SELECT p.id, 'producao', 'Produção', 'multi', false, 1 FROM public.catalog_products p WHERE p.code='CAM-FUT-2026'
UNION ALL
SELECT p.id, 'personalizacao', 'Personalização', 'multi', true, 2 FROM public.catalog_products p WHERE p.code='CAM-FUT-2026'
UNION ALL
SELECT p.id, 'gola', 'Gola', 'single', true, 3 FROM public.catalog_products p WHERE p.code='CAM-FUT-2026';

INSERT INTO public.catalog_options
  (group_id, code, name, sector, operation_name, driver, unit_cost, setup_cost, outsourced, price_delta, material_consumption)
SELECT g.id, 'corte', 'Corte', 'Corte', 'Corte', 'peca', 2.40, 0, false, 0, '[]'::jsonb
FROM public.catalog_option_groups g WHERE g.code='producao'
UNION ALL
SELECT g.id, 'costura', 'Costura reta', 'Costura', 'Costura reta', 'minuto', 0.55, 0, false, 0, '[]'::jsonb
FROM public.catalog_option_groups g WHERE g.code='producao'
UNION ALL
SELECT g.id, 'acabamento', 'Acabamento', 'Acabamento', 'Acabamento', 'peca', 2.80, 0, false, 0, '[]'::jsonb
FROM public.catalog_option_groups g WHERE g.code='producao'
UNION ALL
SELECT g.id, 'bordado', 'Bordado escudo', 'Bordado', 'Bordado escudo', 'mil_pontos', 0.11, 38.00, true, 0, '[]'::jsonb
FROM public.catalog_option_groups g WHERE g.code='personalizacao'
UNION ALL
SELECT g.id, 'sublimacao', 'Sublimação total', 'Sublimação', 'Preparação de sublimação', 'lote', 0, 45.00, false, 0,
  '[{"kind":"tecido","material":"Dry 100% poliéster","unit":"m","consumption":1.35,"waste_pct":5,"unit_cost":18.00},
    {"kind":"aviamento","material":"Ribana 1x1","unit":"kg","consumption":0.08,"waste_pct":3,"unit_cost":32.00},
    {"kind":"linha","material":"Linha poliéster","unit":"m","consumption":1,"waste_pct":0,"unit_cost":0.90},
    {"kind":"aviamento","material":"Papel e tinta sublimática","unit":"un","consumption":1,"waste_pct":0,"unit_cost":3.20},
    {"kind":"embalagem","material":"Embalagem","unit":"un","consumption":1,"waste_pct":0,"unit_cost":1.60}]'::jsonb
FROM public.catalog_option_groups g WHERE g.code='personalizacao'
UNION ALL
SELECT g.id, 'nome', 'Nome e número', 'Costura', 'Aplicação nome e número', 'peca', 2.00, 0, false, 0, '[]'::jsonb
FROM public.catalog_option_groups g WHERE g.code='personalizacao'
UNION ALL
SELECT g.id, 'gola-v', 'Gola V', 'Corte', 'Gola V', 'peca', 1.20, 0, false, 0, '[]'::jsonb
FROM public.catalog_option_groups g WHERE g.code='gola';

SELECT public.t_ok((SELECT count(*) FROM public.catalog_options) >= 7, 'catálogo criado com 7 opções');
RESET ROLE;

-- =============================================================================
-- 2. PEDIDO (vendedor)
-- =============================================================================
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
SET ROLE authenticated;
SELECT public.t_ok(public.can_sell(auth.uid()), 'vendedor tem can_sell');

INSERT INTO public.customers (name, tax_id, city, state, segment)
VALUES ('Laranja Mecânica EC','12.345.678/0001-90','Laranja da Serra','PR','Clube');


INSERT INTO public.sales_orders (number, customer_id, is_quote, due_date, quote_valid_until)
SELECT public.next_sales_order_number(), c.id, true, '2026-03-12', '2026-11-30'
FROM public.customers c WHERE c.name='Laranja Mecânica EC';

INSERT INTO public.sales_order_items
  (order_id, line_no, catalog_product_id, description, color, quantity, unit_price)
SELECT o.id, 1, p.id, 'Camisa futebol oficial', 'Laranja/Preto', 10, 97.77
FROM public.sales_orders o, public.catalog_products p WHERE p.code='CAM-FUT-2026';

INSERT INTO public.sales_order_item_sizes (item_id, size, quantity)
SELECT i.id, s.size, s.qty FROM public.sales_order_items i,
  (VALUES ('M',6),('G',4)) AS s(size, qty);

INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
SELECT i.id, co.id, 1,
  CASE co.code WHEN 'costura' THEN '{"driver_qty":22}'::jsonb
               WHEN 'bordado' THEN '{"driver_qty":6.5}'::jsonb
               ELSE '{}'::jsonb END
FROM public.sales_order_items i, public.catalog_options co
WHERE co.code IN ('corte','costura','acabamento','bordado','sublimacao','nome','gola-v');

SELECT public.t_ok((SELECT total_value FROM public.sales_orders) = 0, 'total começa zerado (só fecha no submit)');

-- negativos do vendedor
SELECT public.t_raises(
  $$INSERT INTO public.catalog_products (code, name) VALUES ('HACK-1','Produto do vendedor')$$,
  'row-level security',
  'vendedor não cria produto no catálogo (RLS)');
UPDATE public.catalog_products SET base_price = 1 WHERE code='CAM-FUT-2026';
SELECT public.t_ok(
  (SELECT base_price FROM public.catalog_products WHERE code='CAM-FUT-2026') = 97.77,
  'vendedor não altera preço do catálogo (0 linhas afetadas)');

SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_costs) = 0,
  'RLS: vendedor enxerga ZERO linhas de custo');
SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_operations) = 0,
  'RLS: vendedor enxerga ZERO operações (carregam custo unitário)');
SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_materials) = 0,
  'RLS: vendedor enxerga ZERO materiais (carregam custo unitário)');
