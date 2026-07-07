
-- Tighten insert policy on comment_revisions
DROP POLICY IF EXISTS "comment_revisions_insert_system" ON public.comment_revisions;
CREATE POLICY "comment_revisions_insert_author"
  ON public.comment_revisions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_id
        AND c.user_id = auth.uid()
    )
  );

-- Revoke EXECUTE from authenticated on trigger functions (triggers still fire)
REVOKE EXECUTE ON FUNCTION public.log_comment_revision() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_comment_mentions() FROM authenticated;
