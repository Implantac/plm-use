-- Comercial preenche grupos no rascunho; custo complementa e informa consumo
-- por item. Todos os valores e identidades sao apenas fixtures descartaveis.
RESET ROLE;
UPDATE public.catalog_products SET reference_code = 'REF-COMERCIAL-TESTE' WHERE code = 'CAM-FUT-2026';
INSERT INTO public.tech_sheets (ref, bom, bop, created_by)
VALUES ('REF-COMERCIAL-TESTE',
  '{"v":2,"items":[{"tipo":"Tecido","material":"Malha base","consumo":"1.20","unidade":"m","custo":9999.99}]}'::jsonb,
  '[]'::jsonb, '00000000-0000-0000-0000-00000000000a');
INSERT INTO public.sales_orders (id, number, customer_id, seller_id, status, is_quote)
SELECT 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1', 'PED-COMERCIAL-TESTE', id,
  '00000000-0000-0000-0000-00000000000b', 'rascunho', false
FROM public.customers WHERE name = 'Laranja Mecânica EC';
INSERT INTO public.sales_order_items
  (id, order_id, line_no, catalog_product_id, description, color, notes, quantity, unit_price)
SELECT 'ffffffff-ffff-4fff-8fff-fffffffffff1', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
       1, id, 'Camisa comercial teste', 'Azul', 'Prazo de arte confirmado', 10, 100
FROM public.catalog_products WHERE code = 'CAM-FUT-2026';
INSERT INTO public.sales_order_item_sizes (item_id, size, quantity)
VALUES ('ffffffff-ffff-4fff-8fff-fffffffffff1', 'M', 6),
       ('ffffffff-ffff-4fff-8fff-fffffffffff1', 'G', 4);
INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
SELECT 'ffffffff-ffff-4fff-8fff-fffffffffff1', co.id, 1,
       CASE WHEN co.code = 'bordado' THEN '{"driver_qty":6.5}'::jsonb ELSE '{}'::jsonb END
FROM public.catalog_options co WHERE co.code IN ('bordado', 'gola-v');

