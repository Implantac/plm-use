-- =============================================================================
-- FLUXO DE PEDIDO — PARTE 3 DE 3
--
-- Use estas partes SÓ se o SQL editor recusar/cortar o arquivo único de 88 KB.
-- Se ele aceitar o APLICAR-EM-PRODUCAO.sql inteiro, use o arquivo único.
--
-- ORDEM OBRIGATÓRIA: parte 1 → parte 2 → parte 3. Cada parte termina em um
-- ponto seguro (fim de uma migration), então parar entre elas não deixa o
-- banco pela metade. O conjunto é reexecutável: reaplicar uma parte não quebra.
--
-- PARTE 3 — arredondamento do custo, visibilidade da timeline, preço sugerido, ficha técnica + VERIFICAÇÃO.
-- =============================================================================

-- 20261021090200_sales_cost_rounding.sql — Arredondamento do custo apenas no total
-- =============================================================================

-- ============================================================================
-- Custo do pedido: arredondar SOMENTE no fim (paridade com o motor TypeScript)
--
-- Problema encontrado na certificacao E2E (2026-10-21): o recalc gravava
-- total_cost de CADA linha de material arredondado em 2 casas e depois somava.
-- O motor src/lib/sales/cost.ts (e o parecer) arredonda so o total. Em linhas
-- pequenas isso divergia de verdade: 5 linhas de R$ 0,001 davam R$ 0,00 no
-- banco e R$ 0,01 na tela.
--
-- Correcao: total_cost das linhas passa a guardar 4 casas (sem arredondar) e o
-- arredondamento acontece uma vez, no total do item. Assim SQL e TS produzem o
-- mesmo numero em qualquer combinacao de materiais.
-- ============================================================================

ALTER TABLE public.sales_order_item_materials
  ALTER COLUMN total_cost TYPE numeric(14,4);

ALTER TABLE public.sales_order_item_operations
  ALTER COLUMN total_cost TYPE numeric(14,4);

COMMENT ON COLUMN public.sales_order_item_materials.total_cost IS
  'Consumo por peca x perda x custo unitario x quantidade do item. 4 casas: o arredondamento para centavos acontece no total do item (recalc_sales_order_item).';

CREATE OR REPLACE FUNCTION public.recalc_sales_order_item(_item_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item public.sales_order_items%ROWTYPE;
  v_set public.cost_settings%ROWTYPE;
  v_mat numeric := 0; v_op numeric := 0; v_setup numeric := 0;
  v_ind numeric := 0; v_oh numeric := 0; v_unit numeric := 0;
  v_margin numeric; v_price numeric;
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para calcular custo.';
  END IF;
  SELECT * INTO v_item FROM public.sales_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  SELECT * INTO v_set FROM public.cost_settings LIMIT 1;

  -- Consumo e por PECA; o total da linha multiplica pela quantidade do item.
  -- Sem arredondar aqui: o centavo e fechado no total (ver comentario acima).
  UPDATE public.sales_order_item_materials m
     SET total_cost = m.consumption * (1 + m.waste_pct/100) * m.unit_cost
           * COALESCE((SELECT i.quantity FROM public.sales_order_items i WHERE i.id = m.item_id), 0)
   WHERE m.item_id = _item_id;

  UPDATE public.sales_order_item_operations
     SET total_cost = (unit_cost * driver_qty) + setup_cost
   WHERE item_id = _item_id;

  SELECT round(COALESCE(SUM(total_cost),0), 2) INTO v_mat
    FROM public.sales_order_item_materials WHERE item_id = _item_id;

  SELECT round(COALESCE(SUM(unit_cost * driver_qty),0), 2),
         round(COALESCE(SUM(setup_cost),0), 2)
    INTO v_op, v_setup
    FROM public.sales_order_item_operations WHERE item_id = _item_id;

  v_ind := v_mat + v_op + v_setup;
  v_oh := round(v_ind * COALESCE(v_set.default_overhead_pct,0) / 100, 2);
  v_unit := CASE WHEN v_item.quantity > 0 THEN round((v_ind + v_oh) / v_item.quantity, 2) ELSE 0 END;
  v_price := v_item.unit_price;
  v_margin := CASE WHEN v_price > 0 THEN round((v_price - v_unit) / v_price * 100, 2) ELSE NULL END;

  INSERT INTO public.sales_order_item_costs
    (item_id, materials_total, operations_total, setup_total, overhead_pct,
     industrial_cost, unit_cost, margin_pct, suggested_price, status, detailed_by, detailed_at, updated_at)
  VALUES
    (_item_id, v_mat, v_op, v_setup, COALESCE(v_set.default_overhead_pct,0),
     v_ind + v_oh, v_unit, v_margin, round(v_unit * (1 + COALESCE(v_set.default_markup_pct,0)/100), 2),
     'concluido', auth.uid(), now(), now())
  ON CONFLICT (item_id) DO UPDATE SET
    materials_total = EXCLUDED.materials_total,
    operations_total = EXCLUDED.operations_total,
    setup_total = EXCLUDED.setup_total,
    overhead_pct = EXCLUDED.overhead_pct,
    industrial_cost = EXCLUDED.industrial_cost,
    unit_cost = EXCLUDED.unit_cost,
    margin_pct = EXCLUDED.margin_pct,
    suggested_price = EXCLUDED.suggested_price,
    status = CASE WHEN sales_order_item_costs.status = 'aprovado'
                  THEN 'aprovado' ELSE 'concluido' END,
    detailed_by = auth.uid(), detailed_at = now(), updated_at = now();

  UPDATE public.sales_order_items SET cost_status = 'custo_concluido' WHERE id = _item_id;
  UPDATE public.sales_orders SET status = 'em_custo'
   WHERE id = v_item.order_id AND status = 'enviado';
  RETURN v_unit;
END $$;

REVOKE ALL ON FUNCTION public.recalc_sales_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recalc_sales_order_item(uuid) TO authenticated;

-- =============================================================================
-- 20261021090300_sales_order_events_visibility.sql — Timeline do pedido visível para custo e PCP
-- =============================================================================

-- ============================================================================
-- Visibilidade da timeline do pedido para quem assume o pedido depois do vendedor
--
-- Defeito encontrado na certificacao E2E (2026-10-21): a policy
-- entity_events_select_scoped (20260117) deixa ver apenas o proprio ator,
-- admin/manager, e alguns pares papel x entity_type especificos (pcp ve lote,
-- qualidade ve capa, coordenador_produto ve reference...). 'sales_order' nao
-- estava em nenhuma lista, entao engenharia de custo e PCP abriam o pedido e
-- viam a timeline VAZIA — justamente os papeis que mais precisam do historico.
--
-- Solucao aditiva: policy permissiva nova (policies de SELECT sao OR entre si),
-- sem tocar na policy original. Quem enxerga: quem calcula custo e quem planeja
-- PCP; vendedor continua vendo os seus (como ator) e admin/manager veem tudo.
-- ============================================================================

DROP POLICY IF EXISTS entity_events_select_sales_order ON public.entity_events;
DROP POLICY IF EXISTS entity_events_select_sales_order ON public.entity_events;
CREATE POLICY entity_events_select_sales_order ON public.entity_events
  FOR SELECT TO authenticated
  USING (
    entity_type IN ('sales_order', 'sales_order_item')
    AND public.is_member(auth.uid())
    AND (public.can_cost(auth.uid()) OR public.can_plan_pcp(auth.uid()))
  );

COMMENT ON POLICY entity_events_select_sales_order ON public.entity_events IS
  'Timeline do pedido visivel para engenharia de custo e PCP (quem assume o pedido apos o vendedor).';

-- =============================================================================
-- 20261021090400_sales_suggested_price.sql — Preço sugerido = piso de margem quando não há markup
-- =============================================================================

-- ============================================================================
-- Preco sugerido: quando nao ha markup configurado, sugere o preco de margem minima
--
-- Achado na certificacao E2E (2026-10-21): cost_settings.default_markup_pct nasce
-- em 0, e o recalc fazia suggested_price = unit_cost * (1 + 0) = unit_cost. Na
-- tela de detalhe isso aparecia como "Custo/peca R$ 68,44 - sugerido R$ 68,44":
-- ou seja, o sistema sugeria vender a preco de custo.
--
-- Regra nova: markup configurado (> 0) manda; sem markup, o sugerido passa a ser
-- o preco que entrega a margem MINIMA aceitavel (cost_settings.min_margin_pct,
-- padrao 25%) — o piso de negociacao, nao o custo.
-- Formula: preco = custo / (1 - margem/100), a mesma de priceForMargin() no
-- motor TypeScript (src/lib/sales/cost.ts).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalc_sales_order_item(_item_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item public.sales_order_items%ROWTYPE;
  v_set public.cost_settings%ROWTYPE;
  v_mat numeric := 0; v_op numeric := 0; v_setup numeric := 0;
  v_ind numeric := 0; v_oh numeric := 0; v_unit numeric := 0;
  v_margin numeric; v_price numeric; v_suggested numeric;
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para calcular custo.';
  END IF;
  SELECT * INTO v_item FROM public.sales_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  SELECT * INTO v_set FROM public.cost_settings LIMIT 1;

  -- Consumo e por PECA; total da linha multiplica pela quantidade do item.
  -- Sem arredondar por linha: o centavo e fechado no total (20261021090200).
  UPDATE public.sales_order_item_materials m
     SET total_cost = m.consumption * (1 + m.waste_pct/100) * m.unit_cost
           * COALESCE((SELECT i.quantity FROM public.sales_order_items i WHERE i.id = m.item_id), 0)
   WHERE m.item_id = _item_id;

  UPDATE public.sales_order_item_operations
     SET total_cost = (unit_cost * driver_qty) + setup_cost
   WHERE item_id = _item_id;

  SELECT round(COALESCE(SUM(total_cost),0), 2) INTO v_mat
    FROM public.sales_order_item_materials WHERE item_id = _item_id;

  SELECT round(COALESCE(SUM(unit_cost * driver_qty),0), 2),
         round(COALESCE(SUM(setup_cost),0), 2)
    INTO v_op, v_setup
    FROM public.sales_order_item_operations WHERE item_id = _item_id;

  v_ind := v_mat + v_op + v_setup;
  v_oh := round(v_ind * COALESCE(v_set.default_overhead_pct,0) / 100, 2);
  v_unit := CASE WHEN v_item.quantity > 0 THEN round((v_ind + v_oh) / v_item.quantity, 2) ELSE 0 END;
  v_price := v_item.unit_price;
  v_margin := CASE WHEN v_price > 0 THEN round((v_price - v_unit) / v_price * 100, 2) ELSE NULL END;

  -- Preco sugerido: markup quando configurado; senao o piso da margem minima.
  v_suggested := CASE
    WHEN v_unit <= 0 THEN 0
    WHEN COALESCE(v_set.default_markup_pct,0) > 0
      THEN round(v_unit * (1 + v_set.default_markup_pct/100), 2)
    WHEN COALESCE(v_set.min_margin_pct,0) >= 100 THEN v_unit
    ELSE round(v_unit / (1 - v_set.min_margin_pct/100), 2)
  END;

  INSERT INTO public.sales_order_item_costs
    (item_id, materials_total, operations_total, setup_total, overhead_pct,
     industrial_cost, unit_cost, margin_pct, suggested_price, status, detailed_by, detailed_at, updated_at)
  VALUES
    (_item_id, v_mat, v_op, v_setup, COALESCE(v_set.default_overhead_pct,0),
     v_ind + v_oh, v_unit, v_margin, v_suggested,
     'concluido', auth.uid(), now(), now())
  ON CONFLICT (item_id) DO UPDATE SET
    materials_total = EXCLUDED.materials_total,
    operations_total = EXCLUDED.operations_total,
    setup_total = EXCLUDED.setup_total,
    overhead_pct = EXCLUDED.overhead_pct,
    industrial_cost = EXCLUDED.industrial_cost,
    unit_cost = EXCLUDED.unit_cost,
    margin_pct = EXCLUDED.margin_pct,
    suggested_price = EXCLUDED.suggested_price,
    status = CASE WHEN sales_order_item_costs.status = 'aprovado'
                  THEN 'aprovado' ELSE 'concluido' END,
    detailed_by = auth.uid(), detailed_at = now(), updated_at = now();

  UPDATE public.sales_order_items SET cost_status = 'custo_concluido' WHERE id = _item_id;
  UPDATE public.sales_orders SET status = 'em_custo'
   WHERE id = v_item.order_id AND status = 'enviado';
  RETURN v_unit;
END $$;

REVOKE ALL ON FUNCTION public.recalc_sales_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recalc_sales_order_item(uuid) TO authenticated;

-- =============================================================================
-- 20261021090500_sales_technical_sheet_full.sql — Ficha técnica com quantidade de trabalho por operação
-- =============================================================================

-- ============================================================================
-- Ficha tecnica do pedido: quantidade de trabalho por operacao e consumo total
--
-- Achado no teste de UI (21/10): `order_item_technical_sheet` devolvia a operacao
-- e o setor, mas nao QUANTO fazer. O PCP via "Bordado escudo" sem saber que sao
-- 6,5 mil pontos por peca (65 no pedido) nem "Costura reta" sem os 22 min/peca
-- (220 min). Sem isso a ficha nao serve para o chao de fabrica — e essa e a
-- unica saida de dados sem custo que a producao tem.
--
-- Tambem faltava o consumo total de material por item: a ficha mostrava so o
-- consumo por peca, obrigando o PCP a multiplicar na mao.
--
-- Mudanca aditiva: mesmas chaves de antes + driver/driver_qty/total_qty na
-- operacao e consumption_total no material. Nenhum valor de custo e exposto
-- (unit_cost, total_cost, setup continuam fora — ha teste garantindo).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.order_item_technical_sheet(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_out jsonb;
BEGIN
  IF NOT public.is_member(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao.';
  END IF;
  SELECT jsonb_build_object(
    'order', jsonb_build_object('number', o.number, 'status', o.status,
                                'due_date', o.due_date, 'customer', c.name,
                                'released_at', o.released_at),
    'items', COALESCE(jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'description', i.description,
        'color', i.color,
        'quantity', i.quantity,
        'reference_code', i.reference_code,
        'tech_status', i.tech_status,
        'grade', (SELECT COALESCE(jsonb_object_agg(s.size, s.quantity), '{}'::jsonb)
                    FROM public.sales_order_item_sizes s WHERE s.item_id = i.id),
        'options', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'name', co.name, 'sector', co.sector,
                        'quantity', soo.quantity, 'spec', soo.spec)), '[]'::jsonb)
                      FROM public.sales_order_item_options soo
                      JOIN public.catalog_options co ON co.id = soo.option_id
                     WHERE soo.item_id = i.id),
        'operations', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'seq', op.seq, 'sector', op.sector, 'operation', op.operation,
                        'outsourced', op.outsourced,
                        'driver', op.driver, 'driver_qty', op.driver_qty,
                        'per_piece', CASE WHEN op.driver = 'lote' THEN NULL
                                     WHEN i.quantity > 0
                                     THEN round(op.driver_qty / i.quantity, 3) ELSE op.driver_qty END)
                      ORDER BY op.seq), '[]'::jsonb)
                      FROM public.sales_order_item_operations op WHERE op.item_id = i.id),
        'materials', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'kind', m.kind, 'material', m.material, 'unit', m.unit,
                        'consumption', m.consumption, 'waste_pct', m.waste_pct,
                        'consumption_total', round(m.consumption * (1 + m.waste_pct / 100) * i.quantity, 3))
                      ORDER BY m.kind, m.material), '[]'::jsonb)
                      FROM public.sales_order_item_materials m WHERE m.item_id = i.id)
      ) ORDER BY i.line_no) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb)
  )
  INTO v_out
  FROM public.sales_orders o
  JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.sales_order_items i ON i.order_id = o.id
  WHERE o.id = _order_id
  GROUP BY o.number, o.status, o.due_date, c.name, o.released_at;
  RETURN COALESCE(v_out, '{}'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.order_item_technical_sheet(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.order_item_technical_sheet(uuid) TO authenticated;


-- =============================================================================
-- VERIFICAÇÃO — copie daqui para baixo, DESCOMENTE e rode numa execução separada.
-- Esperado: 13 tabelas, 8 funções, RLS ligada nas duas tabelas de custo.
-- =============================================================================
-- SELECT 'tabelas do pedido' AS checagem,
--        count(*) FILTER (WHERE to_regclass('public.' || nome) IS NOT NULL) || ' de 13' AS resultado
--   FROM unnest(ARRAY['customers','catalog_products','catalog_option_groups','catalog_options',
--                     'sales_orders','sales_order_items','sales_order_item_sizes',
--                     'sales_order_item_options','sales_order_item_materials',
--                     'sales_order_item_operations','sales_order_item_costs',
--                     'cost_settings','materials']) AS t(nome);
--
-- SELECT 'funcoes do fluxo' AS checagem,
--        count(*) || ' de 8' AS resultado
--   FROM unnest(ARRAY['next_sales_order_number','submit_sales_order','recalc_sales_order_item',
--                     'approve_sales_order_item','release_sales_order_to_pcp',
--                     'order_item_technical_sheet','can_sell','can_cost']) AS f(nome)
--  WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--                 WHERE n.nspname = 'public' AND p.proname = f.nome);
--
-- SELECT 'RLS ligada (custo)' AS checagem,
--        count(*) || ' de 2' AS resultado
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--  WHERE n.nspname = 'public' AND c.relname IN ('sales_order_item_costs','sales_order_item_materials')
--    AND c.relrowsecurity;
--
-- SELECT 'politicas RLS do pedido' AS checagem, count(*) || ' politicas' AS resultado
--   FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'sales_order%';
--
-- SELECT 'settings de custo' AS checagem,
--        CASE WHEN EXISTS (SELECT 1 FROM public.cost_settings) THEN 'seed OK' ELSE 'FALTANDO' END AS resultado;
