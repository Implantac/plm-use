-- Onda 121 — API pública v1 (leitura) autenticada por chave.
-- A chave é mostrada UMA vez na criação; aqui fica só o hash SHA-256 e o prefixo
-- (para o usuário reconhecer qual é qual). Revogar = preencher revoked_at.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_prefix text NOT NULL,              -- ex.: plm_live_a1b2c3
  key_hash text NOT NULL UNIQUE,         -- sha256 hex da chave completa
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(revoked_at) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Só admin/manager veem e gerenciam chaves. O hash nunca é útil sozinho.
DROP POLICY IF EXISTS api_keys_admin_all ON public.api_keys;
CREATE POLICY api_keys_admin_all ON public.api_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role));
