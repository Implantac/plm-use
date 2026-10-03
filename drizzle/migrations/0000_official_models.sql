CREATE TABLE public.official_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text,
  tamanho_base text NOT NULL DEFAULT 'M',
  medidas jsonb NOT NULL DEFAULT '[]'::jsonb,
  detalhes text,
  sketch_path text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_models TO authenticated;
GRANT ALL ON public.official_models TO service_role;
ALTER TABLE public.official_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read official models" ON public.official_models FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
CREATE POLICY "members insert official models" ON public.official_models FOR INSERT TO authenticated WITH CHECK (public.is_member(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "members update official models" ON public.official_models FOR UPDATE TO authenticated USING (public.is_member(auth.uid())) WITH CHECK (public.is_member(auth.uid()));
CREATE POLICY "owner or admin delete official models" ON public.official_models FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_official_models_updated BEFORE UPDATE ON public.official_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "members read official model files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'official-models' AND public.is_member(auth.uid()));
CREATE POLICY "members upload official model files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'official-models' AND public.is_member(auth.uid()));
CREATE POLICY "members delete official model files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'official-models' AND public.is_member(auth.uid()));