-- ============================================================================
-- Visibilidade da timeline do pedido para quem assume o pedido depois do vendedor
--
-- Defeito encontrado na certificacao E2E (2026-10-21): a policy
-- entity_events_select_scoped (20260117) deixa ver apenas o proprio ator,
-- admin/manager, e alguns pares papel x entity_type especificos (pcp ve lote,
-- qualidade ve capa, coordenador_produto ve reference...). 'sales_order' nao
-- estava em nenhuma lista, entao engenharia de custo e PCP abriam o pedido e
-- viam a timeline VAZIA — justamente os papeis que mais precisam do historico.
--
-- Solucao aditiva: policy permissiva nova (policies de SELECT sao OR entre si),
-- sem tocar na policy original. Quem enxerga: quem calcula custo e quem planeja
-- PCP; vendedor continua vendo os seus (como ator) e admin/manager veem tudo.
-- ============================================================================

DROP POLICY IF EXISTS entity_events_select_sales_order ON public.entity_events;
CREATE POLICY entity_events_select_sales_order ON public.entity_events
  FOR SELECT TO authenticated
  USING (
    entity_type IN ('sales_order', 'sales_order_item')
    AND public.is_member(auth.uid())
    AND (public.can_cost(auth.uid()) OR public.can_plan_pcp(auth.uid()))
  );

COMMENT ON POLICY entity_events_select_sales_order ON public.entity_events IS
  'Timeline do pedido visivel para engenharia de custo e PCP (quem assume o pedido apos o vendedor).';
