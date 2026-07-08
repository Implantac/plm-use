-- =========================
-- 1) suppliers
-- =========================
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  cnpj text,
  tipo text NOT NULL DEFAULT 'confeccao',
  contato_nome text,
  contato_email text,
  contato_telefone text,
  cidade text,
  uf text,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- =========================
-- 2) supplier_users
-- =========================
CREATE TABLE public.supplier_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_users TO authenticated;
GRANT ALL ON public.supplier_users TO service_role;
ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;

-- =========================
-- 3) supplier_orders
-- =========================
CREATE TABLE public.supplier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  codigo text NOT NULL UNIQUE,
  reference_id uuid REFERENCES public.references(id),
  descricao text,
  quantidade numeric NOT NULL DEFAULT 0,
  unidade text NOT NULL DEFAULT 'pc',
  prazo date,
  status text NOT NULL DEFAULT 'enviada',
  observacoes text,
  supplier_response text,
  supplier_responded_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplier_orders_supplier ON public.supplier_orders(supplier_id);
CREATE INDEX idx_supplier_orders_status ON public.supplier_orders(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_orders TO authenticated;
GRANT ALL ON public.supplier_orders TO service_role;
ALTER TABLE public.supplier_orders ENABLE ROW LEVEL SECURITY;

-- =========================
-- 4) supplier_sample_submissions
-- =========================
CREATE TABLE public.supplier_sample_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_order_id uuid NOT NULL REFERENCES public.supplier_orders(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  decision text NOT NULL DEFAULT 'pendente',
  decision_note text,
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplier_sample_order ON public.supplier_sample_submissions(supplier_order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_sample_submissions TO authenticated;
GRANT ALL ON public.supplier_sample_submissions TO service_role;
ALTER TABLE public.supplier_sample_submissions ENABLE ROW LEVEL SECURITY;

-- =========================
-- Helper functions
-- =========================
CREATE OR REPLACE FUNCTION public.user_belongs_to_supplier(_uid uuid, _supplier_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_users
    WHERE user_id = _uid AND supplier_id = _supplier_id AND is_active = true
  )
$$;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_supplier(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_supplier(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_supplier_mgmt_role(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('admin','manager','pcp','qualidade','coordenador_produto')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_supplier_mgmt_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_supplier_mgmt_role(uuid) TO authenticated, service_role;

-- =========================
-- Policies (após helpers)
-- =========================
CREATE POLICY "suppliers_select_scope" ON public.suppliers FOR SELECT
  USING (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), id));
CREATE POLICY "suppliers_insert_internal" ON public.suppliers FOR INSERT
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "suppliers_update_internal" ON public.suppliers FOR UPDATE
  USING (public.has_supplier_mgmt_role(auth.uid()))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()));
CREATE POLICY "suppliers_delete_admin" ON public.suppliers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "supplier_users_select_scope" ON public.supplier_users FOR SELECT
  USING (public.has_supplier_mgmt_role(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "supplier_users_write_internal" ON public.supplier_users FOR ALL
  USING (public.has_supplier_mgmt_role(auth.uid()))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()));

CREATE POLICY "supplier_orders_select_scope" ON public.supplier_orders FOR SELECT
  USING (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), supplier_id));
CREATE POLICY "supplier_orders_insert_internal" ON public.supplier_orders FOR INSERT
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()) AND auth.uid() = created_by);
CREATE POLICY "supplier_orders_update_scope" ON public.supplier_orders FOR UPDATE
  USING (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), supplier_id))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), supplier_id));
CREATE POLICY "supplier_orders_delete_admin" ON public.supplier_orders FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "supplier_samples_select_scope" ON public.supplier_sample_submissions FOR SELECT
  USING (public.has_supplier_mgmt_role(auth.uid()) OR public.user_belongs_to_supplier(auth.uid(), supplier_id));
CREATE POLICY "supplier_samples_insert_scope" ON public.supplier_sample_submissions FOR INSERT
  WITH CHECK (
    (public.user_belongs_to_supplier(auth.uid(), supplier_id) OR public.has_supplier_mgmt_role(auth.uid()))
    AND auth.uid() = created_by
  );
CREATE POLICY "supplier_samples_update_internal" ON public.supplier_sample_submissions FOR UPDATE
  USING (public.has_supplier_mgmt_role(auth.uid()))
  WITH CHECK (public.has_supplier_mgmt_role(auth.uid()));
CREATE POLICY "supplier_samples_delete_admin" ON public.supplier_sample_submissions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers updated_at
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_supplier_orders_updated_at BEFORE UPDATE ON public.supplier_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_supplier_samples_updated_at BEFORE UPDATE ON public.supplier_sample_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();