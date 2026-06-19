
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  user_avatar text,
  message text NOT NULL,
  mentions text[] NOT NULL DEFAULT '{}',
  edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_auth" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_own_or_admin" ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX comments_entity_idx ON public.comments (entity_type, entity_id, created_at DESC);

CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
