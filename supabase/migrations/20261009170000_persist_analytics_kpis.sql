-- Persistência dos KPIs estratégicos do BI Executivo (módulo 8 do creative-sync).
-- A tela /analytics editava cards num useState local — a revisão de 09/10 achou
-- o segundo "caso collections". `icon_name` guarda o NOME do ícone (o ReactNode
-- nasce na renderização); KPI sem barra = progress NULL.

CREATE TABLE public.analytics_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  label text NOT NULL,
  value text NOT NULL,
  sub text NOT NULL DEFAULT '',
  progress integer CHECK (progress IS NULL OR progress BETWEEN 0 AND 100),
  icon_name text NOT NULL DEFAULT 'bar-chart',
  tone text NOT NULL DEFAULT 'primary',
  -- created_by: sem FK para auth.users (regra do ambiente Lovable: tabelas de app
  -- nao referenciam a lista de usuarios); a politica de insert abaixo ja exige
  -- auth.uid() = created_by. Versao aplicada no banco em 14/10 espelha isto.
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_kpis TO authenticated;
GRANT ALL ON public.analytics_kpis TO service_role;
ALTER TABLE public.analytics_kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analytics_kpis_select_auth" ON public.analytics_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "analytics_kpis_insert_auth" ON public.analytics_kpis FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "analytics_kpis_update_auth" ON public.analytics_kpis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "analytics_kpis_delete_mgr" ON public.analytics_kpis FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_analytics_kpis_updated BEFORE UPDATE ON public.analytics_kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.analytics_kpis REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_kpis;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
