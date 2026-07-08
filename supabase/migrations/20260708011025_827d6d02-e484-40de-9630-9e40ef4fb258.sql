
-- =========================================================
-- H9-10 · Lançamento — schema, RLS, workflow, eventos, realtime
-- =========================================================

-- 1) Papel-guard do módulo -------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_any_launch_role(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('coordenador_produto','merchandising','comercial','diretor_produto','pcp','admin')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_launch_role(uuid) FROM PUBLIC, anon, authenticated;

-- 2) launch_wave -----------------------------------------------------------
CREATE TABLE public.launch_wave (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  colecao text NOT NULL,
  janela_inicio date NOT NULL,
  janela_fim date NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  responsavel_id uuid REFERENCES auth.users,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users,
  updated_by uuid REFERENCES auth.users,
  CONSTRAINT launch_wave_janela_valida CHECK (janela_fim >= janela_inicio)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_wave TO authenticated;
GRANT ALL ON public.launch_wave TO service_role;
ALTER TABLE public.launch_wave ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_wave_select_role"
  ON public.launch_wave FOR SELECT TO authenticated
  USING (public.has_any_launch_role(auth.uid()));
CREATE POLICY "launch_wave_insert_role"
  ON public.launch_wave FOR INSERT TO authenticated
  WITH CHECK (public.has_any_launch_role(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "launch_wave_update_owner_or_lead"
  ON public.launch_wave FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (auth.uid() = updated_by);
CREATE POLICY "launch_wave_delete_admin"
  ON public.launch_wave FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX launch_wave_status_idx  ON public.launch_wave(status);
CREATE INDEX launch_wave_colecao_idx ON public.launch_wave(colecao);
CREATE INDEX launch_wave_created_by_idx ON public.launch_wave(created_by);

CREATE TRIGGER launch_wave_updated_at
  BEFORE UPDATE ON public.launch_wave
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.launch_wave IS
  'Janela comercial de lançamento (H9-10). Consolida decisões aprovadas do mostruário. Sem preço/custo/estoque.';

-- 3) launch_item -----------------------------------------------------------
CREATE TABLE public.launch_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id uuid NOT NULL REFERENCES public.launch_wave(id) ON DELETE CASCADE,
  reference_id uuid NOT NULL REFERENCES public.references(id) ON DELETE RESTRICT,
  showroom_decision_id uuid REFERENCES public.showroom_decision(id) ON DELETE SET NULL,
  prioridade smallint NOT NULL DEFAULT 3 CHECK (prioridade BETWEEN 1 AND 5),
  meta_unidades integer NOT NULL DEFAULT 0 CHECK (meta_unidades >= 0),
  status text NOT NULL DEFAULT 'proposto',
  erp_sku_ref text,
  erp_source text,
  erp_synced_at timestamptz,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users,
  updated_by uuid REFERENCES auth.users,
  UNIQUE (wave_id, reference_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_item TO authenticated;
GRANT ALL ON public.launch_item TO service_role;
ALTER TABLE public.launch_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_item_select_role"
  ON public.launch_item FOR SELECT TO authenticated
  USING (public.has_any_launch_role(auth.uid()));
CREATE POLICY "launch_item_insert_role"
  ON public.launch_item FOR INSERT TO authenticated
  WITH CHECK (public.has_any_launch_role(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "launch_item_update_owner_or_lead"
  ON public.launch_item FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'pcp')
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (auth.uid() = updated_by);
CREATE POLICY "launch_item_delete_admin"
  ON public.launch_item FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX launch_item_wave_idx     ON public.launch_item(wave_id);
CREATE INDEX launch_item_ref_idx      ON public.launch_item(reference_id);
CREATE INDEX launch_item_status_idx   ON public.launch_item(status);
CREATE INDEX launch_item_dec_idx      ON public.launch_item(showroom_decision_id);

CREATE TRIGGER launch_item_updated_at
  BEFORE UPDATE ON public.launch_item
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.launch_item IS
  'Referência incluída em uma launch_wave. Sem preço/custo/estoque; apenas meta e prioridade.';
COMMENT ON COLUMN public.launch_item.erp_sku_ref IS
  'ID externo do SKU no ERP (leitura via ErpAdapter, cache ≤ 60s).';

-- 3a) trigger: item exige decisão de mostruário aprovada -------------------
CREATE OR REPLACE FUNCTION public.enforce_launch_item_from_approved_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.showroom_decision d
    WHERE d.reference_id = NEW.reference_id
      AND d.decision = 'aprovada'
  ) THEN
    RAISE EXCEPTION 'launch_item exige showroom_decision.decision = aprovada para reference_id %', NEW.reference_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_launch_item_from_approved_decision() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER launch_item_enforce_approved
  BEFORE INSERT ON public.launch_item
  FOR EACH ROW EXECUTE FUNCTION public.enforce_launch_item_from_approved_decision();

-- 4) launch_item_grade -----------------------------------------------------
CREATE TABLE public.launch_item_grade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.launch_item(id) ON DELETE CASCADE,
  tamanho text NOT NULL,
  cor text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users,
  updated_by uuid REFERENCES auth.users,
  UNIQUE (item_id, tamanho, cor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_item_grade TO authenticated;
GRANT ALL ON public.launch_item_grade TO service_role;
ALTER TABLE public.launch_item_grade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_grade_select_role" ON public.launch_item_grade FOR SELECT TO authenticated
  USING (public.has_any_launch_role(auth.uid()));
CREATE POLICY "launch_grade_insert_role" ON public.launch_item_grade FOR INSERT TO authenticated
  WITH CHECK (public.has_any_launch_role(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "launch_grade_update_lead" ON public.launch_item_grade FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'pcp')
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (auth.uid() = updated_by);
CREATE POLICY "launch_grade_delete_admin" ON public.launch_item_grade FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX launch_grade_item_idx ON public.launch_item_grade(item_id);

CREATE TRIGGER launch_grade_updated_at
  BEFORE UPDATE ON public.launch_item_grade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) launch_channel_target -------------------------------------------------
CREATE TABLE public.launch_channel_target (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.launch_item(id) ON DELETE CASCADE,
  canal text NOT NULL CHECK (canal IN ('varejo','atacado','ecom')),
  meta_unidades integer NOT NULL DEFAULT 0 CHECK (meta_unidades >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users,
  updated_by uuid REFERENCES auth.users,
  UNIQUE (item_id, canal)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_channel_target TO authenticated;
GRANT ALL ON public.launch_channel_target TO service_role;
ALTER TABLE public.launch_channel_target ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_chan_select_role" ON public.launch_channel_target FOR SELECT TO authenticated
  USING (public.has_any_launch_role(auth.uid()));
CREATE POLICY "launch_chan_insert_role" ON public.launch_channel_target FOR INSERT TO authenticated
  WITH CHECK (public.has_any_launch_role(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "launch_chan_update_lead" ON public.launch_channel_target FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.user_has_role_name(auth.uid(),'comercial')
    OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (auth.uid() = updated_by);
CREATE POLICY "launch_chan_delete_admin" ON public.launch_channel_target FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX launch_chan_item_idx ON public.launch_channel_target(item_id);

CREATE TRIGGER launch_chan_updated_at
  BEFORE UPDATE ON public.launch_channel_target
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) launch_handoff --------------------------------------------------------
CREATE TABLE public.launch_handoff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_id uuid NOT NULL REFERENCES public.launch_wave(id) ON DELETE CASCADE,
  destino text NOT NULL CHECK (destino IN ('pcp','comercial')),
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  erp_source text,
  erp_id text,
  synced_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users,
  updated_by uuid REFERENCES auth.users,
  UNIQUE (idempotency_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_handoff TO authenticated;
GRANT ALL ON public.launch_handoff TO service_role;
ALTER TABLE public.launch_handoff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_handoff_select_role" ON public.launch_handoff FOR SELECT TO authenticated
  USING (public.has_any_launch_role(auth.uid()));
CREATE POLICY "launch_handoff_insert_role" ON public.launch_handoff FOR INSERT TO authenticated
  WITH CHECK (public.has_any_launch_role(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "launch_handoff_update_lead" ON public.launch_handoff FOR UPDATE TO authenticated
  USING (
    public.user_has_role_name(auth.uid(),'pcp')
    OR public.user_has_role_name(auth.uid(),'comercial')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.has_role(auth.uid(),'admin')
  )
  WITH CHECK (auth.uid() = updated_by);
CREATE POLICY "launch_handoff_delete_admin" ON public.launch_handoff FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX launch_handoff_wave_idx    ON public.launch_handoff(wave_id);
CREATE INDEX launch_handoff_destino_idx ON public.launch_handoff(destino);

CREATE TRIGGER launch_handoff_updated_at
  BEFORE UPDATE ON public.launch_handoff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6a) imutabilidade após sync ----------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_launch_handoff_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.synced_at IS NOT NULL THEN
    IF NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
       OR NEW.payload_hash    IS DISTINCT FROM OLD.payload_hash
       OR NEW.destino         IS DISTINCT FROM OLD.destino
       OR NEW.wave_id         IS DISTINCT FROM OLD.wave_id
       OR NEW.erp_id          IS DISTINCT FROM OLD.erp_id
       OR NEW.erp_source      IS DISTINCT FROM OLD.erp_source
       OR NEW.synced_at       IS DISTINCT FROM OLD.synced_at THEN
      RAISE EXCEPTION 'launch_handoff imutável após synced_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_launch_handoff_immutability() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER launch_handoff_immutable
  BEFORE UPDATE ON public.launch_handoff
  FOR EACH ROW EXECUTE FUNCTION public.enforce_launch_handoff_immutability();

-- 7) Workflow --------------------------------------------------------------
INSERT INTO public.workflow_definitions (entity_type, from_status, to_status, requires_role, is_active) VALUES
  -- launch_wave
  ('launch_wave', 'rascunho',    'em_revisao',  NULL,                  true),
  ('launch_wave', 'em_revisao',  'aprovada',    'coordenador_produto', true),
  ('launch_wave', 'em_revisao',  'rascunho',    NULL,                  true),
  ('launch_wave', 'aprovada',    'publicada',   'diretor_produto',     true),
  ('launch_wave', 'aprovada',    'em_revisao',  'coordenador_produto', true),
  ('launch_wave', 'publicada',   'em_producao', 'pcp',                 true),
  ('launch_wave', 'em_producao', 'lancada',     'pcp',                 true),
  ('launch_wave', 'lancada',     'encerrada',   'coordenador_produto', true),
  ('launch_wave', 'rascunho',    'cancelada',   'coordenador_produto', true),
  ('launch_wave', 'em_revisao',  'cancelada',   'coordenador_produto', true),
  ('launch_wave', 'aprovada',    'cancelada',   'diretor_produto',     true),
  -- launch_item
  ('launch_item', 'proposto',    'validado',    NULL,                  true),
  ('launch_item', 'validado',    'aprovado',    'coordenador_produto', true),
  ('launch_item', 'validado',    'proposto',    NULL,                  true),
  ('launch_item', 'aprovado',    'em_producao', 'pcp',                 true),
  ('launch_item', 'em_producao', 'disponivel',  'pcp',                 true),
  ('launch_item', 'disponivel',  'esgotado',    'comercial',           true),
  ('launch_item', 'disponivel',  'descontinuado','coordenador_produto',true),
  ('launch_item', 'aprovado',    'descontinuado','coordenador_produto',true);

-- 8) Triggers de evento ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_launch_wave_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('launch_wave', NEW.id, 'launch.wave.created', NULL, NEW.status, NEW.created_by,
            jsonb_build_object('codigo', NEW.codigo, 'colecao', NEW.colecao));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('launch_wave', NEW.id, 'launch.wave.status_changed', OLD.status, NEW.status, NEW.updated_by,
            jsonb_build_object('codigo', NEW.codigo));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_launch_wave_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER launch_wave_event
  AFTER INSERT OR UPDATE ON public.launch_wave
  FOR EACH ROW EXECUTE FUNCTION public.log_launch_wave_event();

CREATE OR REPLACE FUNCTION public.log_launch_item_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('launch_item', NEW.id, 'launch.item.added', NULL, NEW.status, NEW.created_by,
            jsonb_build_object('wave_id', NEW.wave_id, 'reference_id', NEW.reference_id, 'showroom_decision_id', NEW.showroom_decision_id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('launch_item', NEW.id, 'launch.item.status_changed', OLD.status, NEW.status, NEW.updated_by,
            jsonb_build_object('wave_id', NEW.wave_id, 'reference_id', NEW.reference_id));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_launch_item_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER launch_item_event
  AFTER INSERT OR UPDATE ON public.launch_item
  FOR EACH ROW EXECUTE FUNCTION public.log_launch_item_event();

CREATE OR REPLACE FUNCTION public.log_launch_handoff_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, actor, payload)
    VALUES ('launch_handoff', NEW.id, 'launch.handoff.sent', NEW.created_by,
            jsonb_build_object('wave_id', NEW.wave_id, 'destino', NEW.destino, 'idempotency_key', NEW.idempotency_key));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.synced_at IS NOT NULL AND OLD.synced_at IS NULL THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, actor, payload)
    VALUES ('launch_handoff', NEW.id, 'launch.handoff.confirmed', NEW.updated_by,
            jsonb_build_object('wave_id', NEW.wave_id, 'destino', NEW.destino, 'erp_id', NEW.erp_id, 'erp_source', NEW.erp_source));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_launch_handoff_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER launch_handoff_event
  AFTER INSERT OR UPDATE ON public.launch_handoff
  FOR EACH ROW EXECUTE FUNCTION public.log_launch_handoff_event();

-- 9) Realtime — estender can_access_module_topic ---------------------------
CREATE OR REPLACE FUNCTION public.can_access_module_topic(_topic text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _topic
    WHEN 'references-live' THEN public.has_any_showroom_role(auth.uid())
      OR public.user_has_role_name(auth.uid(),'estilista')
      OR public.user_has_role_name(auth.uid(),'modelagem')
      OR public.user_has_role_name(auth.uid(),'admin')
    WHEN 'capa-live'      THEN public.user_has_role_name(auth.uid(),'qualidade')
      OR public.user_has_role_name(auth.uid(),'admin')
    WHEN 'pcp-live'       THEN public.user_has_role_name(auth.uid(),'pcp')
      OR public.user_has_role_name(auth.uid(),'admin')
    WHEN 'modules-live'   THEN public.user_has_role_name(auth.uid(),'admin')
      OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    WHEN 'activity-live'  THEN public.user_has_role_name(auth.uid(),'admin')
    WHEN 'launch-live'    THEN public.has_any_launch_role(auth.uid())
    ELSE false
  END
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_module_topic(text) FROM PUBLIC, anon, authenticated;

-- 10) Realtime publication -------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.launch_wave;
ALTER PUBLICATION supabase_realtime ADD TABLE public.launch_item;
ALTER PUBLICATION supabase_realtime ADD TABLE public.launch_handoff;
