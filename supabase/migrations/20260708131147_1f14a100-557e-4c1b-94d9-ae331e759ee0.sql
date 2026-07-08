
-- ============================================================
-- ONDA 2: Cálculos automáticos (LEC / PP / ABC)
-- ============================================================

-- 1) Função de cálculo dos parâmetros de LEC/PP para um item
CREATE OR REPLACE FUNCTION public.calc_stock_params_row(_row public.stock_item)
RETURNS public.stock_item
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  r public.stock_item := _row;
  annual_demand numeric;
BEGIN
  -- Safety stock = Z * σ * √LT
  r.safety_stock := ROUND(
    (r.service_factor * r.demand_stddev * sqrt(GREATEST(r.lead_time_days, 0)))::numeric,
    4
  );

  -- Reorder point = consumo diário * LT + SS
  r.reorder_point := ROUND(
    (r.demand_avg_daily * r.lead_time_days + r.safety_stock)::numeric,
    4
  );

  -- EOQ (Wilson): √(2·D·S / H) — só quando temos custos definidos
  annual_demand := COALESCE(r.annual_qty, 0);
  IF annual_demand > 0 AND r.order_cost > 0 AND r.holding_cost_unit > 0 THEN
    r.eoq := ROUND(
      sqrt(2 * annual_demand * r.order_cost / r.holding_cost_unit)::numeric,
      4
    );
  ELSE
    -- Sem custos: aproxima por cobertura mínima (LT * consumo diário) como lote-alvo
    r.eoq := ROUND(GREATEST(r.demand_avg_daily * r.lead_time_days, 0)::numeric, 4);
  END IF;

  r.min_qty := r.safety_stock;
  r.max_qty := ROUND((r.safety_stock + r.eoq)::numeric, 4);

  IF r.demand_avg_daily > 0 THEN
    r.coverage_days_min := GREATEST(CEIL((r.safety_stock / r.demand_avg_daily))::int, 0);
  ELSE
    r.coverage_days_min := 0;
  END IF;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.calc_stock_params_row(public.stock_item) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calc_stock_params_row(public.stock_item) TO authenticated, service_role;

-- 2) Trigger: recalcula parâmetros antes de INSERT/UPDATE relevante
CREATE OR REPLACE FUNCTION public.trg_stock_item_calc_params()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  calc public.stock_item;
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.lead_time_days    IS DISTINCT FROM OLD.lead_time_days
     OR NEW.demand_avg_daily  IS DISTINCT FROM OLD.demand_avg_daily
     OR NEW.demand_stddev     IS DISTINCT FROM OLD.demand_stddev
     OR NEW.service_factor    IS DISTINCT FROM OLD.service_factor
     OR NEW.annual_qty        IS DISTINCT FROM OLD.annual_qty
     OR NEW.order_cost        IS DISTINCT FROM OLD.order_cost
     OR NEW.holding_cost_unit IS DISTINCT FROM OLD.holding_cost_unit THEN
    calc := public.calc_stock_params_row(NEW);
    NEW.safety_stock      := calc.safety_stock;
    NEW.reorder_point     := calc.reorder_point;
    NEW.eoq               := calc.eoq;
    NEW.min_qty           := calc.min_qty;
    NEW.max_qty           := calc.max_qty;
    NEW.coverage_days_min := calc.coverage_days_min;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_item_calc ON public.stock_item;
CREATE TRIGGER trg_stock_item_calc
  BEFORE INSERT OR UPDATE ON public.stock_item
  FOR EACH ROW EXECUTE FUNCTION public.trg_stock_item_calc_params();

-- 3) Log de recálculo → entity_events
CREATE OR REPLACE FUNCTION public.log_stock_item_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, actor, payload)
    VALUES ('stock_item', NEW.id, 'stock.item.created', NEW.created_by,
      jsonb_build_object('code', NEW.code, 'name', NEW.name, 'category', NEW.category));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.abc_class IS DISTINCT FROM OLD.abc_class THEN
      INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
      VALUES ('stock_item', NEW.id, 'stock.item.abc_reclassified',
        COALESCE(OLD.abc_class::text, 'null'), COALESCE(NEW.abc_class::text,'null'),
        NEW.updated_by,
        jsonb_build_object('code', NEW.code, 'annual_revenue', NEW.annual_revenue));
    END IF;
    IF NEW.reorder_point IS DISTINCT FROM OLD.reorder_point
       OR NEW.safety_stock IS DISTINCT FROM OLD.safety_stock
       OR NEW.eoq IS DISTINCT FROM OLD.eoq THEN
      INSERT INTO public.entity_events(entity_type, entity_id, event_type, actor, payload)
      VALUES ('stock_item', NEW.id, 'stock.item.params_recalculated', NEW.updated_by,
        jsonb_build_object(
          'code', NEW.code,
          'safety_stock', NEW.safety_stock,
          'reorder_point', NEW.reorder_point,
          'eoq', NEW.eoq,
          'min_qty', NEW.min_qty,
          'max_qty', NEW.max_qty
        ));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_stock_item_event() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_stock_item_events ON public.stock_item;
