-- =============================================================================
-- FLUXO DE PEDIDO — PACOTE DE APLICAÇÃO EM PRODUÇÃO
--
-- O QUE É: as migrations que ainda NÃO existem no banco de produção do Lovable,
-- na ordem correta, num arquivo só para colar no SQL editor.
--
-- COMO APLICAR
--   1. Lovable → seu projeto → More (⋯) → Cloud → SQL editor
--   2. Cole TODO este arquivo e execute.
--   3. Rode a verificação do final (bloco "VERIFICAÇÃO") numa nova execução.
--
-- SEGURANÇA
--   - O arquivo é reexecutável: se o editor cortar no meio ou você colar duas
--     vezes, ele não quebra (policies/triggers são recriados, tabelas usam IF
--     NOT EXISTS). O pior caso é repetir trabalho.
--   - Não apaga nada. Não mexe em tabela existente, exceto:
--       * criar `public.materials` (não existia — é dependência do pedido);
--       * acrescentar valores de enum (não remove nenhum);
--       * no `sales_order_item_materials/_operations`, ajustar o tipo de
--         `total_cost` para numeric(14,4) (4 casas, para arredondar só no total).
--   - Verificado em 21/10/2026 num Postgres 18.6 com o mesmo schema do
--     produção (sem `materials`, sem `sales_*`): aplica e o fluxo roda.
--
-- Diagnóstico que gerou este arquivo (API REST de produção, 21/10):
--   56 de 69 tabelas do repositório existem; faltavam exatamente as 12 do
--   fluxo de pedido + `materials`. O resto do PLM está íntegro.
-- =============================================================================

-- Falha cedo e com mensagem clara se algo essencial não existir.
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Banco inesperado: public.profiles não existe. Este pacote assume o schema do PLM já aplicado.';
  END IF;
  IF to_regclass('public.entity_events') IS NULL THEN
    RAISE EXCEPTION 'Banco inesperado: public.entity_events não existe.';
  END IF;
  IF to_regclass('public.production_routes') IS NULL THEN
    RAISE EXCEPTION 'Banco inesperado: public.production_routes não existe (trilha PCP).';
  END IF;
END $$;


-- =============================================================================
-- 20261014220000_persist_materials.sql — Biblioteca de materiais (dependência: FK de sales_order_item_materials)
-- =============================================================================

-- Biblioteca de Materiais (modulo 11 do creative-sync): catalogo de tecidos,
-- aviamentos, linhas, embalagens, bordados e silk reutilizavel no BOM das
-- fichas tecnicas. Padrao identico ao bloco 8 (analytics_kpis): external_key
-- como chave de sync (seeds locais viram linhas na 1a edicao), RLS de tela
-- completa, sem FK para auth.users (regra do ambiente Lovable -- a policy de
-- insert garante o autor), realtime + updated_at via trigger.
-- Comentarios somente com "--" (a guarda sql-migrations.test.ts vigia).

CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  material_type text NOT NULL DEFAULT 'Tecido'
    CHECK (material_type IN ('Tecido','Aviamento','Linha','Embalagem','Bordado','Silk')),
  supplier text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'un',
  unit_cost numeric(12,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  sku text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS materials_type_idx ON public.materials (material_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "materials_select_auth" ON public.materials;
CREATE POLICY "materials_select_auth" ON public.materials FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "materials_insert_auth" ON public.materials;
CREATE POLICY "materials_insert_auth" ON public.materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
DROP POLICY IF EXISTS "materials_update_auth" ON public.materials;
CREATE POLICY "materials_update_auth" ON public.materials FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "materials_delete_mgr" ON public.materials;
CREATE POLICY "materials_delete_mgr" ON public.materials FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_materials_updated ON public.materials;
CREATE TRIGGER trg_materials_updated BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.materials REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 20261021080000_pcp_baseline.sql — Baseline do PCP (idempotente — no-op onde já existe)
-- =============================================================================

-- =============================================================================
-- BASELINE do PCP por OP — consolida na trilha supabase/migrations o que só
-- existia em drizzle/migrations/0002-0004.
--
-- POR QUE EXISTE: `product_configurations`, `production_routes`, `production_orders`
-- e as funções de passagem nasceram no Drizzle, mas o fluxo de Pedido (20261021090100)
-- depende delas por FK. Em projeto novo, `supabase db push` sozinho criava o banco
-- sem essas tabelas e a migration do pedido falhava com
-- `relation "public.product_configurations" does not exist`.
--
-- TOTALMENTE IDEMPOTENTE: em ambiente que já tem as tabelas (aplicadas via Drizzle),
-- cada comando é no-op. Pode rodar depois do Drizzle sem efeito colateral.
-- Convenção do repo: comentário APENAS com -- (barra dupla quebra o SQL editor).
-- =============================================================================

-- 1) Entidades de evento do PCP (o restante do enum vem em 20261021090000)
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'production_order';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'production_order_item';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'production_route';

-- 2) Permissões por papel — quem planeja e quem aponta
CREATE OR REPLACE FUNCTION public.can_write_pcp(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR public.has_role(_uid,'manager')
      OR public.has_role(_uid,'pcp') OR public.has_role(_uid,'operator')
$$;

CREATE OR REPLACE FUNCTION public.can_plan_pcp(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('admin','manager','pcp'))
$$;

REVOKE EXECUTE ON FUNCTION public.can_write_pcp(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_plan_pcp(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_write_pcp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_plan_pcp(uuid) TO authenticated;

-- 3) Tabelas
CREATE TABLE IF NOT EXISTS public.production_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_route_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.production_routes(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  sector text NOT NULL,
  operation text NOT NULL,
  mandatory boolean NOT NULL DEFAULT true,
  outsourced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, sequence)
);
CREATE INDEX IF NOT EXISTS production_route_steps_route_idx
  ON public.production_route_steps (route_id);

CREATE TABLE IF NOT EXISTS public.product_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_product text NOT NULL,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.configuration_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id uuid NOT NULL REFERENCES public.product_configurations(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.production_routes(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (configuration_id, route_id)
);
CREATE INDEX IF NOT EXISTS configuration_routes_route_idx
  ON public.configuration_routes (route_id);

CREATE TABLE IF NOT EXISTS public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  erp_op_id text,
  status text NOT NULL DEFAULT 'planejada',
  priority text NOT NULL DEFAULT 'media',
  planned_start date,
  planned_end date,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  reference_code text NOT NULL,
  reference_name text,
  color text,
  configuration_id uuid REFERENCES public.product_configurations(id),
  route_id uuid NOT NULL REFERENCES public.production_routes(id),
  route_override_reason text,
  quantity_planned integer NOT NULL CHECK (quantity_planned > 0),
  quantity_produced integer NOT NULL DEFAULT 0,
  quantity_lost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS production_order_items_order_idx
  ON public.production_order_items (production_order_id);
CREATE INDEX IF NOT EXISTS production_order_items_route_idx
  ON public.production_order_items (route_id);

CREATE TABLE IF NOT EXISTS public.production_item_step_balance (
  item_id uuid NOT NULL REFERENCES public.production_order_items(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.production_route_steps(id),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, step_id)
);
CREATE INDEX IF NOT EXISTS production_item_step_balance_step_idx
  ON public.production_item_step_balance (step_id);

CREATE TABLE IF NOT EXISTS public.production_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  production_order_id uuid NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  production_order_item_id uuid NOT NULL REFERENCES public.production_order_items(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.production_routes(id),
  origin_step_id uuid REFERENCES public.production_route_steps(id),
  destination_step_id uuid REFERENCES public.production_route_steps(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  type text NOT NULL CHECK (type IN ('total','parcial','desvio','retorno','ajuste','perda','entrada')),
  responsible_id uuid DEFAULT auth.uid(),
  responsible_name text,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS production_passages_order_idx
  ON public.production_passages (production_order_id);
CREATE INDEX IF NOT EXISTS production_passages_item_idx
  ON public.production_passages (production_order_item_id);
CREATE INDEX IF NOT EXISTS production_passages_batch_idx
  ON public.production_passages (batch_id);

-- 4) RLS: leitura para membro, escrita para quem planeja; passagem e saldo
--    NUNCA por escrita direta (só pela função register_passages).
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'production_routes','production_route_steps','product_configurations',
    'configuration_routes','production_orders','production_order_items',
    'production_item_step_balance','production_passages'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "members read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "members read" ON public.%I FOR SELECT TO authenticated USING (public.is_member(auth.uid()))', t);
    IF t NOT IN ('production_item_step_balance','production_passages') THEN
      EXECUTE format('DROP POLICY IF EXISTS "pcp insert" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "pcp update" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "pcp delete" ON public.%I', t);
      EXECUTE format('CREATE POLICY "pcp insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_plan_pcp(auth.uid()))', t);
      EXECUTE format('CREATE POLICY "pcp update" ON public.%I FOR UPDATE TO authenticated USING (public.can_plan_pcp(auth.uid())) WITH CHECK (public.can_plan_pcp(auth.uid()))', t);
      EXECUTE format('CREATE POLICY "pcp delete" ON public.%I FOR DELETE TO authenticated USING (public.can_plan_pcp(auth.uid()))', t);
    END IF;
  END LOOP;
END $$;

-- 5) updated_at
DROP TRIGGER IF EXISTS trg_upd_routes ON public.production_routes;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_routes ON public.production_routes;
CREATE TRIGGER trg_upd_routes BEFORE UPDATE ON public.production_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_upd_configs ON public.product_configurations;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_configs ON public.product_configurations;
CREATE TRIGGER trg_upd_configs BEFORE UPDATE ON public.product_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_upd_orders ON public.production_orders;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_orders ON public.production_orders;
CREATE TRIGGER trg_upd_orders BEFORE UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_upd_items ON public.production_order_items;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_items ON public.production_order_items;
CREATE TRIGGER trg_upd_items BEFORE UPDATE ON public.production_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Saldo inicial do item na primeira etapa da rota
CREATE OR REPLACE FUNCTION public.init_item_balance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_step uuid;
BEGIN
  SELECT id INTO first_step FROM public.production_route_steps
   WHERE route_id = NEW.route_id ORDER BY sequence LIMIT 1;
  IF first_step IS NULL THEN RAISE EXCEPTION 'A rota escolhida não tem etapas.'; END IF;
  INSERT INTO public.production_item_step_balance(item_id, step_id, quantity)
  VALUES (NEW.id, first_step, NEW.quantity_planned);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.init_item_balance() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS trg_init_item_balance ON public.production_order_items;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_init_item_balance ON public.production_order_items;
CREATE TRIGGER trg_init_item_balance AFTER INSERT ON public.production_order_items
  FOR EACH ROW EXECUTE FUNCTION public.init_item_balance();

-- 7) Passagem em bloco — a ÚNICA porta para mover saldo entre etapas
CREATE OR REPLACE FUNCTION public.register_passages(_moves jsonb, _observation text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m jsonb; v_batch uuid := gen_random_uuid(); v_item public.production_order_items%ROWTYPE;
  v_origin public.production_route_steps%ROWTYPE;
  v_dest uuid; v_qty int; v_type text; v_avail int; v_name text;
BEGIN
  IF NOT public.can_write_pcp(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para registrar passagens.';
  END IF;
  SELECT full_name INTO v_name FROM public.profiles WHERE id = auth.uid();
  FOR m IN SELECT * FROM jsonb_array_elements(_moves) LOOP
    v_qty := (m->>'quantity')::int;
    v_type := COALESCE(m->>'type','parcial');
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    SELECT * INTO v_item FROM public.production_order_items
     WHERE id = (m->>'item_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado.'; END IF;
    SELECT * INTO v_origin FROM public.production_route_steps
     WHERE id = (m->>'origin_step_id')::uuid AND route_id = v_item.route_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Etapa de origem não pertence à rota do item.'; END IF;
    SELECT quantity INTO v_avail FROM public.production_item_step_balance
     WHERE item_id = v_item.id AND step_id = v_origin.id FOR UPDATE;
    IF COALESCE(v_avail,0) < v_qty THEN
      RAISE EXCEPTION 'Quantidade (%) maior que o disponível (%) no item %.', v_qty, COALESCE(v_avail,0), v_item.reference_code;
    END IF;

    IF v_type = 'perda' THEN
      IF COALESCE(trim(_observation),'') = '' THEN RAISE EXCEPTION 'Informe o motivo da perda.'; END IF;
      v_dest := NULL;
      UPDATE public.production_order_items SET quantity_lost = quantity_lost + v_qty WHERE id = v_item.id;
    ELSIF v_type = 'retorno' THEN
      IF COALESCE(trim(_observation),'') = '' THEN RAISE EXCEPTION 'Informe o motivo do retorno.'; END IF;
      v_dest := (m->>'destination_step_id')::uuid;
      IF NOT EXISTS (
        SELECT 1 FROM public.production_route_steps
         WHERE id = v_dest AND route_id = v_item.route_id AND sequence < v_origin.sequence) THEN
        RAISE EXCEPTION 'Retorno só pode ir para uma etapa anterior da rota.';
      END IF;
    ELSE
      SELECT id INTO v_dest FROM public.production_route_steps
       WHERE route_id = v_item.route_id AND sequence > v_origin.sequence
       ORDER BY sequence LIMIT 1;
      IF v_dest IS NULL THEN
        UPDATE public.production_order_items SET quantity_produced = quantity_produced + v_qty WHERE id = v_item.id;
      END IF;
    END IF;

    UPDATE public.production_item_step_balance
       SET quantity = quantity - v_qty, updated_at = now()
     WHERE item_id = v_item.id AND step_id = v_origin.id;
    IF v_dest IS NOT NULL THEN
      INSERT INTO public.production_item_step_balance(item_id, step_id, quantity)
      VALUES (v_item.id, v_dest, v_qty)
      ON CONFLICT (item_id, step_id) DO UPDATE
        SET quantity = public.production_item_step_balance.quantity + EXCLUDED.quantity,
            updated_at = now();
    END IF;

    INSERT INTO public.production_passages(
      batch_id, production_order_id, production_order_item_id, route_id,
      origin_step_id, destination_step_id, quantity, type,
      responsible_id, responsible_name, observation)
    VALUES (v_batch, v_item.production_order_id, v_item.id, v_item.route_id,
      v_origin.id, v_dest, v_qty, v_type, auth.uid(), v_name, _observation);

    UPDATE public.production_order_items i
       SET status = CASE
         WHEN i.quantity_produced + i.quantity_lost >= i.quantity_planned THEN 'concluido'
         ELSE 'em_producao' END
     WHERE i.id = v_item.id;
    UPDATE public.production_orders SET status = 'em_producao'
     WHERE id = v_item.production_order_id AND status = 'planejada';
  END LOOP;
  RETURN v_batch;
END $$;
REVOKE EXECUTE ON FUNCTION public.register_passages(jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_passages(jsonb, text) TO authenticated;

-- 8) Troca de rota antes da primeira passagem (com justificativa)
CREATE OR REPLACE FUNCTION public.change_item_route(_item_id uuid, _route_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item public.production_order_items%ROWTYPE; v_first uuid; v_name text;
BEGIN
  IF NOT public.can_plan_pcp(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para trocar a rota.'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RAISE EXCEPTION 'Informe a justificativa da troca de rota.';
  END IF;
  SELECT * INTO v_item FROM public.production_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado.'; END IF;
  IF v_item.route_id = _route_id THEN RAISE EXCEPTION 'O item já está nessa rota.'; END IF;
  IF EXISTS (SELECT 1 FROM public.production_passages
              WHERE production_order_item_id = _item_id AND type <> 'desvio') THEN
    RAISE EXCEPTION 'Só é possível trocar a rota antes da primeira passagem do item.';
  END IF;
  SELECT id INTO v_first FROM public.production_route_steps
   WHERE route_id = _route_id ORDER BY sequence LIMIT 1;
  IF v_first IS NULL THEN RAISE EXCEPTION 'A rota escolhida não tem etapas.'; END IF;
  SELECT full_name INTO v_name FROM public.profiles WHERE id = auth.uid();
  DELETE FROM public.production_item_step_balance WHERE item_id = _item_id;
  UPDATE public.production_order_items SET route_id = _route_id WHERE id = _item_id;
  INSERT INTO public.production_item_step_balance(item_id, step_id, quantity)
  VALUES (_item_id, v_first, v_item.quantity_planned);
  INSERT INTO public.production_passages(
    batch_id, production_order_id, production_order_item_id, route_id,
    origin_step_id, destination_step_id, quantity, type, responsible_name, observation)
  VALUES (gen_random_uuid(), v_item.production_order_id, _item_id, _route_id,
    NULL, v_first, v_item.quantity_planned, 'desvio', v_name, 'Rota alternativa: ' || trim(_reason));
END $$;
REVOKE ALL ON FUNCTION public.change_item_route(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_item_route(uuid, uuid, text) TO authenticated;

-- 9) Eventos: passagem e OP entram no entity_events (timeline única)
CREATE OR REPLACE FUNCTION public.log_production_passage_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from text; v_to text; v_ref text;
BEGIN
  SELECT sector INTO v_from FROM public.production_route_steps WHERE id = NEW.origin_step_id;
  SELECT sector INTO v_to FROM public.production_route_steps WHERE id = NEW.destination_step_id;
  SELECT reference_code || coalesce(' ' || color, '') INTO v_ref
    FROM public.production_order_items WHERE id = NEW.production_order_item_id;
  INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, note, actor, actor_name, payload)
  VALUES ('production_order', NEW.production_order_id, 'production.passage.' || NEW.type,
    v_from, v_to, NEW.observation, NEW.responsible_id, NEW.responsible_name,
    jsonb_build_object('item_id', NEW.production_order_item_id, 'item', v_ref,
                       'quantity', NEW.quantity, 'batch_id', NEW.batch_id));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_production_passage_event() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_log_production_passage ON public.production_passages;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_log_production_passage ON public.production_passages;
CREATE TRIGGER trg_log_production_passage AFTER INSERT ON public.production_passages
  FOR EACH ROW EXECUTE FUNCTION public.log_production_passage_event();

CREATE OR REPLACE FUNCTION public.log_production_order_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, to_status, actor, payload)
    VALUES ('production_order', NEW.id, 'production.order.created', NEW.status, auth.uid(),
            jsonb_build_object('number', NEW.number));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('production_order', NEW.id, 'production.order.status_changed', OLD.status, NEW.status,
            auth.uid(), jsonb_build_object('number', NEW.number));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_production_order_event() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_log_production_order ON public.production_orders;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_log_production_order ON public.production_orders;
CREATE TRIGGER trg_log_production_order AFTER INSERT OR UPDATE ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_production_order_event();

-- =============================================================================
-- 20261021090000_sales_orders_enums.sql — Novos valores de enum: engenharia_custo, sales_order, sales_order_item
-- =============================================================================

-- Pedido personalizado (fase 1) — valores de enum.
-- Arquivo separado de propósito: no Postgres, ALTER TYPE ... ADD VALUE não pode
-- ser USADO (cast) na mesma transação em que é criado. O repo já faz assim
-- (drizzle/migrations/0005_pcp_op_entity_types.sql). Rode este ANTES do 20261021090100.
-- Convenção do repo: comentário em .sql é APENAS -- (barra dupla quebra o SQL editor do Lovable).

-- Papel do vendedor já existe desde 20260708004356 ('comercial').
-- Falta o papel de quem detalha operações e fecha o custo:
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'engenharia_custo';

-- Entidades novas no barramento de eventos (entity_events.account_*).
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'production_order';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'sales_order';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'sales_order_item';

-- =============================================================================
-- 20261021090100_sales_orders.sql — Núcleo: 12 tabelas, RLS, 7 funções, triggers, seeds
-- =============================================================================

-- =============================================================================
-- PEDIDO PERSONALIZADO — fluxo comercial -> ficha tecnica do pedido -> custo -> liberacao PCP
-- Rascunho de migration para revisao (nao aplicar em producao sem ler o parecer).
-- Requer 20261021090000_sales_orders_enums.sql aplicado antes (enum novo nao se usa
-- na mesma transacao em que e criado).
--
-- Reaproveita o que ja existe: customers (novo), production_routes,
-- product_configurations/configuration_routes, production_orders, entity_events,
-- has_role/is_member/can_plan_pcp, update_updated_at_column.
-- Convencao do repo: comentario APENAS com -- (barra dupla quebra o SQL editor do Lovable).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Cliente comercial (o PLM nao tinha; suppliers existia, customers nao)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  trade_name text,
  tax_id text,
  email text,
  phone text,
  city text,
  state text,
  segment text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customers_name_idx ON public.customers (lower(name));

-- ---------------------------------------------------------------------------
-- 2) Catalogo tecnico-comercial: o que o vendedor PODE vender
--    Regra central: so produto com status 'validado' entra em pedido.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  family text,
  description text,
  reference_code text,
  configuration_id uuid REFERENCES public.product_configurations(id),
  base_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  min_qty integer NOT NULL DEFAULT 10 CHECK (min_qty > 0),
  grade jsonb NOT NULL DEFAULT '["P","M","G","GG","3G"]'::jsonb,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','validado','descontinuado')),
  validated_by uuid,
  validated_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalog_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  selection text NOT NULL DEFAULT 'single' CHECK (selection IN ('single','multi')),
  required boolean NOT NULL DEFAULT false,
  sort integer NOT NULL DEFAULT 0,
  UNIQUE (product_id, code)
);

-- A opcao carrega o custeio. E isto que impede o custo de virar gargalo:
-- o engenheiro parametriza UMA vez; o pedido so escolhe e o custo detalha o delta.
CREATE TABLE IF NOT EXISTS public.catalog_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.catalog_option_groups(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  sector text,
  operation_name text,
  driver text NOT NULL DEFAULT 'peca'
    CHECK (driver IN ('peca','mil_pontos','m2','cor','minuto','lote')),
  unit_cost numeric(12,4) NOT NULL DEFAULT 0,
  setup_cost numeric(12,4) NOT NULL DEFAULT 0,
  minutes numeric(8,2),
  outsourced boolean NOT NULL DEFAULT false,
  material_consumption jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_spec text[] NOT NULL DEFAULT '{}',
  price_delta numeric(12,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (group_id, code)
);
CREATE INDEX IF NOT EXISTS catalog_options_group_idx ON public.catalog_options (group_id);

-- ---------------------------------------------------------------------------
-- 3) Pedido / orcamento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  seller_id uuid DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviado','em_custo','custo_concluido','aprovado','liberado_pcp','cancelado')),
  is_quote boolean NOT NULL DEFAULT true,
  due_date date,
  quote_valid_until date,
  payment_terms text,
  notes text,
  total_value numeric(14,2) NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  released_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_orders_status_idx ON public.sales_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS sales_orders_customer_idx ON public.sales_orders (customer_id);
CREATE INDEX IF NOT EXISTS sales_orders_seller_idx ON public.sales_orders (seller_id);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  line_no integer NOT NULL DEFAULT 1,
  catalog_product_id uuid NOT NULL REFERENCES public.catalog_products(id),
  reference_code text,
  description text NOT NULL,
  color text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  price_locked boolean NOT NULL DEFAULT false,
  tech_status text NOT NULL DEFAULT 'aguardando_ficha'
    CHECK (tech_status IN ('aguardando_ficha','em_detalhamento','ficha_concluida')),
  cost_status text NOT NULL DEFAULT 'aguardando_custo'
    CHECK (cost_status IN ('aguardando_custo','em_custo','custo_concluido','aprovado','reprovado')),
  production_order_item_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, line_no)
);
CREATE INDEX IF NOT EXISTS sales_order_items_order_idx ON public.sales_order_items (order_id);
CREATE INDEX IF NOT EXISTS sales_order_items_cost_idx ON public.sales_order_items (cost_status);

