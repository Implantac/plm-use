CREATE OR REPLACE FUNCTION public.change_item_route(_item_id uuid, _route_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item production_order_items%ROWTYPE; v_first uuid; v_name text;
BEGIN
  IF NOT public.can_write_pcp(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para trocar a rota.'; END IF;
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
  INSERT INTO production_passages(batch_id, production_order_id, production_order_item_id, route_id, origin_step_id, destination_step_id, quantity, type, responsible_name, observation)
  VALUES (gen_random_uuid(), v_item.production_order_id, _item_id, _route_id, NULL, v_first, v_item.quantity_planned, 'desvio', v_name, 'Rota alternativa: ' || trim(_reason));
END $$;
REVOKE ALL ON FUNCTION public.change_item_route(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_item_route(uuid, uuid, text) TO authenticated;