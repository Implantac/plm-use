
-- 1. Revoke EXECUTE on SECURITY DEFINER role-check helpers from authenticated.
-- RLS policies referencing these functions continue to work because the
-- policy expressions are evaluated by Postgres using the definer's context
-- consistent with the rest of the SECURITY DEFINER helpers in this schema
-- (has_any_showroom_role, has_any_stock_role, etc.) which are not exposed
-- to the authenticated role directly.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_member(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_role_name(uuid, text) FROM authenticated, anon, PUBLIC;

-- 2. Tighten storage policy for comment attachments so members can only read
-- files whose owning comment they have access to (mirroring the table-level
-- comment_attachments_select_scoped policy).
DROP POLICY IF EXISTS "use_moda_assets_comments_read_member" ON storage.objects;

CREATE POLICY "use_moda_assets_comments_read_scoped"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'use-moda-assets'
  AND (storage.foldername(name))[2] = 'comments'
  AND EXISTS (
    SELECT 1
    FROM public.comment_attachments a
    JOIN public.comments c ON c.id = a.comment_id
    WHERE a.storage_path = storage.objects.name
      AND public.is_member(auth.uid())
      AND (
        auth.uid() = c.user_id
        OR (
          c.mentions IS NOT NULL
          AND array_length(c.mentions, 1) > 0
          AND public.is_user_mentioned(auth.uid(), c.mentions)
        )
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.user_has_role_name(auth.uid(), 'coordenador_produto')
      )
  )
);
