
-- 1. Tabela pilotos
CREATE TABLE public.pilotos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id UUID NOT NULL REFERENCES public.references(id) ON DELETE CASCADE,
  tech_sheet_id UUID REFERENCES public.tech_sheets(id) ON DELETE SET NULL,
  supplier_id UUID,
  tipo TEXT NOT NULL DEFAULT 'prova',
  rodada INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'RASCUNHO',
  observacoes TEXT,
  foto_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pilotos_reference ON public.pilotos(reference_id);
CREATE INDEX idx_pilotos_tech_sheet ON public.pilotos(tech_sheet_id);
CREATE INDEX idx_pilotos_status ON public.pilotos(status);

-- 2. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilotos TO authenticated;
GRANT ALL ON public.pilotos TO service_role;

-- 3. RLS
ALTER TABLE public.pilotos ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Pilotos visíveis para autenticados"
  ON public.pilotos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autenticados criam pilotos"
  ON public.pilotos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Criador ou manager edita piloto"
  ON public.pilotos FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin exclui piloto"
  ON public.pilotos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Trigger updated_at
CREATE TRIGGER update_pilotos_updated_at
  BEFORE UPDATE ON public.pilotos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Trigger log em entity_events
CREATE OR REPLACE FUNCTION public.log_piloto_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('piloto', NEW.id, 'created', NULL, NEW.status, NEW.created_by,
            jsonb_build_object('reference_id', NEW.reference_id, 'rodada', NEW.rodada, 'tipo', NEW.tipo));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, payload)
    VALUES ('piloto', NEW.id, 'status_changed', OLD.status, NEW.status, NEW.updated_by,
            jsonb_build_object('reference_id', NEW.reference_id, 'rodada', NEW.rodada));
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_piloto_events
  AFTER INSERT OR UPDATE ON public.pilotos
  FOR EACH ROW EXECUTE FUNCTION public.log_piloto_status_change();

-- 7. Seed workflow_definitions para piloto
INSERT INTO public.workflow_definitions (entity_type, from_status, to_status, is_active) VALUES
  ('piloto', 'RASCUNHO',            'EM_DESENVOLVIMENTO', true),
  ('piloto', 'EM_DESENVOLVIMENTO',  'EM_AVALIACAO',       true),
  ('piloto', 'EM_AVALIACAO',        'APROVADO',           true),
  ('piloto', 'EM_AVALIACAO',        'REPROVADO',          true),
  ('piloto', 'EM_AVALIACAO',        'AJUSTE_SOLICITADO',  true),
  ('piloto', 'AJUSTE_SOLICITADO',   'EM_DESENVOLVIMENTO', true),
  ('piloto', 'REPROVADO',           'EM_DESENVOLVIMENTO', true)
ON CONFLICT (entity_type, from_status, to_status) DO NOTHING;
