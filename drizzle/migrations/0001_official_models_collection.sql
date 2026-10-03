ALTER TABLE public.official_models ADD COLUMN IF NOT EXISTS colecao text;
ALTER TABLE public.official_models ADD COLUMN IF NOT EXISTS ativa boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS official_models_one_active_per_collection ON public.official_models (lower(colecao)) WHERE ativa AND colecao IS NOT NULL;