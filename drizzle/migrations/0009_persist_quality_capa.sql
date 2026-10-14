-- CAPA da Qualidade: módulo 9 do creative-sync. O store zustand tinha
-- persist(localStorage) — sobrevivia ao F5 mas vivia preso em UM dispositivo,
-- e CAPA é por natureza fluxo entre pessoas (abrir aqui, fechar na fábrica).
-- O espelho no servidor libera cross-device/realtime sem tocar na UI.

CREATE TABLE public.quality_capa_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  defeito text NOT NULL,
  setor text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'Corretiva' CHECK (tipo IN ('Corretiva','Preventiva')),
  status text NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta','Em andamento','Concluída')),
  responsavel text NOT NULL DEFAULT '',
  prazo text NOT NULL DEFAULT '',
  ref text,
  lote text,
  fornecedor text,
  criada text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quality_capa_actions TO authenticated;
GRANT ALL ON public.quality_capa_actions TO service_role;
ALTER TABLE public.quality_capa_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capa_select_auth" ON public.quality_capa_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "capa_insert_auth" ON public.quality_capa_actions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "capa_update_auth" ON public.quality_capa_actions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "capa_delete_auth" ON public.quality_capa_actions FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_capa_updated BEFORE UPDATE ON public.quality_capa_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.quality_capa_actions REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.quality_capa_actions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;