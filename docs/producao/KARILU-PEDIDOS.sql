-- =============================================================================
-- KARILU-PEDIDOS.sql — pedidos de DEMO para exercitar o fluxo operacional
-- (enviar → custo → aprovar → liberar PCP → gaveta com ficha e foto).
--
-- Pré-requisitos (nesta ordem):
--   1) docs/producao/APLICAR-EM-PRODUCAO.sql (tabelas do fluxo);
--   2) KARILU-SEED.sql (produtos KAR-FUT-01..05, clientes KDEMO-*, fichas).
-- O bloco abaixo ABORTA com mensagem clara se o seed não estiver aplicado, e
-- não duplica nada se rodado duas vezes (idempotência pelo marcador
-- 'KARILU-DEMO' nas notas do pedido).
--
-- Por que NÃO chamar as functions RPC (submit/release) daqui: elas checam
-- can_sell/can_plan_pcp(auth.uid()), e no SQL editor auth.uid() é NULL — a
-- function existe para o clique autenticado do usuário. Este seed REPRODUZ os
-- mesmos INSERTs e as mesmas fórmulas de custo (copiadas da migração
-- 20261021090100), então o resultado é linha a linha o que o botão produz.
-- As ações que pedem papel ficam para VOCÊ na UI — que é o teste.
--
-- O cardápio (5 pedidos, 6 linhas, todos >= min_qty 10, grade bate com qty):
--   A rascunho   2 linhas — clique ENVIAR: valida grade/opções obrigatórias e
--                            explode ops do catálogo na ficha do pedido;
--   B enviado    1 linha  — já com explosão: é o ponto de partida do pessoal
--                            de CUSTO (recalcular na tela);
--   C em_custo   1 linha  — custo fechado na tabela com a fórmula do recalc
--                            (material manual incluso) — falta o SEU clique de
--                            APROVAR custo;
--   D aprovado   1 linha  — custo aprovado; botão LIBERAR PARA PCP já acha a
--                            rota padrão (criada embaixo) e gera a OP;
--   E liberado   2 linhas — liberado replicando release_sales_order_to_pcp:
--                            OP 'planejada' já no PCP com a ficha+foto por ref.
--
-- Bônus plantado: o pedido A tem a linha 04 SEM a opção obrigatória do grupo
-- 'personalizacao' — o primeiro clique em Enviar VAI falhar com 'escolha
-- obrigatória pendente'. Corrija pela UI e reenvie: é o gate de validação do
-- bot funcionando na sua frente. (Se quiser pular, adicione a opção e envie.)
-- =============================================================================

-- Alinhamento de preço (cumpre a ficha): bordado do catálogo a R$/mil-pontos
-- coerente com o custo da PLM (6.5k pts = R$ 4.20/peça). Idempotente por
-- natureza: na segunda rodada não encontra mais nada (as linhas já valem 0.65/0.66).
UPDATE public.catalog_options SET unit_cost = 0.65
 WHERE operation_name = 'Bordado escudo' AND unit_cost = 0.11;
UPDATE public.catalog_options SET unit_cost = 0.66
 WHERE operation_name = 'Bordado escudo' AND unit_cost = 0.13;

DO $do$
DECLARE
  v_n     int;
  v_custA uuid; v_custB uuid;
  v_pid   uuid; v_price numeric;
  v_iid   uuid; v_oid   uuid; v_cfg uuid; v_opid uuid;
  v_ovh   numeric; v_mkup numeric;
  v_mat   numeric; v_ops numeric; v_setup numeric;
  v_ind   numeric; v_oh numeric; v_unit numeric; v_margin numeric;
  v_opt   record; v_route uuid; v_poi uuid;
  v_numA text; v_numB text; v_numC text; v_numD text; v_numE text;
