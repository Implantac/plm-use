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
CREATE TRIGGER trg_upd_customers BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_catalog_products BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_sales_orders BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_sales_order_items BEFORE UPDATE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
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
CREATE POLICY customers_read ON public.customers FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
CREATE POLICY customers_write ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.can_sell(auth.uid()));
CREATE POLICY customers_update ON public.customers FOR UPDATE TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));
CREATE POLICY customers_delete ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- catalogo (engenharia e custo sao donos)
CREATE POLICY catalog_products_read ON public.catalog_products FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
CREATE POLICY catalog_products_write ON public.catalog_products FOR ALL TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));
CREATE POLICY catalog_groups_read ON public.catalog_option_groups FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
CREATE POLICY catalog_groups_write ON public.catalog_option_groups FOR ALL TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));
CREATE POLICY catalog_options_read ON public.catalog_options FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
CREATE POLICY catalog_options_write ON public.catalog_options FOR ALL TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));

-- pedido
CREATE POLICY sales_orders_read ON public.sales_orders FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
CREATE POLICY sales_orders_insert ON public.sales_orders FOR INSERT TO authenticated
  WITH CHECK (public.can_sell(auth.uid()));
CREATE POLICY sales_orders_update ON public.sales_orders FOR UPDATE TO authenticated
  USING (public.can_edit_sales_order(id)) WITH CHECK (public.can_edit_sales_order(id));
CREATE POLICY sales_orders_delete ON public.sales_orders FOR DELETE TO authenticated
  USING ((seller_id = auth.uid() AND status = 'rascunho') OR public.has_role(auth.uid(),'admin'));

-- itens e filhos: espelham a permissao do pedido
CREATE POLICY so_items_read ON public.sales_order_items FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
CREATE POLICY so_items_write ON public.sales_order_items FOR ALL TO authenticated
  USING (public.can_edit_sales_order(order_id)) WITH CHECK (public.can_edit_sales_order(order_id));

CREATE POLICY so_sizes_read ON public.sales_order_item_sizes FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
CREATE POLICY so_sizes_write ON public.sales_order_item_sizes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.id = item_id AND public.can_edit_sales_order(i.order_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.id = item_id AND public.can_edit_sales_order(i.order_id)));

CREATE POLICY so_options_read ON public.sales_order_item_options FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
CREATE POLICY so_options_write ON public.sales_order_item_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.id = item_id AND public.can_edit_sales_order(i.order_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales_order_items i WHERE i.id = item_id AND public.can_edit_sales_order(i.order_id)));

-- ficha do pedido com custo: apenas custo/gestao
CREATE POLICY so_materials_cost_read ON public.sales_order_item_materials FOR SELECT TO authenticated
  USING (public.can_cost(auth.uid()));
CREATE POLICY so_materials_cost_write ON public.sales_order_item_materials FOR INSERT TO authenticated
  WITH CHECK (public.can_cost(auth.uid()));
CREATE POLICY so_materials_cost_update ON public.sales_order_item_materials FOR UPDATE TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));
CREATE POLICY so_materials_cost_delete ON public.sales_order_item_materials FOR DELETE TO authenticated
  USING (public.can_cost(auth.uid()));

CREATE POLICY so_ops_cost_read ON public.sales_order_item_operations FOR SELECT TO authenticated
  USING (public.can_cost(auth.uid()));
CREATE POLICY so_ops_cost_write ON public.sales_order_item_operations FOR INSERT TO authenticated
  WITH CHECK (public.can_cost(auth.uid()));
CREATE POLICY so_ops_cost_update ON public.sales_order_item_operations FOR UPDATE TO authenticated
  USING (public.can_cost(auth.uid())) WITH CHECK (public.can_cost(auth.uid()));
CREATE POLICY so_ops_cost_delete ON public.sales_order_item_operations FOR DELETE TO authenticated
  USING (public.can_cost(auth.uid()));

-- custo fechado: sem GRANT direto para authenticated (somente funcoes)
ALTER TABLE public.sales_order_item_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY so_costs_read ON public.sales_order_item_costs FOR SELECT TO authenticated
  USING (public.can_cost(auth.uid()));

-- cost_settings: leitura para todos os membros (a UI de custo mostra o minimo), escrita admin
CREATE POLICY cost_settings_read ON public.cost_settings FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));
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
