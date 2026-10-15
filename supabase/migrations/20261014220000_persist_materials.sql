-- Biblioteca de Materiais (modulo 11 do creative-sync): catalogo de tecidos,
-- aviamentos, linhas, embalagens, bordados e silk reutilizavel no BOM das
-- fichas tecnicas. Padrao identico ao bloco 8 (analytics_kpis): external_key
-- como chave de sync (seeds locais viram linhas na 1a edicao), RLS de tela
-- completa, sem FK para auth.users (regra do ambiente Lovable -- a policy de
-- insert garante o autor), realtime + updated_at via trigger.
-- Comentarios somente com "--" (a guarda sql-migrations.test.ts vigia).

CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  material_type text NOT NULL DEFAULT 'Tecido'
    CHECK (material_type IN ('Tecido','Aviamento','Linha','Embalagem','Bordado','Silk')),
  supplier text NOT NULL DEFAULT '',
  unit text NOT NULL DEFAULT 'un',
  unit_cost numeric(12,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  sku text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX materials_type_idx ON public.materials (material_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_select_auth" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "materials_insert_auth" ON public.materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "materials_update_auth" ON public.materials FOR UPDATE TO authenticated USING (true);
CREATE POLICY "materials_delete_mgr" ON public.materials FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_materials_updated BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.materials REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