BEGIN
  -- -------------------------------------------------------------------------
  -- 0) Idempotência e pré-requisitos
  -- -------------------------------------------------------------------------
  SELECT count(*) INTO v_n FROM public.sales_orders WHERE notes ILIKE '%KARILU-DEMO%';
  IF v_n > 0 THEN
    RAISE NOTICE 'Pedido(s) KARILU-DEMO já existe(m) — nada foi recriado (idempotência).';
    RETURN;
  END IF;

  SELECT count(*) INTO v_n FROM public.catalog_products
   WHERE code LIKE 'KAR-FUT-%' AND status = 'validado';
  IF v_n <> 5 THEN
    RAISE EXCEPTION 'Rode antes o KARILU-SEED.sql — há % produto(s) KAR-FUT validado(s), deviam ser 5.', v_n;
  END IF;

  SELECT id INTO v_custA FROM public.customers WHERE code = 'KDEMO-AGS';
  SELECT id INTO v_custB FROM public.customers WHERE code = 'KDEMO-LAM';
  IF v_custA IS NULL OR v_custB IS NULL THEN
    RAISE EXCEPTION 'Rode antes o KARILU-SEED.sql — faltam os clientes KDEMO-AGS/KDEMO-LAM.';
  END IF;

  SELECT COALESCE(default_overhead_pct, 8), COALESCE(default_markup_pct, 0)
    INTO v_ovh, v_mkup FROM public.cost_settings LIMIT 1;

  -- -------------------------------------------------------------------------
  -- 1) Rota padrão + configuração por produto (o release exige; sem isso o
  --    botão 'Liberar para PCP' reclama 'sem rota padrão'). Nome/tudo iguais
  --    ao que a tela de PCP > Rotas criaria.
  -- -------------------------------------------------------------------------
  INSERT INTO public.production_routes (code, name, description)
  VALUES ('ROT-KAR-DEMO', 'Rota malha esportiva (DEMO Karilu)',
          'Corte → costura → personalização → acabamento/embalo')
  ON CONFLICT (code) DO NOTHING;
  SELECT id INTO v_route FROM public.production_routes WHERE code = 'ROT-KAR-DEMO';

  IF NOT EXISTS (SELECT 1 FROM public.production_route_steps WHERE route_id = v_route) THEN
    INSERT INTO public.production_route_steps (route_id, sequence, sector, operation, mandatory) VALUES
      (v_route, 1, 'Corte',        'Corte', true),
      (v_route, 2, 'Costura',      'Costura', true),
      (v_route, 3, 'Estamparia',   'Personalização (bordado/silk/sublimação)', true),
      (v_route, 4, 'Acabamento',   'Acabamento e embalagem', true);
  END IF;

  FOR v_pid IN SELECT p.id FROM public.catalog_products p
                WHERE p.code LIKE 'KAR-FUT-%' AND p.configuration_id IS NULL
                ORDER BY p.code
  LOOP
    INSERT INTO public.product_configurations (base_product, name, description)
    SELECT p.code, p.name || ' — config padrão', 'Gerada pelo KARILU-PEDIDOS (DEMO)'
      FROM public.catalog_products p WHERE p.id = v_pid
    RETURNING id INTO v_cfg;
    UPDATE public.catalog_products SET configuration_id = v_cfg WHERE id = v_pid;
    INSERT INTO public.configuration_routes (configuration_id, route_id, is_default)
    VALUES (v_cfg, v_route, true)
    ON CONFLICT (configuration_id, route_id) DO NOTHING;
  END LOOP;

  -- =========================================================================
  -- 2) PEDIDO A — rascunho, 2 linhas (a 2ª INCOMPLETA de propósito: o Enviar
  --    deve acusar a opção obrigatória do grupo personalizacao)
  -- =========================================================================
  v_numA := public.next_sales_order_number();
  INSERT INTO public.sales_orders (number, customer_id, is_quote, due_date, payment_terms, notes)
  VALUES (v_numA, v_custA, false, current_date + 15, '50% antecipado, 50% na entrega',
          'KARILU-DEMO · A=rascunho para testar o Enviar (gate de opção obrigatória na linha 04)')
  RETURNING id INTO v_oid;

  -- linha A.1: KAR-FUT-01, 120 pç, completo
  SELECT id, base_price INTO v_pid, v_price FROM public.catalog_products WHERE code = 'KAR-FUT-01';
  INSERT INTO public.sales_order_items
    (order_id, line_no, catalog_product_id, reference_code, description, color,
     quantity, unit_price, price_locked)
  VALUES (v_oid, 1, v_pid, 'KAR-FUT-01', 'Camisa Oficial Água Santa 2026 — Dourado',
          'Dourado/Preto', 120, v_price, true)
  RETURNING id INTO v_iid;
  INSERT INTO public.sales_order_item_sizes (item_id, size, quantity) VALUES
    (v_iid, 'P', 20), (v_iid, 'M', 40), (v_iid, 'G', 40), (v_iid, 'GG', 20);
  INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
  SELECT v_iid, o.id, 1,
         CASE o.driver WHEN 'minuto' THEN '{"driver_qty":22}'::jsonb
                       WHEN 'mil_pontos' THEN '{"driver_qty":6.5}'::jsonb
                       WHEN 'cor' THEN '{"driver_qty":4}'::jsonb
                       ELSE '{}'::jsonb END
    FROM public.catalog_options o
    JOIN public.catalog_option_groups g ON g.id = o.group_id
    JOIN public.catalog_products p ON p.id = g.product_id
   WHERE p.code = 'KAR-FUT-01'
     AND o.code IN ('corte','costura','acabamento','bordado','silk-costas','gola-careca');

  -- linha A.2: KAR-FUT-04, 60 pç — SEM opção de 'personalizacao' (armadilha didática)
  SELECT id, base_price INTO v_pid, v_price FROM public.catalog_products WHERE code = 'KAR-FUT-04';
  INSERT INTO public.sales_order_items
    (order_id, line_no, catalog_product_id, reference_code, description, color,
     quantity, unit_price, price_locked)
  VALUES (v_oid, 2, v_pid, 'KAR-FUT-04', 'Camisa Futebol Wallpaper — Sublimática',
          'Multicolor', 60, v_price, true)
  RETURNING id INTO v_iid;
  INSERT INTO public.sales_order_item_sizes (item_id, size, quantity) VALUES
    (v_iid, 'P', 15), (v_iid, 'M', 20), (v_iid, 'G', 15), (v_iid, 'GG', 10);
  INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
  SELECT v_iid, o.id, 1,
         CASE o.driver WHEN 'minuto' THEN '{"driver_qty":20}'::jsonb ELSE '{}'::jsonb END
    FROM public.catalog_options o
    JOIN public.catalog_option_groups g ON g.id = o.group_id
    JOIN public.catalog_products p ON p.id = g.product_id
   WHERE p.code = 'KAR-FUT-04' AND o.code IN ('corte','costura');

  UPDATE public.sales_orders SET total_value =
    (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM public.sales_order_items WHERE order_id = v_oid)
   WHERE id = v_oid;

  -- =========================================================================
  -- 3) PEDIDO B — enviado com explosão completa (partida do pessoal de custo)
  -- =========================================================================
  v_numB := public.next_sales_order_number();
  INSERT INTO public.sales_orders (number, customer_id, is_quote, due_date, quote_valid_until, notes)
  VALUES (v_numB, v_custB, true, current_date + 20, current_date + 7,
          'KARILU-DEMO · B=orçamento enviado — custo parte para o detalhamento')
  RETURNING id INTO v_oid;

  SELECT id, base_price INTO v_pid, v_price FROM public.catalog_products WHERE code = 'KAR-FUT-02';
  INSERT INTO public.sales_order_items
    (order_id, line_no, catalog_product_id, reference_code, description, color,
     quantity, unit_price, price_locked, tech_status, cost_status)
  VALUES (v_oid, 1, v_pid, 'KAR-FUT-02', 'Camisa Goleiro Laranja Mecânica 2026 — Azul',
          'Azul/Grafite', 150, v_price, true, 'em_detalhamento', 'aguardando_custo')
  RETURNING id INTO v_iid;
  INSERT INTO public.sales_order_item_sizes (item_id, size, quantity) VALUES
    (v_iid, 'P', 30), (v_iid, 'M', 45), (v_iid, 'G', 45), (v_iid, 'GG', 20), (v_iid, '3G', 10);
  INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
  SELECT v_iid, o.id, 1,
         CASE o.driver WHEN 'minuto' THEN '{"driver_qty":26}'::jsonb
                       WHEN 'mil_pontos' THEN '{"driver_qty":5.5}'::jsonb
                       WHEN 'cor' THEN '{"driver_qty":2}'::jsonb
                       ELSE '{}'::jsonb END
    FROM public.catalog_options o
    JOIN public.catalog_option_groups g ON g.id = o.group_id
    JOIN public.catalog_products p ON p.id = g.product_id
   WHERE p.code = 'KAR-FUT-02';

  -- explosão idêntica ao submit_sales_order: ops das opções (materials não vêm:
  -- material_consumption '[]' no seed — o custo detalha o tecido na tela)
  INSERT INTO public.sales_order_item_operations
    (item_id, seq, sector, operation, driver, driver_qty, unit_cost, setup_cost, source, option_id, outsourced)
  SELECT v_iid,
         ROW_NUMBER() OVER (ORDER BY o.code) + COALESCE((SELECT MAX(seq) FROM public.sales_order_item_operations WHERE item_id = v_iid), 0),
         COALESCE(o.sector, 'Producao'), o.operation_name, o.driver,
         CASE o.driver
           WHEN 'peca' THEN i.quantity * s.quantity
           WHEN 'lote' THEN 1
           ELSE COALESCE((s.spec ->> 'driver_qty')::numeric, s.quantity) * i.quantity
         END,
         o.unit_cost, o.setup_cost, 'catalogo', o.id, o.outsourced
    FROM public.sales_order_item_options s
    JOIN public.catalog_options o ON o.id = s.option_id
    JOIN public.sales_order_items i ON i.id = s.item_id
   WHERE s.item_id = v_iid AND o.operation_name IS NOT NULL;

  INSERT INTO public.sales_order_item_costs (item_id, status)
  VALUES (v_iid, 'pendente') ON CONFLICT (item_id) DO NOTHING;

  UPDATE public.sales_orders
     SET status = 'enviado', submitted_at = now(),
         total_value = (SELECT COALESCE(SUM(quantity * unit_price),0) FROM public.sales_order_items WHERE order_id = v_oid)
   WHERE id = v_oid;

  -- =========================================================================
  -- 4) PEDIDO C — em_custo: custo fechado na tabela com a fórmula do recalc
  --    (1 material de tecido lançado 'na mão' pelo engenheiro, como na UI)
  -- =========================================================================
  v_numC := public.next_sales_order_number();
  INSERT INTO public.sales_orders (number, customer_id, is_quote, due_date, notes)
  VALUES (v_numC, v_custA, false, current_date + 12,
          'KARILU-DEMO · C=custo concluído no item — falta seu clique APROVAR custo')
  RETURNING id INTO v_oid;

  SELECT id, base_price INTO v_pid, v_price FROM public.catalog_products WHERE code = 'KAR-FUT-03';
  INSERT INTO public.sales_order_items
    (order_id, line_no, catalog_product_id, reference_code, description, color,
     quantity, unit_price, price_locked, tech_status, cost_status)
  VALUES (v_oid, 1, v_pid, 'KAR-FUT-03', 'Camisa Térmica Dark Night 2026',
          'Preta', 100, v_price, true, 'em_detalhamento', 'custo_concluido')
  RETURNING id INTO v_iid;
  INSERT INTO public.sales_order_item_sizes (item_id, size, quantity) VALUES
    (v_iid, 'P', 25), (v_iid, 'M', 30), (v_iid, 'G', 30), (v_iid, 'GG', 15);
  INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
  SELECT v_iid, o.id, 1,
         CASE o.driver WHEN 'minuto' THEN '{"driver_qty":19}'::jsonb
                       WHEN 'mil_pontos' THEN '{"driver_qty":2.0}'::jsonb
                       ELSE '{}'::jsonb END
    FROM public.catalog_options o
    JOIN public.catalog_option_groups g ON g.id = o.group_id
    JOIN public.catalog_products p ON p.id = g.product_id
   WHERE p.code = 'KAR-FUT-03';

  INSERT INTO public.sales_order_item_operations
    (item_id, seq, sector, operation, driver, driver_qty, unit_cost, setup_cost, source, option_id, outsourced)
  SELECT v_iid,
         ROW_NUMBER() OVER (ORDER BY o.code) + COALESCE((SELECT MAX(seq) FROM public.sales_order_item_operations WHERE item_id = v_iid), 0),
         COALESCE(o.sector, 'Producao'), o.operation_name, o.driver,
         CASE o.driver
           WHEN 'peca' THEN i.quantity * s.quantity
           WHEN 'lote' THEN 1
           ELSE COALESCE((s.spec ->> 'driver_qty')::numeric, s.quantity) * i.quantity
         END,
         o.unit_cost, o.setup_cost, 'catalogo', o.id, o.outsourced
    FROM public.sales_order_item_options s
    JOIN public.catalog_options o ON o.id = s.option_id
    JOIN public.sales_order_items i ON i.id = s.item_id
   WHERE s.item_id = v_iid AND o.operation_name IS NOT NULL;

  -- material do detalhamento do custo (kind enum: 'tecido')
  INSERT INTO public.sales_order_item_materials
    (item_id, kind, material, unit, consumption, waste_pct, unit_cost, source, notes)
  VALUES
    (v_iid, 'tecido', 'Poliamida térmica 240g (segunda pele)', 'm', 1.40, 8, 27.80, 'custo',
     'Lançado no detalhamento (igual à tela de custo)'),
    (v_iid, 'linha', 'Linha poliamida texturizada', 'm', 1.80, 5, 3.10, 'custo', NULL);

  -- totais exatamente como recalc_sales_order_item
  UPDATE public.sales_order_item_materials m
     SET total_cost = round(m.consumption * (1 + m.waste_pct/100) * m.unit_cost
                             * (SELECT i.quantity FROM public.sales_order_items i WHERE i.id = m.item_id), 2)
   WHERE m.item_id = v_iid;
  UPDATE public.sales_order_item_operations
     SET total_cost = (unit_cost * driver_qty) + setup_cost
   WHERE item_id = v_iid;

  SELECT COALESCE(SUM(total_cost),0) INTO v_mat FROM public.sales_order_item_materials WHERE item_id = v_iid;
  SELECT COALESCE(SUM(unit_cost * driver_qty),0), COALESCE(SUM(setup_cost),0)
    INTO v_ops, v_setup FROM public.sales_order_item_operations WHERE item_id = v_iid;

  v_ind := v_mat + v_ops + v_setup;
  v_oh := v_ind * v_ovh / 100;
  v_unit := (v_ind + v_oh) / 100; -- quantidade do item C = 100
  v_margin := (v_price - v_unit) / v_price * 100;

  INSERT INTO public.sales_order_item_costs
    (item_id, materials_total, operations_total, setup_total, overhead_pct,
     industrial_cost, unit_cost, margin_pct, suggested_price, status, detailed_at, updated_at)
  VALUES
    (v_iid, v_mat, v_ops, v_setup, v_ovh, ROUND(v_ind + v_oh, 2), ROUND(v_unit, 2),
     ROUND(v_margin, 2), ROUND(v_unit * (1 + v_mkup/100), 2), 'concluido', now(), now())
  ON CONFLICT (item_id) DO UPDATE SET
     materials_total = EXCLUDED.materials_total, operations_total = EXCLUDED.operations_total,
     setup_total = EXCLUDED.setup_total, overhead_pct = EXCLUDED.overhead_pct,
     industrial_cost = EXCLUDED.industrial_cost, unit_cost = EXCLUDED.unit_cost,
     margin_pct = EXCLUDED.margin_pct, suggested_price = EXCLUDED.suggested_price,
     status = 'concluido', detailed_at = now(), updated_at = now();

  UPDATE public.sales_orders
     SET status = 'em_custo', submitted_at = now(),
         total_value = (SELECT COALESCE(SUM(quantity * unit_price),0) FROM public.sales_order_items WHERE order_id = v_oid)
   WHERE id = v_oid;

  -- =========================================================================
  -- 5) PEDIDO D — aprovado (custo aprovado por linha com nota de gestor):
  --    é o seu clique em 'Liberar para PCP' que fecha o ciclo dele
  -- =========================================================================
  v_numD := public.next_sales_order_number();
  INSERT INTO public.sales_orders (number, customer_id, is_quote, due_date, notes)
  VALUES (v_numD, v_custB, false, current_date + 10,
          'KARILU-DEMO · D=aprovado — teste o botão LIBERAR PARA PCP (a rota padrão existe)')
  RETURNING id INTO v_oid;

  SELECT id, base_price INTO v_pid, v_price FROM public.catalog_products WHERE code = 'KAR-FUT-05';
  INSERT INTO public.sales_order_items
    (order_id, line_no, catalog_product_id, reference_code, description, color,
     quantity, unit_price, price_locked, tech_status, cost_status)
  VALUES (v_oid, 1, v_pid, 'KAR-FUT-05', 'Camiseta Oficial Operário Ferroviário 2026 — Preto',
          'Preto/Branco', 80, v_price, true, 'ficha_concluida', 'aprovado')
  RETURNING id INTO v_iid;
  INSERT INTO public.sales_order_item_sizes (item_id, size, quantity) VALUES
    (v_iid, 'P', 20), (v_iid, 'M', 25), (v_iid, 'G', 25), (v_iid, 'GG', 10);
  INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
  SELECT v_iid, o.id, 1,
         CASE o.driver WHEN 'minuto' THEN '{"driver_qty":24}'::jsonb
                       WHEN 'mil_pontos' THEN '{"driver_qty":9.2}'::jsonb
                       WHEN 'cor' THEN '{"driver_qty":5}'::jsonb
                       ELSE '{}'::jsonb END
    FROM public.catalog_options o
    JOIN public.catalog_option_groups g ON g.id = o.group_id
    JOIN public.catalog_products p ON p.id = g.product_id
   WHERE p.code = 'KAR-FUT-05';

  INSERT INTO public.sales_order_item_operations
    (item_id, seq, sector, operation, driver, driver_qty, unit_cost, setup_cost, source, option_id, outsourced)
  SELECT v_iid,
         ROW_NUMBER() OVER (ORDER BY o.code) + COALESCE((SELECT MAX(seq) FROM public.sales_order_item_operations WHERE item_id = v_iid), 0),
         COALESCE(o.sector, 'Producao'), o.operation_name, o.driver,
         CASE o.driver
           WHEN 'peca' THEN i.quantity * s.quantity
           WHEN 'lote' THEN 1
           ELSE COALESCE((s.spec ->> 'driver_qty')::numeric, s.quantity) * i.quantity
         END,
         o.unit_cost, o.setup_cost, 'catalogo', o.id, o.outsourced
    FROM public.sales_order_item_options s
    JOIN public.catalog_options o ON o.id = s.option_id
    JOIN public.sales_order_items i ON i.id = s.item_id
   WHERE s.item_id = v_iid AND o.operation_name IS NOT NULL;

  UPDATE public.sales_order_item_operations SET total_cost = (unit_cost * driver_qty) + setup_cost WHERE item_id = v_iid;
  SELECT COALESCE(SUM(unit_cost * driver_qty),0), COALESCE(SUM(setup_cost),0)
    INTO v_ops, v_setup FROM public.sales_order_item_operations WHERE item_id = v_iid;
  v_mat := 0;
  SELECT COALESCE(SUM(total_cost),0) INTO v_mat FROM public.sales_order_item_materials WHERE item_id = v_iid;
  v_ind := v_mat + v_ops + v_setup;
  v_oh := v_ind * v_ovh / 100;
  v_unit := (v_ind + v_oh) / 80; -- quantidade do item D = 80
  v_margin := (v_price - v_unit) / v_price * 100;

  INSERT INTO public.sales_order_item_costs
    (item_id, materials_total, operations_total, setup_total, overhead_pct,
     industrial_cost, unit_cost, margin_pct, suggested_price, status,
     detailed_at, approved_at, notes, updated_at)
  VALUES
    (v_iid, v_mat, v_ops, v_setup, v_ovh, ROUND(v_ind + v_oh, 2), ROUND(v_unit, 2),
     ROUND(v_margin, 2), ROUND(v_unit * (1 + v_mkup/100), 2), 'aprovado',
     now(), now(), 'Aprovado no seed (simula gestor)', now())
  ON CONFLICT (item_id) DO NOTHING;

  UPDATE public.sales_orders
     SET status = 'aprovado', submitted_at = now(), approved_at = now(),
         total_value = (SELECT COALESCE(SUM(quantity * unit_price),0) FROM public.sales_order_items WHERE order_id = v_oid)
   WHERE id = v_oid;

  -- =========================================================================
  -- 6) PEDIDO E — liberado_pcp: explosão + custo aprovado + release replicado
  --    (OP planejada no PCP, 2 itens apontando por reference_code p/ as
  --    fichas KAR-FUT-01/04 com FOTO e aplicações)
  -- =========================================================================
  v_numE := public.next_sales_order_number();
  INSERT INTO public.sales_orders (number, customer_id, is_quote, due_date, notes)
  VALUES (v_numE, v_custA, false, current_date + 8,
          'KARILU-DEMO · E=já no PCP — abra a OP na Gaveta e veja a ficha com foto')
  RETURNING id INTO v_oid;

  INSERT INTO public.production_orders (number, status, priority, planned_end, notes)
  VALUES ('OP-' || v_numE, 'planejada', 'media', current_date + 8,
          'Gerada do pedido ' || v_numE || ' (KARILU-DEMO)')
  RETURNING id INTO v_opid;

  -- item E.1: KAR-FUT-01, 40 pç
  SELECT id, base_price INTO v_pid, v_price FROM public.catalog_products WHERE code = 'KAR-FUT-01';
  INSERT INTO public.sales_order_items
    (order_id, line_no, catalog_product_id, reference_code, description, color,
     quantity, unit_price, price_locked, tech_status, cost_status)
  VALUES (v_oid, 1, v_pid, 'KAR-FUT-01', 'Camisa Oficial Água Santa 2026 — Dourado',
          'Dourado/Preto', 40, v_price, true, 'ficha_concluida', 'aprovado')
  RETURNING id INTO v_iid;
  INSERT INTO public.sales_order_item_sizes (item_id, size, quantity) VALUES
    (v_iid, 'P', 10), (v_iid, 'M', 10), (v_iid, 'G', 10), (v_iid, 'GG', 10);
  INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
  SELECT v_iid, o.id, 1,
         CASE o.driver WHEN 'minuto' THEN '{"driver_qty":22}'::jsonb
                       WHEN 'mil_pontos' THEN '{"driver_qty":6.5}'::jsonb
                       WHEN 'cor' THEN '{"driver_qty":4}'::jsonb
                       ELSE '{}'::jsonb END
    FROM public.catalog_options o
    JOIN public.catalog_option_groups g ON g.id = o.group_id
    JOIN public.catalog_products p ON p.id = g.product_id
   WHERE p.code = 'KAR-FUT-01';
  INSERT INTO public.sales_order_item_operations
    (item_id, seq, sector, operation, driver, driver_qty, unit_cost, setup_cost, source, option_id, outsourced)
  SELECT v_iid,
         ROW_NUMBER() OVER (ORDER BY o.code) + COALESCE((SELECT MAX(seq) FROM public.sales_order_item_operations WHERE item_id = v_iid), 0),
         COALESCE(o.sector, 'Producao'), o.operation_name, o.driver,
         CASE o.driver
           WHEN 'peca' THEN i.quantity * s.quantity
           WHEN 'lote' THEN 1
           ELSE COALESCE((s.spec ->> 'driver_qty')::numeric, s.quantity) * i.quantity
         END,
         o.unit_cost, o.setup_cost, 'catalogo', o.id, o.outsourced
    FROM public.sales_order_item_options s
    JOIN public.catalog_options o ON o.id = s.option_id
    JOIN public.sales_order_items i ON i.id = s.item_id
   WHERE s.item_id = v_iid AND o.operation_name IS NOT NULL;
  -- item E.2: KAR-FUT-04, 30 pç
  SELECT id, base_price INTO v_pid, v_price FROM public.catalog_products WHERE code = 'KAR-FUT-04';
  INSERT INTO public.sales_order_items
    (order_id, line_no, catalog_product_id, reference_code, description, color,
     quantity, unit_price, price_locked, tech_status, cost_status)
  VALUES (v_oid, 2, v_pid, 'KAR-FUT-04', 'Camisa Futebol Wallpaper — Sublimática',
          'Multicolor', 30, v_price, true, 'ficha_concluida', 'aprovado')
  RETURNING id INTO v_iid;
  INSERT INTO public.sales_order_item_sizes (item_id, size, quantity) VALUES
    (v_iid, 'P', 8), (v_iid, 'M', 8), (v_iid, 'G', 8), (v_iid, 'GG', 6);
  INSERT INTO public.sales_order_item_options (item_id, option_id, quantity, spec)
  SELECT v_iid, o.id, 1,
         CASE o.driver WHEN 'minuto' THEN '{"driver_qty":20}'::jsonb
                       WHEN 'mil_pontos' THEN '{"driver_qty":2.5}'::jsonb
                       ELSE '{}'::jsonb END
    FROM public.catalog_options o
    JOIN public.catalog_option_groups g ON g.id = o.group_id
    JOIN public.catalog_products p ON p.id = g.product_id
   WHERE p.code = 'KAR-FUT-04';
  INSERT INTO public.sales_order_item_operations
    (item_id, seq, sector, operation, driver, driver_qty, unit_cost, setup_cost, source, option_id, outsourced)
  SELECT v_iid,
         ROW_NUMBER() OVER (ORDER BY o.code) + COALESCE((SELECT MAX(seq) FROM public.sales_order_item_operations WHERE item_id = v_iid), 0),
         COALESCE(o.sector, 'Producao'), o.operation_name, o.driver,
         CASE o.driver
           WHEN 'peca' THEN i.quantity * s.quantity
           WHEN 'lote' THEN 1
           ELSE COALESCE((s.spec ->> 'driver_qty')::numeric, s.quantity) * i.quantity
         END,
         o.unit_cost, o.setup_cost, 'catalogo', o.id, o.outsourced
    FROM public.sales_order_item_options s
    JOIN public.catalog_options o ON o.id = s.option_id
    JOIN public.sales_order_items i ON i.id = s.item_id
   WHERE s.item_id = v_iid AND o.operation_name IS NOT NULL;

  UPDATE public.sales_order_item_operations SET total_cost = (unit_cost * driver_qty) + setup_cost
   WHERE item_id IN (SELECT id FROM public.sales_order_items WHERE order_id = v_oid);
  SELECT COALESCE(SUM(unit_cost * driver_qty),0), COALESCE(SUM(setup_cost),0)
    INTO v_ops, v_setup FROM public.sales_order_item_operations
   WHERE item_id IN (SELECT id FROM public.sales_order_items WHERE order_id = v_oid);
  v_mat := 0; v_ind := v_mat + v_ops + v_setup; v_oh := v_ind * v_ovh / 100;
  INSERT INTO public.sales_order_item_costs
    (item_id, materials_total, operations_total, setup_total, overhead_pct,
     industrial_cost, unit_cost, status, detailed_at, approved_at, notes, updated_at)
  SELECT i.id, 0,
         (SELECT COALESCE(SUM(unit_cost * driver_qty),0) FROM public.sales_order_item_operations op WHERE op.item_id = i.id),
         (SELECT COALESCE(SUM(setup_cost),0) FROM public.sales_order_item_operations op WHERE op.item_id = i.id),
         v_ovh,
         ROUND((SELECT COALESCE(SUM((unit_cost * driver_qty) + setup_cost),0) FROM public.sales_order_item_operations op WHERE op.item_id = i.id) * (1 + v_ovh/100), 2),
         ROUND((SELECT COALESCE(SUM((unit_cost * driver_qty) + setup_cost),0) FROM public.sales_order_item_operations op WHERE op.item_id = i.id) * (1 + v_ovh/100) / i.quantity, 2),
         'aprovado', now(), now(), 'Seed KARILU-DEMO (simula custo aprovado)', now()
    FROM public.sales_order_items i WHERE i.order_id = v_oid
  ON CONFLICT (item_id) DO NOTHING;

  -- liberação: mesmos INSERTs de release_sales_order_to_pcp
  FOR v_opt IN
    SELECT i.id AS item_id, i.reference_code, i.description, i.color, i.quantity,
           p.configuration_id AS cfg
      FROM public.sales_order_items i
      JOIN public.catalog_products p ON p.id = i.catalog_product_id
     WHERE i.order_id = v_oid
     ORDER BY i.line_no
  LOOP
    SELECT route_id INTO v_route
      FROM public.configuration_routes
     WHERE configuration_id = v_opt.cfg
     ORDER BY is_default DESC, created_at
     LIMIT 1;
    IF v_route IS NULL THEN
      RAISE EXCEPTION 'Config do item % sem rota — rode o bloco 1 antes.', v_opt.reference_code;
    END IF;
    INSERT INTO public.production_order_items
      (production_order_id, reference_code, reference_name, color, configuration_id,
       route_id, quantity_planned, status)
    VALUES
      (v_opid,
       COALESCE(v_opt.reference_code, v_opt.description), v_opt.description,
       v_opt.color, v_opt.cfg, v_route, v_opt.quantity, 'aguardando')
    RETURNING id INTO v_poi;
    UPDATE public.sales_order_items SET production_order_item_id = v_poi WHERE id = v_opt.item_id;
    INSERT INTO public.entity_relations (from_type, from_id, to_type, to_id, relation, created_by)
    VALUES ('sales_order', v_oid, 'production_order', v_opid, 'gerou_op', NULL)
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.sales_orders
     SET status = 'liberado_pcp', submitted_at = now(), approved_at = now(), released_at = now(),
         total_value = (SELECT COALESCE(SUM(quantity * unit_price),0) FROM public.sales_order_items WHERE order_id = v_oid)
   WHERE id = v_oid;

  RAISE NOTICE 'Pedidos DEMO criados: A=% B=% C=% D=% E=%', v_numA, v_numB, v_numC, v_numD, v_numE;
