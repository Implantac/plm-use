
-- =========================================================================
-- Security hardening: restrict UPDATE policies, storage ownership,
-- realtime channel authorization, and SECURITY DEFINER exposure.
-- =========================================================================

-- 1. Tighten UPDATE policies on influencers / quality_capa / tech_sheets
DROP POLICY IF EXISTS influencers_update_auth ON public.influencers;
CREATE POLICY influencers_update_owner_or_mgr ON public.influencers
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

DROP POLICY IF EXISTS capa_update_auth ON public.quality_capa;
CREATE POLICY capa_update_owner_or_mgr ON public.quality_capa
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

DROP POLICY IF EXISTS techsheets_update_auth ON public.tech_sheets;
CREATE POLICY techsheets_update_owner_or_mgr ON public.tech_sheets
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  );

-- 2. Storage — enforce per-user folder ownership on use-moda-assets
-- File paths must be of the form "<auth.uid()>/..."
DROP POLICY IF EXISTS assets_select_auth ON storage.objects;
DROP POLICY IF EXISTS assets_insert_auth ON storage.objects;
DROP POLICY IF EXISTS assets_update_auth ON storage.objects;
DROP POLICY IF EXISTS assets_delete_auth ON storage.objects;

CREATE POLICY assets_select_owner ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'use-moda-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY assets_insert_owner ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'use-moda-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY assets_update_owner ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'use-moda-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'use-moda-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY assets_delete_owner ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'use-moda-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Realtime channel authorization — scope subscriptions by topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS realtime_authenticated_read ON realtime.messages;
DROP POLICY IF EXISTS realtime_authenticated_write ON realtime.messages;

CREATE POLICY realtime_authenticated_read ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    -- Per-user private channels: only the owning user may subscribe
    realtime.topic() = 'notifications:' || auth.uid()::text
    -- Shared operational channels used across the app
    OR realtime.topic() IN (
      'references-live', 'capa-live', 'modules-live',
      'pcp-live', 'activity-live'
    )
    OR realtime.topic() LIKE 'entity-events-%'
    OR realtime.topic() LIKE 'comments:%'
    OR realtime.topic() LIKE 'presence:%'
  );

CREATE POLICY realtime_authenticated_write ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() = 'notifications:' || auth.uid()::text
    OR realtime.topic() IN (
      'references-live', 'capa-live', 'modules-live',
      'pcp-live', 'activity-live'
    )
    OR realtime.topic() LIKE 'entity-events-%'
    OR realtime.topic() LIKE 'comments:%'
    OR realtime.topic() LIKE 'presence:%'
  );

-- 4. SECURITY DEFINER exposure — revoke direct EXECUTE from authenticated/public
-- on definer functions that are used only by triggers or workflow enforcement.
-- has_role() is intentionally left executable because RLS policies invoke it.
REVOKE ALL ON FUNCTION public.can_transition_reference(reference_status, reference_status) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_reference_status_change() FROM PUBLIC, anon, authenticated;
