-- =============================================================================
-- CONSUMO DE MATERIAL DA OP (fecha o loop do lado do PCP)
--
-- A Onda 21 deu ciclo de vida à reserva: saída física consome em FIFO e OP
-- concluída/cancelada libera o resto. Só que **ninguém no PCP tinha como gerar
-- essa saída**. O caminho real era: o almoxarife abrir /inventory, escolher o
-- insumo no olho, digitar a quantidade e registrar — item por item, sem relação
-- com a OP e sem saber quanto a OP reservou. Resultado prático: a reserva
-- continuava ativa, o disponível seguia furado e o consumo nunca era atribuído
-- a uma ordem.
--
-- Esta migration cria `record_op_material_consumption(_order_id)`:
--
--   1. lê as reservas ativas daquela OP (ref_type='op', ref_id=_order_id);
--   2. para cada uma, registra `stock_movement kind='out'` com ref da OP;
--   3. consome **a própria reserva da OP** (não a mais antiga da vizinha);
--   4. o que não tem saldo físico volta como `curtos`, sem inventar movimento.
--
-- O ponto 3 exige cuidado: o trigger da Onda 21 consome FIFO por item/armazém,
-- o que poderia fechar a reserva de outra OP mais antiga e deixar esta presa. A
-- função marca a transação com `app.skip_reservation_consume = 'on'` e atribui
-- o consumo explicitamente; o trigger respeita a marca.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) O trigger passa a respeitar a marca de consumo explícito
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_reservations_on_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restante numeric(14,4) := NEW.qty;
  r          record;
  v_usar     numeric(14,4);
