-- Helper: verifica se o usuário está na lista de mentions (comparando full_name em profiles)
CREATE OR REPLACE FUNCTION public.is_user_mentioned(_uid uuid, _mentions text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _uid
      AND _mentions IS NOT NULL
      AND (
        lower(regexp_replace(coalesce(p.full_name, ''), '\s+', '.', 'g')) = ANY (
          SELECT lower(regexp_replace(m, '^@', '')) FROM unnest(_mentions) AS m
        )
        OR lower(coalesce(p.full_name, '')) = ANY (
          SELECT lower(regexp_replace(m, '^@', '')) FROM unnest(_mentions) AS m
        )
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_user_mentioned(uuid, text[]) FROM authenticated, anon, public;

DROP POLICY IF EXISTS comments_select_scoped ON public.comments;

CREATE POLICY comments_select_scoped ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = user_id
      OR (
        mentions IS NOT NULL
        AND array_length(mentions, 1) > 0
        AND public.is_user_mentioned(auth.uid(), mentions)
      )
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );