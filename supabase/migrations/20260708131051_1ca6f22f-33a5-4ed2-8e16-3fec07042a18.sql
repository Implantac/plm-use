
-- 1) Recriar view como SECURITY INVOKER
DROP VIEW IF EXISTS public.stock_balance;
CREATE VIEW public.stock_balance
  WITH (security_invoker = true) AS
SELECT
  i.id  AS item_id,
  w.id  AS warehouse_id,
  i.code AS item_code,
  i.name AS item_name,
  w.code AS warehouse_code,
  COALESCE(SUM(CASE
    WHEN m.kind IN ('in','transfer_in','count') THEN m.qty
    WHEN m.kind IN ('out','transfer_out')       THEN -m.qty
    WHEN m.kind = 'adjust'                      THEN m.qty
    ELSE 0
  END), 0) AS qty_on_hand,
  COALESCE((
    SELECT SUM(r.qty) FROM public.stock_reservation r
    WHERE r.item_id = i.id AND r.warehouse_id = w.id AND r.status = 'ativa'
  ), 0) AS qty_reserved
FROM public.stock_item i
CROSS JOIN public.warehouse w
LEFT JOIN public.stock_movement m
  ON m.item_id = i.id AND m.warehouse_id = w.id
GROUP BY i.id, w.id, i.code, i.name, w.code;

GRANT SELECT ON public.stock_balance TO authenticated;
GRANT SELECT ON public.stock_balance TO service_role;

-- 2) Revogar execute de anon nas SECURITY DEFINER helpers do módulo estoque
REVOKE ALL ON FUNCTION public.has_any_stock_role(uuid)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_stock_write_role(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_any_stock_role(uuid)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_stock_write_role(uuid) TO authenticated, service_role;
