-- USE MODA PLM — Onda 123 (pedidos pela API). Aplicar no SQL Editor. Idempotente.
-- Onda 123 — pedidos criados pela API (loja/ERP → PLM) com idempotência.
-- external_source + external_ref identificam o pedido no sistema de origem
-- (ex.: 'vtex' + '1234567-01'); reenviar o mesmo pedido não duplica.
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS external_source text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS external_ref text;
CREATE UNIQUE INDEX IF NOT EXISTS sales_orders_external_uniq
  ON public.sales_orders (external_source, external_ref)
  WHERE external_source IS NOT NULL AND external_ref IS NOT NULL;
NOTIFY pgrst, 'reload schema';

-- Conferência: deve devolver 2 linhas (external_ref, external_source)
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='sales_orders' AND column_name IN ('external_source','external_ref') ORDER BY 1;
