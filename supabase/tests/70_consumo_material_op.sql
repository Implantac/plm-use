-- =============================================================================
-- CERTIFICACAO E2E 7/7 — consumo de material da OP
--
-- Prova o caminho que o PCP não tinha: registrar a saída dos insumos reservados
-- por uma OP, com atribuição correta mesmo quando existe outra OP com reserva
-- mais antiga do mesmo item (o caso em que o FIFO genérico fecharia a reserva
-- errada).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.t_ok(cond boolean, msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT cond THEN RAISE EXCEPTION 'FALHOU: %', msg; END IF;
  RAISE NOTICE '  ok  %', msg;
END $$;

RESET ROLE;

-- ---------- limpeza de execução anterior ----------
DELETE FROM public.stock_movement
 WHERE item_id IN (SELECT id FROM public.stock_item WHERE code LIKE 'INS-OPCONS%');
DELETE FROM public.stock_reservation
 WHERE item_id IN (SELECT id FROM public.stock_item WHERE code LIKE 'INS-OPCONS%');
DELETE FROM public.production_orders WHERE number LIKE 'OP-CONS-%';
DELETE FROM public.stock_item WHERE code LIKE 'INS-OPCONS%';
DELETE FROM public.warehouse WHERE code = 'WH-OPCONS';

-- ---------- fixtures ----------
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-00000000000a', 'admin@plm.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-00000000000a', 'admin')
ON CONFLICT DO NOTHING;

-- usuario sem permissao de estoque (papel 'operator')
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-00000000000f', 'operador@plm.test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-00000000000f', 'operator')
ON CONFLICT DO NOTHING;

INSERT INTO public.warehouse (code, name, type, location, created_by)
VALUES ('WH-OPCONS', 'Armazem consumo OP', 'central', 'Teste',
        '00000000-0000-0000-0000-00000000000a')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.stock_item (code, name, category, unit, is_active, created_by)
VALUES ('INS-OPCONS-A', 'Tecido consumo A', 'tecido', 'm', true,
        '00000000-0000-0000-0000-00000000000a'),
       ('INS-OPCONS-B', 'Aviamento consumo B', 'aviamento', 'un', true,
        '00000000-0000-0000-0000-00000000000a')
ON CONFLICT (code) DO NOTHING;

-- 100 m do tecido A, 50 un do aviamento B
INSERT INTO public.stock_movement (item_id, warehouse_id, kind, qty, ref_type, created_by)
SELECT i.id, w.id, 'in', CASE WHEN i.code = 'INS-OPCONS-A' THEN 100 ELSE 50 END,
       'recebimento', '00000000-0000-0000-0000-00000000000a'
  FROM public.stock_item i, public.warehouse w
 WHERE i.code LIKE 'INS-OPCONS%' AND w.code = 'WH-OPCONS';

INSERT INTO public.production_orders (id, number, status, created_by)
VALUES ('00000000-0000-0000-0000-00000000ccc1', 'OP-CONS-VELHA', 'planejada',
        '00000000-0000-0000-0000-00000000000a'),
       ('00000000-0000-0000-0000-00000000ccc2', 'OP-CONS-NOVA', 'planejada',
        '00000000-0000-0000-0000-00000000000a');

-- A OP VELHA reservou 10 m do tecido A ha 3 minutos.
INSERT INTO public.stock_reservation
  (item_id, warehouse_id, qty, ref_type, ref_id, notes, created_by, created_at)
SELECT id, (SELECT id FROM public.warehouse WHERE code = 'WH-OPCONS'),
       10, 'op', '00000000-0000-0000-0000-00000000ccc1', 'reserva velha',
       '00000000-0000-0000-0000-00000000000a', now() - interval '3 minutes'
  FROM public.stock_item WHERE code = 'INS-OPCONS-A';

-- A OP NOVA reservou 20 m do tecido A + 30 un do aviamento B, agora.
INSERT INTO public.stock_reservation
  (item_id, warehouse_id, qty, ref_type, ref_id, notes, created_by, created_at)
SELECT i.id, (SELECT id FROM public.warehouse WHERE code = 'WH-OPCONS'),
       CASE WHEN i.code = 'INS-OPCONS-A' THEN 20 ELSE 30 END,
       'op', '00000000-0000-0000-0000-00000000ccc2', 'reserva nova',
       '00000000-0000-0000-0000-00000000000a', now()
  FROM public.stock_item i WHERE i.code LIKE 'INS-OPCONS%';

-- ---------- 1) a tela consegue ver o que a OP reservou ----------
SELECT public.t_ok(
  (SELECT count(*) FROM public.op_reserved_materials('00000000-0000-0000-0000-00000000ccc2')) = 2,
  'op_reserved_materials lista os 2 insumos reservados da OP');

SELECT public.t_ok(
  (SELECT qty_on_hand FROM public.op_reserved_materials('00000000-0000-0000-0000-00000000ccc2')
    WHERE item_code = 'INS-OPCONS-A') = 100,
  'op_reserved_materials informa o saldo fisico do insumo');

