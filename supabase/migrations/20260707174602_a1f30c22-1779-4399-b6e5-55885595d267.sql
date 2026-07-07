
-- V8: Generic workflow engine (polymorphic transitions for any entity)

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  requires_role TEXT,
  requires_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  sla_hours INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, from_status, to_status)
);

CREATE INDEX IF NOT EXISTS idx_workflow_defs_entity_from
  ON public.workflow_definitions (entity_type, from_status)
  WHERE is_active = true;

GRANT SELECT ON public.workflow_definitions TO authenticated;
GRANT ALL ON public.workflow_definitions TO service_role;

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_defs_read_authenticated"
  ON public.workflow_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "workflow_defs_admin_write"
  ON public.workflow_definitions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_workflow_defs_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Generic transition validator
CREATE OR REPLACE FUNCTION public.can_transition(
  _entity_type TEXT,
  _from TEXT,
  _to TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workflow_definitions
    WHERE entity_type = _entity_type
      AND from_status = _from
      AND to_status = _to
      AND is_active = true
  )
$$;

REVOKE EXECUTE ON FUNCTION public.can_transition(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_transition(TEXT, TEXT, TEXT) TO authenticated, service_role;

-- Seed: mirror existing reference_transitions into the generic engine
INSERT INTO public.workflow_definitions (entity_type, from_status, to_status, is_active)
SELECT 'reference', from_status::text, to_status::text, is_active
FROM public.reference_transitions
ON CONFLICT (entity_type, from_status, to_status) DO NOTHING;

-- Seed: default lote (PCP) workflow
INSERT INTO public.workflow_definitions (entity_type, from_status, to_status, is_active) VALUES
  ('lote', 'CORTE', 'COSTURA', true),
  ('lote', 'COSTURA', 'ACABAMENTO', true),
  ('lote', 'ACABAMENTO', 'QUALIDADE', true),
  ('lote', 'QUALIDADE', 'EXPEDICAO', true),
  ('lote', 'EXPEDICAO', 'FINALIZADO', true),
  ('lote', 'COSTURA', 'QUALIDADE', true),
  ('lote', 'ACABAMENTO', 'COSTURA', true)
ON CONFLICT (entity_type, from_status, to_status) DO NOTHING;

-- Seed: default CAPA workflow
INSERT INTO public.workflow_definitions (entity_type, from_status, to_status, is_active) VALUES
  ('capa', 'ABERTA', 'INVESTIGACAO', true),
  ('capa', 'INVESTIGACAO', 'ACAO', true),
  ('capa', 'ACAO', 'VERIFICACAO', true),
  ('capa', 'VERIFICACAO', 'FECHADA', true),
  ('capa', 'INVESTIGACAO', 'FECHADA', true)
ON CONFLICT (entity_type, from_status, to_status) DO NOTHING;

-- Seed: default tech_sheet workflow
INSERT INTO public.workflow_definitions (entity_type, from_status, to_status, is_active) VALUES
  ('tech_sheet', 'RASCUNHO', 'REVISAO', true),
  ('tech_sheet', 'REVISAO', 'APROVADA', true),
  ('tech_sheet', 'REVISAO', 'RASCUNHO', true),
  ('tech_sheet', 'APROVADA', 'OBSOLETA', true)
ON CONFLICT (entity_type, from_status, to_status) DO NOTHING;
