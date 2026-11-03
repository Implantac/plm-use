DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('looks','looks'),('color_palettes','palettes'),('marketing_influencers','influencers'),
    ('measurement_charts','charts'),('materials','materials'),('print_assets','prints'),
    ('display_boards','boards'),('collections','collections'),('analytics_kpis','analytics_kpis'),
    ('collection_map_filters','cfilters'),('quality_capa_actions','capa')
  ) AS t(tbl, pfx) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pfx||'_select_auth', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pfx||'_update_auth', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_member(auth.uid()) OR auth.uid() = created_by)', r.pfx||'_select_auth', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''manager''::app_role)) WITH CHECK (auth.uid() = created_by OR created_by IS NULL OR public.has_role(auth.uid(), ''admin''::app_role) OR public.has_role(auth.uid(), ''manager''::app_role))', r.pfx||'_update_auth', r.tbl);
  END LOOP;
  DROP POLICY IF EXISTS capa_delete_auth ON public.quality_capa_actions;
  CREATE POLICY capa_delete_auth ON public.quality_capa_actions FOR DELETE TO authenticated
    USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));
END $$;