CREATE TRIGGER trg_stock_item_events
  AFTER INSERT OR UPDATE ON public.stock_item
  FOR EACH ROW EXECUTE FUNCTION public.log_stock_item_event();

-- 4) Classify ABC — recalcula classe A/B/C por faturamento acumulado
CREATE OR REPLACE FUNCTION public.classify_abc(_a_threshold numeric DEFAULT 0.80, _b_threshold numeric DEFAULT 0.95)
RETURNS TABLE(item_id uuid, old_class public.abc_class, new_class public.abc_class, cumulative_pct numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_revenue numeric;
  rec RECORD;
  running numeric := 0;
  pct numeric;
  new_c public.abc_class;
BEGIN
  IF NOT public.has_stock_write_role(auth.uid()) THEN
    RAISE EXCEPTION 'insufficient_privilege: classify_abc requires stock write role';
  END IF;

  SELECT COALESCE(SUM(annual_revenue), 0) INTO total_revenue
  FROM public.stock_item
  WHERE is_active = true AND annual_revenue > 0;

  IF total_revenue <= 0 THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT id, abc_class, annual_revenue
    FROM public.stock_item
    WHERE is_active = true AND annual_revenue > 0
    ORDER BY annual_revenue DESC
  LOOP
    running := running + rec.annual_revenue;
    pct := running / total_revenue;
    IF pct <= _a_threshold THEN
      new_c := 'A';
    ELSIF pct <= _b_threshold THEN
      new_c := 'B';
    ELSE
      new_c := 'C';
    END IF;

    IF new_c IS DISTINCT FROM rec.abc_class THEN
      UPDATE public.stock_item
         SET abc_class = new_c,
             updated_by = auth.uid()
       WHERE id = rec.id;
    END IF;

    item_id := rec.id;
    old_class := rec.abc_class;
    new_class := new_c;
    cumulative_pct := ROUND(pct * 100, 4);
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.classify_abc(numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.classify_abc(numeric, numeric) TO authenticated, service_role;

-- 5) Trigger em stock_movement: alerta de reposição quando saldo <= reorder_point
CREATE OR REPLACE FUNCTION public.trg_stock_movement_low_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur_balance numeric;
  it public.stock_item;
BEGIN
  SELECT * INTO it FROM public.stock_item WHERE id = NEW.item_id;
  IF it.id IS NULL OR it.reorder_point <= 0 THEN
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
        'current_balance', cur_balance,
        'reorder_point', it.reorder_point,
        'safety_stock', it.safety_stock,
        'abc_class', it.abc_class
      ));
  END IF;

  -- log da movimentação sempre
  INSERT INTO public.entity_events(entity_type, entity_id, event_type, actor, payload)
  VALUES ('stock_movement', NEW.id, 'stock.movement.registered', NEW.created_by,
    jsonb_build_object(
      'item_id', NEW.item_id,
      'warehouse_id', NEW.warehouse_id,
      'kind', NEW.kind,
      'qty', NEW.qty,
      'ref_type', NEW.ref_type,
      'ref_id', NEW.ref_id
    ));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_stock_movement_low_balance() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_stock_mov_events ON public.stock_movement;
CREATE TRIGGER trg_stock_mov_events
  AFTER INSERT ON public.stock_movement
  FOR EACH ROW EXECUTE FUNCTION public.trg_stock_movement_low_balance();

-- 6) Trigger em stock_reservation: log eventos
CREATE OR REPLACE FUNCTION public.log_stock_reservation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, to_status, actor, payload)
    VALUES ('stock_reservation', NEW.id, 'stock.reservation.created', NEW.status::text, NEW.created_by,
      jsonb_build_object('item_id', NEW.item_id, 'qty', NEW.qty, 'ref_type', NEW.ref_type, 'ref_id', NEW.ref_id));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('stock_reservation', NEW.id,
      CASE NEW.status
        WHEN 'consumida' THEN 'stock.reservation.consumed'
        WHEN 'cancelada' THEN 'stock.reservation.cancelled'
        ELSE 'stock.reservation.status_changed'
      END,
      OLD.status::text, NEW.status::text, auth.uid(),
      jsonb_build_object('item_id', NEW.item_id, 'qty', NEW.qty));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_stock_reservation_event() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_stock_res_events ON public.stock_reservation;
CREATE TRIGGER trg_stock_res_events
  AFTER INSERT OR UPDATE ON public.stock_reservation
  FOR EACH ROW EXECUTE FUNCTION public.log_stock_reservation_event();