CREATE TABLE IF NOT EXISTS public.sales_order_item_sizes (
  item_id uuid NOT NULL REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY (item_id, size)
);

CREATE TABLE IF NOT EXISTS public.sales_order_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.catalog_options(id),
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  UNIQUE (item_id, option_id)
);

-- ---------------------------------------------------------------------------
-- 4) Ficha do pedido: materiais e operacoes (o que o custo detalha)
--    Estas tabelas carregam unit_cost: leitura restrita (ver RLS).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_order_item_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'aviamento'
    CHECK (kind IN ('tecido','aviamento','linha','embalagem','servico')),
  material text NOT NULL,
  material_id uuid REFERENCES public.materials(id),
  unit text NOT NULL DEFAULT 'un',
  consumption numeric(12,4) NOT NULL DEFAULT 0,
  waste_pct numeric(5,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,4) NOT NULL DEFAULT 0,
  total_cost numeric(12,2),
  source text NOT NULL DEFAULT 'custo' CHECK (source IN ('catalogo','custo')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS so_item_materials_item_idx ON public.sales_order_item_materials (item_id);

CREATE TABLE IF NOT EXISTS public.sales_order_item_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  seq integer NOT NULL DEFAULT 1,
  sector text NOT NULL,
  operation text NOT NULL,
  driver text NOT NULL DEFAULT 'peca'
    CHECK (driver IN ('peca','mil_pontos','m2','cor','minuto','lote')),
  driver_qty numeric(12,3) NOT NULL DEFAULT 1,
  unit_cost numeric(12,4) NOT NULL DEFAULT 0,
  setup_cost numeric(12,4) NOT NULL DEFAULT 0,
  total_cost numeric(12,2),
  source text NOT NULL DEFAULT 'custo' CHECK (source IN ('catalogo','custo')),
  option_id uuid REFERENCES public.catalog_options(id),
  outsourced boolean NOT NULL DEFAULT false,
  supplier_id uuid REFERENCES public.suppliers(id),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, seq)
);
CREATE INDEX IF NOT EXISTS so_item_ops_item_idx ON public.sales_order_item_operations (item_id);

