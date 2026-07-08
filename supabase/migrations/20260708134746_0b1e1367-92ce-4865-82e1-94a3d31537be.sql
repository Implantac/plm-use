
CREATE OR REPLACE FUNCTION public.classify_abc(_a_threshold numeric DEFAULT 0.80, _b_threshold numeric DEFAULT 0.95)
 RETURNS TABLE(item_id uuid, old_class abc_class, new_class abc_class, cumulative_pct numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_revenue numeric;
  rec RECORD;
  running numeric := 0;
  pct numeric;
  new_c public.abc_class;
BEGIN
  -- Access is controlled via EXECUTE grants (service_role only). The calling
  -- server function validates the user's role before invoking this RPC, so
  -- we skip the auth.uid() check that would fail under service_role context.

  SELECT COALESCE(SUM(annual_revenue), 0) INTO total_revenue
  FROM public.stock_item
  WHERE is_active = true AND annual_revenue > 0;

  IF total_revenue <= 0 THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT id, abc_class, annual_revenue
    FROM public.stock_item
    WHERE is_active = true AND annual_revenue > 0
    ORDER BY annual_revenue DESC
  LOOP
    running := running + rec.annual_revenue;
    pct := running / total_revenue;
    IF pct <= _a_threshold THEN
      new_c := 'A';
    ELSIF pct <= _b_threshold THEN
      new_c := 'B';
    ELSE
      new_c := 'C';
    END IF;

    IF new_c IS DISTINCT FROM rec.abc_class THEN
      UPDATE public.stock_item
         SET abc_class = new_c
       WHERE id = rec.id;
    END IF;

    item_id := rec.id;
    old_class := rec.abc_class;
    new_class := new_c;
    cumulative_pct := ROUND(pct * 100, 4);
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$function$;

-- CREATE OR REPLACE resets grants; re-apply the restriction.
REVOKE EXECUTE ON FUNCTION public.classify_abc(numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_abc(numeric, numeric) TO service_role;
