
-- Scope comment_attachments SELECT to users who can see the parent comment
DROP POLICY IF EXISTS comment_attachments_select_member ON public.comment_attachments;
CREATE POLICY comment_attachments_select_scoped ON public.comment_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = comment_attachments.comment_id
      AND is_member(auth.uid())
      AND (
        auth.uid() = c.user_id
        OR (c.mentions IS NOT NULL AND array_length(c.mentions,1) > 0 AND is_user_mentioned(auth.uid(), c.mentions))
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
        OR user_has_role_name(auth.uid(), 'coordenador_produto')
      )
  )
);

-- Scope comment_revisions SELECT the same way
DROP POLICY IF EXISTS comment_revisions_select_member ON public.comment_revisions;
CREATE POLICY comment_revisions_select_scoped ON public.comment_revisions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.id = comment_revisions.comment_id
      AND is_member(auth.uid())
      AND (
        auth.uid() = c.user_id
        OR (c.mentions IS NOT NULL AND array_length(c.mentions,1) > 0 AND is_user_mentioned(auth.uid(), c.mentions))
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
        OR user_has_role_name(auth.uid(), 'coordenador_produto')
      )
  )
);

-- Revoke direct EXECUTE from authenticated on SECURITY DEFINER helpers.
-- These are called from RLS policies (which do not require caller EXECUTE)
-- so revoking here removes the callable RPC surface without breaking access checks.
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_supplier(uuid, uuid) FROM authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_supplier_mgmt_role(uuid) FROM authenticated, PUBLIC;
