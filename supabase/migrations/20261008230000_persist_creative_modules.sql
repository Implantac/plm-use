-- Persistência dos 6 módulos criativos "voláteis" (P0-1 / Sprint 2)
-- color_palettes · print_assets · looks · display_boards · measurement_charts ·
-- collection_map_filters
--
-- Convenções copiadas de 20260619005953 (influencers/quality_capa/tech_sheets):
-- uuid PK interno, created_by→auth.users, RLS 4-políticas, trigger de
-- updated_at, REPLICA IDENTITY FULL + publicação supabase_realtime.
--
-- Diferença deliberada: `external_key` UNIQUE carrega o id do store em memória
-- ("pal-01", "look-123...", uuid) e é a chave do upsert. Assim os seeds locais
-- viram linhas na primeira edição sem a corrida de double-insert do padrão
-- antigo (que só reaproveitava id com length 36) e sem renumerar o id na UI.
-- Arrays aninhados (cores da cartela, versões da estampa, itens do look/board,
-- pontos/grades da tabela de medidas) ficam em jsonb — igual a tech_sheets.bom;
-- normalização p/ BI é a fase 2.

-- ---------- 1. color_palettes (src/lib/colors) ----------
CREATE TABLE public.color_palettes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  season text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT '',
  cover text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','em_revisao','aprovada','arquivada')),
  colors jsonb NOT NULL DEFAULT '[]'::jsonb, -- ColorRef[]
  linked_refs integer NOT NULL DEFAULT 0,
  updated_on timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.color_palettes TO authenticated;
GRANT ALL ON public.color_palettes TO service_role;
ALTER TABLE public.color_palettes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "palettes_select_auth" ON public.color_palettes FOR SELECT TO authenticated USING (true);
CREATE POLICY "palettes_insert_auth" ON public.color_palettes FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "palettes_update_auth" ON public.color_palettes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "palettes_delete_mgr" ON public.color_palettes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_palettes_updated BEFORE UPDATE ON public.color_palettes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2. print_assets (src/lib/prints) ----------
CREATE TABLE public.print_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  code text NOT NULL DEFAULT '',
  name text NOT NULL,
  tecnica text NOT NULL DEFAULT 'digital'
    CHECK (tecnica IN ('digital','rotativa','localizada','sublimacao','silk')),
  repeat_cm jsonb NOT NULL DEFAULT '{"widthCm":0,"heightCm":0}'::jsonb,
  color_count integer NOT NULL DEFAULT 0,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb, -- hex[]
  supplier text,
  season text,
  brand text,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','em_prova','aprovada','arquivada')),
  cover text NOT NULL DEFAULT '',
  file_format text NOT NULL DEFAULT 'AI'
    CHECK (file_format IN ('AI','PSD','SVG','TIFF','PDF')),
  file_size_mb numeric,
  linked_refs integer NOT NULL DEFAULT 0,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  versions jsonb NOT NULL DEFAULT '[]'::jsonb, -- PrintVersion[]
  updated_on timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.print_assets TO authenticated;
GRANT ALL ON public.print_assets TO service_role;
ALTER TABLE public.print_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prints_select_auth" ON public.print_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "prints_insert_auth" ON public.print_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "prints_update_auth" ON public.print_assets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "prints_delete_mgr" ON public.print_assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_prints_updated BEFORE UPDATE ON public.print_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3. looks (src/lib/looks) ----------
CREATE TABLE public.looks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  season text NOT NULL DEFAULT '',
  occasion text NOT NULL DEFAULT 'casual'
    CHECK (occasion IN ('casual','trabalho','festa','resort','esporte','streetwear')),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','aprovado','arquivado')),
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  styling_notes text NOT NULL DEFAULT '',
  cover_color text NOT NULL DEFAULT '#000000',
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- LookItem[]
  created_on timestamptz,
  updated_on timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.looks TO authenticated;
