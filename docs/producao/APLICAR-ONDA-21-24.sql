-- =============================================================================
-- ONDAS 21 + 24 — PACOTE DE APLICAÇÃO EM PRODUÇÃO
--
-- O QUE É: as duas migrations que mudam o BANCO (as Ondas 22, 23 e 25 são só
-- código de tela) num arquivo só, na ordem correta, para colar no SQL editor.
--
-- POR QUE ESTE ARQUIVO EXISTE
--   Medido em 05/11/2026 com a chave pública do próprio app publicado:
--     * view  stock_reservation_aging ............ 404 (PGRST205)
--     * RPC   cancel_reservations_for_ref ........ 404 (PGRST202)
--     * RPC   op_reserved_materials .............. 404 (PGRST202)
--     * RPC   record_op_material_consumption ..... 404 (PGRST202)
--   O app publicado JÁ está na Onda 25. Isso significa que, hoje, a tela de
--   reservas promete "consumo e liberação automáticos" e a aba Material da OP
--   oferece o botão de baixa — e nenhum dos dois funciona neste banco.
--
-- COMO APLICAR
--   1. Lovable → seu projeto → More (⋯) → Cloud → SQL editor
--      (ou Supabase → SQL Editor do projeto njmniwsqwohmigroswnl)
--   2. Cole TODO este arquivo e execute.
--   3. Rode o bloco "VERIFICAÇÃO" ao final, numa nova execução.
--
-- SEGURANÇA
--   - Reexecutável: usa CREATE OR REPLACE, DROP TRIGGER IF EXISTS e CREATE
--     VIEW (recriável). Colar duas vezes não quebra.
--   - Não apaga dado nenhum. Não altera tabela existente.
--   - Verificado em 05/11/2026 num Postgres 18.6 com o schema do repositório:
--     aplica em banco limpo E sobre um banco que já tem a Onda 21.
--
-- ORDEM: a Onda 24 redefine a função de trigger criada pela Onda 21, então
-- precisa vir depois. Não inverta.
-- =============================================================================

-- =============================================================================
-- PARTE 1/2 — ONDA 21: CICLO DE VIDA DA RESERVA
-- arquivo: supabase/migrations/20261104120000_stock_reservation_lifecycle.sql
-- =============================================================================

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


-- =============================================================================
-- PARTE 2/2 — ONDA 24: CONSUMO DE MATERIAL DA OP
-- arquivo: supabase/migrations/20261104200000_op_material_consumption.sql
-- =============================================================================

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


-- =============================================================================
-- VERIFICAÇÃO — rode este bloco depois de aplicar, numa execução separada.
-- Esperado: 3 linhas "ok".
-- =============================================================================
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_views
   WHERE schemaname = 'public' AND viewname = 'stock_reservation_aging';
  IF n = 1 THEN RAISE NOTICE 'ok  view stock_reservation_aging existe';
  ELSE RAISE EXCEPTION 'FALHOU: view stock_reservation_aging nao existe'; END IF;

  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
   WHERE s.nspname = 'public' AND p.proname = 'record_op_material_consumption';
  IF n = 1 THEN RAISE NOTICE 'ok  RPC record_op_material_consumption existe';
  ELSE RAISE EXCEPTION 'FALHOU: RPC record_op_material_consumption nao existe'; END IF;

  SELECT count(*) INTO n FROM pg_trigger
   WHERE tgname IN ('trg_stock_reservation_op_status', 'trg_stock_reservation_consume')
     AND NOT tgisinternal;
  IF n = 2 THEN RAISE NOTICE 'ok  os 2 triggers da reserva estao instalados';
  ELSE RAISE EXCEPTION 'FALHOU: triggers da reserva ausentes (encontrados %)', n; END IF;
END $$;

-- Depois disso, o PostgREST precisa recarregar o schema para a API enxergar
-- a view e as funções novas:
NOTIFY pgrst, 'reload schema';
