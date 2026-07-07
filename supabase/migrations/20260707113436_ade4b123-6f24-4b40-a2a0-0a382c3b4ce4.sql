
-- 1) Table
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comment_attachments_comment_idx
  ON public.comment_attachments(comment_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.comment_attachments TO authenticated;
GRANT ALL ON public.comment_attachments TO service_role;

ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_attachments_select_member"
  ON public.comment_attachments FOR SELECT
  TO authenticated
  USING (public.is_member(auth.uid()));

CREATE POLICY "comment_attachments_insert_author"
  ON public.comment_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "comment_attachments_delete_owner_or_admin"
  ON public.comment_attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Storage read policy: any member can read comment attachments
-- (owner-only INSERT/UPDATE/DELETE policies stay in place)
CREATE POLICY "use_moda_assets_comments_read_member"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'use-moda-assets'
    AND (storage.foldername(name))[2] = 'comments'
    AND public.is_member(auth.uid())
  );

-- 3) Extend comment revisions with attachment snapshot
ALTER TABLE public.comment_revisions
  ADD COLUMN IF NOT EXISTS previous_attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4) Update revision trigger to snapshot attachments list at edit time
CREATE OR REPLACE FUNCTION public.log_comment_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  atts jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.message IS DISTINCT FROM OLD.message
                        OR NEW.mentions IS DISTINCT FROM OLD.mentions) THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'file_name', a.file_name,
      'storage_path', a.storage_path,
      'mime_type', a.mime_type,
      'size_bytes', a.size_bytes
    )), '[]'::jsonb)
    INTO atts
    FROM public.comment_attachments a
    WHERE a.comment_id = OLD.id;

    INSERT INTO public.comment_revisions(
      comment_id, previous_message, previous_mentions, previous_attachments, edited_by
    )
    VALUES (OLD.id, OLD.message, OLD.mentions, atts, auth.uid());
    NEW.edited := true;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_comment_revision() FROM PUBLIC, anon, authenticated;
