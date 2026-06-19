
-- Influencers
CREATE TABLE public.influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  handle text NOT NULL,
  regiao text,
  uf text,
  seguidores integer NOT NULL DEFAULT 0,
  segmento text,
  perfil text,
  custo_medio numeric NOT NULL DEFAULT 0,
  vendas_geradas integer NOT NULL DEFAULT 0,
  envios jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.influencers TO authenticated;
GRANT ALL ON public.influencers TO service_role;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "influencers_select_auth" ON public.influencers FOR SELECT TO authenticated USING (true);
CREATE POLICY "influencers_insert_auth" ON public.influencers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "influencers_update_auth" ON public.influencers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "influencers_delete_mgr" ON public.influencers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_influencers_updated BEFORE UPDATE ON public.influencers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quality CAPA
CREATE TABLE public.quality_capa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text,
  lote text,
  defeito text NOT NULL,
  setor text NOT NULL,
  fornecedor text,
  tipo text NOT NULL CHECK (tipo IN ('Corretiva','Preventiva')),
  responsavel text NOT NULL,
  prazo date,
  status text NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta','Em andamento','Concluída')),
  criada date NOT NULL DEFAULT (now()::date),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_capa TO authenticated;
GRANT ALL ON public.quality_capa TO service_role;
ALTER TABLE public.quality_capa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capa_select_auth" ON public.quality_capa FOR SELECT TO authenticated USING (true);
CREATE POLICY "capa_insert_auth" ON public.quality_capa FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "capa_update_auth" ON public.quality_capa FOR UPDATE TO authenticated USING (true);
CREATE POLICY "capa_delete_mgr" ON public.quality_capa FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_capa_updated BEFORE UPDATE ON public.quality_capa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TechSheet (BOM/BOP/Versions) stored as single document per ref
CREATE TABLE public.tech_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  bom jsonb NOT NULL DEFAULT '[]'::jsonb,
  bop jsonb NOT NULL DEFAULT '[]'::jsonb,
  versoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tech_sheets TO authenticated;
GRANT ALL ON public.tech_sheets TO service_role;
ALTER TABLE public.tech_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "techsheets_select_auth" ON public.tech_sheets FOR SELECT TO authenticated USING (true);
CREATE POLICY "techsheets_insert_auth" ON public.tech_sheets FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "techsheets_update_auth" ON public.tech_sheets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "techsheets_delete_mgr" ON public.tech_sheets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_techsheets_updated BEFORE UPDATE ON public.tech_sheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