-- Custo fechado por item: tabela separada de proposito (isolamento de preco/custo).
CREATE TABLE IF NOT EXISTS public.sales_order_item_costs (
  item_id uuid PRIMARY KEY REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  materials_total numeric(12,2) NOT NULL DEFAULT 0,
  operations_total numeric(12,2) NOT NULL DEFAULT 0,
  setup_total numeric(12,2) NOT NULL DEFAULT 0,
  overhead_pct numeric(5,2) NOT NULL DEFAULT 8,
  industrial_cost numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  margin_pct numeric(6,2),
  suggested_price numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_detalhamento','concluido','aprovado','reprovado')),
  detailed_by uuid,
  detailed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cost_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  min_margin_pct numeric(5,2) NOT NULL DEFAULT 25,
  default_overhead_pct numeric(5,2) NOT NULL DEFAULT 8,
  default_markup_pct numeric(5,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cost_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5) Permissoes
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_sell(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR public.has_role(_uid,'manager')
      OR public.has_role(_uid,'comercial') OR public.has_role(_uid,'diretor_produto')
$$;

CREATE OR REPLACE FUNCTION public.can_cost(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR public.has_role(_uid,'manager')
      OR public.has_role(_uid,'engenharia_custo') OR public.has_role(_uid,'coordenador_produto')
$$;

CREATE OR REPLACE FUNCTION public.can_edit_sales_order(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_orders o
     WHERE o.id = _order_id
       AND ((o.seller_id = auth.uid() AND o.status IN ('rascunho','enviado'))
            OR public.can_cost(auth.uid()))
  )
$$;

REVOKE EXECUTE ON FUNCTION public.can_sell(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_cost(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_sales_order(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_sell(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_cost(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_sales_order(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Numeracao do pedido
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_sales_order_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year text := to_char(now(),'YYYY'); v_seq int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('sales_order_number'));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(number,'^PED-'||v_year||'-',''),'')::int),0)+1
    INTO v_seq FROM public.sales_orders WHERE number LIKE 'PED-'||v_year||'-%';
  RETURN 'PED-'||v_year||'-'||lpad(v_seq::text,4,'0');
END $$;
REVOKE EXECUTE ON FUNCTION public.next_sales_order_number() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.next_sales_order_number() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Triggers: updated_at + barramento de eventos
-- ---------------------------------------------------------------------------
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_customers ON public.customers;
CREATE TRIGGER trg_upd_customers BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_catalog_products ON public.catalog_products;
CREATE TRIGGER trg_upd_catalog_products BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_sales_orders ON public.sales_orders;
CREATE TRIGGER trg_upd_sales_orders BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_sales_order_items ON public.sales_order_items;
CREATE TRIGGER trg_upd_sales_order_items BEFORE UPDATE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_upd_so_item_ops ON public.sales_order_item_operations;
CREATE TRIGGER trg_upd_so_item_ops BEFORE UPDATE ON public.sales_order_item_operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.log_sales_order_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, to_status, actor, payload)
    VALUES ('sales_order', NEW.id, 'sales_order.created', NEW.status, auth.uid(),
            jsonb_build_object('number', NEW.number, 'customer_id', NEW.customer_id));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('sales_order', NEW.id, 'sales_order.status_changed', OLD.status, NEW.status, auth.uid(),
            jsonb_build_object('number', NEW.number));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_sales_order_event() FROM public, anon, authenticated;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_log_sales_order ON public.sales_orders;
CREATE TRIGGER trg_log_sales_order AFTER INSERT OR UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_sales_order_event();

CREATE OR REPLACE FUNCTION public.log_sales_item_cost_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order uuid; v_desc text;
BEGIN
  SELECT order_id, description INTO v_order, v_desc
    FROM public.sales_order_items WHERE id = NEW.item_id;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('sales_order_item', NEW.item_id,
            CASE WHEN TG_OP = 'INSERT' THEN 'sales_order.cost.opened' ELSE 'sales_order.cost.'||NEW.status END,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
            NEW.status, auth.uid(),
            jsonb_build_object('order_id', v_order, 'item', v_desc, 'unit_cost', NEW.unit_cost));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_sales_item_cost_event() FROM public, anon, authenticated;
-- (bundle) recria trigger com segurança
DROP TRIGGER IF EXISTS trg_log_sales_item_cost ON public.sales_order_item_costs;
CREATE TRIGGER trg_log_sales_item_cost AFTER INSERT OR UPDATE ON public.sales_order_item_costs
  FOR EACH ROW EXECUTE FUNCTION public.log_sales_item_cost_event();

-- ---------------------------------------------------------------------------
-- 8) Enviar pedido: valida e explode o catalogo na ficha do pedido
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_sales_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.sales_orders%ROWTYPE;
  v_item public.sales_order_items%ROWTYPE;
  v_prod public.catalog_products%ROWTYPE;
  v_sum int; v_missing text; v_opt record;
BEGIN
  IF NOT (public.can_sell(auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Sem permissao para enviar pedido.';
  END IF;
  SELECT * INTO v_order FROM public.sales_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado.'; END IF;
  IF v_order.status NOT IN ('rascunho','enviado') THEN
    RAISE EXCEPTION 'Pedido no status % nao pode ser enviado.', v_order.status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_order_items WHERE order_id = _order_id) THEN
    RAISE EXCEPTION 'Pedido sem itens.';
  END IF;

  FOR v_item IN SELECT * FROM public.sales_order_items WHERE order_id = _order_id ORDER BY line_no LOOP
    SELECT * INTO v_prod FROM public.catalog_products WHERE id = v_item.catalog_product_id;
    IF v_prod.status <> 'validado' THEN
      RAISE EXCEPTION 'Produto % nao esta validado para venda (status %).', v_prod.code, v_prod.status;
    END IF;
    IF v_item.quantity < v_prod.min_qty THEN
      RAISE EXCEPTION 'Item % abaixo da quantidade minima (% pecas).', v_item.description, v_prod.min_qty;
    END IF;
    SELECT COALESCE(SUM(quantity),0) INTO v_sum
      FROM public.sales_order_item_sizes WHERE item_id = v_item.id;
    IF v_sum > 0 AND v_sum <> v_item.quantity THEN
      RAISE EXCEPTION 'Item %: grade soma % pecas, item tem %.', v_item.description, v_sum, v_item.quantity;
    END IF;
    IF v_item.unit_price <= 0 THEN
      RAISE EXCEPTION 'Item % sem preco comercial.', v_item.description;
    END IF;

    SELECT string_agg(g.name, ', ') INTO v_missing
      FROM public.catalog_option_groups g
     WHERE g.product_id = v_prod.id AND g.required
       AND NOT EXISTS (
         SELECT 1 FROM public.sales_order_item_options o
          JOIN public.catalog_options co ON co.id = o.option_id
         WHERE o.item_id = v_item.id AND co.group_id = g.id);
    IF v_missing IS NOT NULL THEN
      RAISE EXCEPTION 'Item %: escolha obrigatoria pendente (%).', v_item.description, v_missing;
    END IF;

    FOR v_opt IN
      SELECT co.*, soo.quantity AS opt_qty, soo.spec AS opt_spec
        FROM public.sales_order_item_options soo
        JOIN public.catalog_options co ON co.id = soo.option_id
       WHERE soo.item_id = v_item.id
    LOOP
      IF v_opt.operation_name IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.sales_order_item_operations op
         WHERE op.item_id = v_item.id AND op.option_id = v_opt.id) THEN
        INSERT INTO public.sales_order_item_operations
          (item_id, seq, sector, operation, driver, driver_qty, unit_cost, setup_cost, source, option_id, outsourced)
        VALUES (
          v_item.id,
          COALESCE((SELECT MAX(seq) FROM public.sales_order_item_operations WHERE item_id = v_item.id),0) + 1,
          COALESCE(v_opt.sector,'Producao'),
          v_opt.operation_name,
          v_opt.driver,
          CASE v_opt.driver
            WHEN 'peca' THEN v_item.quantity * v_opt.opt_qty
            WHEN 'lote' THEN 1
            ELSE COALESCE((v_opt.opt_spec->>'driver_qty')::numeric, v_opt.opt_qty) * v_item.quantity
          END,
          v_opt.unit_cost, v_opt.setup_cost, 'catalogo', v_opt.id, v_opt.outsourced);
      END IF;

      INSERT INTO public.sales_order_item_materials
        (item_id, kind, material, unit, consumption, waste_pct, unit_cost, source, notes)
      SELECT v_item.id,
             COALESCE(m->>'kind','aviamento'), m->>'material', COALESCE(m->>'unit','un'),
             COALESCE((m->>'consumption')::numeric,0),
             COALESCE((m->>'waste_pct')::numeric,0),
             COALESCE((m->>'unit_cost')::numeric,0),
             'catalogo', 'explosao da opcao ' || v_opt.name
        FROM jsonb_array_elements(v_opt.material_consumption) m
       WHERE m->>'material' IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.sales_order_item_materials x
            WHERE x.item_id = v_item.id AND x.material = m->>'material');
    END LOOP;

    UPDATE public.sales_order_items
       SET tech_status = 'em_detalhamento', cost_status = 'aguardando_custo'
     WHERE id = v_item.id;
    INSERT INTO public.sales_order_item_costs (item_id, status)
    VALUES (v_item.id, 'pendente')
    ON CONFLICT (item_id) DO NOTHING;
  END LOOP;

  UPDATE public.sales_orders
     SET status = 'enviado', submitted_at = now(),
         total_value = (SELECT COALESCE(SUM(quantity * unit_price),0) FROM public.sales_order_items WHERE order_id = _order_id)
   WHERE id = _order_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_sales_order(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_sales_order(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) Recalcular custo do item (materiais + operacoes + setup, rateio e margem)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_sales_order_item(_item_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item public.sales_order_items%ROWTYPE;
  v_set public.cost_settings%ROWTYPE;
  v_mat numeric := 0; v_op numeric := 0; v_setup numeric := 0;
  v_ind numeric := 0; v_oh numeric := 0; v_unit numeric := 0;
  v_margin numeric; v_price numeric;
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para calcular custo.';
  END IF;
  SELECT * INTO v_item FROM public.sales_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  SELECT * INTO v_set FROM public.cost_settings LIMIT 1;

  -- Consumo é por PEÇA: o total da linha multiplica pela quantidade do item.
  UPDATE public.sales_order_item_materials m
     SET total_cost = round(
           m.consumption * (1 + m.waste_pct/100) * m.unit_cost
           * COALESCE((SELECT i.quantity FROM public.sales_order_items i WHERE i.id = m.item_id), 0), 2)
   WHERE m.item_id = _item_id;

  SELECT COALESCE(SUM(total_cost),0) INTO v_mat
    FROM public.sales_order_item_materials WHERE item_id = _item_id;

  UPDATE public.sales_order_item_operations
     SET total_cost = (unit_cost * driver_qty) + setup_cost
   WHERE item_id = _item_id;

  SELECT COALESCE(SUM(unit_cost * driver_qty),0), COALESCE(SUM(setup_cost),0)
    INTO v_op, v_setup
    FROM public.sales_order_item_operations WHERE item_id = _item_id;

  v_ind := v_mat + v_op + v_setup;
  v_oh := v_ind * COALESCE(v_set.default_overhead_pct,0) / 100;
  v_unit := CASE WHEN v_item.quantity > 0 THEN (v_ind + v_oh) / v_item.quantity ELSE 0 END;
  v_price := v_item.unit_price;
  v_margin := CASE WHEN v_price > 0 THEN (v_price - v_unit) / v_price * 100 ELSE NULL END;

  INSERT INTO public.sales_order_item_costs
    (item_id, materials_total, operations_total, setup_total, overhead_pct,
     industrial_cost, unit_cost, margin_pct, suggested_price, status, detailed_by, detailed_at, updated_at)
  VALUES
    (_item_id, v_mat, v_op, v_setup, COALESCE(v_set.default_overhead_pct,0),
     v_ind + v_oh, v_unit, v_margin, v_unit * (1 + COALESCE(v_set.default_markup_pct,0)/100),
     'concluido', auth.uid(), now(), now())
  ON CONFLICT (item_id) DO UPDATE SET
    materials_total = EXCLUDED.materials_total,
    operations_total = EXCLUDED.operations_total,
    setup_total = EXCLUDED.setup_total,
    overhead_pct = EXCLUDED.overhead_pct,
    industrial_cost = EXCLUDED.industrial_cost,
    unit_cost = EXCLUDED.unit_cost,
    margin_pct = EXCLUDED.margin_pct,
    suggested_price = EXCLUDED.suggested_price,
    status = CASE WHEN sales_order_item_costs.status = 'aprovado'
                  THEN 'aprovado' ELSE 'concluido' END,
    detailed_by = auth.uid(), detailed_at = now(), updated_at = now();

  UPDATE public.sales_order_items SET cost_status = 'custo_concluido' WHERE id = _item_id;
  UPDATE public.sales_orders SET status = 'em_custo'
   WHERE id = v_item.order_id AND status IN ('enviado');
  RETURN v_unit;
END $$;
REVOKE ALL ON FUNCTION public.recalc_sales_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recalc_sales_order_item(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10) Aprovar custo do item (margem minima e gate de gestor)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_sales_order_item(_item_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cost public.sales_order_item_costs%ROWTYPE;
  v_item public.sales_order_items%ROWTYPE;
  v_set public.cost_settings%ROWTYPE;
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para aprovar custo.';
  END IF;
  SELECT * INTO v_item FROM public.sales_order_items WHERE id = _item_id FOR UPDATE;
  SELECT * INTO v_cost FROM public.sales_order_item_costs WHERE item_id = _item_id FOR UPDATE;
  IF NOT FOUND OR v_cost.status NOT IN ('concluido') THEN
    RAISE EXCEPTION 'Custo do item precisa estar concluido para aprovar (status: %).', COALESCE(v_cost.status,'ausente');
  END IF;
  SELECT * INTO v_set FROM public.cost_settings LIMIT 1;
  IF v_cost.margin_pct IS NULL OR v_cost.margin_pct < v_set.min_margin_pct THEN
    IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')) THEN
      RAISE EXCEPTION 'Margem % esta abaixo do minimo % — aprovacao de gestor necessaria.',
        COALESCE(round(v_cost.margin_pct,2),0), v_set.min_margin_pct;
    END IF;
  END IF;

  UPDATE public.sales_order_item_costs
     SET status = 'aprovado', approved_by = auth.uid(), approved_at = now(),
         notes = COALESCE(_note, notes), updated_at = now()
   WHERE item_id = _item_id;
  UPDATE public.sales_order_items SET cost_status = 'aprovado' WHERE id = _item_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.sales_order_items
     WHERE order_id = v_item.order_id AND cost_status <> 'aprovado') THEN
    UPDATE public.sales_orders
       SET status = 'aprovado', approved_at = now()
     WHERE id = v_item.order_id AND status IN ('em_custo','custo_concluido');
  ELSE
    UPDATE public.sales_orders SET status = 'custo_concluido'
     WHERE id = v_item.order_id AND status = 'em_custo';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.approve_sales_order_item(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_sales_order_item(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11) Liberar para PCP: gera OP por pedido com a rota da configuracao
--     Nao toca a regra de producao: saldo por etapa continua em register_passages.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_sales_order_to_pcp(_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order public.sales_orders%ROWTYPE;
  v_item record; v_route uuid; v_op uuid; v_poi uuid; v_config uuid; v_pend int;
BEGIN
  IF NOT public.can_plan_pcp(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para liberar pedido para PCP.';
  END IF;
  SELECT * INTO v_order FROM public.sales_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido nao encontrado.'; END IF;
  IF v_order.status <> 'aprovado' THEN
    RAISE EXCEPTION 'Pedido precisa estar aprovado (status atual: %).', v_order.status;
  END IF;

  SELECT count(*) INTO v_pend FROM public.sales_order_items
   WHERE order_id = _order_id AND cost_status <> 'aprovado';
  IF v_pend > 0 THEN
    RAISE EXCEPTION '% item(ns) sem custo aprovado.', v_pend;
  END IF;

  INSERT INTO public.production_orders (number, status, priority, planned_end, notes)
  VALUES ('OP-'||v_order.number, 'planejada', 'media', v_order.due_date,
          'Gerada do pedido '||v_order.number)
  RETURNING id INTO v_op;

  FOR v_item IN
    SELECT i.*, p.configuration_id AS cfg
      FROM public.sales_order_items i
      JOIN public.catalog_products p ON p.id = i.catalog_product_id
     WHERE i.order_id = _order_id
     ORDER BY i.line_no
  LOOP
    v_config := v_item.cfg;
    SELECT route_id INTO v_route
      FROM public.configuration_routes
     WHERE configuration_id = v_config
     ORDER BY is_default DESC, created_at
     LIMIT 1;
    IF v_route IS NULL THEN
      RAISE EXCEPTION 'Item % sem rota padrao — configure em PCP > Rotas.', v_item.description;
    END IF;

    INSERT INTO public.production_order_items
      (production_order_id, reference_code, reference_name, color, configuration_id,
       route_id, quantity_planned, status)
    VALUES
      (v_op, COALESCE(v_item.reference_code, v_item.description), v_item.description,
       v_item.color, v_config, v_route, v_item.quantity, 'aguardando')
    RETURNING id INTO v_poi;

    UPDATE public.sales_order_items
       SET production_order_item_id = v_poi
     WHERE id = v_item.id;

    INSERT INTO public.entity_relations (from_type, from_id, to_type, to_id, relation, created_by)
    VALUES ('sales_order', _order_id, 'production_order', v_op, 'gerou_op', auth.uid())
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.sales_orders SET status = 'liberado_pcp', released_at = now() WHERE id = _order_id;
  RETURN v_op;
END $$;
REVOKE ALL ON FUNCTION public.release_sales_order_to_pcp(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.release_sales_order_to_pcp(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 12) Ficha tecnica do pedido SEM custo (producao e qualidade leem)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_item_technical_sheet(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_out jsonb;
BEGIN
  IF NOT public.is_member(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao.';
  END IF;
  SELECT jsonb_build_object(
    'order', jsonb_build_object('number', o.number, 'status', o.status,
                                'due_date', o.due_date, 'customer', c.name),
    'items', COALESCE(jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'description', i.description,
        'color', i.color,
        'quantity', i.quantity,
        'reference_code', i.reference_code,
        'tech_status', i.tech_status,
        'grade', (SELECT COALESCE(jsonb_object_agg(s.size, s.quantity), '{}'::jsonb)
                    FROM public.sales_order_item_sizes s WHERE s.item_id = i.id),
        'options', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'name', co.name, 'sector', co.sector,
                        'quantity', soo.quantity, 'spec', soo.spec)), '[]'::jsonb)
                      FROM public.sales_order_item_options soo
                      JOIN public.catalog_options co ON co.id = soo.option_id
                     WHERE soo.item_id = i.id),
        'operations', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'seq', op.seq, 'sector', op.sector, 'operation', op.operation,
                        'outsourced', op.outsourced)), '[]'::jsonb)
                      FROM public.sales_order_item_operations op WHERE op.item_id = i.id),
        'materials', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'kind', m.kind, 'material', m.material, 'unit', m.unit,
                        'consumption', m.consumption, 'waste_pct', m.waste_pct)), '[]'::jsonb)
                      FROM public.sales_order_item_materials m WHERE m.item_id = i.id)
      ) ORDER BY i.line_no) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb)
  )
  INTO v_out
  FROM public.sales_orders o
  JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.sales_order_items i ON i.order_id = o.id
  WHERE o.id = _order_id
  GROUP BY o.number, o.status, o.due_date, c.name;
  RETURN COALESCE(v_out, '{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.order_item_technical_sheet(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.order_item_technical_sheet(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 13) RLS
-- ---------------------------------------------------------------------------
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','catalog_products','catalog_option_groups','catalog_options',
    'sales_orders','sales_order_items','sales_order_item_sizes','sales_order_item_options',
    'sales_order_item_materials','sales_order_item_operations','sales_order_item_costs','cost_settings'
  ] LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_option_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_item_sizes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_item_options TO authenticated;
