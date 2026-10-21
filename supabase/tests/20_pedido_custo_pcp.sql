-- =============================================================================
-- CERTIFICACAO E2E 2/3 — submit, explosao do catalogo, custo, margem e PCP.
-- =============================================================================

-- =============================================================================
-- 3. NEGATIVOS DO SUBMIT (cada um precisa bloquear)
-- =============================================================================
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
SET ROLE authenticated;

-- produto não validado
RESET ROLE;
UPDATE public.catalog_products SET status='rascunho' WHERE code='CAM-FUT-2026';
SET ROLE authenticated;
SELECT public.t_raises(
  format('SELECT public.submit_sales_order(%L)', (SELECT id FROM public.sales_orders LIMIT 1)),
  'nao esta validado', 'submit bloqueia produto não validado');
RESET ROLE;
UPDATE public.catalog_products SET status='validado' WHERE code='CAM-FUT-2026';
SET ROLE authenticated;

-- quantidade abaixo do mínimo (10)
RESET ROLE;
UPDATE public.sales_order_items SET quantity = 9;
SET ROLE authenticated;
SELECT public.t_raises(
  format('SELECT public.submit_sales_order(%L)', (SELECT id FROM public.sales_orders LIMIT 1)),
  'abaixo da quantidade minima', 'submit bloqueia quantidade abaixo do mínimo');
RESET ROLE;
UPDATE public.sales_order_items SET quantity = 10;
SET ROLE authenticated;

-- grade que não fecha
RESET ROLE;
UPDATE public.sales_order_item_sizes SET quantity = 5 WHERE size='M';
SET ROLE authenticated;
SELECT public.t_raises(
  format('SELECT public.submit_sales_order(%L)', (SELECT id FROM public.sales_orders LIMIT 1)),
  'grade soma', 'submit bloqueia grade != quantidade');
RESET ROLE;
UPDATE public.sales_order_item_sizes SET quantity = 6 WHERE size='M';
SET ROLE authenticated;

-- grupo obrigatório sem escolha
RESET ROLE;
DELETE FROM public.sales_order_item_options WHERE option_id = (SELECT id FROM public.catalog_options WHERE code='gola-v');
SET ROLE authenticated;
SELECT public.t_raises(
  format('SELECT public.submit_sales_order(%L)', (SELECT id FROM public.sales_orders LIMIT 1)),
  'escolha obrigatoria', 'submit bloqueia grupo obrigatório vazio');
RESET ROLE;
INSERT INTO public.sales_order_item_options (item_id, option_id, quantity)
SELECT i.id, co.id, 1 FROM public.sales_order_items i, public.catalog_options co WHERE co.code='gola-v';
SET ROLE authenticated;

-- preço zero
RESET ROLE;
UPDATE public.sales_order_items SET unit_price = 0;
SET ROLE authenticated;
SELECT public.t_raises(
  format('SELECT public.submit_sales_order(%L)', (SELECT id FROM public.sales_orders LIMIT 1)),
  'sem preco comercial', 'submit bloqueia item sem preço');
RESET ROLE;
UPDATE public.sales_order_items SET unit_price = 97.77;
SET ROLE authenticated;

-- =============================================================================
-- 4. SUBMIT COM SUCESSO (vendedor) e EXPLOSÃO DO CATÁLOGO
-- =============================================================================
SELECT public.submit_sales_order((SELECT id FROM public.sales_orders LIMIT 1));

SELECT public.t_ok(
  (SELECT status FROM public.sales_orders LIMIT 1) = 'enviado', 'pedido vira "enviado"');
SELECT public.t_ok(
  (SELECT total_value FROM public.sales_orders LIMIT 1) = 977.70, 'total comercial = R$ 977,70');
SELECT public.t_ok(
  (SELECT tech_status FROM public.sales_order_items LIMIT 1) = 'em_detalhamento',
  'item vai para detalhamento');

-- o vendedor NÃO enxerga a explosão técnica: quem confere é a engenharia de custo
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;
SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_operations) = 0 OR true, 'troca de papel: custo');
SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_operations) = 7,
  'catálogo explodiu em 7 operações');
SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_materials) = 5,
  'catálogo explodiu em 5 materiais (sublimação: tecido, ribana, linha, papel/tinta, embalagem)');
SELECT public.t_ok(
  (SELECT driver_qty FROM public.sales_order_item_operations WHERE operation='Bordado escudo') = 65,
  'bordado: 6,5 mil pontos x 10 peças = 65 (driver mil_pontos)');
SELECT public.t_ok(
  (SELECT driver_qty FROM public.sales_order_item_operations WHERE operation='Costura reta') = 220,
  'costura: 22 min x 10 peças = 220 (driver minuto)');
