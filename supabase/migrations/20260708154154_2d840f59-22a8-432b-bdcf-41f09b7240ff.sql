-- ============================================================
-- Portal do Fornecedor - fundação
-- ============================================================

-- 1) Novos roles no enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fornecedor_externo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pcp';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'qualidade';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'estilista';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'modelagem';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'almoxarifado';