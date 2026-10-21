-- Pedido personalizado (fase 1) — valores de enum.
-- Arquivo separado de propósito: no Postgres, ALTER TYPE ... ADD VALUE não pode
-- ser USADO (cast) na mesma transação em que é criado. O repo já faz assim
-- (drizzle/migrations/0005_pcp_op_entity_types.sql). Rode este ANTES do 20261021090100.
-- Convenção do repo: comentário em .sql é APENAS -- (barra dupla quebra o SQL editor do Lovable).

-- Papel do vendedor já existe desde 20260708004356 ('comercial').
-- Falta o papel de quem detalha operações e fecha o custo:
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'engenharia_custo';

-- Entidades novas no barramento de eventos (entity_events.account_*).
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'production_order';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'sales_order';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'sales_order_item';