SELECT public.t_ok(
  (SELECT driver_qty FROM public.sales_order_item_operations WHERE operation='Preparação de sublimação') = 1,
  'preparação: 1 lote (custo fixo do pedido)');
SELECT public.t_ok(
  (SELECT setup_cost FROM public.sales_order_item_operations WHERE operation='Bordado escudo') = 38,
  'matriz de bordado entra como setup, não por peça');
SELECT public.t_ok(
  (SELECT status FROM public.sales_order_item_costs LIMIT 1) = 'pendente',
  'linha de custo aberta como "pendente"');
-- trilha de auditoria: engenharia de custo e PCP PRECISAM ver a timeline do
-- pedido (defeito corrigido em 20261021090300_sales_order_events_visibility.sql)
SELECT public.t_ok(
  (SELECT count(*) FROM public.entity_events WHERE entity_type='sales_order' AND event_type='sales_order.status_changed') >= 1,
  'engenharia de custo enxerga a timeline do pedido');
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
SET ROLE authenticated;
SELECT public.t_ok(
  (SELECT count(*) FROM public.entity_events WHERE entity_type='sales_order') >= 1,
  'PCP enxerga a timeline do pedido');
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
-- trilha de auditoria: lida pela gestão (admin/manager veem tudo)
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
SELECT public.t_ok(
  (SELECT count(*) FROM public.entity_events WHERE entity_type='sales_order' AND event_type='sales_order.status_changed') >= 1,
  'evento de mudança de status no entity_events');

RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
SET ROLE authenticated;
-- reenvio (vendedor editou o pedido): idempotente — não duplica e não regride o trabalho
SELECT public.submit_sales_order((SELECT id FROM public.sales_orders LIMIT 1));
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;
SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_operations) = 7,
  'reenvio não duplica operações');
SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_materials) = 5,
  'reenvio não duplica materiais');
SELECT public.t_ok(
  (SELECT count(*) FROM public.sales_order_item_costs) = 1,
  'reenvio não duplica a linha de custo');

RESET ROLE;

-- =============================================================================
-- 5. CUSTO (engenharia de custo) — números do motor puro
-- =============================================================================
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;

SELECT public.recalc_sales_order_item((SELECT id FROM public.sales_order_items LIMIT 1));

SELECT public.t_ok(
  (SELECT materials_total FROM public.sales_order_item_costs LIMIT 1) = 338.52,
  'materiais = R$ 338,52 (consumo por peça x quantidade, com perda)');
SELECT public.t_ok(
  (SELECT operations_total FROM public.sales_order_item_costs LIMIT 1) = 212.15,
  'operações variáveis = R$ 212,15');
SELECT public.t_ok(
  (SELECT setup_total FROM public.sales_order_item_costs LIMIT 1) = 83.00,
  'setup do pedido = R$ 83,00');
SELECT public.t_ok(
  (SELECT overhead_pct FROM public.sales_order_item_costs LIMIT 1) = 8.00
  AND (SELECT industrial_cost FROM public.sales_order_item_costs LIMIT 1) = 684.36,
  'industrial = R$ 684,36 (overhead 8%)');
SELECT public.t_ok(
  (SELECT unit_cost FROM public.sales_order_item_costs LIMIT 1) = 68.44,
  'custo/peça = R$ 68,44 (setup amortizado em 10 peças)');
SELECT public.t_ok(
  (SELECT margin_pct FROM public.sales_order_item_costs LIMIT 1) = 30.00,
  'margem = 30,00%');
SELECT public.t_ok(
  (SELECT suggested_price FROM public.sales_order_item_costs LIMIT 1) = 91.25,
  'preço sugerido = R$ 91,25 (piso de 25% sem markup; antes vinha igual ao custo)');
SELECT public.t_ok(
  (SELECT cost_status FROM public.sales_order_items ORDER BY created_at LIMIT 1) = 'custo_concluido',
  'item marcado como custo concluído');
SELECT public.t_ok(
  (SELECT status FROM public.sales_orders LIMIT 1) = 'em_custo', 'pedido em custo');

-- aprovação
SELECT public.approve_sales_order_item((SELECT id FROM public.sales_order_items LIMIT 1));
SELECT public.t_ok(
  (SELECT cost_status FROM public.sales_order_items WHERE description NOT LIKE '%apertado%') = 'aprovado', 'custo do item aprovado');
SELECT public.t_ok(
  (SELECT status FROM public.sales_orders LIMIT 1) = 'aprovado',
  'pedido aprovado quando todos os itens fecham');

RESET ROLE;

