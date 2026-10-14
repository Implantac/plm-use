-- Persistência do módulo Coleções (fechar o resto do P0-1: a tela /collections
-- tinha CRUD completo em useState — edições morriam no F5).
-- Mesmas convenções de 20261008230000 (external_key = id numérico do store em
-- texto; KPIs demo viram colunas nullable — NULL = "sem dado", não 0).

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  season text NOT NULL DEFAULT '',
  year integer NOT NULL DEFAULT 2026,
  brand text NOT NULL DEFAULT '',
  target_revenue text NOT NULL DEFAULT '',
  target_sales text NOT NULL DEFAULT '',
  target_margin text NOT NULL DEFAULT '',
  planned_qty text NOT NULL DEFAULT '',
  planned_mix integer NOT NULL DEFAULT 0,
  realized_mix integer NOT NULL DEFAULT 0,
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  roi text NOT NULL DEFAULT '',
  abc text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Planejamento',
  image text NOT NULL DEFAULT '',
  showroom_approval numeric,
  avg_cost numeric,
  avg_price numeric,
  sell_through numeric,
  lead_time_dias integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_select_auth" ON public.collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "collections_insert_auth" ON public.collections FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "collections_update_auth" ON public.collections FOR UPDATE TO authenticated USING (true);
CREATE POLICY "collections_delete_mgr" ON public.collections FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.collections REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
