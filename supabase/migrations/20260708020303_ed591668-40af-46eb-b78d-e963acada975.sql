
-- === S1/S2: Reforçar policies de realtime.messages com is_member() ===
DROP POLICY IF EXISTS realtime_authenticated_read ON realtime.messages;
DROP POLICY IF EXISTS realtime_authenticated_write ON realtime.messages;

CREATE POLICY realtime_authenticated_read ON realtime.messages
FOR SELECT TO authenticated
USING (
  public.is_member(auth.uid()) AND (
    realtime.topic() = ('notifications:' || (auth.uid())::text)
    OR (
      realtime.topic() = ANY (ARRAY['references-live','capa-live','modules-live','pcp-live','activity-live','launch-live'])
      AND public.can_access_module_topic(realtime.topic())
    )
    OR (
      realtime.topic() LIKE 'entity-events-%'
      AND public.can_access_entity_topic((NULLIF(substr(realtime.topic(), 15), ''))::uuid)
    )
    OR (
      realtime.topic() LIKE 'comments:%'
      AND public.can_access_entity_topic((NULLIF(substr(realtime.topic(), 10), ''))::uuid)
    )
    OR (
      realtime.topic() LIKE 'launch:%'
      AND public.can_access_entity_topic((NULLIF(substr(realtime.topic(), 8), ''))::uuid)
    )
    OR (
      realtime.topic() LIKE 'presence:%'
      AND public.is_member(auth.uid())
    )
  )
);

CREATE POLICY realtime_authenticated_write ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  public.is_member(auth.uid()) AND (
    realtime.topic() = ('notifications:' || (auth.uid())::text)
    OR (
      realtime.topic() = ANY (ARRAY['references-live','capa-live','modules-live','pcp-live','activity-live','launch-live'])
      AND public.can_access_module_topic(realtime.topic())
    )
    OR (
      realtime.topic() LIKE 'entity-events-%'
      AND public.can_access_entity_topic((NULLIF(substr(realtime.topic(), 15), ''))::uuid)
    )
    OR (
      realtime.topic() LIKE 'comments:%'
      AND public.can_access_entity_topic((NULLIF(substr(realtime.topic(), 10), ''))::uuid)
    )
    OR (
      realtime.topic() LIKE 'launch:%'
      AND public.can_access_entity_topic((NULLIF(substr(realtime.topic(), 8), ''))::uuid)
    )
    OR (
      realtime.topic() LIKE 'presence:%'
      AND public.is_member(auth.uid())
    )
  )
);

-- === S3: Revogar EXECUTE de SECURITY DEFINER que só devem rodar como trigger ===
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_comment_mentions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_comment_revision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_piloto_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_reference_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_showroom_decision_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_showroom_feedback_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_showroom_publication_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_showroom_sample_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_launch_wave_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_launch_item_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_launch_handoff_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_launch_handoff_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_launch_item_from_approved_decision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_showroom_decision_justificativa() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
