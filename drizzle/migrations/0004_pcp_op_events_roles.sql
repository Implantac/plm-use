CREATE OR REPLACE FUNCTION public.can_plan_pcp(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _uid AND role IN ('admin','manager','pcp'))
$$;
REVOKE EXECUTE ON FUNCTION public.can_plan_pcp(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_plan_pcp(uuid) TO authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['production_routes','production_route_steps','product_configurations','configuration_routes','production_orders','production_order_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "pcp insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "pcp update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "pcp delete" ON public.%I', t);
    EXECUTE format('CREATE POLICY "pcp insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_plan_pcp(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "pcp update" ON public.%I FOR UPDATE TO authenticated USING (public.can_plan_pcp(auth.uid())) WITH CHECK (public.can_plan_pcp(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "pcp delete" ON public.%I FOR DELETE TO authenticated USING (public.can_plan_pcp(auth.uid()))', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.change_item_route(_item_id uuid, _route_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item production_order_items%ROWTYPE; v_first uuid; v_name text;
BEGIN
  IF NOT public.can_plan_pcp(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para trocar a rota.'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN RAISE EXCEPTION 'Informe a justificativa da troca de rota.'; END IF;
  SELECT * INTO v_item FROM production_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado.'; END IF;
  IF v_item.route_id = _route_id THEN RAISE EXCEPTION 'O item já está nessa rota.'; END IF;
  IF EXISTS (SELECT 1 FROM production_passages WHERE production_order_item_id = _item_id AND type <> 'desvio') THEN
    RAISE EXCEPTION 'Só é possível trocar a rota antes da primeira passagem do item.';
  END IF;
  SELECT id INTO v_first FROM production_route_steps WHERE route_id = _route_id ORDER BY sequence LIMIT 1;
  IF v_first IS NULL THEN RAISE EXCEPTION 'A rota escolhida não tem etapas.'; END IF;
  SELECT full_name INTO v_name FROM profiles WHERE id = auth.uid();
  DELETE FROM production_item_step_balance WHERE item_id = _item_id;
  UPDATE production_order_items SET route_id = _route_id WHERE id = _item_id;
  INSERT INTO production_item_step_balance(item_id, step_id, quantity) VALUES (_item_id, v_first, v_item.quantity_planned);
  INSERT INTO production_passages(batch_id, production_order_id, production_order_item_id, route_id, origin_step_id, destination_step_id, quantity, type, responsible_id, responsible_name, observation)
  VALUES (gen_random_uuid(), v_item.production_order_id, _item_id, _route_id, NULL, v_first, v_item.quantity_planned, 'desvio', auth.uid(), v_name, 'Rota alternativa: ' || trim(_reason));
END $$;
REVOKE ALL ON FUNCTION public.change_item_route(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_item_route(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_production_passage_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_to text; v_ref text;
BEGIN
  SELECT sector INTO v_from FROM production_route_steps WHERE id = NEW.origin_step_id;
  SELECT sector INTO v_to FROM production_route_steps WHERE id = NEW.destination_step_id;
  SELECT reference_code || coalesce(' ' || color, '') INTO v_ref FROM production_order_items WHERE id = NEW.production_order_item_id;
  INSERT INTO entity_events(entity_type, entity_id, event_type, from_status, to_status, note, actor, actor_name, payload)
  VALUES ('production_order', NEW.production_order_id, 'production.passage.' || NEW.type, v_from, v_to, NEW.observation,
    NEW.responsible_id, NEW.responsible_name,
    jsonb_build_object('item_id', NEW.production_order_item_id, 'item', v_ref, 'quantity', NEW.quantity, 'batch_id', NEW.batch_id));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_production_passage_event() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_log_production_passage ON public.production_passages;
CREATE TRIGGER trg_log_production_passage AFTER INSERT ON public.production_passages
FOR EACH ROW EXECUTE FUNCTION public.log_production_passage_event();

CREATE OR REPLACE FUNCTION public.log_production_order_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO entity_events(entity_type, entity_id, event_type, to_status, actor, payload)
    VALUES ('production_order', NEW.id, 'production.order.created', NEW.status, auth.uid(), jsonb_build_object('number', NEW.number));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('production_order', NEW.id, 'production.order.status_changed', OLD.status, NEW.status, auth.uid(), jsonb_build_object('number', NEW.number));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_production_order_event() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_log_production_order ON public.production_orders;
CREATE TRIGGER trg_log_production_order AFTER INSERT OR UPDATE ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.log_production_order_event();