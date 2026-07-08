-- =========================================================
-- H9-09 · Mostruário — parte 2: entidades, RLS, triggers e workflow
-- =========================================================

-- Helper: qualquer papel de mostruário (comparação por texto,
-- evita depender de ::app_role dos valores recém-adicionados no mesmo ciclo)
CREATE OR REPLACE FUNCTION public.has_any_showroom_role(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('coordenador_produto','merchandising','comercial','showroom','diretor_produto','admin')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_showroom_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_showroom_role(uuid) TO authenticated, service_role;

-- Helper por nome (evita literais ::app_role em policies durante rollout)
CREATE OR REPLACE FUNCTION public.user_has_role_name(_uid uuid, _name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role::text = _name
  )
$$;
REVOKE EXECUTE ON FUNCTION public.user_has_role_name(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_role_name(uuid, text) TO authenticated, service_role;

-- =========================================================
-- 1) showroom_sample
-- =========================================================
CREATE TABLE public.showroom_sample (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.references(id) ON DELETE RESTRICT,
  piloto_id uuid REFERENCES public.pilotos(id) ON DELETE SET NULL,
  grade text,
  cor text,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  status text NOT NULL DEFAULT 'solicitada'
    CHECK (status IN ('solicitada','recebida','em_curadoria','aprovada','reprovada','em_kit','em_showroom','retornada','devolvida','arquivada')),
  posse_logica text,
  motivo text,
  evidencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_showroom_sample_reference ON public.showroom_sample(reference_id);
CREATE INDEX idx_showroom_sample_status ON public.showroom_sample(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.showroom_sample TO authenticated;
GRANT ALL ON public.showroom_sample TO service_role;
ALTER TABLE public.showroom_sample ENABLE ROW LEVEL SECURITY;

CREATE POLICY "showroom_sample select membros" ON public.showroom_sample
  FOR SELECT TO authenticated USING (public.has_any_showroom_role(auth.uid()));
CREATE POLICY "showroom_sample insert curadores" ON public.showroom_sample
  FOR INSERT TO authenticated WITH CHECK (
    public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'merchandising')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  );
CREATE POLICY "showroom_sample update curadores" ON public.showroom_sample
  FOR UPDATE TO authenticated USING (public.has_any_showroom_role(auth.uid()))
  WITH CHECK (public.has_any_showroom_role(auth.uid()));
CREATE POLICY "showroom_sample delete diretor" ON public.showroom_sample
  FOR DELETE TO authenticated USING (
    public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  );

CREATE TRIGGER trg_showroom_sample_updated_at
  BEFORE UPDATE ON public.showroom_sample
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2) showroom_kit + itens
-- =========================================================
CREATE TABLE public.showroom_kit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  rota text NOT NULL,
  periodo_inicio date,
  periodo_fim date,
  status text NOT NULL DEFAULT 'em_montagem'
    CHECK (status IN ('em_montagem','montado','em_rota','retornado','arquivado')),
  responsavel_id uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_showroom_kit_rota ON public.showroom_kit(rota);
CREATE INDEX idx_showroom_kit_status ON public.showroom_kit(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.showroom_kit TO authenticated;
GRANT ALL ON public.showroom_kit TO service_role;
ALTER TABLE public.showroom_kit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "showroom_kit select membros" ON public.showroom_kit
  FOR SELECT TO authenticated USING (public.has_any_showroom_role(auth.uid()));
CREATE POLICY "showroom_kit write times" ON public.showroom_kit
  FOR ALL TO authenticated
  USING (
    public.user_has_role_name(auth.uid(),'merchandising')
    OR public.user_has_role_name(auth.uid(),'comercial')
    OR public.user_has_role_name(auth.uid(),'showroom')
    OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  )
  WITH CHECK (
    public.user_has_role_name(auth.uid(),'merchandising')
    OR public.user_has_role_name(auth.uid(),'comercial')
    OR public.user_has_role_name(auth.uid(),'showroom')
    OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  );

CREATE TRIGGER trg_showroom_kit_updated_at
  BEFORE UPDATE ON public.showroom_kit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.showroom_kit_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.showroom_kit(id) ON DELETE CASCADE,
  sample_id uuid NOT NULL REFERENCES public.showroom_sample(id) ON DELETE RESTRICT,
  posicao integer,
  observacao text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kit_id, sample_id)
);
CREATE INDEX idx_showroom_kit_item_kit ON public.showroom_kit_item(kit_id);
CREATE INDEX idx_showroom_kit_item_sample ON public.showroom_kit_item(sample_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.showroom_kit_item TO authenticated;
GRANT ALL ON public.showroom_kit_item TO service_role;
ALTER TABLE public.showroom_kit_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "showroom_kit_item select membros" ON public.showroom_kit_item
  FOR SELECT TO authenticated USING (public.has_any_showroom_role(auth.uid()));
CREATE POLICY "showroom_kit_item write times" ON public.showroom_kit_item
  FOR ALL TO authenticated
  USING (
    public.user_has_role_name(auth.uid(),'merchandising')
    OR public.user_has_role_name(auth.uid(),'comercial')
    OR public.user_has_role_name(auth.uid(),'showroom')
    OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  )
  WITH CHECK (
    public.user_has_role_name(auth.uid(),'merchandising')
    OR public.user_has_role_name(auth.uid(),'comercial')
    OR public.user_has_role_name(auth.uid(),'showroom')
    OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  );

-- =========================================================
-- 3) showroom_publication
-- =========================================================
CREATE TABLE public.showroom_publication (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  colecao text,
  versao integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','em_revisao','publicada','rejeitada','congelada')),
  reference_ids uuid[] NOT NULL DEFAULT '{}',
  storytelling text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  frozen_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_showroom_pub_status ON public.showroom_publication(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.showroom_publication TO authenticated;
GRANT ALL ON public.showroom_publication TO service_role;
ALTER TABLE public.showroom_publication ENABLE ROW LEVEL SECURITY;

CREATE POLICY "showroom_pub select membros" ON public.showroom_publication
  FOR SELECT TO authenticated USING (public.has_any_showroom_role(auth.uid()));
CREATE POLICY "showroom_pub write coord/diretor" ON public.showroom_publication
  FOR ALL TO authenticated
  USING (
    public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  )
  WITH CHECK (
    public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  );

CREATE TRIGGER trg_showroom_pub_updated_at
  BEFORE UPDATE ON public.showroom_publication
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4) showroom_feedback
-- =========================================================
CREATE TABLE public.showroom_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.references(id) ON DELETE CASCADE,
  publication_id uuid REFERENCES public.showroom_publication(id) ON DELETE SET NULL,
  kit_id uuid REFERENCES public.showroom_kit(id) ON DELETE SET NULL,
  autor_id uuid REFERENCES auth.users(id),
  autor_nome text,
  autor_tipo text NOT NULL DEFAULT 'interno'
    CHECK (autor_tipo IN ('interno','representante','buyer','showroom')),
  dimensao text NOT NULL
    CHECK (dimensao IN ('caimento','cor','tato','medida','preco_percebido','storytelling')),
  nota smallint NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario text,
  rota text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_showroom_fb_ref ON public.showroom_feedback(reference_id);
CREATE INDEX idx_showroom_fb_dim ON public.showroom_feedback(dimensao);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.showroom_feedback TO authenticated;
GRANT ALL ON public.showroom_feedback TO service_role;
ALTER TABLE public.showroom_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "showroom_fb select membros" ON public.showroom_feedback
  FOR SELECT TO authenticated USING (public.has_any_showroom_role(auth.uid()));
CREATE POLICY "showroom_fb insert membros" ON public.showroom_feedback
  FOR INSERT TO authenticated WITH CHECK (public.has_any_showroom_role(auth.uid()));
CREATE POLICY "showroom_fb update autor/diretor" ON public.showroom_feedback
  FOR UPDATE TO authenticated
  USING (
    autor_id = auth.uid()
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  )
  WITH CHECK (
    autor_id = auth.uid()
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  );
CREATE POLICY "showroom_fb delete autor/diretor" ON public.showroom_feedback
  FOR DELETE TO authenticated
  USING (
    autor_id = auth.uid()
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  );

-- =========================================================
-- 5) showroom_decision (Go / No-Go / Revisar)
-- =========================================================
CREATE TABLE public.showroom_decision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.references(id) ON DELETE RESTRICT,
  publication_id uuid REFERENCES public.showroom_publication(id) ON DELETE SET NULL,
  decision text NOT NULL DEFAULT 'pendente'
    CHECK (decision IN ('pendente','go','no_go','revisar')),
  justificativa text,
  decidido_por uuid REFERENCES auth.users(id),
  decidido_em timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reference_id, publication_id)
);
CREATE INDEX idx_showroom_dec_ref ON public.showroom_decision(reference_id);
CREATE INDEX idx_showroom_dec_decision ON public.showroom_decision(decision);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.showroom_decision TO authenticated;
GRANT ALL ON public.showroom_decision TO service_role;
ALTER TABLE public.showroom_decision ENABLE ROW LEVEL SECURITY;

