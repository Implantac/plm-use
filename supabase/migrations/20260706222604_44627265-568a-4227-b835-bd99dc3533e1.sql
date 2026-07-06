
-- Extend quality_capa for real workflow
ALTER TABLE public.quality_capa DROP CONSTRAINT IF EXISTS quality_capa_status_check;
ALTER TABLE public.quality_capa ADD CONSTRAINT quality_capa_status_check
  CHECK (status = ANY (ARRAY['Aberta','Investigação','Ação','Verificação','Concluída','Reprovada']));

ALTER TABLE public.quality_capa
  ADD COLUMN IF NOT EXISTS causa_raiz text,
  ADD COLUMN IF NOT EXISTS cinco_porques jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS evidencias jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS acao_imediata text,
  ADD COLUMN IF NOT EXISTS acao_corretiva text,
  ADD COLUMN IF NOT EXISTS acao_preventiva text,
  ADD COLUMN IF NOT EXISTS verificado_em timestamptz,
  ADD COLUMN IF NOT EXISTS verificado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eficacia text CHECK (eficacia IS NULL OR eficacia = ANY (ARRAY['Eficaz','Não eficaz','Pendente'])),
  ADD COLUMN IF NOT EXISTS reincidencia_de uuid REFERENCES public.quality_capa(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS severidade text NOT NULL DEFAULT 'Média' CHECK (severidade = ANY (ARRAY['Baixa','Média','Alta','Crítica']));

-- CAPA timeline (immutable event log)
CREATE TABLE IF NOT EXISTS public.capa_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id uuid NOT NULL REFERENCES public.quality_capa(id) ON DELETE CASCADE,
  event text NOT NULL,
  from_status text,
  to_status text,
  note text,
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.capa_events TO authenticated;
GRANT ALL ON public.capa_events TO service_role;

ALTER TABLE public.capa_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capa_events_read_authenticated" ON public.capa_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "capa_events_insert_authenticated" ON public.capa_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor OR actor IS NULL);

CREATE INDEX IF NOT EXISTS capa_events_capa_idx ON public.capa_events(capa_id, created_at DESC);

-- Realtime
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.quality_capa; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.capa_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
