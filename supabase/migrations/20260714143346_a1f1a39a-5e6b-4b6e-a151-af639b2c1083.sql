
-- Fix 1: is_user_mentioned by stable user id, not full_name
CREATE OR REPLACE FUNCTION public.is_user_mentioned(_uid uuid, _mentions text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(COALESCE(_mentions, ARRAY[]::text[])) AS m
    WHERE regexp_replace(m, '^@', '') = _uid::text
  )
$function$;

-- Fix mention notification trigger to resolve by uuid mention tokens
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  mention text;
  target_user uuid;
  new_mentions text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_mentions := NEW.mentions;
  ELSE
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
    mention := regexp_replace(mention, '^@', '');

    BEGIN
      target_user := mention::uuid;
    EXCEPTION WHEN others THEN
      target_user := NULL;
    END;

    IF target_user IS NULL THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user) THEN
      CONTINUE;
    END IF;

    IF target_user <> NEW.user_id THEN
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
$function$;

-- Fix 2: role check on CAPA insert
DROP POLICY IF EXISTS "capa_insert_auth" ON public.quality_capa;
CREATE POLICY "capa_insert_auth" ON public.quality_capa
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.user_has_role_name(auth.uid(), 'qualidade')
      OR public.user_has_role_name(auth.uid(), 'pcp')
      OR public.user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );

-- Fix 2b: role check on pcp_occurrences insert
DROP POLICY IF EXISTS "Authenticated insert occurrences" ON public.pcp_occurrences;
CREATE POLICY "Authenticated insert occurrences" ON public.pcp_occurrences
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reported_by
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role)
      OR public.user_has_role_name(auth.uid(), 'pcp')
      OR public.user_has_role_name(auth.uid(), 'qualidade')
      OR public.user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );
