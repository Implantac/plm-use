-- O entity_events vive desde julho com enum próprio; os módulos criativos
-- (1–6) só espelhavam timeline em localStorage porque o enum não tinha os
-- valores. Com isto aplicado, o mirror (src/lib/local-events/mirror.ts) passa
-- a gravar a timeline no servidor — compartilhada entre dispositivos.
-- Padrão do repo: ALTER TYPE ... ADD VALUE IF NOT EXISTS (ver 20260708011739).

ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'color_palette';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'print_design';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'look';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'display_board';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'collection_map';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'measurement_chart';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'collection';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'analytics_kpi';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'quality_capa';
ALTER TYPE public.entity_type ADD VALUE IF NOT EXISTS 'influencer';
