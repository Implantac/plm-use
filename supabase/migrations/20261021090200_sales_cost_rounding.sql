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
