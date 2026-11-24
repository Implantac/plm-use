-- USE MODA PLM — aplicar no SQL Editor do projeto njmniwsqwohmigroswnl (idempotente: pode rodar 2x sem erro)
-- 1/2: Onda 119 — rfq_quotes
-- Onda 119 — Cotação (RFQ) de verdade.
-- Antes: a aba "RFQ & Cotação BOM" mostrava três fornecedores inventados com preços
-- inventados, tudo em memória (sumia ao recarregar) e "Adjudicar" gravava preço fictício
-- na BOM real. Agora cada proposta é uma linha persistida, ligada a um fornecedor
-- cadastrado; o fornecedor pode responder pelo portal; adjudicar gera a ordem de compra.

CREATE TABLE IF NOT EXISTS public.rfq_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL,          -- código da ficha técnica (store local, não FK)
  bom_item_id text NOT NULL,             -- id do item da BOM dentro da ficha
  material text NOT NULL,
  unidade text NOT NULL DEFAULT 'un',
  quantidade numeric NOT NULL DEFAULT 0, -- necessidade do lote no momento do convite
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  preco_unitario numeric CHECK (preco_unitario IS NULL OR preco_unitario >= 0),
  moq numeric NOT NULL DEFAULT 1 CHECK (moq > 0),
  lead_time_dias integer NOT NULL DEFAULT 1 CHECK (lead_time_dias > 0),
  otif_pct numeric NOT NULL DEFAULT 0 CHECK (otif_pct BETWEEN 0 AND 100),
  condicao_pagamento text,
  observacoes text,
  origem text NOT NULL DEFAULT 'comprador' CHECK (origem IN ('comprador', 'fornecedor')),
  -- convidada: aguardando o fornecedor preencher; respondida: tem preço; adjudicada/perdida: decidida
  status text NOT NULL DEFAULT 'convidada' CHECK (status IN ('convidada', 'respondida', 'adjudicada', 'perdida')),
  supplier_order_id uuid REFERENCES public.supplier_orders(id) ON DELETE SET NULL,
  respondido_em timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reference_code, bom_item_id, supplier_id)
);
CREATE INDEX IF NOT EXISTS idx_rfq_quotes_item ON public.rfq_quotes(reference_code, bom_item_id);
CREATE INDEX IF NOT EXISTS idx_rfq_quotes_supplier_status ON public.rfq_quotes(supplier_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfq_quotes TO authenticated;
GRANT ALL ON public.rfq_quotes TO service_role;
ALTER TABLE public.rfq_quotes ENABLE ROW LEVEL SECURITY;

-- Interno (compras/PCP/gestão): tudo.
DROP POLICY IF EXISTS rfq_quotes_internal_all ON public.rfq_quotes;
CREATE POLICY rfq_quotes_internal_all ON public.rfq_quotes
  FOR ALL TO authenticated
  USING (public.has_supplier_mgmt_role(auth.uid()))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()));

-- Fornecedor: vê e responde só as cotações do próprio fornecedor; não cria nem apaga.
DROP POLICY IF EXISTS rfq_quotes_supplier_select ON public.rfq_quotes;
CREATE POLICY rfq_quotes_supplier_select ON public.rfq_quotes
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id));

DROP POLICY IF EXISTS rfq_quotes_supplier_update ON public.rfq_quotes;
CREATE POLICY rfq_quotes_supplier_update ON public.rfq_quotes
  FOR UPDATE TO authenticated
  USING (public.user_belongs_to_supplier(auth.uid(), supplier_id) AND status IN ('convidada', 'respondida'))
  WITH CHECK (public.user_belongs_to_supplier(auth.uid(), supplier_id) AND status = 'respondida');

-- updated_at automático (reusa o trigger padrão do projeto se existir).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_rfq_quotes_updated_at ON public.rfq_quotes';
    EXECUTE 'CREATE TRIGGER trg_rfq_quotes_updated_at BEFORE UPDATE ON public.rfq_quotes
             FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END $$;

-- 2/2: Onda 121 — api_keys
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

-- Conferência: deve devolver 2 linhas (api_keys, rfq_quotes)
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('rfq_quotes','api_keys') ORDER BY 1;
NOTIFY pgrst, 'reload schema';
