
-- 1) INSERT policies: require created_by = auth.uid() (no NULL bypass)
DROP POLICY IF EXISTS influencers_insert_auth ON public.influencers;
CREATE POLICY influencers_insert_auth ON public.influencers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS capa_insert_auth ON public.quality_capa;
CREATE POLICY capa_insert_auth ON public.quality_capa
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS techsheets_insert_auth ON public.tech_sheets;
CREATE POLICY techsheets_insert_auth ON public.tech_sheets
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 2) Scope SELECT policies to relevant roles/ownership

-- quality_capa
DROP POLICY IF EXISTS capa_select_member ON public.quality_capa;
CREATE POLICY capa_select_scoped ON public.quality_capa
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = created_by
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'qualidade')
      OR user_has_role_name(auth.uid(), 'pcp')
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );

-- influencers
DROP POLICY IF EXISTS influencers_select_member ON public.influencers;
CREATE POLICY influencers_select_scoped ON public.influencers
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = created_by
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'comercial')
      OR user_has_role_name(auth.uid(), 'merchandising')
      OR user_has_role_name(auth.uid(), 'marketing')
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
      OR user_has_role_name(auth.uid(), 'diretor_produto')
    )
  );

-- tech_sheets
DROP POLICY IF EXISTS techsheets_select_member ON public.tech_sheets;
CREATE POLICY techsheets_select_scoped ON public.tech_sheets
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = created_by
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'estilista')
      OR user_has_role_name(auth.uid(), 'modelagem')
      OR user_has_role_name(auth.uid(), 'pcp')
      OR user_has_role_name(auth.uid(), 'qualidade')
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );

-- pcp_lots
DROP POLICY IF EXISTS pcp_lots_select_member ON public.pcp_lots;
CREATE POLICY pcp_lots_select_scoped ON public.pcp_lots
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'pcp')
      OR user_has_role_name(auth.uid(), 'qualidade')
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
      OR user_has_role_name(auth.uid(), 'modelagem')
    )
  );

-- pcp_occurrences
DROP POLICY IF EXISTS pcp_occurrences_select_member ON public.pcp_occurrences;
CREATE POLICY pcp_occurrences_select_scoped ON public.pcp_occurrences
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = reported_by
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'pcp')
      OR user_has_role_name(auth.uid(), 'qualidade')
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );

-- references
DROP POLICY IF EXISTS references_select_member ON public.references;
CREATE POLICY references_select_scoped ON public.references
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = created_by
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'estilista')
      OR user_has_role_name(auth.uid(), 'modelagem')
      OR user_has_role_name(auth.uid(), 'pcp')
      OR user_has_role_name(auth.uid(), 'qualidade')
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
      OR user_has_role_name(auth.uid(), 'merchandising')
      OR user_has_role_name(auth.uid(), 'comercial')
      OR user_has_role_name(auth.uid(), 'showroom')
      OR user_has_role_name(auth.uid(), 'diretor_produto')
    )
  );

-- comments: own + admin/manager + coordenador_produto
DROP POLICY IF EXISTS comments_select_member ON public.comments;
CREATE POLICY comments_select_scoped ON public.comments
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = user_id
      OR (mentions IS NOT NULL AND array_length(mentions, 1) > 0)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );

-- activity_log: own + admin
DROP POLICY IF EXISTS activity_select_member ON public.activity_log;
CREATE POLICY activity_select_scoped ON public.activity_log
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = user_id
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- entity_events: actor + admin/manager/coordenador_produto
DROP POLICY IF EXISTS entity_events_select_member ON public.entity_events;
CREATE POLICY entity_events_select_scoped ON public.entity_events
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = actor
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
      OR user_has_role_name(auth.uid(), 'pcp')
      OR user_has_role_name(auth.uid(), 'qualidade')
    )
  );

-- entity_relations: creator + admin/manager
DROP POLICY IF EXISTS entity_relations_select_member ON public.entity_relations;
CREATE POLICY entity_relations_select_scoped ON public.entity_relations
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      auth.uid() = created_by
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );

-- reference_transitions: config table, admin/manager + relevant roles
DROP POLICY IF EXISTS reference_transitions_select_member ON public.reference_transitions;
CREATE POLICY reference_transitions_select_scoped ON public.reference_transitions
  FOR SELECT TO authenticated
  USING (
    is_member(auth.uid()) AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR user_has_role_name(auth.uid(), 'estilista')
      OR user_has_role_name(auth.uid(), 'modelagem')
      OR user_has_role_name(auth.uid(), 'pcp')
      OR user_has_role_name(auth.uid(), 'qualidade')
      OR user_has_role_name(auth.uid(), 'coordenador_produto')
    )
  );