BEGIN
  -- Só saída real consome. transfer_out é movimento interno entre armazéns:
  -- a reserva continua presa ao item, não sai da empresa.
  IF NEW.kind <> 'out' THEN
    RETURN NEW;
  END IF;

  -- Consumo atribuído a uma OP específica (record_op_material_consumption):
  -- a função já fechou a reserva certa. Consumir FIFO aqui fecharia a reserva
  -- de outra OP e deixaria a desta pendurada.
  IF coalesce(current_setting('app.skip_reservation_consume', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT id, qty
      FROM public.stock_reservation
     WHERE item_id      = NEW.item_id
       AND warehouse_id = NEW.warehouse_id
       AND status       = 'ativa'
     ORDER BY created_at, id
       FOR UPDATE
  LOOP
    EXIT WHEN v_restante <= 0;

    v_usar := LEAST(r.qty, v_restante);

    IF v_usar >= r.qty THEN
      UPDATE public.stock_reservation
         SET status = 'consumida', consumed_at = now(), updated_at = now()
       WHERE id = r.id;
    ELSE
      UPDATE public.stock_reservation
         SET qty = qty - v_usar, updated_at = now()
       WHERE id = r.id;
    END IF;

    v_restante := v_restante - v_usar;
  END LOOP;

  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Saldo físico de um item/armazém (fonte única: a view do estoque)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stock_on_hand(_item_id uuid, _warehouse_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT b.qty_on_hand FROM public.stock_balance b
      WHERE b.item_id = _item_id AND b.warehouse_id = _warehouse_id),
    0
  )
$$;

REVOKE EXECUTE ON FUNCTION public.stock_on_hand(uuid, uuid) FROM public, anon;

-- ---------------------------------------------------------------------------
-- 2) RPC: registrar o consumo de material de uma OP
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_op_material_consumption(
  _order_id uuid,
  _justification text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_op         public.production_orders%ROWTYPE;
  v_res        record;
  v_saldo      numeric;
  v_consumidos jsonb := '[]'::jsonb;
  v_curtos     jsonb := '[]'::jsonb;
  v_motivo     text;
BEGIN
  -- Quem movimenta estoque é o almoxarifado (admin/manager/almoxarifado).
  -- PCP planeja, não dá baixa — essa separação é deliberada no sistema.
  IF v_uid IS NULL OR NOT public.has_stock_write_role(v_uid) THEN
    RAISE EXCEPTION 'Sem permissao para movimentar estoque.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_op FROM public.production_orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'OP nao encontrada: %', _order_id;
  END IF;

  v_motivo := COALESCE(NULLIF(trim(_justification), ''),
                       'Consumo de material na OP ' || v_op.number);

  -- Marca a transação: o trigger não consome FIFO, porque aqui a atribuição é
  -- explícita (reserva desta OP).
  PERFORM set_config('app.skip_reservation_consume', 'on', true);

  FOR v_res IN
    SELECT r.id, r.item_id, r.warehouse_id, r.qty, i.code, i.name, i.unit
      FROM public.stock_reservation r
      JOIN public.stock_item i ON i.id = r.item_id
     WHERE r.ref_type = 'op'
       AND r.ref_id   = _order_id
       AND r.status   = 'ativa'
     ORDER BY r.created_at, r.id
       FOR UPDATE OF r
  LOOP
    v_saldo := public.stock_on_hand(v_res.item_id, v_res.warehouse_id);

    IF v_saldo >= v_res.qty THEN
      INSERT INTO public.stock_movement
        (item_id, warehouse_id, kind, qty, ref_type, ref_id, justification, created_by)
      VALUES
        (v_res.item_id, v_res.warehouse_id, 'out', v_res.qty, 'op', _order_id,
         v_motivo, v_uid);

      UPDATE public.stock_reservation
         SET status = 'consumida', consumed_at = now(), updated_at = now()
       WHERE id = v_res.id;

      v_consumidos := v_consumidos || jsonb_build_object(
        'item_id',     v_res.item_id,
        'item_code',   v_res.code,
        'item_name',   v_res.name,
        'unit',        v_res.unit,
        'qty',         v_res.qty,
        'saldo_antes', v_saldo
      );
    ELSE
      -- Sem saldo, nada é inventado: o item volta para a lista de curto e a
      -- reserva continua ativa (o MRP precisa continuar vendo a necessidade).
      v_curtos := v_curtos || jsonb_build_object(
        'item_id',   v_res.item_id,
        'item_code', v_res.code,
        'item_name', v_res.name,
        'unit',      v_res.unit,
        'qty',       v_res.qty,
        'saldo',     v_saldo,
        'falta',     v_res.qty - v_saldo
      );
    END IF;
  END LOOP;

  PERFORM set_config('app.skip_reservation_consume', '', true);

  RETURN jsonb_build_object(
    'order_id',   _order_id,
    'order_number', v_op.number,
    'consumidos', v_consumidos,
    'curtos',     v_curtos,
    'total_consumido', jsonb_array_length(v_consumidos),
    'total_curto',     jsonb_array_length(v_curtos)
  );
END $$;

REVOKE ALL ON FUNCTION public.record_op_material_consumption(uuid, text)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_op_material_consumption(uuid, text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) O que a OP tem reservado, para a tela mostrar antes de consumir
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.op_reserved_materials(_order_id uuid)
RETURNS TABLE (
  reservation_id uuid,
  item_id        uuid,
  item_code      text,
  item_name      text,
  unit           text,
  qty            numeric,
  qty_on_hand    numeric,
  dias_ativa     int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.id,
         r.item_id,
         i.code,
         i.name,
         i.unit,
         r.qty,
         public.stock_on_hand(r.item_id, r.warehouse_id),
         date_part('day', now() - r.created_at)::int
    FROM public.stock_reservation r
    JOIN public.stock_item i ON i.id = r.item_id
   WHERE r.ref_type = 'op'
     AND r.ref_id   = _order_id
     AND r.status   = 'ativa'
   ORDER BY r.created_at, r.id
$$;

REVOKE ALL ON FUNCTION public.op_reserved_materials(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.op_reserved_materials(uuid) TO authenticated, service_role;
