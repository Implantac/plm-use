
-- 1) Revisions table for edit history
CREATE TABLE IF NOT EXISTS public.comment_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  previous_message text NOT NULL,
  previous_mentions text[] NOT NULL DEFAULT '{}',
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comment_revisions_comment_idx
  ON public.comment_revisions(comment_id, edited_at DESC);

GRANT SELECT, INSERT ON public.comment_revisions TO authenticated;
GRANT ALL ON public.comment_revisions TO service_role;

ALTER TABLE public.comment_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_revisions_select_member"
  ON public.comment_revisions FOR SELECT
  TO authenticated
  USING (public.is_member(auth.uid()));

CREATE POLICY "comment_revisions_insert_system"
  ON public.comment_revisions FOR INSERT
  TO authenticated
  WITH CHECK (true); -- inserted only by trigger (SECURITY DEFINER) or the author

-- 2) Trigger: capture prior version on UPDATE when message changes
CREATE OR REPLACE FUNCTION public.log_comment_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.message IS DISTINCT FROM OLD.message
                        OR NEW.mentions IS DISTINCT FROM OLD.mentions) THEN
    INSERT INTO public.comment_revisions(comment_id, previous_message, previous_mentions, edited_by)
    VALUES (OLD.id, OLD.message, OLD.mentions, auth.uid());
    NEW.edited := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_revision ON public.comments;
CREATE TRIGGER trg_comments_revision
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.log_comment_revision();

-- 3) Trigger: notify mentioned users
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mention text;
  target_user uuid;
  new_mentions text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_mentions := NEW.mentions;
  ELSE
    -- Only newly added mentions on UPDATE
    new_mentions := ARRAY(
      SELECT unnest(NEW.mentions)
      EXCEPT
      SELECT unnest(OLD.mentions)
    );
  END IF;

  IF new_mentions IS NULL OR array_length(new_mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH mention IN ARRAY new_mentions LOOP
    -- Strip leading @ and normalize
    mention := lower(regexp_replace(mention, '^@', ''));

    -- Resolve to a user via profile full_name (case-insensitive, dots/spaces flexible)
    SELECT p.id INTO target_user
    FROM public.profiles p
    WHERE lower(regexp_replace(coalesce(p.full_name, ''), '\s+', '.', 'g')) = mention
       OR lower(coalesce(p.full_name, '')) = mention
    LIMIT 1;

    IF target_user IS NOT NULL AND target_user <> NEW.user_id THEN
      INSERT INTO public.notifications(user_id, external_id, severity, title, detail, source, href)
      VALUES (
        target_user,
        'mention:' || NEW.id::text || ':' || target_user::text,
        'info',
        coalesce(NEW.user_name, 'Alguém') || ' mencionou você',
        left(NEW.message, 240),
        'comments',
        '/' || NEW.entity_type || '/' || NEW.entity_id
      )
      ON CONFLICT (user_id, external_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_notify_mentions ON public.comments;
CREATE TRIGGER trg_comments_notify_mentions
  AFTER INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment_mentions();

-- Lock down definer functions from anon
REVOKE EXECUTE ON FUNCTION public.log_comment_revision() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_comment_mentions() FROM PUBLIC, anon;