END
$do$;

-- ---------------------------------------------------------------------------
-- Conferência — o esperado: 5 pedidos · 6 itens · 1 OP no PCP com 2 itens ·
-- rota DEMO com 4 etapas · configs 5
-- ---------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.sales_orders WHERE notes ILIKE '%KARILU-DEMO%') AS pedidos_demo,
  (SELECT count(*) FROM public.sales_order_items i JOIN public.sales_orders o ON o.id = i.order_id
    WHERE o.notes ILIKE '%KARILU-DEMO%') AS itens,
  (SELECT count(*) FROM public.production_orders WHERE notes ILIKE '%KARILU-DEMO%') AS op_pcp,
  (SELECT count(*) FROM public.production_order_items poi JOIN public.production_orders po ON po.id = poi.production_order_id
    WHERE po.notes ILIKE '%KARILU-DEMO%') AS itens_na_op,
  (SELECT count(*) FROM public.production_route_steps s JOIN public.production_routes r ON r.id = s.route_id
    WHERE r.code = 'ROT-KAR-DEMO') AS etapas_rota;

SELECT o.number, o.status, c.code AS cliente,
       (SELECT count(*) FROM public.sales_order_items i WHERE i.order_id = o.id) AS linhas,
       o.total_value
  FROM public.sales_orders o
  JOIN public.customers c ON c.id = o.customer_id
 WHERE o.notes ILIKE '%KARILU-DEMO%'
 ORDER BY o.created_at;

-- Rollback completo (na ordem; filhos caem em cascata):
--   DELETE FROM public.entity_relations WHERE from_type = 'sales_order' AND from_id IN (SELECT id FROM public.sales_orders WHERE notes ILIKE '%KARILU-DEMO%');
--   DELETE FROM public.production_orders WHERE notes ILIKE '%KARILU-DEMO%';
--   DELETE FROM public.sales_orders WHERE notes ILIKE '%KARILU-DEMO%';
--   DELETE FROM public.configuration_routes WHERE route_id = (SELECT id FROM public.production_routes WHERE code = 'ROT-KAR-DEMO');
--   DELETE FROM public.production_routes WHERE code = 'ROT-KAR-DEMO';
--   UPDATE public.catalog_products SET configuration_id = NULL WHERE code LIKE 'KAR-FUT-%' AND configuration_id IN (SELECT id FROM public.product_configurations WHERE description LIKE '%KARILU-PEDIDOS%');
--   DELETE FROM public.product_configurations WHERE description LIKE '%KARILU-PEDIDOS%';