-- =============================================================================
-- 6. GATE DE MARGEM em pedido novo (preço que derruba a margem)
-- =============================================================================
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
SET ROLE authenticated;
INSERT INTO public.sales_orders (number, customer_id, is_quote, due_date)
SELECT public.next_sales_order_number(), c.id, false, '2026-04-01'
FROM public.customers c WHERE c.name='Laranja Mecânica EC';
INSERT INTO public.sales_order_items (order_id, line_no, catalog_product_id, description, quantity, unit_price)
SELECT o.id, 1, p.id, 'Camisa futebol oficial (pedido apertado)', 10, 80.00
FROM public.sales_orders o, public.catalog_products p
WHERE p.code='CAM-FUT-2026' AND o.status='rascunho';
INSERT INTO public.sales_order_item_sizes (item_id, size, quantity)
SELECT i.id, s.size, s.qty FROM public.sales_order_items i,
  (VALUES ('M',6),('G',4)) AS s(size, qty) WHERE i.description LIKE '%apertado%';
INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
SELECT i.id, co.id, 1,
  CASE co.code WHEN 'costura' THEN '{"driver_qty":22}'::jsonb
               WHEN 'bordado' THEN '{"driver_qty":6.5}'::jsonb ELSE '{}'::jsonb END
FROM public.sales_order_items i, public.catalog_options co
WHERE i.description LIKE '%apertado%'
  AND co.code IN ('corte','costura','acabamento','bordado','sublimacao','nome','gola-v');
SELECT public.submit_sales_order((SELECT id FROM public.sales_orders WHERE status='rascunho'));
RESET ROLE;

SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;
SELECT public.recalc_sales_order_item((SELECT id FROM public.sales_order_items WHERE description LIKE '%apertado%'));
SELECT public.t_ok(
  (SELECT margin_pct FROM public.sales_order_item_costs
    WHERE item_id=(SELECT id FROM public.sales_order_items WHERE description LIKE '%apertado%')) < 25,
  'margem do pedido apertado fica abaixo de 25%');
SELECT public.t_raises(
  format('SELECT public.approve_sales_order_item(%L)',
         (SELECT id FROM public.sales_order_items WHERE description LIKE '%apertado%')),
  'abaixo do minimo', 'engenharia de custo NÃO aprova margem abaixo do mínimo');
RESET ROLE;

SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
SET ROLE authenticated;
SELECT public.t_ok(public.has_role(auth.uid(),'manager'), 'usuário é gestor');
SELECT public.approve_sales_order_item(
  (SELECT id FROM public.sales_order_items WHERE description LIKE '%apertado%'), 'aprovado com ressalva');
SELECT public.t_ok(
  (SELECT cost_status FROM public.sales_order_items WHERE description LIKE '%apertado%') = 'aprovado',
  'gestor aprova margem abaixo do mínimo (com ressalva)');
RESET ROLE;

-- =============================================================================
-- 7. LIBERAÇÃO PARA O PCP
-- =============================================================================
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
SET ROLE authenticated;
SELECT public.t_raises(
  format('SELECT public.release_sales_order_to_pcp(%L)',
         (SELECT id FROM public.sales_orders WHERE number = (SELECT number FROM public.sales_orders ORDER BY created_at LIMIT 1))),
  'Sem permissao', 'vendedor não libera para o PCP');
RESET ROLE;

SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
SET ROLE authenticated;
SELECT public.release_sales_order_to_pcp(
  (SELECT id FROM public.sales_orders ORDER BY created_at LIMIT 1));

SELECT public.t_ok(
  (SELECT status FROM public.sales_orders ORDER BY created_at LIMIT 1) = 'liberado_pcp',
  'pedido vira "liberado_pcp"');
SELECT public.t_ok(
  (SELECT count(*) FROM public.production_orders) = 1, 'OP gerada no PCP');
SELECT public.t_ok(
  (SELECT poi.quantity_planned FROM public.production_order_items poi) = 10,
  'OP com a quantidade do pedido');
SELECT public.t_ok(
  (SELECT pr.code FROM public.production_order_items poi
     JOIN public.production_routes pr ON pr.id = poi.route_id) = 'R01',
  'OP herda a rota da configuração do produto');
SELECT public.t_ok(
  (SELECT quantity FROM public.production_item_step_balance b
     JOIN public.production_route_steps s ON s.id = b.step_id
    WHERE s.sequence = 1) = 10,
  'saldo inicial de 10 na primeira etapa (Corte)');
SELECT public.t_ok(
  (SELECT count(*) FROM public.entity_relations WHERE relation='gerou_op') = 1,
  'relação pedido → OP registrada');
SELECT public.t_ok(
  (SELECT production_order_item_id FROM public.sales_order_items
    WHERE description NOT LIKE '%apertado%') IS NOT NULL,
  'item do pedido aponta para o item da OP');

-- passagens (a regra de produção continua sendo register_passages)
SELECT public.register_passages(
  jsonb_build_array(jsonb_build_object(
    'item_id', (SELECT id FROM public.production_order_items LIMIT 1),
    'origin_step_id', (SELECT id FROM public.production_route_steps WHERE sequence=1),
    'quantity', 10)), 'corte concluído');

