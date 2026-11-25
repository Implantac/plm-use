-- Onda 125 — Conectores de ERP (Bling v3). Guarda tokens OAuth do lado do servidor.
-- Só o service_role lê/grava: nenhum token chega ao navegador. O que o admin vê
-- (conta, última sincronização, resumo) sai por server function sem os segredos.
CREATE TABLE IF NOT EXISTS public.integration_connections (
  provider text PRIMARY KEY,                       -- 'bling'
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  account_label text,                              -- nome da empresa no ERP
  oauth_state text,                                -- anti-CSRF do fluxo em andamento
  oauth_state_expires_at timestamptz,
  connected_by uuid REFERENCES auth.users(id),
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_sync_summary jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_connections FROM anon, authenticated;
GRANT ALL ON public.integration_connections TO service_role;