CREATE POLICY "showroom_dec select membros" ON public.showroom_decision
  FOR SELECT TO authenticated USING (public.has_any_showroom_role(auth.uid()));
CREATE POLICY "showroom_dec write diretor/coord" ON public.showroom_decision
  FOR ALL TO authenticated
  USING (
    public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  )
  WITH CHECK (
    public.user_has_role_name(auth.uid(),'coordenador_produto')
    OR public.user_has_role_name(auth.uid(),'diretor_produto')
    OR public.user_has_role_name(auth.uid(),'admin')
  );

CREATE OR REPLACE FUNCTION public.enforce_showroom_decision_justificativa()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.decision <> 'pendente' AND (NEW.justificativa IS NULL OR length(btrim(NEW.justificativa)) < 3) THEN
    RAISE EXCEPTION 'Decisão % exige justificativa', NEW.decision;
  END IF;
  IF NEW.decision <> 'pendente' AND NEW.decidido_em IS NULL THEN
    NEW.decidido_em := now();
    NEW.decidido_por := COALESCE(NEW.decidido_por, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_showroom_decision_justif
  BEFORE INSERT OR UPDATE ON public.showroom_decision
  FOR EACH ROW EXECUTE FUNCTION public.enforce_showroom_decision_justificativa();

CREATE TRIGGER trg_showroom_decision_updated_at
  BEFORE UPDATE ON public.showroom_decision
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 6) Triggers de evento — timeline unificada
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_showroom_sample_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('showroom_sample', NEW.id, 'sample.requested', NULL, NEW.status, NEW.created_by,
            jsonb_build_object('reference_id', NEW.reference_id, 'grade', NEW.grade, 'cor', NEW.cor, 'quantidade', NEW.quantidade));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('showroom_sample', NEW.id,
            CASE NEW.status
              WHEN 'recebida' THEN 'sample.received'
              WHEN 'aprovada' THEN 'sample.approved'
              WHEN 'reprovada' THEN 'sample.rejected'
              WHEN 'em_kit' THEN 'sample.in_kit'
              WHEN 'em_showroom' THEN 'sample.in_showroom'
              WHEN 'retornada' THEN 'sample.returned'
              WHEN 'devolvida' THEN 'sample.returned'
              WHEN 'arquivada' THEN 'sample.archived'
              ELSE 'sample.status_changed'
            END,
            OLD.status, NEW.status, NEW.updated_by,
            jsonb_build_object('reference_id', NEW.reference_id, 'motivo', NEW.motivo));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_log_showroom_sample_event
  AFTER INSERT OR UPDATE ON public.showroom_sample
  FOR EACH ROW EXECUTE FUNCTION public.log_showroom_sample_event();