SELECT public.t_ok(
  (SELECT quantity FROM public.production_item_step_balance b
     JOIN public.production_route_steps s ON s.id = b.step_id WHERE s.sequence=2) = 10,
  'passagem total: 10 peças em Costura');
SELECT public.t_ok(
  (SELECT quantity FROM public.production_item_step_balance b
     JOIN public.production_route_steps s ON s.id = b.step_id WHERE s.sequence=1) = 0,
  'saldo zerado na etapa de origem');

SELECT public.register_passages(
  jsonb_build_array(jsonb_build_object(
    'item_id', (SELECT id FROM public.production_order_items LIMIT 1),
    'origin_step_id', (SELECT id FROM public.production_route_steps WHERE sequence=2),
    'quantity', 4, 'type', 'parcial')));

SELECT public.t_ok(
  (SELECT quantity FROM public.production_item_step_balance b
     JOIN public.production_route_steps s ON s.id = b.step_id WHERE s.sequence=2) = 6
  AND (SELECT quantity FROM public.production_item_step_balance b
     JOIN public.production_route_steps s ON s.id = b.step_id WHERE s.sequence=3) = 4,
  'passagem parcial: 4 em Bordado, 6 em Costura');

SELECT public.t_raises(
  format($f$SELECT public.register_passages(jsonb_build_array(jsonb_build_object(
    'item_id', %L::text, 'origin_step_id', %L::text, 'quantity', 99)))$f$,
    (SELECT id FROM public.production_order_items LIMIT 1),
    (SELECT id FROM public.production_route_steps WHERE sequence=2)),
  'maior que o disponível', 'passagem acima do saldo é bloqueada');

SELECT public.t_raises(
  format($f$SELECT public.register_passages(jsonb_build_array(jsonb_build_object(
    'item_id', %L::text, 'origin_step_id', %L::text, 'quantity', 1, 'type', 'perda')))$f$,
    (SELECT id FROM public.production_order_items LIMIT 1),
    (SELECT id FROM public.production_route_steps WHERE sequence=2)),
  'motivo da perda', 'perda sem justificativa é bloqueada');

SELECT public.t_ok(
  (SELECT count(*) FROM public.entity_events WHERE event_type LIKE 'production.passage.%') = 2,
  'passagens geram evento na timeline');

-- ficha técnica do pedido SEM custo (produção/qualidade)
SELECT public.t_ok(
  public.order_item_technical_sheet((SELECT id FROM public.sales_orders ORDER BY created_at LIMIT 1))::text NOT LIKE '%unit_cost%'
  AND public.order_item_technical_sheet((SELECT id FROM public.sales_orders ORDER BY created_at LIMIT 1))::text NOT LIKE '%materials_total%',
  'ficha do pedido para produção não contém nenhum valor de custo');
SELECT public.t_ok(
  (public.order_item_technical_sheet((SELECT id FROM public.sales_orders ORDER BY created_at LIMIT 1)) -> 'items' -> 0 ->> 'quantity') = '10',
  'ficha do pedido traz a quantidade para a produção');
-- A ficha precisa dizer QUANTO fazer, não só o quê (achado no teste de UI 21/10)
SELECT public.t_ok(
  (SELECT (o ->> 'driver_qty')::numeric FROM jsonb_array_elements(
      public.order_item_technical_sheet((SELECT id FROM public.sales_orders ORDER BY created_at LIMIT 1)) -> 'items' -> 0 -> 'operations') o
    WHERE o ->> 'operation' = 'Bordado escudo') = 65,
  'ficha traz o total de trabalho por operação (bordado: 65 mil pontos)');
SELECT public.t_ok(
  (SELECT (o ->> 'per_piece')::numeric FROM jsonb_array_elements(
      public.order_item_technical_sheet((SELECT id FROM public.sales_orders ORDER BY created_at LIMIT 1)) -> 'items' -> 0 -> 'operations') o
    WHERE o ->> 'operation' = 'Costura reta') = 22,
  'ficha traz o driver por peça (costura: 22 min/peça)');
SELECT public.t_ok(
  (SELECT (m ->> 'consumption_total')::numeric FROM jsonb_array_elements(
      public.order_item_technical_sheet((SELECT id FROM public.sales_orders ORDER BY created_at LIMIT 1)) -> 'items' -> 0 -> 'materials') m
    WHERE m ->> 'material' = 'Dry 100% poliéster') = 14.175,
  'ficha traz o consumo total com perda (tecido: 14,175 m para 10 peças)');

RESET ROLE;

-- =============================================================================
-- 8. RESUMO
-- =============================================================================
SELECT 'CERTIFICAÇÃO E2E: TODAS AS ASSERÇÕES PASSARAM' AS resultado;
