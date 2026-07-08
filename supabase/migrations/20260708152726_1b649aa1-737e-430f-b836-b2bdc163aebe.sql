REVOKE EXECUTE ON FUNCTION public.has_any_stock_role(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.has_stock_write_role(uuid) FROM authenticated, anon, public;