CREATE OR REPLACE FUNCTION public.log_showroom_publication_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('showroom_publication', NEW.id, 'showroom.created', NULL, NEW.status, NEW.created_by,
            jsonb_build_object('titulo', NEW.titulo, 'versao', NEW.versao));
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('showroom_publication', NEW.id,
            CASE NEW.status
              WHEN 'publicada' THEN 'showroom.published'
              WHEN 'congelada' THEN 'showroom.frozen'
              WHEN 'rejeitada' THEN 'showroom.rejected'
              ELSE 'showroom.status_changed'
            END,
            OLD.status, NEW.status, NEW.updated_by,
            jsonb_build_object('titulo', NEW.titulo, 'versao', NEW.versao, 'refs', to_jsonb(NEW.reference_ids)));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_log_showroom_pub_event
  AFTER INSERT OR UPDATE ON public.showroom_publication
  FOR EACH ROW EXECUTE FUNCTION public.log_showroom_publication_event();

CREATE OR REPLACE FUNCTION public.log_showroom_decision_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.decision <> 'pendente')
     OR (TG_OP = 'UPDATE' AND NEW.decision IS DISTINCT FROM OLD.decision) THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('showroom_decision', NEW.id, 'reference.launch_decision',
            COALESCE(OLD.decision,'pendente'), NEW.decision, NEW.decidido_por,
            jsonb_build_object('reference_id', NEW.reference_id, 'publication_id', NEW.publication_id, 'justificativa', NEW.justificativa));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_log_showroom_decision_event
  AFTER INSERT OR UPDATE ON public.showroom_decision
  FOR EACH ROW EXECUTE FUNCTION public.log_showroom_decision_event();

