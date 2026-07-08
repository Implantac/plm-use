DROP POLICY IF EXISTS "Pilotos visíveis para autenticados" ON public.pilotos;

CREATE POLICY "pilotos_select_members_scoped"
  ON public.pilotos FOR SELECT
  TO authenticated
  USING (
    public.is_member(auth.uid())
    AND (
      auth.uid() = created_by
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'manager')
      OR public.user_has_role_name(auth.uid(), 'pcp')
      OR public.user_has_role_name(auth.uid(), 'modelagem')
      OR public.user_has_role_name(auth.uid(), 'qualidade')
      OR public.user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );