-- Cenários do PCP por OP. Roda tudo numa transação e desfaz no final.
-- Uso: psql -v ON_ERROR_STOP=1 -f tests/db/pcp-op-scenarios.sql
BEGIN;
DO $$
DECLARE u uuid; v uuid; r1 uuid; r2 uuid; op uuid; it1 uuid; it2 uuid; s1 uuid; s2 uuid; b1 uuid; q int; ok boolean;
BEGIN
  SELECT user_id INTO u FROM user_roles WHERE role IN ('admin','pcp') LIMIT 1;
  SELECT id INTO v FROM profiles WHERE id NOT IN (SELECT user_id FROM user_roles WHERE role IN ('admin','manager','pcp','operator')) LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  SELECT id INTO r1 FROM production_routes WHERE code='R01';
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT id INTO r1 FROM production_routes WHERE code='R01';
  SELECT id INTO r2 FROM production_routes WHERE code='R02';
  INSERT INTO production_orders(number, status, priority) VALUES ('OP-TESTE', 'em_producao', 'media') RETURNING id INTO op;
  INSERT INTO production_order_items(production_order_id, reference_code, color, route_id, quantity_planned) VALUES (op,'T-1','Preto',r1,500) RETURNING id INTO it1;
  INSERT INTO production_order_items(production_order_id, reference_code, color, route_id, quantity_planned) VALUES (op,'T-2','Branco',r2,100) RETURNING id INTO it2;
  SELECT id INTO s1 FROM production_route_steps WHERE route_id=r1 ORDER BY sequence LIMIT 1;
  SELECT id INTO s2 FROM production_route_steps WHERE route_id=r1 ORDER BY sequence OFFSET 1 LIMIT 1;

  -- Parcial: 200 de 500 do Corte para a Costura
  PERFORM register_passages(jsonb_build_array(jsonb_build_object('item_id',it1,'origin_step_id',s1,'quantity',200,'type','parcial')), NULL);
  SELECT quantity INTO q FROM production_item_step_balance WHERE item_id=it1 AND step_id=s2;
  IF q <> 200 THEN RAISE EXCEPTION 'FALHA parcial: costura=%', q; END IF;
  RAISE NOTICE 'OK passagem parcial';

  -- Bloqueio: passar mais que o disponível
  ok := false;
  BEGIN PERFORM register_passages(jsonb_build_array(jsonb_build_object('item_id',it1,'origin_step_id',s1,'quantity',999,'type','parcial')), NULL);
  EXCEPTION WHEN others THEN ok := true; END;
  IF NOT ok THEN RAISE EXCEPTION 'FALHA: aceitou quantidade acima do saldo'; END IF;
  RAISE NOTICE 'OK bloqueio acima do disponível';

  -- Total em bloco, item com rota diferente (Bordado) junto
  SELECT id INTO b1 FROM production_route_steps WHERE route_id=r2 ORDER BY sequence LIMIT 1;
  PERFORM register_passages(jsonb_build_array(
    jsonb_build_object('item_id',it1,'origin_step_id',s1,'quantity',300,'type','total'),
    jsonb_build_object('item_id',it2,'origin_step_id',b1,'quantity',100,'type','total')), NULL);
  SELECT quantity INTO q FROM production_item_step_balance WHERE item_id=it1 AND step_id=s2;
  IF q <> 500 THEN RAISE EXCEPTION 'FALHA total: costura=%', q; END IF;
  SELECT quantity INTO q FROM production_item_step_balance WHERE item_id=it2
    AND step_id=(SELECT id FROM production_route_steps WHERE route_id=r2 ORDER BY sequence OFFSET 1 LIMIT 1);
  IF q <> 100 THEN RAISE EXCEPTION 'FALHA rota diferente: %', q; END IF;
  RAISE NOTICE 'OK passagem total em bloco e item com rota diferente';

  -- Retorno: 50 da Costura de volta ao Corte, com motivo
  PERFORM register_passages(jsonb_build_array(jsonb_build_object('item_id',it1,'origin_step_id',s2,'destination_step_id',s1,'quantity',50,'type','retorno')), 'Retrabalho de costura');
  SELECT quantity INTO q FROM production_item_step_balance WHERE item_id=it1 AND step_id=s1;
  IF q <> 50 THEN RAISE EXCEPTION 'FALHA retorno: corte=%', q; END IF;
  RAISE NOTICE 'OK retorno de etapa';

  -- Linha do tempo
  SELECT count(*) INTO q FROM entity_events WHERE entity_type='production_order' AND entity_id=op AND event_type LIKE 'production.%';
  IF q < 5 THEN RAISE EXCEPTION 'FALHA linha do tempo: % eventos', q; END IF;
  RAISE NOTICE 'OK linha do tempo (% eventos)', q;

  -- Visualizador não passa
  IF v IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
    ok := false;
    BEGIN PERFORM register_passages(jsonb_build_array(jsonb_build_object('item_id',it1,'origin_step_id',s1,'quantity',10,'type','parcial')), NULL);
    EXCEPTION WHEN others THEN ok := true; END;
    IF NOT ok THEN RAISE EXCEPTION 'FALHA: visualizador registrou passagem'; END IF;
    RAISE NOTICE 'OK visualizador bloqueado';
  END IF;
END $$;
ROLLBACK;
