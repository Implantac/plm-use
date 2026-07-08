-- Broadcast low-balance alerts to users with stock roles via notifications table.
CREATE OR REPLACE FUNCTION public.trg_stock_movement_low_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cur_balance numeric;
  it public.stock_item;
  target_user uuid;
  ext_id text;
BEGIN
  SELECT * INTO it FROM public.stock_item WHERE id = NEW.item_id;
  IF it.id IS NULL OR it.reorder_point <= 0 THEN
    -- still log the movement
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, actor, payload)
    VALUES ('stock_movement', NEW.id, 'stock.movement.registered', NEW.created_by,
      jsonb_build_object('item_id', NEW.item_id, 'warehouse_id', NEW.warehouse_id,
                         'kind', NEW.kind, 'qty', NEW.qty,
                         'ref_type', NEW.ref_type, 'ref_id', NEW.ref_id));
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(CASE
    WHEN kind IN ('in','transfer_in','count') THEN qty
    WHEN kind IN ('out','transfer_out')       THEN -qty
    WHEN kind = 'adjust'                       THEN qty
    ELSE 0 END), 0)
  INTO cur_balance
  FROM public.stock_movement
  WHERE item_id = NEW.item_id;

  IF cur_balance <= it.reorder_point THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, actor, payload)
    VALUES ('stock_item', NEW.item_id, 'stock.low_balance_alert', NEW.created_by,
      jsonb_build_object(
        'code', it.code,
        'name', it.name,
        'current_balance', cur_balance,
        'reorder_point', it.reorder_point,
        'safety_stock', it.safety_stock,
        'abc_class', it.abc_class
      ));

    -- Bucket notifications by date so we don't spam the same user multiple times per day per item.
    ext_id := 'stock_low:' || it.id::text || ':' || to_char(now(), 'YYYY-MM-DD');

    FOR target_user IN
      SELECT DISTINCT user_id FROM public.user_roles
      WHERE role::text IN ('admin','manager','pcp','qualidade','coordenador_produto','almoxarifado')
    LOOP
      INSERT INTO public.notifications(user_id, external_id, severity, title, detail, source, href)
      VALUES (
        target_user,
        ext_id,
        CASE WHEN cur_balance <= it.safety_stock THEN 'critical' ELSE 'warn' END,
        'Estoque baixo · ' || it.code,
        it.name || ' — saldo ' || ROUND(cur_balance, 2) || ' ' || it.unit ||
          ' (PP ' || ROUND(it.reorder_point, 2) || ', SS ' || ROUND(it.safety_stock, 2) || ')',
        'inventory',
        '/inventory'
      )
      ON CONFLICT (user_id, external_id) DO NOTHING;
    END LOOP;
  END IF;

  INSERT INTO public.entity_events(entity_type, entity_id, event_type, actor, payload)
  VALUES ('stock_movement', NEW.id, 'stock.movement.registered', NEW.created_by,
    jsonb_build_object(
      'item_id', NEW.item_id, 'warehouse_id', NEW.warehouse_id,
      'kind', NEW.kind, 'qty', NEW.qty,
      'ref_type', NEW.ref_type, 'ref_id', NEW.ref_id
    ));

  RETURN NEW;
END;
$function$;