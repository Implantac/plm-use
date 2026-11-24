-- Onda 122 — Webhooks assinados (HMAC) com fila e reenvio.
-- A fila é alimentada por triggers no banco: qualquer caminho que grave pedido,
-- OP ou ficha técnica (tela, API, ERP) gera o evento. O despacho é feito pelo
-- servidor (cron assinado ou "Enviar agora" em Segurança).

CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL CHECK (url ~ '^https?://'),
  secret text NOT NULL,                      -- HMAC-SHA256; mostrado uma vez
  events text[] NOT NULL DEFAULT ARRAY['*']::text[],
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_delivery_at timestamptz,
  last_status int
);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','failed')),
  attempts int NOT NULL DEFAULT 0,
  response_status int,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
  ON public.webhook_deliveries(next_attempt_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_sub
  ON public.webhook_deliveries(subscription_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_subscriptions TO authenticated;
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_subscriptions, public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_subscriptions_admin_all ON public.webhook_subscriptions;
CREATE POLICY webhook_subscriptions_admin_all ON public.webhook_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));
DROP POLICY IF EXISTS webhook_deliveries_admin_select ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_admin_select ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));

-- Enfileira um evento para toda assinatura ativa que o escute ('*' = todos).
CREATE OR REPLACE FUNCTION public.webhook_enqueue(_event text, _payload jsonb)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  INSERT INTO public.webhook_deliveries (subscription_id, event, payload)
  SELECT s.id, _event, _payload
  FROM public.webhook_subscriptions s
  WHERE s.active AND ('*' = ANY(s.events) OR _event = ANY(s.events));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.webhook_enqueue(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.webhook_enqueue(text, jsonb) TO service_role, authenticated;

-- Triggers: pedidos, OPs e fichas técnicas.
CREATE OR REPLACE FUNCTION public.trg_webhook_sales_orders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.webhook_enqueue('sales_order.created',
      jsonb_build_object('id', NEW.id, 'number', NEW.number, 'status', NEW.status,
        'customer_id', NEW.customer_id, 'total_value', NEW.total_value, 'is_quote', NEW.is_quote));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.webhook_enqueue('sales_order.status_changed',
      jsonb_build_object('id', NEW.id, 'number', NEW.number, 'from', OLD.status, 'to', NEW.status,
        'total_value', NEW.total_value));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS webhook_sales_orders ON public.sales_orders;
CREATE TRIGGER webhook_sales_orders AFTER INSERT OR UPDATE OF status ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_webhook_sales_orders();

CREATE OR REPLACE FUNCTION public.trg_webhook_production_orders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.webhook_enqueue('production_order.created',
      jsonb_build_object('id', NEW.id, 'number', NEW.number, 'status', NEW.status, 'priority', NEW.priority,
        'planned_start', NEW.planned_start, 'planned_end', NEW.planned_end, 'erp_op_id', NEW.erp_op_id));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.webhook_enqueue('production_order.status_changed',
      jsonb_build_object('id', NEW.id, 'number', NEW.number, 'from', OLD.status, 'to', NEW.status,
        'erp_op_id', NEW.erp_op_id));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS webhook_production_orders ON public.production_orders;
CREATE TRIGGER webhook_production_orders AFTER INSERT OR UPDATE OF status ON public.production_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_webhook_production_orders();

CREATE OR REPLACE FUNCTION public.trg_webhook_tech_sheets()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.webhook_enqueue(
    CASE WHEN TG_OP = 'INSERT' THEN 'tech_sheet.created' ELSE 'tech_sheet.updated' END,
    jsonb_build_object('id', NEW.id, 'ref', NEW.ref, 'updated_at', NEW.updated_at));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS webhook_tech_sheets ON public.tech_sheets;
CREATE TRIGGER webhook_tech_sheets AFTER INSERT OR UPDATE ON public.tech_sheets
  FOR EACH ROW EXECUTE FUNCTION public.trg_webhook_tech_sheets();

NOTIFY pgrst, 'reload schema';