GRANT ALL ON public.looks TO service_role;
ALTER TABLE public.looks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "looks_select_auth" ON public.looks FOR SELECT TO authenticated USING (true);
CREATE POLICY "looks_insert_auth" ON public.looks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "looks_update_auth" ON public.looks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "looks_delete_mgr" ON public.looks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_looks_updated BEFORE UPDATE ON public.looks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 4. display_boards (src/lib/display) ----------
CREATE TABLE public.display_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  season text NOT NULL DEFAULT '',
  target text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','em_revisao','aprovada')),
  cover text NOT NULL DEFAULT '',
  bg_color text NOT NULL DEFAULT '#ffffff',
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- BoardItem[] (x/y/w em % do canvas)
  updated_on timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.display_boards TO authenticated;
GRANT ALL ON public.display_boards TO service_role;
ALTER TABLE public.display_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boards_select_auth" ON public.display_boards FOR SELECT TO authenticated USING (true);
CREATE POLICY "boards_insert_auth" ON public.display_boards FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "boards_update_auth" ON public.display_boards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "boards_delete_mgr" ON public.display_boards FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_boards_updated BEFORE UPDATE ON public.display_boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 5. measurement_charts (src/lib/measurements) ----------
CREATE TABLE public.measurement_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  code text NOT NULL DEFAULT '',
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Top'
    CHECK (category IN ('Top','Bottom','Dress','Outwear','Underwear','Kids')),
  segment text NOT NULL DEFAULT 'Feminino'
    CHECK (segment IN ('Feminino','Masculino','Unissex','Infantil')),
  fit text CHECK (fit IN ('slim','regular','oversized','relaxed')),
  unit text NOT NULL DEFAULT 'cm' CHECK (unit IN ('cm','in')),
  brand text,
  linked_refs integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','aprovada','arquivada')),
  updated_on timestamptz,
  updated_by text NOT NULL DEFAULT '',
  points jsonb NOT NULL DEFAULT '[]'::jsonb, -- MeasurementPoint[]
  grade jsonb NOT NULL DEFAULT '[]'::jsonb, -- MeasurementGradeRow[]
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurement_charts TO authenticated;
GRANT ALL ON public.measurement_charts TO service_role;
ALTER TABLE public.measurement_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charts_select_auth" ON public.measurement_charts FOR SELECT TO authenticated USING (true);
CREATE POLICY "charts_insert_auth" ON public.measurement_charts FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "charts_update_auth" ON public.measurement_charts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "charts_delete_mgr" ON public.measurement_charts FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_charts_updated BEFORE UPDATE ON public.measurement_charts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 6. collection_map_filters (src/lib/collection-map) ----------
-- O único estado mutável do módulo são os filtros salvos (antes só
-- localStorage). A matriz em si não tem mutators no store — permanece seed
-- estática até decisão de produto.
CREATE TABLE public.collection_map_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text NOT NULL UNIQUE,
  name text NOT NULL,
  owner text NOT NULL DEFAULT '',
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  colors jsonb NOT NULL DEFAULT '[]'::jsonb, -- hex[]
  statuses jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_on timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_map_filters TO authenticated;
GRANT ALL ON public.collection_map_filters TO service_role;
ALTER TABLE public.collection_map_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfilters_select_auth" ON public.collection_map_filters FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfilters_insert_auth" ON public.collection_map_filters FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "cfilters_update_auth" ON public.collection_map_filters FOR UPDATE TO authenticated USING (true);
CREATE POLICY "cfilters_delete_auth" ON public.collection_map_filters FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER trg_cfilters_updated BEFORE UPDATE ON public.collection_map_filters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Realtime (padrão 20260706222604: DO block tolerante a re-run) ----------
ALTER TABLE public.color_palettes REPLICA IDENTITY FULL;
ALTER TABLE public.print_assets REPLICA IDENTITY FULL;
ALTER TABLE public.looks REPLICA IDENTITY FULL;
ALTER TABLE public.display_boards REPLICA IDENTITY FULL;
ALTER TABLE public.measurement_charts REPLICA IDENTITY FULL;
ALTER TABLE public.collection_map_filters REPLICA IDENTITY FULL;
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['color_palettes','print_assets','looks','display_boards','measurement_charts','collection_map_filters']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
