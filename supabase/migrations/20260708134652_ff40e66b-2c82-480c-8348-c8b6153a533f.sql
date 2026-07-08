
-- 1) Align WITH CHECK with USING for launch_* UPDATE policies
DROP POLICY IF EXISTS launch_wave_update_owner_or_lead ON public.launch_wave;
CREATE POLICY launch_wave_update_owner_or_lead ON public.launch_wave
FOR UPDATE TO authenticated
USING (
  (auth.uid() = created_by)
  OR user_has_role_name(auth.uid(), 'coordenador_produto')
  OR user_has_role_name(auth.uid(), 'diretor_produto')
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = updated_by
  AND (
    (auth.uid() = created_by)
    OR user_has_role_name(auth.uid(), 'coordenador_produto')
    OR user_has_role_name(auth.uid(), 'diretor_produto')
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS launch_item_update_owner_or_lead ON public.launch_item;
CREATE POLICY launch_item_update_owner_or_lead ON public.launch_item
FOR UPDATE TO authenticated
USING (
  (auth.uid() = created_by)
  OR user_has_role_name(auth.uid(), 'coordenador_produto')
  OR user_has_role_name(auth.uid(), 'diretor_produto')
  OR user_has_role_name(auth.uid(), 'pcp')
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = updated_by
  AND (
    (auth.uid() = created_by)
    OR user_has_role_name(auth.uid(), 'coordenador_produto')
    OR user_has_role_name(auth.uid(), 'diretor_produto')
    OR user_has_role_name(auth.uid(), 'pcp')
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS launch_grade_update_lead ON public.launch_item_grade;
CREATE POLICY launch_grade_update_lead ON public.launch_item_grade
FOR UPDATE TO authenticated
USING (
  (auth.uid() = created_by)
  OR user_has_role_name(auth.uid(), 'coordenador_produto')
  OR user_has_role_name(auth.uid(), 'pcp')
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = updated_by
  AND (
    (auth.uid() = created_by)
    OR user_has_role_name(auth.uid(), 'coordenador_produto')
    OR user_has_role_name(auth.uid(), 'pcp')
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS launch_chan_update_lead ON public.launch_channel_target;
CREATE POLICY launch_chan_update_lead ON public.launch_channel_target
FOR UPDATE TO authenticated
USING (
  (auth.uid() = created_by)
  OR user_has_role_name(auth.uid(), 'comercial')
  OR user_has_role_name(auth.uid(), 'coordenador_produto')
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = updated_by
  AND (
    (auth.uid() = created_by)
    OR user_has_role_name(auth.uid(), 'comercial')
    OR user_has_role_name(auth.uid(), 'coordenador_produto')
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

DROP POLICY IF EXISTS launch_handoff_update_lead ON public.launch_handoff;
CREATE POLICY launch_handoff_update_lead ON public.launch_handoff
FOR UPDATE TO authenticated
USING (
  user_has_role_name(auth.uid(), 'pcp')
  OR user_has_role_name(auth.uid(), 'comercial')
  OR user_has_role_name(auth.uid(), 'diretor_produto')
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = updated_by
  AND (
    user_has_role_name(auth.uid(), 'pcp')
    OR user_has_role_name(auth.uid(), 'comercial')
    OR user_has_role_name(auth.uid(), 'diretor_produto')
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 2) Explicit deny-UPDATE / deny-DELETE on append-only audit tables
--    Restrictive policies with no permissive counterpart => always denied.
CREATE POLICY entity_events_no_update ON public.entity_events
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY entity_events_no_delete ON public.entity_events
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

CREATE POLICY capa_events_no_update ON public.capa_events
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY capa_events_no_delete ON public.capa_events
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- 3) showroom_kit_item: split ALL policy into explicit per-command policies,
--    including admin-only DELETE, matching the sibling launch_* pattern.
DROP POLICY IF EXISTS "showroom_kit_item write times" ON public.showroom_kit_item;

CREATE POLICY showroom_kit_item_insert_role ON public.showroom_kit_item
FOR INSERT TO authenticated
WITH CHECK (
  user_has_role_name(auth.uid(), 'merchandising')
  OR user_has_role_name(auth.uid(), 'comercial')
  OR user_has_role_name(auth.uid(), 'showroom')
  OR user_has_role_name(auth.uid(), 'coordenador_produto')
  OR user_has_role_name(auth.uid(), 'diretor_produto')
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY showroom_kit_item_update_role ON public.showroom_kit_item
FOR UPDATE TO authenticated
USING (
  user_has_role_name(auth.uid(), 'merchandising')
  OR user_has_role_name(auth.uid(), 'comercial')
  OR user_has_role_name(auth.uid(), 'showroom')
  OR user_has_role_name(auth.uid(), 'coordenador_produto')
  OR user_has_role_name(auth.uid(), 'diretor_produto')
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  user_has_role_name(auth.uid(), 'merchandising')
  OR user_has_role_name(auth.uid(), 'comercial')
  OR user_has_role_name(auth.uid(), 'showroom')
  OR user_has_role_name(auth.uid(), 'coordenador_produto')
  OR user_has_role_name(auth.uid(), 'diretor_produto')
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY showroom_kit_item_delete_admin ON public.showroom_kit_item
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4) Restrict classify_abc SECURITY DEFINER RPC — signed-in users cannot call it.
--    Callers must go through the server function using the admin client.
REVOKE EXECUTE ON FUNCTION public.classify_abc(numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_abc(numeric, numeric) TO service_role;