CREATE OR REPLACE FUNCTION public.log_showroom_feedback_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
  VALUES ('showroom_feedback', NEW.id, 'feedback.captured', NULL, NULL, NEW.autor_id,
          jsonb_build_object(
            'reference_id', NEW.reference_id,
            'dimensao', NEW.dimensao,
            'nota', NEW.nota,
            'autor_tipo', NEW.autor_tipo,
            'rota', NEW.rota
          ));
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_log_showroom_feedback_event
  AFTER INSERT ON public.showroom_feedback
  FOR EACH ROW EXECUTE FUNCTION public.log_showroom_feedback_event();

-- =========================================================
-- 7) Máquinas de estado
-- =========================================================
INSERT INTO public.workflow_definitions (entity_type, from_status, to_status, is_active)
VALUES
  ('showroom_sample','solicitada','recebida', true),
  ('showroom_sample','recebida','em_curadoria', true),
  ('showroom_sample','em_curadoria','aprovada', true),
  ('showroom_sample','em_curadoria','reprovada', true),
  ('showroom_sample','reprovada','devolvida', true),
  ('showroom_sample','aprovada','em_kit', true),
  ('showroom_sample','em_kit','em_showroom', true),
  ('showroom_sample','em_showroom','retornada', true),
  ('showroom_sample','retornada','arquivada', true),
  ('showroom_publication','rascunho','em_revisao', true),
  ('showroom_publication','em_revisao','publicada', true),
  ('showroom_publication','em_revisao','rejeitada', true),
  ('showroom_publication','rejeitada','rascunho', true),
  ('showroom_publication','publicada','congelada', true),
  ('showroom_decision','pendente','go', true),
  ('showroom_decision','pendente','no_go', true),
  ('showroom_decision','pendente','revisar', true)
ON CONFLICT DO NOTHING;

-- =========================================================
-- 8) Realtime — tópico escopado por papel
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.showroom_sample;
ALTER PUBLICATION supabase_realtime ADD TABLE public.showroom_publication;
ALTER PUBLICATION supabase_realtime ADD TABLE public.showroom_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.showroom_decision;

DO $mig$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages' AND policyname = 'showroom-live read scoped'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "showroom-live read scoped" ON realtime.messages
      FOR SELECT TO authenticated
      USING (
        realtime.topic() = 'showroom-live'
        AND public.has_any_showroom_role(auth.uid())
      )
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages' AND policyname = 'showroom-live write scoped'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "showroom-live write scoped" ON realtime.messages
      FOR INSERT TO authenticated
      WITH CHECK (
        realtime.topic() = 'showroom-live'
        AND public.has_any_showroom_role(auth.uid())
      )
    $p$;
  END IF;
END $mig$;