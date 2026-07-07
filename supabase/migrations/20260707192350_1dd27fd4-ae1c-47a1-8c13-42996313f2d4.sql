
-- Lock down trigger function from direct execution
REVOKE EXECUTE ON FUNCTION public.log_piloto_status_change() FROM PUBLIC, authenticated, anon;

-- Tighten realtime broadcast policies: require membership for shared/module topics and entity/comment wildcard topics
DROP POLICY IF EXISTS realtime_authenticated_read ON realtime.messages;
DROP POLICY IF EXISTS realtime_authenticated_write ON realtime.messages;

CREATE POLICY realtime_authenticated_read
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Per-user private notification topic
  realtime.topic() = ('notifications:' || (auth.uid())::text)
  -- Shared module broadcast topics: restrict to workspace members
  OR (
    realtime.topic() = ANY (ARRAY['references-live','capa-live','modules-live','pcp-live','activity-live'])
    AND public.is_member(auth.uid())
  )
  -- Entity event and comment thread wildcards: restrict to workspace members
  OR ((realtime.topic() LIKE 'entity-events-%' OR realtime.topic() LIKE 'comments:%')
      AND public.is_member(auth.uid()))
  -- Presence channels: any authenticated user
  OR realtime.topic() LIKE 'presence:%'
);

CREATE POLICY realtime_authenticated_write
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('notifications:' || (auth.uid())::text)
  OR (
    realtime.topic() = ANY (ARRAY['references-live','capa-live','modules-live','pcp-live','activity-live'])
    AND public.is_member(auth.uid())
  )
  OR ((realtime.topic() LIKE 'entity-events-%' OR realtime.topic() LIKE 'comments:%')
      AND public.is_member(auth.uid()))
  OR realtime.topic() LIKE 'presence:%'
);
