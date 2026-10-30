-- =============================================================================
-- PLM FLUIDO 2.0 + FUNDACAO MULTI-TENANT + CAD MARKERS + OUTBOX USECLOUD ERP
-- Script 100% idempotente e retrocompativel com o banco em producao (Karilu).
-- Convencao obrigatoria: zero barra-dupla em comentarios.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Fundacao Multi-Tenant nao-destrutiva (preserva operacao single-tenant atual)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tax_id text,
  tax_regime text NOT NULL DEFAULT 'SIMPLES_CONFECCAO'
    CHECK (tax_regime IN ('SIMPLES_CONFECCAO','LUCRO_PRESUMIDO','LUCRO_REAL','PRIVATE_LABEL_ATACADO','PERSONALIZADO')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tenants (id, slug, name, tax_regime)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'default',
  'Operacao Principal',
  'SIMPLES_CONFECCAO'
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS tenant_memberships_user_idx
  ON public.tenant_memberships (user_id, is_default DESC);

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims text;
  v_jwt_tenant text;
  v_tenant uuid;
BEGIN
  v_claims := nullif(current_setting('request.jwt.claims', true), '');
  IF v_claims IS NOT NULL THEN
    BEGIN
      v_jwt_tenant := nullif(v_claims::jsonb ->> 'tenant_id', '');
      IF v_jwt_tenant IS NOT NULL THEN
        RETURN v_jwt_tenant::uuid;
      END IF;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT tm.tenant_id INTO v_tenant
      FROM public.tenant_memberships tm
     WHERE tm.user_id = auth.uid()
     ORDER BY tm.is_default DESC, tm.created_at ASC
     LIMIT 1;
    IF v_tenant IS NOT NULL THEN
      RETURN v_tenant;
    END IF;
  END IF;

  RETURN '00000000-0000-0000-0000-000000000001'::uuid;
END $$;

REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_read_member ON public.tenants;
CREATE POLICY tenants_read_member ON public.tenants
  FOR SELECT TO authenticated
  USING (
    id = public.current_tenant_id()
    OR EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
       WHERE tm.tenant_id = tenants.id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tenant_memberships_read_own ON public.tenant_memberships;
CREATE POLICY tenant_memberships_read_own ON public.tenant_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Adiciona tenant_id com default seguro nas tabelas centrais existentes (se existirem)
DO $$
DECLARE
  v_tbl text;
BEGIN
  FOREACH v_tbl IN ARRAY ARRAY[
    'references',
    'tech_sheets',
    'catalog_products',
    'customers',
    'sales_orders',
    'materials',
    'production_orders'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = v_tbl
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id)',
        v_tbl
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)',
        v_tbl || '_tenant_idx',
        v_tbl
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Repositorio persistente de Moldes e Encaixe CAD (sincronizado com /cad)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cad_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id),
  external_key text NOT NULL UNIQUE,
  ref_code text NOT NULL,
  file_name text NOT NULL,
  format text NOT NULL DEFAULT 'ADS'
    CHECK (format IN ('ADS','DXF','PLT','AI','CLO3D','PDF','SVG')),
  sistema_cad text NOT NULL DEFAULT 'Audaces',
  version text NOT NULL DEFAULT 'v1.0',
  eficiencia_pct numeric(5,2) NOT NULL DEFAULT 85.00 CHECK (eficiencia_pct >= 0 AND eficiencia_pct <= 100),
  largura_enfesto_m numeric(6,3) NOT NULL DEFAULT 1.800 CHECK (largura_enfesto_m >= 0),
  comprimento_risco_m numeric(8,3) NOT NULL DEFAULT 0 CHECK (comprimento_risco_m >= 0),
  encolhimento_urdume_pct numeric(5,2) NOT NULL DEFAULT 0,
  encolhimento_trama_pct numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Revisão'
    CHECK (status IN ('Rascunho','Revisão','Aprovado','Produção')),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cad_markers_tenant_ref_idx
  ON public.cad_markers (tenant_id, upper(ref_code));

ALTER TABLE public.cad_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cad_markers_tenant_select ON public.cad_markers;
CREATE POLICY cad_markers_tenant_select ON public.cad_markers
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS cad_markers_tenant_write ON public.cad_markers;
CREATE POLICY cad_markers_tenant_write ON public.cad_markers
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP TRIGGER IF EXISTS trg_upd_cad_markers ON public.cad_markers;
CREATE TRIGGER trg_upd_cad_markers
  BEFORE UPDATE ON public.cad_markers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3) Outbox idempotente de integracao bidirecional com UseCloud ERP
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.erp_sync_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id),
  idempotency_key text NOT NULL UNIQUE,
  event_kind text NOT NULL
    CHECK (event_kind IN ('SKU_EXPLOSION','BOM_STRUCTURE','PRODUCTION_ORDER_STOCK','PRODUCTION_ORDER_SALES')),
  reference_code text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','synced','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  synced_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS erp_sync_outbox_pending_idx
  ON public.erp_sync_outbox (tenant_id, status, created_at ASC);

ALTER TABLE public.erp_sync_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS erp_sync_outbox_tenant_select ON public.erp_sync_outbox;
CREATE POLICY erp_sync_outbox_tenant_select ON public.erp_sync_outbox
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS erp_sync_outbox_tenant_insert ON public.erp_sync_outbox;
CREATE POLICY erp_sync_outbox_tenant_insert ON public.erp_sync_outbox
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP TRIGGER IF EXISTS trg_upd_erp_sync_outbox ON public.erp_sync_outbox;
CREATE TRIGGER trg_upd_erp_sync_outbox
  BEFORE UPDATE ON public.erp_sync_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grants explicitos para o papel authenticated (as policies RLS acima decidem o acesso por tenant)
GRANT SELECT ON public.tenants, public.tenant_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cad_markers, public.erp_sync_outbox TO authenticated;
