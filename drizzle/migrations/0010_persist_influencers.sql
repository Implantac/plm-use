-- Influenciadores (GTM): módulo 10 do creative-sync. Lista + envios por
-- influencer; `envios` é jsonb pelo mesmo acordo dos módulos 1–6 (normalizar
-- para tabela filha é a fase BI/4 — ver TODO). CHECK de status espelha o union
-- do tipo Envio para lixar entrada manual via SQL Editor.

CREATE TABLE public.marketing_influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  nome text NOT NULL,
  handle text NOT NULL DEFAULT '',
  regiao text NOT NULL DEFAULT '',
  uf text NOT NULL DEFAULT '',
  seguidores integer NOT NULL DEFAULT 0,
  segmento text NOT NULL DEFAULT '',
  perfil text NOT NULL DEFAULT 'Micro' CHECK (perfil IN ('Macro','Médio','Micro')),
  custo_medio numeric NOT NULL DEFAULT 0,
  vendas_geradas numeric NOT NULL DEFAULT 0,
  envios jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_influencers TO authenticated;
GRANT ALL ON public.marketing_influencers TO service_role;
ALTER TABLE public.marketing_influencers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "influencers_select_auth" ON public.marketing_influencers FOR SELECT TO authenticated USING (true);
CREATE POLICY "influencers_insert_auth" ON public.marketing_influencers FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "influencers_update_auth" ON public.marketing_influencers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "influencers_delete_mgr" ON public.marketing_influencers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_influencers_updated BEFORE UPDATE ON public.marketing_influencers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.marketing_influencers REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_influencers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;