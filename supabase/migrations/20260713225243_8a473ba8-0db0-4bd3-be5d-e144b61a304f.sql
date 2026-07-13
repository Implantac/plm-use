
-- 1) capa_events: mirror quality_capa visibility
DROP POLICY IF EXISTS capa_events_select_member ON public.capa_events;

CREATE POLICY capa_events_select_scoped
ON public.capa_events
FOR SELECT
TO authenticated
USING (
  is_member(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.quality_capa q
    WHERE q.id = capa_events.capa_id
      AND (
        auth.uid() = q.created_by
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
        OR user_has_role_name(auth.uid(), 'qualidade')
        OR user_has_role_name(auth.uid(), 'pcp')
        OR user_has_role_name(auth.uid(), 'coordenador_produto')
      )
  )
);

-- 2) entity_events: narrow role visibility by entity_type buckets
DROP POLICY IF EXISTS entity_events_select_scoped ON public.entity_events;

CREATE POLICY entity_events_select_scoped
ON public.entity_events
FOR SELECT
TO authenticated
USING (
  is_member(auth.uid())
  AND (
    auth.uid() = actor
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR (
      user_has_role_name(auth.uid(), 'pcp')
      AND entity_type IN (
        'lote','piloto','launch_wave','launch_item','launch_handoff',
        'stock_item','stock_movement','stock_reservation','facao_order'
      )
    )
    OR (
      user_has_role_name(auth.uid(), 'qualidade')
      AND entity_type IN ('capa','piloto','showroom_sample','facao_order','lote')
    )
    OR (
      user_has_role_name(auth.uid(), 'coordenador_produto')
      AND entity_type IN (
        'reference','tech_sheet','engenharia',
        'showroom_sample','showroom_publication','showroom_decision','showroom_feedback',
        'launch_wave','launch_item','piloto'
      )
    )
  )
);
