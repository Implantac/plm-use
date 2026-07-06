
DO $$ BEGIN
  CREATE TYPE public.reference_status AS ENUM (
    'IDEIA','CROQUI','MODELAGEM','PILOTO','AJUSTE','APROVACAO','ENGENHARIA','PRODUCAO','FINALIZADA','ARQUIVADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.reference_priority AS ENUM ('BAIXA','MEDIA','ALTA','URGENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.entity_type AS ENUM (
    'reference','lote','tech_sheet','piloto','capa','engenharia','facao_order'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) references
CREATE TABLE IF NOT EXISTS public."references" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  collection_id text,
  theme text,
  line text,
  season text,
  designer_id uuid,
  modelista_id uuid,
  status public.reference_status NOT NULL DEFAULT 'IDEIA',
  priority public.reference_priority NOT NULL DEFAULT 'MEDIA',
  target_cost numeric(12,2),
  target_price numeric(12,2),
  image_url text,
  erp_product_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS references_status_idx ON public."references" (status);
CREATE INDEX IF NOT EXISTS references_collection_idx ON public."references" (collection_id);
CREATE INDEX IF NOT EXISTS references_code_idx ON public."references" (code);
CREATE INDEX IF NOT EXISTS references_erp_product_idx ON public."references" (erp_product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public."references" TO authenticated;
GRANT ALL ON public."references" TO service_role;

ALTER TABLE public."references" ENABLE ROW LEVEL SECURITY;

CREATE POLICY references_select_authenticated ON public."references"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY references_insert_authenticated ON public."references"
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY references_update_owner_or_admin ON public."references"
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  )
  WITH CHECK (true);

CREATE POLICY references_delete_admin ON public."references"
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER references_updated_at
  BEFORE UPDATE ON public."references"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) reference_transitions
CREATE TABLE IF NOT EXISTS public.reference_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status public.reference_status NOT NULL,
  to_status public.reference_status NOT NULL,
  requires_role text,
  requires_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_status, to_status)
);

GRANT SELECT ON public.reference_transitions TO authenticated;
GRANT ALL ON public.reference_transitions TO service_role;

ALTER TABLE public.reference_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_transitions_select ON public.reference_transitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY reference_transitions_admin_write ON public.reference_transitions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.reference_transitions (from_status, to_status) VALUES
  ('IDEIA','CROQUI'),('CROQUI','MODELAGEM'),('MODELAGEM','PILOTO'),
  ('PILOTO','AJUSTE'),('PILOTO','APROVACAO'),('AJUSTE','PILOTO'),
  ('AJUSTE','APROVACAO'),('APROVACAO','ENGENHARIA'),('APROVACAO','AJUSTE'),
  ('ENGENHARIA','PRODUCAO'),('PRODUCAO','FINALIZADA'),
  ('IDEIA','ARQUIVADA'),('CROQUI','ARQUIVADA'),('MODELAGEM','ARQUIVADA'),
  ('PILOTO','ARQUIVADA'),('AJUSTE','ARQUIVADA'),('APROVACAO','ARQUIVADA'),
  ('ENGENHARIA','ARQUIVADA'),('PRODUCAO','ARQUIVADA'),('FINALIZADA','ARQUIVADA')
ON CONFLICT DO NOTHING;

-- 3) entity_events
CREATE TABLE IF NOT EXISTS public.entity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.entity_type NOT NULL,
  entity_id uuid NOT NULL,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  actor uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entity_events_entity_idx
  ON public.entity_events (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entity_events_actor_idx
  ON public.entity_events (actor);

GRANT SELECT, INSERT ON public.entity_events TO authenticated;
GRANT ALL ON public.entity_events TO service_role;

ALTER TABLE public.entity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_events_select ON public.entity_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY entity_events_insert_own ON public.entity_events
  FOR INSERT TO authenticated
  WITH CHECK (actor = auth.uid());

-- 4) entity_relations (unique via expression index)
CREATE TABLE IF NOT EXISTS public.entity_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type public.entity_type NOT NULL,
  from_id uuid NOT NULL,
  to_type public.entity_type NOT NULL,
  to_id uuid,
  to_external_id text,
  relation text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS entity_relations_unique_idx
  ON public.entity_relations (
    from_type, from_id, to_type,
    (COALESCE(to_id::text, to_external_id, '')),
    relation
  );
CREATE INDEX IF NOT EXISTS entity_relations_from_idx
  ON public.entity_relations (from_type, from_id);
CREATE INDEX IF NOT EXISTS entity_relations_to_idx
  ON public.entity_relations (to_type, to_id);

GRANT SELECT, INSERT, DELETE ON public.entity_relations TO authenticated;
GRANT ALL ON public.entity_relations TO service_role;

ALTER TABLE public.entity_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_relations_select ON public.entity_relations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY entity_relations_insert_authenticated ON public.entity_relations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY entity_relations_delete_owner_or_admin ON public.entity_relations
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5) helpers
CREATE OR REPLACE FUNCTION public.can_transition_reference(_from public.reference_status, _to public.reference_status)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reference_transitions
    WHERE from_status = _from AND to_status = _to AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.log_reference_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('reference', NEW.id, 'created', NULL, NEW.status::text, NEW.created_by,
            jsonb_build_object('code', NEW.code, 'name', NEW.name));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('reference', NEW.id, 'status_changed', OLD.status::text, NEW.status::text, NEW.updated_by,
            jsonb_build_object('code', NEW.code));
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS references_status_change_trg ON public."references";
CREATE TRIGGER references_status_change_trg
  AFTER INSERT OR UPDATE ON public."references"
  FOR EACH ROW EXECUTE FUNCTION public.log_reference_status_change();

-- 6) realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public."references";
ALTER PUBLICATION supabase_realtime ADD TABLE public.entity_events;
