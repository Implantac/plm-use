-- =============================================================================
-- KARILU-FIX-NOTIF.sql — conserto de bug LATENTE do próprio app, exposto pelo
-- seed KARILU em 22/10.
--
-- O gatilho trg_stock_movement_low_balance (migration 20260708131912) escreve
-- severity 'warn' na notifications — mas a CHECK viva só aceita
-- critical|warning|info. Resultado em produção: QUALQUER movimento de saída
-- que deixe um item no/abaixo do ponto de reposição ABORTA junto com o próprio
-- movimento (o almoxarife fica travado). Nenhum seed meu é o culpado; a prova
-- é que a função nunca rodou com dados.
--
-- Este arquivo: (1) recria a MESMA função, copiada byte a byte do repo, com a
-- única palavra 'warn' trocada por 'warning'; (2) roda um teste sintético
-- ponta-a-ponta (item fantasma → entrada → saída que gera falta → notificação
-- 'warning' → limpeza). Idempotente; nada de dados de teste permanece.
--
-- O conserto vive no banco. O arquivo de migration original do repo é
-- histórico — vale repassar ao mantenedor do código para a correção nascer
-- também numa migration futura.
-- =============================================================================

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
        CASE WHEN cur_balance <= it.safety_stock THEN 'critical' ELSE 'warning' END,
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

-- ---------------------------------------------------------------------------
-- PROVA VIVA — antes deste fix, o mesmo roteiro morria em 23514 no meio da
-- transação. Depois dele: movimento registrado + notificação 'warning' criada
-- e apagada. A exceção do bloco abaixo é a rede de segurança: se o fix não
-- tiver pegado, o arquivo GRITA em vez de deixar lixo.
-- ---------------------------------------------------------------------------
DO $fix$
DECLARE
  v_item uuid; v_wh uuid; v_uid uuid; v_cnt int; v_sev text;
BEGIN
  SELECT id INTO v_wh FROM public.warehouse WHERE code = 'ALM-CENTRAL';
  IF v_wh IS NULL THEN
    SELECT id INTO v_wh FROM public.warehouse ORDER BY created_at LIMIT 1;
  END IF;
  SELECT id INTO v_uid FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_wh IS NULL OR v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem armazém/usuário p/ o teste — rode o KARILU-BASE antes deste arquivo.';
  END IF;

  DELETE FROM public.stock_item WHERE code = 'STK-ZZZ-NOTIF-TESTE';  -- resíduo de tentativa anterior
  INSERT INTO public.stock_item (code, name, category, unit, demand_avg_daily,
                                 lead_time_days, safety_stock, reorder_point, created_by)
  VALUES ('STK-ZZZ-NOTIF-TESTE', 'Prova de notificação (apagar-me)', 'insumo', 'un',
          500, 10, 50, 5000, v_uid)
  RETURNING id INTO v_item;

  INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, justification, created_by)
  VALUES (v_item, v_wh, 'in', 4000, 'ajuste', 'KARILU-FIX-NOTIF teste — entrada', v_uid);

  BEGIN
    INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, justification, created_by)
    VALUES (v_item, v_wh, 'out', 4000, 'ajuste', 'KARILU-FIX-NOTIF teste — saída que gera falta', v_uid);
  EXCEPTION WHEN SQLSTATE '23514' THEN
    RAISE EXCEPTION 'O FIX NÃO PEGOU: o gatilho seguiu escrevendo severity ilegal. Não apague nada; me traga esta mensagem.';
  END;

  SELECT count(*), min(severity) INTO v_cnt, v_sev FROM public.notifications
   WHERE external_id LIKE 'stock_low:' || v_item::text || ':%';
  IF v_cnt = 0 OR v_sev NOT IN ('warning','critical') THEN
    RAISE EXCEPTION 'Teste falhou: % notificação(ões), severity=% — gatilho sem conserto visível.', v_cnt, v_sev;
  END IF;
  RAISE NOTICE 'PROVA OK: falta detectada, % notificação(ões) severity=%, movimento registrado sem quebrar.', v_cnt, v_sev;

  DELETE FROM public.notifications WHERE external_id LIKE 'stock_low:' || v_item::text || ':%';
  DELETE FROM public.stock_movement WHERE justification LIKE 'KARILU-FIX-NOTIF teste%';
  DELETE FROM public.stock_item WHERE id = v_item;
END $fix$;
