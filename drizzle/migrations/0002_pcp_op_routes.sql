CREATE OR REPLACE FUNCTION public.can_write_pcp(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR public.has_role(_uid,'manager') OR public.has_role(_uid,'pcp') OR public.has_role(_uid,'operator')
$$;
REVOKE EXECUTE ON FUNCTION public.can_write_pcp(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_write_pcp(uuid) TO authenticated;

CREATE TABLE public.production_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(), updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.production_route_steps (
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
CREATE INDEX ON public.production_route_steps(route_id);

CREATE TABLE public.product_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_product text NOT NULL,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(), updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.configuration_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id uuid NOT NULL REFERENCES public.product_configurations(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.production_routes(id) ON DELETE CASCADE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (configuration_id, route_id)
);
CREATE INDEX ON public.configuration_routes(route_id);

CREATE TABLE public.production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  erp_op_id text,
  status text NOT NULL DEFAULT 'planejada',
  priority text NOT NULL DEFAULT 'media',
  planned_start date, planned_end date,
  notes text,
  created_by uuid DEFAULT auth.uid(), updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.production_order_items (
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
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.production_order_items(production_order_id);
CREATE INDEX ON public.production_order_items(route_id);

CREATE TABLE public.production_item_step_balance (
  item_id uuid NOT NULL REFERENCES public.production_order_items(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.production_route_steps(id),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, step_id)
);
CREATE INDEX ON public.production_item_step_balance(step_id);

CREATE TABLE public.production_passages (
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
CREATE INDEX ON public.production_passages(production_order_id);
CREATE INDEX ON public.production_passages(production_order_item_id);
CREATE INDEX ON public.production_passages(batch_id);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['production_routes','production_route_steps','product_configurations','configuration_routes','production_orders','production_order_items','production_item_step_balance','production_passages'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "members read" ON public.%I FOR SELECT TO authenticated USING (public.is_member(auth.uid()))', t);
    IF t NOT IN ('production_item_step_balance','production_passages') THEN
      EXECUTE format('CREATE POLICY "pcp insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_pcp(auth.uid()))', t);
      EXECUTE format('CREATE POLICY "pcp update" ON public.%I FOR UPDATE TO authenticated USING (public.can_write_pcp(auth.uid())) WITH CHECK (public.can_write_pcp(auth.uid()))', t);
      EXECUTE format('CREATE POLICY "pcp delete" ON public.%I FOR DELETE TO authenticated USING (public.can_write_pcp(auth.uid()))', t);
    END IF;
  END LOOP;
END $$;

CREATE TRIGGER trg_upd_routes BEFORE UPDATE ON public.production_routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_configs BEFORE UPDATE ON public.product_configurations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_orders BEFORE UPDATE ON public.production_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_upd_items BEFORE UPDATE ON public.production_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ao criar item: saldo total na primeira etapa da rota
CREATE OR REPLACE FUNCTION public.init_item_balance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_step uuid;
BEGIN
  SELECT id INTO first_step FROM production_route_steps WHERE route_id = NEW.route_id ORDER BY sequence LIMIT 1;
  IF first_step IS NULL THEN RAISE EXCEPTION 'A rota escolhida não tem etapas.'; END IF;
  INSERT INTO production_item_step_balance(item_id, step_id, quantity) VALUES (NEW.id, first_step, NEW.quantity_planned);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_init_item_balance AFTER INSERT ON public.production_order_items FOR EACH ROW EXECUTE FUNCTION public.init_item_balance();

-- Passagem em bloco: _moves = [{item_id, origin_step_id, quantity, type?, destination_step_id?}]
CREATE OR REPLACE FUNCTION public.register_passages(_moves jsonb, _observation text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m jsonb; v_batch uuid := gen_random_uuid(); v_item production_order_items%ROWTYPE;
  v_origin production_route_steps%ROWTYPE; v_dest uuid; v_qty int; v_type text; v_avail int; v_name text;
BEGIN
  IF NOT public.can_write_pcp(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para registrar passagens.'; END IF;
  SELECT full_name INTO v_name FROM profiles WHERE id = auth.uid();
  FOR m IN SELECT * FROM jsonb_array_elements(_moves) LOOP
    v_qty := (m->>'quantity')::int;
    v_type := COALESCE(m->>'type','parcial');
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Quantidade inválida.'; END IF;
    SELECT * INTO v_item FROM production_order_items WHERE id = (m->>'item_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item não encontrado.'; END IF;
    SELECT * INTO v_origin FROM production_route_steps WHERE id = (m->>'origin_step_id')::uuid AND route_id = v_item.route_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Etapa de origem não pertence à rota do item.'; END IF;
    SELECT quantity INTO v_avail FROM production_item_step_balance WHERE item_id = v_item.id AND step_id = v_origin.id FOR UPDATE;
    IF COALESCE(v_avail,0) < v_qty THEN RAISE EXCEPTION 'Quantidade (%) maior que o disponível (%) no item %.', v_qty, COALESCE(v_avail,0), v_item.reference_code; END IF;

    IF v_type = 'perda' THEN
      IF COALESCE(trim(_observation),'') = '' THEN RAISE EXCEPTION 'Informe o motivo da perda.'; END IF;
      v_dest := NULL;
      UPDATE production_order_items SET quantity_lost = quantity_lost + v_qty WHERE id = v_item.id;
    ELSIF v_type = 'retorno' THEN
      IF COALESCE(trim(_observation),'') = '' THEN RAISE EXCEPTION 'Informe o motivo do retorno.'; END IF;
      v_dest := (m->>'destination_step_id')::uuid;
      IF NOT EXISTS (SELECT 1 FROM production_route_steps WHERE id = v_dest AND route_id = v_item.route_id AND sequence < v_origin.sequence) THEN
        RAISE EXCEPTION 'Retorno só pode ir para uma etapa anterior da rota.'; END IF;
    ELSE
      SELECT id INTO v_dest FROM production_route_steps WHERE route_id = v_item.route_id AND sequence > v_origin.sequence ORDER BY sequence LIMIT 1;
      IF v_dest IS NULL THEN
        UPDATE production_order_items SET quantity_produced = quantity_produced + v_qty WHERE id = v_item.id;
      END IF;
    END IF;

    UPDATE production_item_step_balance SET quantity = quantity - v_qty, updated_at = now() WHERE item_id = v_item.id AND step_id = v_origin.id;
    IF v_dest IS NOT NULL THEN
      INSERT INTO production_item_step_balance(item_id, step_id, quantity) VALUES (v_item.id, v_dest, v_qty)
      ON CONFLICT (item_id, step_id) DO UPDATE SET quantity = production_item_step_balance.quantity + EXCLUDED.quantity, updated_at = now();
    END IF;

    INSERT INTO production_passages(batch_id, production_order_id, production_order_item_id, route_id, origin_step_id, destination_step_id, quantity, type, responsible_id, responsible_name, observation)
    VALUES (v_batch, v_item.production_order_id, v_item.id, v_item.route_id, v_origin.id, v_dest, v_qty, v_type, auth.uid(), v_name, _observation);

    UPDATE production_order_items i SET status = CASE
      WHEN i.quantity_produced + i.quantity_lost >= i.quantity_planned THEN 'concluido' ELSE 'em_producao' END
    WHERE i.id = v_item.id;
    UPDATE production_orders SET status = 'em_producao' WHERE id = v_item.production_order_id AND status = 'planejada';
  END LOOP;
  RETURN v_batch;
END $$;
REVOKE EXECUTE ON FUNCTION public.register_passages(jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_passages(jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.init_item_balance() FROM public, anon, authenticated;