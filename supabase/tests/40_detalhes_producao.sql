-- Certificacao do novo fluxo em dados de teste, com papeis reais de RLS.
-- 1. A ficha padrao e fotografada sem custo; 2. texto por grupo/item;
-- 3. concorrencia, autorizacao e bloqueio apos aprovacao; 4. saida para a OP.

RESET ROLE;
UPDATE public.catalog_products SET reference_code = 'REF-DETALHE-TESTE' WHERE code = 'CAM-FUT-2026';
INSERT INTO public.tech_sheets (ref, bom, bop, created_by)
VALUES (
  'REF-DETALHE-TESTE',
  '{"v":2,"items":[{"tipo":"Tecido","material":"Malha teste","fornecedor":"Fornecedor teste","lote":"L01","consumo":"1.2","unidade":"m","custo":9876.5},{"tipo":"Teste aninhado","material":{"custo":9876.5},"consumo":[{"custo":9876.5}]}],"preCost":{"targetCusto":9876.5},"aplicacoes":[{"tipo":"Bordado","posicao":"Peito","arte":"LOGO","larguraCm":8,"alturaCm":6,"pontos":12,"cores":2,"qtdPorPeca":1,"obs":"Fio azul","custoUnitario":9876.5},{"tipo":"Teste aninhado","arte":{"custo":9876.5}}],"image":"https://example.com/referencia.jpg"}'::jsonb,
  '[{"seq":1,"setor":"Costura","etapa":"Fechar gola","tempoMin":8,"responsavel":"Equipe teste","custo":9876.5},{"setor":"Teste aninhado","etapa":{"custo":9876.5}}]'::jsonb,
  '00000000-0000-0000-0000-00000000000a'
);
INSERT INTO public.sales_orders (id, number, customer_id, status, is_quote)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'PED-DETALHES-TESTE', id, 'enviado', false
FROM public.customers WHERE name = 'Laranja Mecânica EC';
INSERT INTO public.sales_order_items
  (id, order_id, line_no, catalog_product_id, reference_code, description, quantity, unit_price, cost_status)
SELECT v.id::uuid, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, v.linha, p.id, v.ref, v.descricao, 10, 100, 'aguardando_custo'
FROM public.catalog_products p,
  (VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 1, NULL::text, 'Camisa teste A'),
          ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 2, NULL::text, 'Camisa teste B'),
          ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 3, 'SEM-FICHA', 'Camisa sem ficha'))
    AS v(id, linha, ref, descricao)
WHERE p.code = 'CAM-FUT-2026';
INSERT INTO public.sales_orders (id, number, customer_id, status, is_quote)
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', 'PED-OUTRO-TESTE', id, 'enviado', false
FROM public.customers WHERE name = 'Laranja Mecânica EC';
INSERT INTO public.sales_order_items
  (id, order_id, line_no, catalog_product_id, description, quantity, unit_price, cost_status)
SELECT 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
       1, id, 'Mesmo produto outro pedido', 10, 100, 'aguardando_custo'
FROM public.catalog_products WHERE code = 'CAM-FUT-2026';
INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
SELECT 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', co.id, 1,
       '{"driver_qty":6.5,"custo":9876.5,"objeto":{"unit_cost":9876.5}}'::jsonb
FROM public.catalog_options co WHERE co.code = 'bordado';

SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;
SELECT public.start_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1');
SELECT public.t_ok((public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')->>'base_found')::boolean,
  'encontra a ficha pela referencia do catalogo');
SELECT public.t_ok(public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>>'{base,materiais,0,material}' = 'Malha teste',
  'copia material tecnico da ficha padrao');
SELECT public.t_ok(public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>>'{base,aplicacoes,0,observacao}' = 'Fio azul',
  'copia observacao tecnica da aplicacao');
SELECT public.t_ok(position('9876.5' IN public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')::text) = 0,
  'nao copia custo, setup ou precificacao');
SELECT public.t_ok(public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>>'{base,materiais,0,fornecedor}' = 'Fornecedor teste'
  AND public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>>'{base,operacoes,0,responsavel}' = 'Equipe teste'
  AND public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>>'{base,foto}' = 'https://example.com/referencia.jpg',
  'preserva fornecedor, responsavel e foto tecnica');
SELECT public.t_ok(public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>'{base,materiais,1,material}' = 'null'::jsonb
  AND public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>'{base,materiais,1,consumo}' = 'null'::jsonb
  AND public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>'{base,operacoes,1,etapa}' = 'null'::jsonb
  AND public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>'{base,aplicacoes,1,arte}' = 'null'::jsonb,
  'rejeita objetos e arrays aninhados nas chaves tecnicas');
SELECT public.t_ok(jsonb_array_length(public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')->'groups') = 9,
  'cria os grupos iniciais');
SELECT public.t_ok((public.order_item_technical_sheet('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')#>>'{items,0,options,0,spec,driver_qty}')::numeric = 6.5
  AND position('9876.5' IN public.order_item_technical_sheet('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')::text) = 0,
  'spec mantem driver mas nao passa json financeiro arbitrario a producao');

SELECT public.save_order_item_detail_group('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' AND group_name = 'Costura'),
  NULL, E'Seguir piloto aprovado\nAplicar etiqueta na gola', 1);
SELECT public.t_ok((SELECT detail = E'Seguir piloto aprovado\nAplicar etiqueta na gola' AND revision = 2
  FROM public.sales_order_item_detail_groups WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' AND group_name = 'Costura'),
  'salva texto multilinear por grupo e eleva a revisao');
SELECT public.t_ok(NOT (public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4')->>'initialized')::boolean,
  'salvar um item nao inicia ou modifica outro pedido');
SELECT public.t_ok((SELECT g->>'detail' = '' FROM jsonb_array_elements(
  public.start_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4')->'groups') g WHERE g->>'name' = 'Costura'),
  'outro pedido do mesmo produto comeca sem a instrucao do primeiro');
SELECT public.t_raises(format('SELECT public.save_order_item_detail_group(%L,%L,NULL,%L,1)',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' AND group_name = 'Costura'), 'texto antigo'),
  'outro usuario', 'revisao antiga nao sobrescreve texto');
SELECT public.save_order_item_detail_group('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', NULL, 'Etiqueta especial', 'Etiqueta na barra', 0);
SELECT public.t_raises(format('SELECT public.save_order_item_detail_group(%L,NULL,%L,%L,0)',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'ETIQUETA ESPECIAL', ''),
  'Ja existe', 'grupo nao duplica com diferenca de caixa');
SELECT public.t_raises(format('SELECT public.delete_order_item_detail_group(%L,%L,9)',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' AND group_name = 'Etiqueta especial')),
  'outro usuario', 'revisao antiga nao remove grupo');
SELECT public.delete_order_item_detail_group('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' AND group_name = 'Etiqueta especial'), 1);
SELECT public.t_ok(NOT EXISTS (SELECT 1 FROM public.sales_order_item_detail_groups
  WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' AND group_name = 'Etiqueta especial'),
  'remove grupo escolhido');

SELECT public.t_ok((public.start_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2')->>'initialized')::boolean,
  'a inicializacao ja devolve a ficha pronta ao editor');
SELECT public.start_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3');
SELECT public.t_ok((SELECT detail = '' FROM public.sales_order_item_detail_groups
  WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' AND group_name = 'Costura'),
  'detalhe nao vaza para outro item do mesmo produto');
SELECT public.t_ok(NOT (public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3')->>'base_found')::boolean,
  'referencia sem ficha nao fabrica dados');
SELECT public.save_order_item_detail_group('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3' AND group_name = 'Bordado'),
  NULL, 'Preservar texto', 1);
RESET ROLE;
INSERT INTO public.tech_sheets (ref, bom, bop, created_by)
VALUES ('SEM-FICHA', '{"v":2,"items":[{"tipo":"Tecido","material":"Base tardia"}]}'::jsonb,
        '[]'::jsonb, '00000000-0000-0000-0000-00000000000a');
SET ROLE authenticated;
SELECT public.start_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3');
SELECT public.t_ok(public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3')#>>'{base,materiais,0,material}' = 'Base tardia',
  'base inexistente e capturada quando a ficha aparece antes da aprovacao');
SELECT public.t_ok((SELECT detail = 'Preservar texto' FROM public.sales_order_item_detail_groups
  WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3' AND group_name = 'Bordado'),
  'captura tardia nao sobrescreve detalhes ja escritos');
RESET ROLE;
UPDATE public.tech_sheets SET bom = '{"v":2,"items":[{"tipo":"Tecido","material":"Malha alterada"}]}'::jsonb
  WHERE ref = 'REF-DETALHE-TESTE';
SET ROLE authenticated;
SELECT public.start_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1');
SELECT public.t_ok(public.get_order_item_details('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1')#>>'{base,materiais,0,material}' = 'Malha teste',
  'foto da ficha base e imutavel ao reabrir ou mudar o produto');
SELECT public.t_ok((SELECT detail LIKE 'Seguir piloto%' FROM public.sales_order_item_detail_groups
  WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' AND group_name = 'Costura'),
  'reabrir nao sobrescreve instrucao preenchida');

RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
SET ROLE authenticated;
SELECT public.t_raises(format('SELECT public.start_order_item_details(%L)', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  'Sem permissao', 'comercial nao edita detalhes do custo');
SELECT public.t_raises(format('UPDATE public.sales_order_item_detail_groups SET detail=%L', 'indevido'),
  'permission denied', 'escrita direta fora das RPCs negada');

RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
SET ROLE authenticated;
SELECT public.t_ok(public.order_item_technical_sheet('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')#>>'{items,0,detail_groups,0,name}' = 'Costura',
  'PCP recebe grupo preenchido na ficha tecnica do pedido');
SELECT public.t_ok(public.order_item_technical_sheet('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')#>>'{items,0,detail_groups,0,detail}' = E'Seguir piloto aprovado\nAplicar etiqueta na gola',
  'PCP recebe instrucao inteira com quebras de linha');
SELECT public.t_ok(position('9876.5' IN public.order_item_technical_sheet('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')::text) = 0,
  'ficha de producao nao contem valores financeiros da base');
SELECT public.t_raises(format('SELECT public.save_order_item_detail_group(%L,NULL,%L,%L,0)',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'PCP', 'nao permitido'),
  'Sem permissao', 'PCP visualiza mas nao edita detalhes do custo');
SELECT public.t_ok(NOT has_function_privilege('anon', 'public.get_order_item_details(uuid)', 'EXECUTE')
  AND NOT has_table_privilege('authenticated', 'public.sales_order_item_detail_groups', 'INSERT'),
  'anon nao acessa detalhes e authenticated nao grava direto na tabela');
RESET ROLE;
SET request.jwt.claim.sub = '';
SET ROLE authenticated;
SELECT public.t_raises(format('SELECT public.get_order_item_details(%L)', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
  'Sem permissao', 'usuario sem identidade nao le detalhes');

RESET ROLE;
UPDATE public.sales_order_items SET cost_status = 'aprovado' WHERE order_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
UPDATE public.sales_orders SET status = 'aprovado' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
SET ROLE authenticated;
SELECT public.t_raises(format('SELECT public.save_order_item_detail_group(%L,%L,NULL,%L,2)',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  (SELECT id FROM public.sales_order_item_detail_groups WHERE item_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' AND group_name = 'Costura'), 'alteracao apos aprovacao'),
  'bloqueados', 'item aprovado bloqueia mesmo API direta');
RESET ROLE;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000e';
SET ROLE authenticated;
SELECT public.release_sales_order_to_pcp('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT public.t_ok(EXISTS (SELECT 1 FROM public.production_orders WHERE number = 'OP-PED-DETALHES-TESTE'),
  'pedido gera OP');
SELECT public.t_ok(public.order_item_technical_sheet('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')#>>'{items,0,detail_groups,0,detail}' LIKE 'Seguir piloto%',
  'detalhes permanecem disponiveis para a OP depois da liberacao');
RESET ROLE;
