DROP POLICY IF EXISTS workflow_defs_read_authenticated ON public.workflow_definitions;
CREATE POLICY workflow_defs_read_members ON public.workflow_definitions
  FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));