GRANT SELECT ON public.cost_settings TO authenticated;

-- Custo: tabela sem GRANT para authenticated. Somente via funcoes SECURITY DEFINER.
GRANT SELECT, INSERT, UPDATE ON public.sales_order_item_materials TO authenticated;
GRANT SELECT ON public.sales_order_item_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales_order_item_operations TO authenticated;

-- customers
DROP POLICY IF EXISTS customers_read ON public.customers;
CREATE POLICY customers_read ON public.customers FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS customers_write ON public.customers;
CREATE POLICY customers_write ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.can_sell(auth.uid()));
DROP POLICY IF EXISTS customers_update ON public.customers;
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));
DROP POLICY IF EXISTS customers_delete ON public.customers;
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- catalogo (engenharia e custo sao donos)
DROP POLICY IF EXISTS catalog_products_read ON public.catalog_products;
CREATE POLICY catalog_products_read ON public.catalog_products FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS catalog_products_write ON public.catalog_products;
CREATE POLICY catalog_products_write ON public.catalog_products FOR ALL TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));
DROP POLICY IF EXISTS catalog_groups_read ON public.catalog_option_groups;
CREATE POLICY catalog_groups_read ON public.catalog_option_groups FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS catalog_groups_write ON public.catalog_option_groups;
CREATE POLICY catalog_groups_write ON public.catalog_option_groups FOR ALL TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));
DROP POLICY IF EXISTS catalog_options_read ON public.catalog_options;
CREATE POLICY catalog_options_read ON public.catalog_options FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS catalog_options_write ON public.catalog_options;
CREATE POLICY catalog_options_write ON public.catalog_options FOR ALL TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));

-- pedido
DROP POLICY IF EXISTS sales_orders_read ON public.sales_orders;
CREATE POLICY sales_orders_read ON public.sales_orders FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS sales_orders_insert ON public.sales_orders;
CREATE POLICY sales_orders_insert ON public.sales_orders FOR INSERT TO authenticated
  WITH CHECK (public.can_sell(auth.uid()));
DROP POLICY IF EXISTS sales_orders_update ON public.sales_orders;
CREATE POLICY sales_orders_update ON public.sales_orders FOR UPDATE TO authenticated
  USING (public.can_edit_sales_order(id)) WITH CHECK (public.can_edit_sales_order(id));
DROP POLICY IF EXISTS sales_orders_delete ON public.sales_orders;
CREATE POLICY sales_orders_delete ON public.sales_orders FOR DELETE TO authenticated
  USING ((seller_id = auth.uid() AND status = 'rascunho') OR public.has_role(auth.uid(),'admin'));

-- itens e filhos: espelham a permissao do pedido
DROP POLICY IF EXISTS so_items_read ON public.sales_order_items;
CREATE POLICY so_items_read ON public.sales_order_items FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS so_items_write ON public.sales_order_items;
CREATE POLICY so_items_write ON public.sales_order_items FOR ALL TO authenticated
  USING (public.can_edit_sales_order(order_id)) WITH CHECK (public.can_edit_sales_order(order_id));

DROP POLICY IF EXISTS so_sizes_read ON public.sales_order_item_sizes;
CREATE POLICY so_sizes_read ON public.sales_order_item_sizes FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS so_sizes_write ON public.sales_order_item_sizes;
CREATE POLICY so_sizes_write ON public.sales_order_item_sizes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.id = item_id AND public.can_edit_sales_order(i.order_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.id = item_id AND public.can_edit_sales_order(i.order_id)));

DROP POLICY IF EXISTS so_options_read ON public.sales_order_item_options;
CREATE POLICY so_options_read ON public.sales_order_item_options FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS so_options_write ON public.sales_order_item_options;
CREATE POLICY so_options_write ON public.sales_order_item_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.id = item_id AND public.can_edit_sales_order(i.order_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.id = item_id AND public.can_edit_sales_order(i.order_id)));

-- ficha do pedido com custo: apenas custo/gestao
DROP POLICY IF EXISTS so_materials_cost_read ON public.sales_order_item_materials;
CREATE POLICY so_materials_cost_read ON public.sales_order_item_materials FOR SELECT TO authenticated
  USING (public.can_cost(auth.uid()));
DROP POLICY IF EXISTS so_materials_cost_write ON public.sales_order_item_materials;
CREATE POLICY so_materials_cost_write ON public.sales_order_item_materials FOR INSERT TO authenticated
  WITH CHECK (public.can_cost(auth.uid()));
DROP POLICY IF EXISTS so_materials_cost_update ON public.sales_order_item_materials;
CREATE POLICY so_materials_cost_update ON public.sales_order_item_materials FOR UPDATE TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));
DROP POLICY IF EXISTS so_materials_cost_delete ON public.sales_order_item_materials;
CREATE POLICY so_materials_cost_delete ON public.sales_order_item_materials FOR DELETE TO authenticated
  USING (public.can_cost(auth.uid()));

DROP POLICY IF EXISTS so_ops_cost_read ON public.sales_order_item_operations;
CREATE POLICY so_ops_cost_read ON public.sales_order_item_operations FOR SELECT TO authenticated
  USING (public.can_cost(auth.uid()));
DROP POLICY IF EXISTS so_ops_cost_write ON public.sales_order_item_operations;
CREATE POLICY so_ops_cost_write ON public.sales_order_item_operations FOR INSERT TO authenticated
  WITH CHECK (public.can_cost(auth.uid()));
DROP POLICY IF EXISTS so_ops_cost_update ON public.sales_order_item_operations;
CREATE POLICY so_ops_cost_update ON public.sales_order_item_operations FOR UPDATE TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));
DROP POLICY IF EXISTS so_ops_cost_delete ON public.sales_order_item_operations;
CREATE POLICY so_ops_cost_delete ON public.sales_order_item_operations FOR DELETE TO authenticated
  USING (public.can_cost(auth.uid()));

-- custo fechado: sem GRANT direto para authenticated (somente funcoes)
ALTER TABLE public.sales_order_item_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS so_costs_read ON public.sales_order_item_costs;
CREATE POLICY so_costs_read ON public.sales_order_item_costs FOR SELECT TO authenticated
  USING (public.can_cost(auth.uid()));

-- cost_settings: leitura para todos os membros (a UI de custo mostra o minimo), escrita admin
DROP POLICY IF EXISTS cost_settings_read ON public.cost_settings;
CREATE POLICY cost_settings_read ON public.cost_settings FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
DROP POLICY IF EXISTS cost_settings_write ON public.cost_settings;
CREATE POLICY cost_settings_write ON public.cost_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------------------------------------------------------------------------
-- 14) Maquina de estados do pedido no workflow_definitions (motor existente)
-- ---------------------------------------------------------------------------
INSERT INTO public.workflow_definitions (entity_type, from_status, to_status, requires_role, sla_hours)
VALUES
  ('sales_order','rascunho','enviado','comercial',24),
  ('sales_order','enviado','em_custo','engenharia_custo',24),
  ('sales_order','em_custo','custo_concluido','engenharia_custo',48),
  ('sales_order','custo_concluido','aprovado','manager',24),
  ('sales_order','aprovado','liberado_pcp','pcp',24),
  ('sales_order','rascunho','cancelado','comercial',NULL),
  ('sales_order','enviado','cancelado','comercial',NULL),
  ('sales_order','em_custo','cancelado','manager',NULL)
ON CONFLICT (entity_type, from_status, to_status) DO NOTHING;

-- =============================================================================
-- 20261021090200_sales_cost_rounding.sql — Arredondamento do custo apenas no total
-- =============================================================================

-- ============================================================================
-- Custo do pedido: arredondar SOMENTE no fim (paridade com o motor TypeScript)
--
-- Problema encontrado na certificacao E2E (2026-10-21): o recalc gravava
-- total_cost de CADA linha de material arredondado em 2 casas e depois somava.
-- O motor src/lib/sales/cost.ts (e o parecer) arredonda so o total. Em linhas
-- pequenas isso divergia de verdade: 5 linhas de R$ 0,001 davam R$ 0,00 no
-- banco e R$ 0,01 na tela.
--
-- Correcao: total_cost das linhas passa a guardar 4 casas (sem arredondar) e o
-- arredondamento acontece uma vez, no total do item. Assim SQL e TS produzem o
-- mesmo numero em qualquer combinacao de materiais.
-- ============================================================================

ALTER TABLE public.sales_order_item_materials
  ALTER COLUMN total_cost TYPE numeric(14,4);

ALTER TABLE public.sales_order_item_operations
  ALTER COLUMN total_cost TYPE numeric(14,4);

COMMENT ON COLUMN public.sales_order_item_materials.total_cost IS
  'Consumo por peca x perda x custo unitario x quantidade do item. 4 casas: o arredondamento para centavos acontece no total do item (recalc_sales_order_item).';

CREATE OR REPLACE FUNCTION public.recalc_sales_order_item(_item_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item public.sales_order_items%ROWTYPE;
  v_set public.cost_settings%ROWTYPE;
  v_mat numeric := 0; v_op numeric := 0; v_setup numeric := 0;
  v_ind numeric := 0; v_oh numeric := 0; v_unit numeric := 0;
  v_margin numeric; v_price numeric;
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para calcular custo.';
  END IF;
  SELECT * INTO v_item FROM public.sales_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  SELECT * INTO v_set FROM public.cost_settings LIMIT 1;

  -- Consumo e por PECA; o total da linha multiplica pela quantidade do item.
  -- Sem arredondar aqui: o centavo e fechado no total (ver comentario acima).
  UPDATE public.sales_order_item_materials m
     SET total_cost = m.consumption * (1 + m.waste_pct/100) * m.unit_cost
           * COALESCE((SELECT i.quantity FROM public.sales_order_items i WHERE i.id = m.item_id), 0)
   WHERE m.item_id = _item_id;

  UPDATE public.sales_order_item_operations
     SET total_cost = (unit_cost * driver_qty) + setup_cost
   WHERE item_id = _item_id;

  SELECT round(COALESCE(SUM(total_cost),0), 2) INTO v_mat
    FROM public.sales_order_item_materials WHERE item_id = _item_id;

  SELECT round(COALESCE(SUM(unit_cost * driver_qty),0), 2),
         round(COALESCE(SUM(setup_cost),0), 2)
    INTO v_op, v_setup
    FROM public.sales_order_item_operations WHERE item_id = _item_id;

  v_ind := v_mat + v_op + v_setup;
  v_oh := round(v_ind * COALESCE(v_set.default_overhead_pct,0) / 100, 2);
  v_unit := CASE WHEN v_item.quantity > 0 THEN round((v_ind + v_oh) / v_item.quantity, 2) ELSE 0 END;
  v_price := v_item.unit_price;
  v_margin := CASE WHEN v_price > 0 THEN round((v_price - v_unit) / v_price * 100, 2) ELSE NULL END;

  INSERT INTO public.sales_order_item_costs
    (item_id, materials_total, operations_total, setup_total, overhead_pct,
     industrial_cost, unit_cost, margin_pct, suggested_price, status, detailed_by, detailed_at, updated_at)
  VALUES
    (_item_id, v_mat, v_op, v_setup, COALESCE(v_set.default_overhead_pct,0),
     v_ind + v_oh, v_unit, v_margin, round(v_unit * (1 + COALESCE(v_set.default_markup_pct,0)/100), 2),
     'concluido', auth.uid(), now(), now())
  ON CONFLICT (item_id) DO UPDATE SET
    materials_total = EXCLUDED.materials_total,
    operations_total = EXCLUDED.operations_total,
    setup_total = EXCLUDED.setup_total,
    overhead_pct = EXCLUDED.overhead_pct,
    industrial_cost = EXCLUDED.industrial_cost,
    unit_cost = EXCLUDED.unit_cost,
    margin_pct = EXCLUDED.margin_pct,
    suggested_price = EXCLUDED.suggested_price,
    status = CASE WHEN sales_order_item_costs.status = 'aprovado'
                  THEN 'aprovado' ELSE 'concluido' END,
    detailed_by = auth.uid(), detailed_at = now(), updated_at = now();

  UPDATE public.sales_order_items SET cost_status = 'custo_concluido' WHERE id = _item_id;
  UPDATE public.sales_orders SET status = 'em_custo'
   WHERE id = v_item.order_id AND status = 'enviado';
  RETURN v_unit;
END $$;

REVOKE ALL ON FUNCTION public.recalc_sales_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recalc_sales_order_item(uuid) TO authenticated;

-- =============================================================================
-- 20261021090300_sales_order_events_visibility.sql — Timeline do pedido visível para custo e PCP
-- =============================================================================

-- ============================================================================
-- Visibilidade da timeline do pedido para quem assume o pedido depois do vendedor
--
-- Defeito encontrado na certificacao E2E (2026-10-21): a policy
-- entity_events_select_scoped (20260117) deixa ver apenas o proprio ator,
-- admin/manager, e alguns pares papel x entity_type especificos (pcp ve lote,
-- qualidade ve capa, coordenador_produto ve reference...). 'sales_order' nao
-- estava em nenhuma lista, entao engenharia de custo e PCP abriam o pedido e
-- viam a timeline VAZIA — justamente os papeis que mais precisam do historico.
--
-- Solucao aditiva: policy permissiva nova (policies de SELECT sao OR entre si),
-- sem tocar na policy original. Quem enxerga: quem calcula custo e quem planeja
-- PCP; vendedor continua vendo os seus (como ator) e admin/manager veem tudo.
-- ============================================================================

DROP POLICY IF EXISTS entity_events_select_sales_order ON public.entity_events;
DROP POLICY IF EXISTS entity_events_select_sales_order ON public.entity_events;
CREATE POLICY entity_events_select_sales_order ON public.entity_events
  FOR SELECT TO authenticated
  USING (
    entity_type IN ('sales_order', 'sales_order_item')
    AND public.is_member(auth.uid())
    AND (public.can_cost(auth.uid()) OR public.can_plan_pcp(auth.uid()))
  );

COMMENT ON POLICY entity_events_select_sales_order ON public.entity_events IS
  'Timeline do pedido visivel para engenharia de custo e PCP (quem assume o pedido apos o vendedor).';

-- =============================================================================
-- 20261021090400_sales_suggested_price.sql — Preço sugerido = piso de margem quando não há markup
-- =============================================================================

-- ============================================================================
-- Preco sugerido: quando nao ha markup configurado, sugere o preco de margem minima
--
-- Achado na certificacao E2E (2026-10-21): cost_settings.default_markup_pct nasce
-- em 0, e o recalc fazia suggested_price = unit_cost * (1 + 0) = unit_cost. Na
-- tela de detalhe isso aparecia como "Custo/peca R$ 68,44 - sugerido R$ 68,44":
-- ou seja, o sistema sugeria vender a preco de custo.
--
-- Regra nova: markup configurado (> 0) manda; sem markup, o sugerido passa a ser
-- o preco que entrega a margem MINIMA aceitavel (cost_settings.min_margin_pct,
-- padrao 25%) — o piso de negociacao, nao o custo.
-- Formula: preco = custo / (1 - margem/100), a mesma de priceForMargin() no
-- motor TypeScript (src/lib/sales/cost.ts).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalc_sales_order_item(_item_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item public.sales_order_items%ROWTYPE;
  v_set public.cost_settings%ROWTYPE;
  v_mat numeric := 0; v_op numeric := 0; v_setup numeric := 0;
  v_ind numeric := 0; v_oh numeric := 0; v_unit numeric := 0;
  v_margin numeric; v_price numeric; v_suggested numeric;
BEGIN
  IF NOT public.can_cost(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao para calcular custo.';
  END IF;
  SELECT * INTO v_item FROM public.sales_order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item nao encontrado.'; END IF;
  SELECT * INTO v_set FROM public.cost_settings LIMIT 1;

  -- Consumo e por PECA; total da linha multiplica pela quantidade do item.
  -- Sem arredondar por linha: o centavo e fechado no total (20261021090200).
  UPDATE public.sales_order_item_materials m
     SET total_cost = m.consumption * (1 + m.waste_pct/100) * m.unit_cost
           * COALESCE((SELECT i.quantity FROM public.sales_order_items i WHERE i.id = m.item_id), 0)
   WHERE m.item_id = _item_id;

  UPDATE public.sales_order_item_operations
     SET total_cost = (unit_cost * driver_qty) + setup_cost
   WHERE item_id = _item_id;

  SELECT round(COALESCE(SUM(total_cost),0), 2) INTO v_mat
    FROM public.sales_order_item_materials WHERE item_id = _item_id;

  SELECT round(COALESCE(SUM(unit_cost * driver_qty),0), 2),
         round(COALESCE(SUM(setup_cost),0), 2)
    INTO v_op, v_setup
    FROM public.sales_order_item_operations WHERE item_id = _item_id;

  v_ind := v_mat + v_op + v_setup;
  v_oh := round(v_ind * COALESCE(v_set.default_overhead_pct,0) / 100, 2);
  v_unit := CASE WHEN v_item.quantity > 0 THEN round((v_ind + v_oh) / v_item.quantity, 2) ELSE 0 END;
  v_price := v_item.unit_price;
  v_margin := CASE WHEN v_price > 0 THEN round((v_price - v_unit) / v_price * 100, 2) ELSE NULL END;

  -- Preco sugerido: markup quando configurado; senao o piso da margem minima.
  v_suggested := CASE
    WHEN v_unit <= 0 THEN 0
    WHEN COALESCE(v_set.default_markup_pct,0) > 0
      THEN round(v_unit * (1 + v_set.default_markup_pct/100), 2)
    WHEN COALESCE(v_set.min_margin_pct,0) >= 100 THEN v_unit
    ELSE round(v_unit / (1 - v_set.min_margin_pct/100), 2)
  END;

  INSERT INTO public.sales_order_item_costs
    (item_id, materials_total, operations_total, setup_total, overhead_pct,
     industrial_cost, unit_cost, margin_pct, suggested_price, status, detailed_by, detailed_at, updated_at)
  VALUES
    (_item_id, v_mat, v_op, v_setup, COALESCE(v_set.default_overhead_pct,0),
     v_ind + v_oh, v_unit, v_margin, v_suggested,
     'concluido', auth.uid(), now(), now())
  ON CONFLICT (item_id) DO UPDATE SET
    materials_total = EXCLUDED.materials_total,
    operations_total = EXCLUDED.operations_total,
    setup_total = EXCLUDED.setup_total,
    overhead_pct = EXCLUDED.overhead_pct,
    industrial_cost = EXCLUDED.industrial_cost,
    unit_cost = EXCLUDED.unit_cost,
    margin_pct = EXCLUDED.margin_pct,
    suggested_price = EXCLUDED.suggested_price,
    status = CASE WHEN sales_order_item_costs.status = 'aprovado'
                  THEN 'aprovado' ELSE 'concluido' END,
    detailed_by = auth.uid(), detailed_at = now(), updated_at = now();

  UPDATE public.sales_order_items SET cost_status = 'custo_concluido' WHERE id = _item_id;
  UPDATE public.sales_orders SET status = 'em_custo'
   WHERE id = v_item.order_id AND status = 'enviado';
  RETURN v_unit;
END $$;

REVOKE ALL ON FUNCTION public.recalc_sales_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recalc_sales_order_item(uuid) TO authenticated;

-- =============================================================================
-- 20261021090500_sales_technical_sheet_full.sql — Ficha técnica com quantidade de trabalho por operação
-- =============================================================================

-- ============================================================================
-- Ficha tecnica do pedido: quantidade de trabalho por operacao e consumo total
--
-- Achado no teste de UI (21/10): `order_item_technical_sheet` devolvia a operacao
-- e o setor, mas nao QUANTO fazer. O PCP via "Bordado escudo" sem saber que sao
-- 6,5 mil pontos por peca (65 no pedido) nem "Costura reta" sem os 22 min/peca
-- (220 min). Sem isso a ficha nao serve para o chao de fabrica — e essa e a
-- unica saida de dados sem custo que a producao tem.
--
-- Tambem faltava o consumo total de material por item: a ficha mostrava so o
-- consumo por peca, obrigando o PCP a multiplicar na mao.
--
-- Mudanca aditiva: mesmas chaves de antes + driver/driver_qty/total_qty na
-- operacao e consumption_total no material. Nenhum valor de custo e exposto
-- (unit_cost, total_cost, setup continuam fora — ha teste garantindo).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.order_item_technical_sheet(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_out jsonb;
BEGIN
  IF NOT public.is_member(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissao.';
  END IF;
  SELECT jsonb_build_object(
    'order', jsonb_build_object('number', o.number, 'status', o.status,
                                'due_date', o.due_date, 'customer', c.name,
                                'released_at', o.released_at),
    'items', COALESCE(jsonb_agg(jsonb_build_object(
        'item_id', i.id,
        'description', i.description,
        'color', i.color,
        'quantity', i.quantity,
        'reference_code', i.reference_code,
        'tech_status', i.tech_status,
        'grade', (SELECT COALESCE(jsonb_object_agg(s.size, s.quantity), '{}'::jsonb)
                    FROM public.sales_order_item_sizes s WHERE s.item_id = i.id),
        'options', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'name', co.name, 'sector', co.sector,
                        'quantity', soo.quantity, 'spec', soo.spec)), '[]'::jsonb)
                      FROM public.sales_order_item_options soo
                      JOIN public.catalog_options co ON co.id = soo.option_id
                     WHERE soo.item_id = i.id),
        'operations', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'seq', op.seq, 'sector', op.sector, 'operation', op.operation,
                        'outsourced', op.outsourced,
                        'driver', op.driver, 'driver_qty', op.driver_qty,
                        'per_piece', CASE WHEN op.driver = 'lote' THEN NULL
                                     WHEN i.quantity > 0
                                     THEN round(op.driver_qty / i.quantity, 3) ELSE op.driver_qty END)
                      ORDER BY op.seq), '[]'::jsonb)
                      FROM public.sales_order_item_operations op WHERE op.item_id = i.id),
        'materials', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'kind', m.kind, 'material', m.material, 'unit', m.unit,
                        'consumption', m.consumption, 'waste_pct', m.waste_pct,
                        'consumption_total', round(m.consumption * (1 + m.waste_pct / 100) * i.quantity, 3))
                      ORDER BY m.kind, m.material), '[]'::jsonb)
                      FROM public.sales_order_item_materials m WHERE m.item_id = i.id)
      ) ORDER BY i.line_no) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb)
  )
  INTO v_out
  FROM public.sales_orders o
  JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN public.sales_order_items i ON i.order_id = o.id
  WHERE o.id = _order_id
  GROUP BY o.number, o.status, o.due_date, c.name, o.released_at;
  RETURN COALESCE(v_out, '{}'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.order_item_technical_sheet(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.order_item_technical_sheet(uuid) TO authenticated;


-- =============================================================================
-- VERIFICAÇÃO — copie daqui para baixo, DESCOMENTE e rode numa execução separada.
-- Esperado: 13 tabelas, 8 funções, RLS ligada nas duas tabelas de custo.
-- =============================================================================
-- SELECT 'tabelas do pedido' AS checagem,
--        count(*) FILTER (WHERE to_regclass('public.' || nome) IS NOT NULL) || ' de 13' AS resultado
--   FROM unnest(ARRAY['customers','catalog_products','catalog_option_groups','catalog_options',
--                     'sales_orders','sales_order_items','sales_order_item_sizes',
--                     'sales_order_item_options','sales_order_item_materials',
--                     'sales_order_item_operations','sales_order_item_costs',
--                     'cost_settings','materials']) AS t(nome);
--
-- SELECT 'funcoes do fluxo' AS checagem,
--        count(*) || ' de 8' AS resultado
--   FROM unnest(ARRAY['next_sales_order_number','submit_sales_order','recalc_sales_order_item',
--                     'approve_sales_order_item','release_sales_order_to_pcp',
--                     'order_item_technical_sheet','can_sell','can_cost']) AS f(nome)
--  WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--                 WHERE n.nspname = 'public' AND p.proname = f.nome);
--
-- SELECT 'RLS ligada (custo)' AS checagem,
--        count(*) || ' de 2' AS resultado
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--  WHERE n.nspname = 'public' AND c.relname IN ('sales_order_item_costs','sales_order_item_materials')
--    AND c.relrowsecurity;
--
-- SELECT 'politicas RLS do pedido' AS checagem, count(*) || ' politicas' AS resultado
--   FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'sales_order%';
--
-- SELECT 'settings de custo' AS checagem,
--        CASE WHEN EXISTS (SELECT 1 FROM public.cost_settings) THEN 'seed OK' ELSE 'FALTANDO' END AS resultado;
