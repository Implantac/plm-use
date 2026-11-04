-- =============================================================================
-- CERTIFICACAO 6/6 — ciclo de vida da reserva de estoque.
--
-- Prova que a reserva deixa de ficar 'ativa' para sempre:
--   1. saída física consome a reserva em FIFO;
--   2. consumo parcial reduz a qty e mantém ativa;
--   3. OP cancelada libera o que sobrou;
--   4. OP concluída também libera;
--   5. transfer_out NÃO consome (é movimento interno);
--   6. a view de aging mostra as ativas.
-- =============================================================================

-- helpers de asserção (idempotente: os testes 10/20 já os definem quando rodam
-- na suíte completa; este arquivo também precisa rodar sozinho)
CREATE OR REPLACE FUNCTION public.t_ok(cond boolean, msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT cond THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF;
  RAISE NOTICE '  ok  %', msg;
END $$;

RESET ROLE;

-- usuario de fixture (os testes 10/20 já criam os mesmos ids; ON CONFLICT cobre
-- a execução isolada deste arquivo)
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-00000000000a', 'admin@plm.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stock_item (code, name, category, unit, is_active, created_by)
VALUES ('INS-LIFECYCLE', 'Insumo ciclo de vida', 'tecido', 'kg', true,
        '00000000-0000-0000-0000-00000000000a')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.warehouse (code, name, type, location, created_by)
VALUES ('WH-LIFECYCLE', 'Armazem ciclo', 'central', 'Teste',
        '00000000-0000-0000-0000-00000000000a')
ON CONFLICT (code) DO NOTHING;

-- tres reservas ativas do mesmo item/armazem, criadas em ordem
DELETE FROM public.stock_reservation
 WHERE item_id = (SELECT id FROM public.stock_item WHERE code = 'INS-LIFECYCLE');

-- created_at explicito e distinto: num INSERT unico todas nasceriam com o mesmo
-- now() e o desempate FIFO cairia no uuid (ordem arbitraria). Em producao cada
-- liberacao de OP e um INSERT proprio, entao created_at ordena de verdade.
INSERT INTO public.stock_reservation (item_id, warehouse_id, qty, ref_type, ref_id, notes, created_by, created_at)
SELECT si.id, w.id, v.qty, 'op', v.ref, 'teste', '00000000-0000-0000-0000-00000000000a'::uuid,
       now() - v.idade
  FROM public.stock_item si, public.warehouse w,
       (VALUES (10::numeric, '00000000-0000-0000-0000-00000000aaa1'::uuid, interval '3 minutes'),
               (20::numeric, '00000000-0000-0000-0000-00000000aaa2'::uuid, interval '2 minutes'),
               (30::numeric, '00000000-0000-0000-0000-00000000aaa3'::uuid, interval '1 minute')) AS v(qty, ref, idade)
 WHERE si.code = 'INS-LIFECYCLE' AND w.code = 'WH-LIFECYCLE';

-- ---------- 1) entrada nao consome ----------
INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, created_by)
SELECT id, (SELECT id FROM public.warehouse WHERE code = 'WH-LIFECYCLE'),
       'in', 100, 'recebimento', '00000000-0000-0000-0000-00000000000a'::uuid
  FROM public.stock_item WHERE code = 'INS-LIFECYCLE';

SELECT public.t_ok(
  (SELECT count(*) FROM public.stock_reservation r
    JOIN public.stock_item i ON i.id = r.item_id
   WHERE i.code = 'INS-LIFECYCLE' AND r.status = 'ativa') = 3,
  'entrada de estoque não consome reserva');

-- ---------- 2) transferencia nao consome ----------
INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, created_by)
SELECT id, (SELECT id FROM public.warehouse WHERE code = 'WH-LIFECYCLE'),
       'transfer_out', 5, 'transferencia', '00000000-0000-0000-0000-00000000000a'::uuid
  FROM public.stock_item WHERE code = 'INS-LIFECYCLE';

SELECT public.t_ok(
  (SELECT count(*) FROM public.stock_reservation r
    JOIN public.stock_item i ON i.id = r.item_id
   WHERE i.code = 'INS-LIFECYCLE' AND r.status = 'ativa') = 3,
  'transfer_out não consome reserva (movimento interno)');