-- Mesmo produto em outro pedido e pedido sem vendedor: isolamento e controle de acesso.
INSERT INTO public.sales_orders (id, number, customer_id, seller_id, status, is_quote)
SELECT v.id::uuid, v.number, c.id, v.seller::uuid, 'rascunho', false
FROM public.customers c CROSS JOIN (VALUES
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2', 'PED-ISOLADO-TESTE', '00000000-0000-0000-0000-00000000000b'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3', 'PED-SEM-VENDEDOR', NULL)
) AS v(id, number, seller) WHERE c.name = 'Laranja Mecânica EC';
INSERT INTO public.sales_order_items (id, order_id, line_no, catalog_product_id, description, quantity, unit_price)
SELECT v.id::uuid, v.order_id::uuid, 1, p.id, 'Outro item isolado', 10, 100
FROM public.catalog_products p CROSS JOIN (VALUES
 ('ffffffff-ffff-4fff-8fff-fffffffffff2', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2'),
 ('ffffffff-ffff-4fff-8fff-fffffffffff3', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3')
) AS v(id, order_id) WHERE p.code = 'CAM-FUT-2026';
INSERT INTO public.sales_order_item_materials (id, item_id, kind, material, unit, consumption, waste_pct, unit_cost, source)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'ffffffff-ffff-4fff-8fff-fffffffffff2',
        'tecido', 'Somente outro pedido', 'm', 2, 0, 30, 'catalogo');

-- Comercial abre e preenche sem mexer no custo ou na ficha compartilhada.
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
SET ROLE authenticated;
SELECT public.t_ok((public.start_order_item_commercial_details('ffffffff-ffff-4fff-8fff-fffffffffff1')->>'initialized')::boolean IS TRUE,
  'comercial inicia ficha do proprio item no rascunho');
SELECT public.t_ok((public.get_order_item_details('ffffffff-ffff-4fff-8fff-fffffffffff1')#>>'{base,materiais,0,material}' = 'Malha base') IS TRUE,
  'comercial carrega base tecnica sem campos financeiros');
SELECT public.save_order_item_commercial_group('ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND group_name='Costura'),
  NULL, E'Gola V azul\nSeguir arte aprovada', 1);
SELECT public.save_order_item_commercial_group('ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND group_name='Bordado'),
  NULL, 'Escudo no peito esquerdo', 1);
SELECT public.t_ok((SELECT commercial_detail = E'Gola V azul\nSeguir arte aprovada' AND detail = '' AND revision=2
  FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND group_name='Costura') IS TRUE,
  'texto comercial salvo isoladamente e com revisao');
SELECT public.t_raises(format('SELECT public.save_order_item_commercial_group(%L,%L,NULL,%L,1)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND group_name='Costura'), 'versao antiga'),
  'outro usuario', 'revisao antiga nao apaga dados comerciais');
SELECT public.t_raises(format('SELECT public.list_order_item_material_consumption(%L)', 'ffffffff-ffff-4fff-8fff-fffffffffff1'),
  'Sem permissao', 'comercial nao recebe custos dos materiais');
SELECT public.t_raises(format('SELECT public.start_order_item_details(%L)', 'ffffffff-ffff-4fff-8fff-fffffffffff1'),
  'Sem permissao', 'comercial nao grava complemento do custo');
SELECT public.t_raises(format('SELECT public.start_order_item_commercial_details(%L)', 'ffffffff-ffff-4fff-8fff-fffffffffff3'),
  'bloqueados', 'vendedor nao assume pedido com vendedor nulo');
SELECT public.start_order_item_commercial_details('ffffffff-ffff-4fff-8fff-fffffffffff2');
SELECT public.t_ok((SELECT commercial_detail = '' FROM public.sales_order_item_detail_groups
  WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff2' AND group_name='Costura') IS TRUE,
  'outro pedido do mesmo produto nao herda o texto do primeiro');
SELECT public.t_raises(format('SELECT public.save_order_item_commercial_group(%L,%L,NULL,%L,1)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff2' AND group_name='Costura'), 'troca cruzada'),
  'Grupo nao encontrado', 'nao altera grupo pertencente a outro item');

-- Envio real, nao alteracao direta de status.
SELECT public.submit_sales_order('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1');
SELECT public.t_ok((SELECT status = 'enviado' FROM public.sales_orders WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1') IS TRUE,
  'envio real deixa item disponivel ao custo');
SELECT public.t_raises(format('SELECT public.save_order_item_commercial_group(%L,%L,NULL,%L,2)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND group_name='Costura'), 'tentativa apos envio'),
  'bloqueados', 'comercial nao altera detalhes apos envio');

-- Custo recebe texto do comercial e complementa no mesmo grupo, sem sobrescrever.
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;
SELECT public.t_ok((SELECT g->>'commercial_detail' = E'Gola V azul\nSeguir arte aprovada'
  FROM jsonb_array_elements(public.start_order_item_details('ffffffff-ffff-4fff-8fff-fffffffffff1')->'groups') g
  WHERE g->>'name' = 'Costura') IS TRUE,
  'custo carrega detalhes anteriores do comercial');
SELECT public.save_order_item_detail_group('ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND group_name='Costura'),
  NULL, 'Costurar com agulha 80', 2);
SELECT public.t_ok((SELECT commercial_detail = E'Gola V azul\nSeguir arte aprovada' AND detail = 'Costurar com agulha 80' AND revision=3
  FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND group_name='Costura') IS TRUE,
  'complemento do custo preserva o texto comercial');
SELECT public.t_raises(format('SELECT public.delete_order_item_detail_group(%L,%L,3)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND group_name='Costura')),
  'detalhes do comercial', 'custo nao pode excluir grupo com conteudo do comercial');
SELECT public.t_raises(format('SELECT public.start_order_item_commercial_details(%L)', 'ffffffff-ffff-4fff-8fff-fffffffffff1'),
  'Sem permissao', 'custo nao altera dados comerciais');

SELECT public.save_order_item_material_consumption('ffffffff-ffff-4fff-8fff-fffffffffff1', NULL,
  'tecido', 'Malha base', 'm', 1.25, 10, 10, 0);
SELECT public.t_ok((SELECT consumption = 1.25 AND waste_pct = 10 AND unit_cost = 10 AND total_cost = 137.50 AND revision = 1
  FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base') IS TRUE,
  'consumo por peca, perda e custo unitario recalculam em uma transacao');
SELECT public.t_ok((SELECT materials_total=137.50 FROM public.sales_order_item_costs WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1') IS TRUE,
  'consumo entra no calculo de custo do item correto');
SELECT public.t_ok((SELECT status='em_custo' FROM public.sales_orders WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1') IS TRUE,
  'gravar consumo avancou o pedido para em_custo');
SELECT public.t_ok((jsonb_array_length(public.list_order_item_material_consumption('ffffffff-ffff-4fff-8fff-fffffffffff1')) = 1) IS TRUE,
  'custo consulta materiais deste item');
SELECT public.t_ok((public.list_order_item_material_consumption('ffffffff-ffff-4fff-8fff-fffffffffff2')#>>'{0,material}' = 'Somente outro pedido') IS TRUE,
  'consumo do outro pedido permanece separado');
SELECT public.t_raises(format('SELECT public.save_order_item_material_consumption(%L,%L,NULL,NULL,NULL,9,0,9,1)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  'Material nao encontrado neste item', 'material de outro item nao pode ser alterado');
SELECT public.save_order_item_material_consumption('ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base'),
  NULL, NULL, NULL, 1.5, 5, 12, 1);
SELECT public.t_ok((SELECT consumption=1.5 AND waste_pct=5 AND unit_cost=12 AND total_cost=189 AND revision=2
  FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base') IS TRUE,
  'alteracao recalcula sem criar linha duplicada');
SELECT public.t_raises(format('SELECT public.save_order_item_material_consumption(%L,%L,NULL,NULL,NULL,2,0,20,1)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base')),
  'outro usuario', 'revisao antiga de material nao sobrescreve');
UPDATE public.sales_order_item_materials SET consumption=1.6
  WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base';
SELECT public.t_ok((SELECT revision=3 FROM public.sales_order_item_materials
  WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base') IS TRUE,
  'edicao pelo painel antigo tambem incrementa revisao');
SELECT public.t_raises(format('SELECT public.delete_order_item_material_consumption(%L,%L,2)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base')),
  'outro usuario', 'revisao antiga nao remove material');
SELECT public.save_order_item_material_consumption('ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base'),
  NULL, NULL, NULL, 1.6, 5, 12, 3);
SELECT public.t_ok((SELECT revision=3 AND total_cost=201.60 FROM public.sales_order_item_materials
  WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base') IS TRUE,
  'recalculo sem mudar insumos nao aumenta revisao');
SELECT public.t_raises(format('SELECT public.save_order_item_material_consumption(%L,NULL,%L,%L,%L,-1,0,10,0)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1','tecido','Invalido','m'),
  'consumo por peca', 'consumo negativo e recusado');
SELECT public.save_order_item_material_consumption('ffffffff-ffff-4fff-8fff-fffffffffff1', NULL,
  'aviamento', 'Botao temporario', 'un', 1, 0, 2, 0);
SELECT public.t_ok((SELECT materials_total=221.60 FROM public.sales_order_item_costs WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1') IS TRUE,
  'material adicional entra no custo');
SELECT public.delete_order_item_material_consumption('ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Botao temporario'), 1);
SELECT public.t_ok((SELECT count(*)=1 FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1')
  AND (SELECT materials_total=201.60 FROM public.sales_order_item_costs WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1') IS TRUE,
  'remocao valida recalcula e preserva material anterior');

-- A ficha e a OP recebem comercial, complemento e consumo, sem os custos.
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
SET ROLE authenticated;
SELECT public.t_ok((public.order_item_technical_sheet('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')#>>'{items,0,commercial_notes}' = 'Prazo de arte confirmado') IS TRUE,
  'ficha inclui observacoes basicas existentes do item');
SELECT public.t_ok((SELECT g->>'commercial_detail'=E'Gola V azul\nSeguir arte aprovada' AND g->>'detail'='Costurar com agulha 80'
  FROM jsonb_array_elements(public.order_item_technical_sheet('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')#>'{items,0,detail_groups}') g
  WHERE g->>'name'='Costura') IS TRUE,
  'ficha mostra comercial e complemento do custo no mesmo grupo');
SELECT public.t_ok((SELECT g->>'commercial_detail'='Escudo no peito esquerdo' AND g->>'detail'=''
  FROM jsonb_array_elements(public.order_item_technical_sheet('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')#>'{items,0,detail_groups}') g
  WHERE g->>'name'='Bordado') IS TRUE,
  'grupo preenchido so pelo comercial tambem chega a producao');
SELECT public.t_ok((public.order_item_technical_sheet('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')#>>'{items,0,materials,0,consumption}')::numeric = 1.6
  AND (public.order_item_technical_sheet('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')#>>'{items,0,materials,0,consumption_total}')::numeric = 16.8,
  'ficha mostra consumo por peca e total com perda');
SELECT public.t_ok(position('unit_cost' IN public.order_item_technical_sheet('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')::text)=0
  AND position('9999.99' IN public.order_item_technical_sheet('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1')::text)=0,
  'ficha e OP nao entregam campos financeiros estruturados');
SELECT public.t_raises(format('SELECT public.list_order_item_material_consumption(%L)', 'ffffffff-ffff-4fff-8fff-fffffffffff1'),
  'Sem permissao', 'PCP nao le os custos pela nova RPC');

RESET ROLE;
SELECT public.t_ok((SELECT bom#>>'{items,0,consumo}'='1.20' AND bom#>>'{items,0,custo}'='9999.99'
  FROM public.tech_sheets WHERE ref='REF-COMERCIAL-TESTE') IS TRUE,
  'ficha padrao continua intacta');
UPDATE public.sales_order_items SET cost_status='aprovado' WHERE id='ffffffff-ffff-4fff-8fff-fffffffffff1';
UPDATE public.sales_orders SET status='aprovado' WHERE id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;
SELECT public.t_raises(format('SELECT public.save_order_item_material_consumption(%L,%L,NULL,NULL,NULL,2,0,10,3)',
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  (SELECT id FROM public.sales_order_item_materials WHERE item_id='ffffffff-ffff-4fff-8fff-fffffffffff1' AND material='Malha base')),
  'bloqueados', 'item aprovado bloqueia consumo tambem pela API');
RESET ROLE;
