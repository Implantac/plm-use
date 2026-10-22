ALTER TABLE public.production_order_items ADD COLUMN IF NOT EXISTS sales_order_item_id uuid NULL REFERENCES public.sales_order_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_poi_sales_order_item ON public.production_order_items(sales_order_item_id);
ALTER TABLE public.sales_order_item_materials ADD COLUMN IF NOT EXISTS stock_item_id uuid NULL REFERENCES public.stock_item(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_soim_stock_item ON public.sales_order_item_materials(stock_item_id);

CREATE OR REPLACE FUNCTION public.release_sales_order_to_pcp(_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.sales_orders%ROWTYPE;
  v_item record; v_route uuid; v_op uuid; v_poi uuid; v_config uuid; v_pend int;
  v_wh uuid;
BEGIN
  IF NOT public.can_plan_pcp(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para liberar pedido para PCP.';
  END IF;
  SELECT * INTO v_order FROM public.sales_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado.'; END IF;
  IF v_order.status <> 'aprovado' THEN
    RAISE EXCEPTION 'Pedido precisa estar aprovado (status atual: %).', v_order.status;
  END IF;

  SELECT count(*) INTO v_pend FROM public.sales_order_items
   WHERE order_id = _order_id AND cost_status <> 'aprovado';
  IF v_pend > 0 THEN
    RAISE EXCEPTION '% item(ns) sem custo aprovado.', v_pend;
  END IF;

  INSERT INTO public.production_orders (number, status, priority, planned_end, notes)
  VALUES ('OP-'||v_order.number, 'planejada', 'media', v_order.due_date,
          'Gerada do pedido '||v_order.number)
  RETURNING id INTO v_op;

  FOR v_item IN
    SELECT i.*, p.configuration_id AS cfg
      FROM public.sales_order_items i
      JOIN public.catalog_products p ON p.id = i.catalog_product_id
     WHERE i.order_id = _order_id
     ORDER BY i.line_no
  LOOP
    v_config := v_item.cfg;
    SELECT route_id INTO v_route
      FROM public.configuration_routes
     WHERE configuration_id = v_config
     ORDER BY is_default DESC, created_at
     LIMIT 1;
    IF v_route IS NULL THEN
      RAISE EXCEPTION 'Item % sem rota padrao — configure em PCP > Rotas.', v_item.description;
    END IF;

    INSERT INTO public.production_order_items
      (production_order_id, reference_code, reference_name, color, configuration_id,
       route_id, quantity_planned, status, sales_order_item_id)
    VALUES
      (v_op, COALESCE(v_item.reference_code, v_item.description), v_item.description,
       v_item.color, v_config, v_route, v_item.quantity, 'aguardando', v_item.id)
    RETURNING id INTO v_poi;

    UPDATE public.sales_order_items
       SET production_order_item_id = v_poi
     WHERE id = v_item.id;

    INSERT INTO public.entity_relations (from_type, from_id, to_type, to_id, relation, created_by)
    VALUES ('sales_order', _order_id, 'production_order', v_op, 'gerou_op', auth.uid())
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Reservas de material (fase A): só materiais vinculados a item de estoque.
  SELECT id INTO v_wh FROM public.warehouse WHERE code = 'ALM-CENTRAL' ORDER BY code LIMIT 1;
  IF v_wh IS NOT NULL THEN
    INSERT INTO public.stock_reservation (item_id, warehouse_id, qty, ref_type, ref_id, notes, created_by)
    SELECT m.stock_item_id, v_wh,
           ROUND(m.consumption * (1 + COALESCE(m.waste_pct,0)/100) * i.quantity, 4),
           'op', v_op, 'Reservado na liberação do pedido ' || v_order.number, auth.uid()
      FROM public.sales_order_item_materials m
      JOIN public.sales_order_items i ON i.id = m.item_id
     WHERE i.order_id = _order_id
       AND m.stock_item_id IS NOT NULL
       AND ROUND(m.consumption * (1 + COALESCE(m.waste_pct,0)/100) * i.quantity, 4) > 0;
  END IF;

  UPDATE public.sales_orders SET status = 'liberado_pcp', released_at = now() WHERE id = _order_id;
  RETURN v_op;
END $function$;