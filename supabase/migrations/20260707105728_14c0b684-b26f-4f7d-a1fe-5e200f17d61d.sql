
-- Helper: user is a provisioned member (has at least one role assigned)
CREATE OR REPLACE FUNCTION public.is_member(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid)
$$;

REVOKE ALL ON FUNCTION public.is_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO authenticated;

-- Replace broad USING(true) SELECT policies with membership-scoped versions.
DROP POLICY IF EXISTS "Authenticated read lots" ON public.pcp_lots;
CREATE POLICY pcp_lots_select_member ON public.pcp_lots
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read occurrences" ON public.pcp_occurrences;
CREATE POLICY pcp_occurrences_select_member ON public.pcp_occurrences
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS capa_select_auth ON public.quality_capa;
CREATE POLICY capa_select_member ON public.quality_capa
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS techsheets_select_auth ON public.tech_sheets;
CREATE POLICY techsheets_select_member ON public.tech_sheets
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS influencers_select_auth ON public.influencers;
CREATE POLICY influencers_select_member ON public.influencers
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS references_select_authenticated ON public."references";
CREATE POLICY references_select_member ON public."references"
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS activity_select_auth ON public.activity_log;
CREATE POLICY activity_select_member ON public.activity_log
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS comments_select_auth ON public.comments;
CREATE POLICY comments_select_member ON public.comments
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS capa_events_read_authenticated ON public.capa_events;
CREATE POLICY capa_events_select_member ON public.capa_events
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS entity_events_select ON public.entity_events;
CREATE POLICY entity_events_select_member ON public.entity_events
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS entity_relations_select ON public.entity_relations;
CREATE POLICY entity_relations_select_member ON public.entity_relations
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS reference_transitions_select ON public.reference_transitions;
CREATE POLICY reference_transitions_select_member ON public.reference_transitions
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));
