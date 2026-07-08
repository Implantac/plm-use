
CREATE OR REPLACE FUNCTION public.can_access_entity_topic(_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.entity_events e WHERE e.entity_id = _entity_id AND e.actor = auth.uid())
    OR EXISTS (SELECT 1 FROM public.comments c WHERE c.entity_id = _entity_id::text AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.entity_relations r WHERE (r.from_id = _entity_id OR r.to_id = _entity_id) AND r.created_by = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_entity_topic(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_access_module_topic(_topic text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _topic
    WHEN 'references-live' THEN public.has_any_showroom_role(auth.uid())
      OR public.user_has_role_name(auth.uid(),'estilista')
      OR public.user_has_role_name(auth.uid(),'modelagem')
      OR public.user_has_role_name(auth.uid(),'admin')
    WHEN 'capa-live' THEN public.user_has_role_name(auth.uid(),'qualidade')
      OR public.user_has_role_name(auth.uid(),'admin')
    WHEN 'pcp-live' THEN public.user_has_role_name(auth.uid(),'pcp')
      OR public.user_has_role_name(auth.uid(),'admin')
    WHEN 'modules-live' THEN public.user_has_role_name(auth.uid(),'admin')
      OR public.user_has_role_name(auth.uid(),'coordenador_produto')
    WHEN 'activity-live' THEN public.user_has_role_name(auth.uid(),'admin')
    ELSE false
  END
$$;
REVOKE EXECUTE ON FUNCTION public.can_access_module_topic(text) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS realtime_authenticated_read ON realtime.messages;
DROP POLICY IF EXISTS realtime_authenticated_write ON realtime.messages;

CREATE POLICY realtime_authenticated_read ON realtime.messages
FOR SELECT TO authenticated
USING (
  (realtime.topic() = ('notifications:' || auth.uid()::text))
  OR (realtime.topic() = ANY (ARRAY['references-live','capa-live','modules-live','pcp-live','activity-live'])
      AND public.can_access_module_topic(realtime.topic()))
  OR (realtime.topic() LIKE 'entity-events-%'
      AND public.can_access_entity_topic(NULLIF(substr(realtime.topic(),15),'')::uuid))
  OR (realtime.topic() LIKE 'comments:%'
      AND public.can_access_entity_topic(NULLIF(substr(realtime.topic(),10),'')::uuid))
  OR (realtime.topic() LIKE 'presence:%' AND public.is_member(auth.uid()))
);

CREATE POLICY realtime_authenticated_write ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  (realtime.topic() = ('notifications:' || auth.uid()::text))
  OR (realtime.topic() = ANY (ARRAY['references-live','capa-live','modules-live','pcp-live','activity-live'])
      AND public.can_access_module_topic(realtime.topic()))
  OR (realtime.topic() LIKE 'entity-events-%'
      AND public.can_access_entity_topic(NULLIF(substr(realtime.topic(),15),'')::uuid))
  OR (realtime.topic() LIKE 'comments:%'
      AND public.can_access_entity_topic(NULLIF(substr(realtime.topic(),10),'')::uuid))
  OR (realtime.topic() LIKE 'presence:%' AND public.is_member(auth.uid()))
);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_role_name(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_any_showroom_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_transition(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_transition_reference(reference_status, reference_status) FROM PUBLIC, anon, authenticated;
