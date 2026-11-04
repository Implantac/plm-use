-- =============================================================================
-- CICLO DE VIDA DA RESERVA DE ESTOQUE
--
-- Defeito encontrado em 04/11/2026: `release_sales_order_to_pcp` (drizzle/0014)
-- cria reservas com status 'ativa', mas NADA as encerrava automaticamente. O
-- status 'consumida'/'cancelada' só existia via clique manual no
-- ReservationsPanel (/inventory). Efeito prático:
--
--   * a view `stock_balance` subtrai TODA reserva 'ativa' do disponível;
--   * como a reserva nunca saía de 'ativa', o disponível caía a cada liberação
--     e nunca voltava;
--   * o MRP (que passou a ler `stock_balance` na Onda 19) começaria a acusar
--     ruptura de compra fantasma depois de poucas OPs.
--
-- Esta migration fecha o ciclo:
--   1) saída física de estoque (stock_movement kind='out') consome as reservas
--      ativas do par item/armazém, em FIFO por created_at, com consumo parcial;
--   2) OP concluída ou cancelada libera o que sobrou de reserva daquela OP.
--
-- Nada é apagado. Reservas antigas em 'ativa' continuam válidas: a partir daqui
-- elas passam a ser consumidas pelas saídas e encerradas pelo status da OP.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Saída física consome reserva (FIFO, parcial)
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
      -- consumo parcial: a reserva continua ativa com o saldo que sobrou
      UPDATE public.stock_reservation
         SET qty = r.qty - v_usar, updated_at = now()
       WHERE id = r.id;
    END IF;

    v_restante := v_restante - v_usar;
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stock_reservation_consume ON public.stock_movement;
CREATE TRIGGER trg_stock_reservation_consume
AFTER INSERT ON public.stock_movement
FOR EACH ROW EXECUTE FUNCTION public.consume_reservations_on_movement();

-- ---------------------------------------------------------------------------
-- 2) Encerramento por referência (usada quando a OP termina ou é cancelada)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_reservations_for_ref(
  _ref_type text,
  _ref_id   uuid,
  _motivo   text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  WITH upd AS (
    UPDATE public.stock_reservation
       SET status       = 'cancelada',
           cancelled_at = now(),
           updated_at   = now(),
           notes        = COALESCE(notes, '') ||
                          CASE WHEN _motivo IS NULL OR _motivo = '' THEN ''
                               ELSE ' | ' || _motivo END
     WHERE ref_type = _ref_type
       AND ref_id   = _ref_id
       AND status   = 'ativa'
    RETURNING 1
  )
  SELECT count(*) INTO v_n FROM upd;

  RETURN v_n;
END $$;

-- Só os triggers usam esta função: não expor a authenticated evita que alguém
-- cancele reserva de outra área chamando a RPC direto (ela é SECURITY DEFINER).
REVOKE ALL ON FUNCTION public.cancel_reservations_for_ref(text, uuid, text)
  FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) OP concluída ou cancelada libera a reserva remanescente
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_reservations_on_op_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('cancelada', 'cancelado', 'concluida', 'concluido') THEN
    PERFORM public.cancel_reservations_for_ref(
      'op',
      NEW.id,
      CASE
        WHEN NEW.status IN ('cancelada', 'cancelado') THEN 'Reserva liberada: OP cancelada'
        ELSE 'Reserva liberada: OP concluída'
      END
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stock_reservation_op_status ON public.production_orders;
CREATE TRIGGER trg_stock_reservation_op_status
AFTER UPDATE OF status ON public.production_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_reservations_on_op_status();

-- ---------------------------------------------------------------------------
-- 4) Diagnóstico: reservas ativas antigas (o que ficou do período sem ciclo)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.stock_reservation_aging AS
SELECT r.id,
       r.status,
       r.ref_type,
       r.ref_id,
       i.code  AS item_code,
       i.name  AS item_name,
       w.code  AS warehouse_code,
       r.qty,
       r.created_at,
       date_part('day', now() - r.created_at)::int AS dias_ativa
  FROM public.stock_reservation r
  JOIN public.stock_item i ON i.id = r.item_id
  JOIN public.warehouse  w ON w.id = r.warehouse_id
 WHERE r.status = 'ativa';

GRANT SELECT ON public.stock_reservation_aging TO authenticated, service_role;
