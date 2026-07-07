
DROP POLICY IF EXISTS references_update_owner_or_admin ON public."references";
CREATE POLICY references_update_owner_or_admin ON public."references"
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    (created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'manager'::app_role))
  );
