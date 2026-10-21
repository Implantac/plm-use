-- =============================================================================
-- FLUXO DE PEDIDO — PARTE 1 DE 3
--
-- Use estas partes SÓ se o SQL editor recusar/cortar o arquivo único de 88 KB.
-- Se ele aceitar o APLICAR-EM-PRODUCAO.sql inteiro, use o arquivo único.
--
-- ORDEM OBRIGATÓRIA: parte 1 → parte 2 → parte 3. Cada parte termina em um
-- ponto seguro (fim de uma migration), então parar entre elas não deixa o
-- banco pela metade. O conjunto é reexecutável: reaplicar uma parte não quebra.
--
-- PARTE 1 — guarda de ambiente + `materials` + baseline do PCP + valores de enum.
-- =============================================================================

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