-- ---------- 3) consumo parcial: 15 de 10+20 ----------
INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, created_by)
SELECT id, (SELECT id FROM public.warehouse WHERE code = 'WH-LIFECYCLE'),
       'out', 15, 'pcp_lot', '00000000-0000-0000-0000-00000000000a'::uuid
  FROM public.stock_item WHERE code = 'INS-LIFECYCLE';

SELECT public.t_ok(
  (SELECT r.status FROM public.stock_reservation r
    WHERE r.ref_id = '00000000-0000-0000-0000-00000000aaa1') = 'consumida',
  'saída consome a reserva mais antiga inteira (FIFO)');

SELECT public.t_ok(
  (SELECT r.qty FROM public.stock_reservation r
    WHERE r.ref_id = '00000000-0000-0000-0000-00000000aaa2') = 15,
  'consumo parcial reduz a qty da reserva seguinte (20 → 15)');

SELECT public.t_ok(
  (SELECT r.status FROM public.stock_reservation r
    WHERE r.ref_id = '00000000-0000-0000-0000-00000000aaa3') = 'ativa',
  'reserva não alcançada pela saída continua ativa');

-- ---------- 4) OP cancelada libera a reserva remanescente ----------
INSERT INTO public.production_orders (id, number, status, created_by)
VALUES ('00000000-0000-0000-0000-00000000bbb1', 'OP-LIFECYCLE-CANC', 'planejada',
        '00000000-0000-0000-0000-00000000000a')
ON CONFLICT (number) DO NOTHING;

UPDATE public.stock_reservation SET ref_id = '00000000-0000-0000-0000-00000000bbb1'
 WHERE ref_id = '00000000-0000-0000-0000-00000000aaa2';

UPDATE public.production_orders SET status = 'cancelada'
 WHERE id = '00000000-0000-0000-0000-00000000bbb1';

SELECT public.t_ok(
  (SELECT r.status FROM public.stock_reservation r
    WHERE r.ref_id = '00000000-0000-0000-0000-00000000bbb1') = 'cancelada',
  'OP cancelada libera a reserva remanescente');

-- ---------- 5) OP concluida tambem libera ----------
INSERT INTO public.production_orders (id, number, status, created_by)
VALUES ('00000000-0000-0000-0000-00000000bbb2', 'OP-LIFECYCLE-CONC', 'em_producao',
        '00000000-0000-0000-0000-00000000000a')
ON CONFLICT (number) DO NOTHING;

UPDATE public.stock_reservation SET ref_id = '00000000-0000-0000-0000-00000000bbb2'
 WHERE ref_id = '00000000-0000-0000-0000-00000000aaa3';

UPDATE public.production_orders SET status = 'concluida'
 WHERE id = '00000000-0000-0000-0000-00000000bbb2';

SELECT public.t_ok(
  (SELECT r.status FROM public.stock_reservation r
    WHERE r.ref_id = '00000000-0000-0000-0000-00000000bbb2') = 'cancelada',
  'OP concluída libera a reserva que sobrou');

-- ---------- 6) saldo volta a ficar disponivel ----------
SELECT public.t_ok(
  (SELECT count(*) FROM public.stock_reservation r
    JOIN public.stock_item i ON i.id = r.item_id
   WHERE i.code = 'INS-LIFECYCLE' AND r.status = 'ativa') = 0,
  'nenhuma reserva fica presa em ativa ao fim do ciclo');

-- ---------- 7) view de aging ----------
SELECT public.t_ok(
  EXISTS (SELECT 1 FROM information_schema.views
           WHERE table_schema = 'public' AND table_name = 'stock_reservation_aging'),
  'view de aging das reservas ativas existe');

-- limpeza: devolve o banco ao estado anterior a este teste
RESET ROLE;
DELETE FROM public.stock_movement
 WHERE item_id = (SELECT id FROM public.stock_item WHERE code = 'INS-LIFECYCLE');
DELETE FROM public.stock_reservation
 WHERE item_id = (SELECT id FROM public.stock_item WHERE code = 'INS-LIFECYCLE');
DELETE FROM public.production_orders
 WHERE number IN ('OP-LIFECYCLE-CANC', 'OP-LIFECYCLE-CONC');
DELETE FROM public.stock_item WHERE code = 'INS-LIFECYCLE';
DELETE FROM public.warehouse WHERE code = 'WH-LIFECYCLE';
