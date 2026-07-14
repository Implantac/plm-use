-- Fix 4 warn-level security findings from scan (2026-07-14)

-- 1) comments_update_own: prevent reassignment of user_id via UPDATE
DROP POLICY IF EXISTS comments_update_own ON public.comments;
CREATE POLICY comments_update_own ON public.comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) capa_events_insert_own: verify user has legitimate access to referenced CAPA
DROP POLICY IF EXISTS capa_events_insert_own ON public.capa_events;
CREATE POLICY capa_events_insert_own ON public.capa_events
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = actor
    AND is_member(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.quality_capa q
      WHERE q.id = capa_events.capa_id
        AND (
          auth.uid() = q.created_by
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'manager'::app_role)
          OR public.user_has_role_name(auth.uid(), 'qualidade')
          OR public.user_has_role_name(auth.uid(), 'pcp')
          OR public.user_has_role_name(auth.uid(), 'coordenador_produto')
        )
    )
  );

-- 3) entity_events_insert_own: mirror SELECT scoping so users can only fabricate events for entity_types their role covers
DROP POLICY IF EXISTS entity_events_insert_own ON public.entity_events;
CREATE POLICY entity_events_insert_own ON public.entity_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor = auth.uid()
    AND is_member(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR (public.user_has_role_name(auth.uid(), 'pcp') AND entity_type = ANY (ARRAY['lote','piloto','launch_wave','launch_item','launch_handoff','stock_item','stock_movement','stock_reservation','facao_order']::entity_type[]))
      OR (public.user_has_role_name(auth.uid(), 'qualidade') AND entity_type = ANY (ARRAY['capa','piloto','showroom_sample','facao_order','lote']::entity_type[]))
      OR (public.user_has_role_name(auth.uid(), 'coordenador_produto') AND entity_type = ANY (ARRAY['reference','tech_sheet','engenharia','showroom_sample','showroom_publication','showroom_decision','showroom_feedback','launch_wave','launch_item','piloto']::entity_type[]))
    )
  );

-- 4) Supplier* policies: restrict role from public to authenticated

-- suppliers
DROP POLICY IF EXISTS suppliers_delete_admin ON public.suppliers;
CREATE POLICY suppliers_delete_admin ON public.suppliers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS suppliers_insert_internal ON public.suppliers;
CREATE POLICY suppliers_insert_internal ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS suppliers_select_scope ON public.suppliers;
CREATE POLICY suppliers_select_scope ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), id));

DROP POLICY IF EXISTS suppliers_update_internal ON public.suppliers;
CREATE POLICY suppliers_update_internal ON public.suppliers
  FOR UPDATE TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()));

-- supplier_orders
DROP POLICY IF EXISTS supplier_orders_delete_admin ON public.supplier_orders;
CREATE POLICY supplier_orders_delete_admin ON public.supplier_orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS supplier_orders_insert_internal ON public.supplier_orders;
CREATE POLICY supplier_orders_insert_internal ON public.supplier_orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS supplier_orders_select_scope ON public.supplier_orders;
CREATE POLICY supplier_orders_select_scope ON public.supplier_orders
  FOR SELECT TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), supplier_id));

DROP POLICY IF EXISTS supplier_orders_update_scope ON public.supplier_orders;
CREATE POLICY supplier_orders_update_scope ON public.supplier_orders
  FOR UPDATE TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), supplier_id))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), supplier_id));

-- supplier_sample_submissions
DROP POLICY IF EXISTS supplier_samples_delete_admin ON public.supplier_sample_submissions;
CREATE POLICY supplier_samples_delete_admin ON public.supplier_sample_submissions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS supplier_samples_insert_scope ON public.supplier_sample_submissions;
CREATE POLICY supplier_samples_insert_scope ON public.supplier_sample_submissions
  FOR INSERT TO authenticated
  WITH CHECK ((public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.has_supplier_mgmt_role(auth.uid())) AND auth.uid() = created_by);

DROP POLICY IF EXISTS supplier_samples_select_scope ON public.supplier_sample_submissions;
CREATE POLICY supplier_samples_select_scope ON public.supplier_sample_submissions
  FOR SELECT TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), supplier_id));

DROP POLICY IF EXISTS supplier_samples_update_internal ON public.supplier_sample_submissions;
CREATE POLICY supplier_samples_update_internal ON public.supplier_sample_submissions
  FOR UPDATE TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()));

-- supplier_users
DROP POLICY IF EXISTS supplier_users_select_scope ON public.supplier_users;
CREATE POLICY supplier_users_select_scope ON public.supplier_users
  FOR SELECT TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS supplier_users_write_internal ON public.supplier_users;
CREATE POLICY supplier_users_write_internal ON public.supplier_users
  FOR ALL TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()));