-- ---------- 2) quem nao movimenta estoque nao consome ----------
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000f';
SET ROLE authenticated;
SELECT public.t_raises(
  format('SELECT public.record_op_material_consumption(%L)',
         '00000000-0000-0000-0000-00000000ccc2'),
  'Sem permissao', 'papel operator nao consome material de OP');
RESET ROLE;

-- ---------- 3) consumo pela OP NOVA (a reserva mais antiga e de OUTRA OP) ----------
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
SELECT public.t_ok(
  (public.record_op_material_consumption('00000000-0000-0000-0000-00000000ccc2')
     #>>'{total_consumido}')::int = 2,
  'consumo da OP nova baixa os 2 insumos reservados');
RESET ROLE;

SELECT public.t_ok(
  (SELECT count(*) FROM public.stock_movement
    WHERE ref_type = 'op' AND ref_id = '00000000-0000-0000-0000-00000000ccc2'
      AND kind = 'out') = 2,
  'movimentos de saida ficam ligados a OP de origem');

SELECT public.t_ok(
  (SELECT sum(qty) FROM public.stock_movement
    WHERE ref_id = '00000000-0000-0000-0000-00000000ccc2' AND kind = 'out') = 50,
  'quantidade baixada = 20 m + 30 un reservados');

-- ESTE e o ponto que o FIFO generico erraria: a reserva de 10 m da OP VELHA e
-- mais antiga; consumir em FIFO fecharia ela e deixaria a da OP NOVA presa.
SELECT public.t_ok(
  (SELECT status FROM public.stock_reservation
    WHERE ref_id = '00000000-0000-0000-0000-00000000ccc2'
      AND item_id = (SELECT id FROM public.stock_item WHERE code = 'INS-OPCONS-A'))
  = 'consumida',
  'consumo fecha a reserva da PROPRIA OP (nao a mais antiga de outra)');

SELECT public.t_ok(
  (SELECT status FROM public.stock_reservation
    WHERE ref_id = '00000000-0000-0000-0000-00000000ccc1') = 'ativa',
  'reserva da OP vizinha continua ativa e intacta');

-- ---------- 4) o disponivel volta a refletir a realidade ----------
SELECT public.t_ok(
  (SELECT qty_on_hand - qty_reserved FROM public.stock_balance
    WHERE item_id = (SELECT id FROM public.stock_item WHERE code = 'INS-OPCONS-A')) = 70,
  'tecido A: 80 em estoque menos 10 reservados = 70 disponiveis');

-- ---------- 5) chamar de novo nao faz nada (idempotente) ----------
SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
SELECT public.t_ok(
  (public.record_op_material_consumption('00000000-0000-0000-0000-00000000ccc2')
     #>>'{total_consumido}')::int = 0,
  'segunda chamada nao consome de novo');
RESET ROLE;

SELECT public.t_ok(
  (SELECT count(*) FROM public.stock_movement
    WHERE ref_id = '00000000-0000-0000-0000-00000000ccc2') = 2,
  'nenhum movimento duplicado foi criado');

-- ---------- 6) sem saldo fisico: nada e inventado ----------
-- Reserva maior que o saldo fisico (cenario de ruptura).
UPDATE public.stock_reservation
   SET qty = 500
 WHERE ref_id = '00000000-0000-0000-0000-00000000ccc1';

SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
SELECT public.t_ok(
  (public.record_op_material_consumption('00000000-0000-0000-0000-00000000ccc1')
     #>>'{total_curto}')::int = 1,
  'insumo sem saldo volta como curto em vez de virar movimento');
RESET ROLE;

SELECT public.t_ok(
  (SELECT count(*) FROM public.stock_movement
    WHERE ref_id = '00000000-0000-0000-0000-00000000ccc1' AND kind = 'out') = 0,
  'nenhuma saida foi registrada para o insumo em falta');

SELECT public.t_ok(
  (SELECT status FROM public.stock_reservation
    WHERE ref_id = '00000000-0000-0000-0000-00000000ccc1') = 'ativa',
  'reserva sem saldo continua ativa (o MRP precisa ver a necessidade)');

-- ---------- 7) OP encerrada libera o que sobrou (Onda 21 continua valendo) ----------
RESET ROLE;
UPDATE public.stock_reservation SET qty = 10
 WHERE ref_id = '00000000-0000-0000-0000-00000000ccc1';

UPDATE public.production_orders SET status = 'cancelada'
 WHERE id = '00000000-0000-0000-0000-00000000ccc1';

SELECT public.t_ok(
  (SELECT count(*) FROM public.stock_reservation
    WHERE ref_id = '00000000-0000-0000-0000-00000000ccc1' AND status = 'ativa') = 0,
  'OP cancelada libera a reserva que nao foi consumida');

-- ---------- limpeza ----------
DELETE FROM public.stock_movement
 WHERE item_id IN (SELECT id FROM public.stock_item WHERE code LIKE 'INS-OPCONS%');
DELETE FROM public.stock_reservation
 WHERE item_id IN (SELECT id FROM public.stock_item WHERE code LIKE 'INS-OPCONS%');
DELETE FROM public.production_orders WHERE number LIKE 'OP-CONS-%';
DELETE FROM public.stock_item WHERE code LIKE 'INS-OPCONS%';
DELETE FROM public.warehouse WHERE code = 'WH-OPCONS';
