
-- ============================================================
-- ONDA 1: Almoxarifado - Schema base (Doc 06.2 + ABC + LEC)
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.abc_class AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stock_item_category AS ENUM ('tecido', 'aviamento', 'embalagem', 'acabado', 'insumo', 'etiqueta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.warehouse_type AS ENUM ('central', 'celula', 'expedicao', 'quarentena');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stock_movement_kind AS ENUM ('in', 'out', 'transfer_in', 'transfer_out', 'adjust', 'count');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.stock_reservation_status AS ENUM ('ativa', 'consumida', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Helper: escopo de leitura do módulo almoxarifado
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_any_stock_role(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('admin','manager','pcp','qualidade','coordenador_produto','almoxarifado')
  )
$$;

-- Helper: escopo de escrita (almoxarifado + admin)
CREATE OR REPLACE FUNCTION public.has_stock_write_role(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role::text IN ('admin','manager','almoxarifado')
  )
$$;

-- ============================================================
-- 1. stock_item
-- ============================================================
CREATE TABLE public.stock_item (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL UNIQUE,
  name               text NOT NULL,
  category           public.stock_item_category NOT NULL DEFAULT 'insumo',
  unit               text NOT NULL DEFAULT 'un',
  is_active          boolean NOT NULL DEFAULT true,

  -- Curva ABC
  abc_class          public.abc_class,
  annual_revenue     numeric(14,2) NOT NULL DEFAULT 0,
  annual_qty         numeric(14,4) NOT NULL DEFAULT 0,
  unit_price         numeric(14,4) NOT NULL DEFAULT 0,

  -- Parâmetros LEC / Ponto do Pedido
  lead_time_days     integer NOT NULL DEFAULT 0,
  demand_avg_daily   numeric(14,4) NOT NULL DEFAULT 0,
  demand_stddev      numeric(14,4) NOT NULL DEFAULT 0,
  service_factor     numeric(6,4)  NOT NULL DEFAULT 1.65, -- 95%
  order_cost         numeric(14,2) NOT NULL DEFAULT 0,    -- custo fixo por pedido
  holding_cost_unit  numeric(14,4) NOT NULL DEFAULT 0,    -- custo anual de manter 1 un

  -- Calculados (populados por trigger na Onda 2)
  safety_stock       numeric(14,4) NOT NULL DEFAULT 0,
  reorder_point      numeric(14,4) NOT NULL DEFAULT 0,
  eoq                numeric(14,4) NOT NULL DEFAULT 0,
  min_qty            numeric(14,4) NOT NULL DEFAULT 0,
  max_qty            numeric(14,4) NOT NULL DEFAULT 0,
  coverage_days_min  integer NOT NULL DEFAULT 0,

  supplier_default   text,
  notes              text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  updated_by         uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_stock_item_code       ON public.stock_item(code);
CREATE INDEX idx_stock_item_category   ON public.stock_item(category);
CREATE INDEX idx_stock_item_abc        ON public.stock_item(abc_class);
CREATE INDEX idx_stock_item_active     ON public.stock_item(is_active);

GRANT SELECT, INSERT, UPDATE ON public.stock_item TO authenticated;
GRANT ALL ON public.stock_item TO service_role;

ALTER TABLE public.stock_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_item_select_scoped
  ON public.stock_item FOR SELECT TO authenticated
  USING (public.has_any_stock_role(auth.uid()));

CREATE POLICY stock_item_insert_writers
  ON public.stock_item FOR INSERT TO authenticated
  WITH CHECK (public.has_stock_write_role(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY stock_item_update_writers
  ON public.stock_item FOR UPDATE TO authenticated
  USING (public.has_stock_write_role(auth.uid()))
  WITH CHECK (public.has_stock_write_role(auth.uid()));

CREATE TRIGGER trg_stock_item_updated_at
  BEFORE UPDATE ON public.stock_item
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. warehouse
-- ============================================================
CREATE TABLE public.warehouse (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  type        public.warehouse_type NOT NULL DEFAULT 'central',
  is_active   boolean NOT NULL DEFAULT true,
  location    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE ON public.warehouse TO authenticated;
GRANT ALL ON public.warehouse TO service_role;

ALTER TABLE public.warehouse ENABLE ROW LEVEL SECURITY;

CREATE POLICY warehouse_select_scoped
  ON public.warehouse FOR SELECT TO authenticated
  USING (public.has_any_stock_role(auth.uid()));

CREATE POLICY warehouse_insert_writers
  ON public.warehouse FOR INSERT TO authenticated
  WITH CHECK (public.has_stock_write_role(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY warehouse_update_writers
  ON public.warehouse FOR UPDATE TO authenticated
  USING (public.has_stock_write_role(auth.uid()))
  WITH CHECK (public.has_stock_write_role(auth.uid()));

CREATE TRIGGER trg_warehouse_updated_at
  BEFORE UPDATE ON public.warehouse
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. stock_movement
-- ============================================================
CREATE TABLE public.stock_movement (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES public.stock_item(id) ON DELETE RESTRICT,
  warehouse_id  uuid NOT NULL REFERENCES public.warehouse(id)  ON DELETE RESTRICT,
  kind          public.stock_movement_kind NOT NULL,
  qty           numeric(14,4) NOT NULL CHECK (qty > 0),

  -- Origem/rastreio
  ref_type      text,      -- 'recebimento' | 'pcp_lot' | 'piloto' | 'ajuste' | 'contagem' | 'transferencia'
  ref_id        uuid,
  lot_code      text,      -- lote físico
  justification text,      -- obrigatório para ajuste

  -- Transferência: par atômico
  transfer_pair_id uuid,

  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)
);

CREATE INDEX idx_stock_mov_item      ON public.stock_movement(item_id);
CREATE INDEX idx_stock_mov_warehouse ON public.stock_movement(warehouse_id);
CREATE INDEX idx_stock_mov_kind      ON public.stock_movement(kind);
CREATE INDEX idx_stock_mov_ref       ON public.stock_movement(ref_type, ref_id);
CREATE INDEX idx_stock_mov_created   ON public.stock_movement(created_at DESC);

GRANT SELECT, INSERT ON public.stock_movement TO authenticated;
GRANT ALL ON public.stock_movement TO service_role;

ALTER TABLE public.stock_movement ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_mov_select_scoped
  ON public.stock_movement FOR SELECT TO authenticated
  USING (public.has_any_stock_role(auth.uid()));

CREATE POLICY stock_mov_insert_writers
  ON public.stock_movement FOR INSERT TO authenticated
  WITH CHECK (
    public.has_stock_write_role(auth.uid())
    AND auth.uid() = created_by
    -- ajuste só admin
    AND (kind <> 'adjust' OR public.has_role(auth.uid(), 'admin'))
  );

-- ============================================================
-- 4. stock_reservation
-- ============================================================
CREATE TABLE public.stock_reservation (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      uuid NOT NULL REFERENCES public.stock_item(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouse(id)  ON DELETE RESTRICT,
  qty          numeric(14,4) NOT NULL CHECK (qty > 0),
  ref_type     text NOT NULL, -- 'pcp_lot' | 'piloto' | 'op'
  ref_id       uuid NOT NULL,
  status       public.stock_reservation_status NOT NULL DEFAULT 'ativa',
  notes        text,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  consumed_at  timestamptz,
  cancelled_at timestamptz
);

CREATE INDEX idx_stock_res_item    ON public.stock_reservation(item_id);
CREATE INDEX idx_stock_res_ref     ON public.stock_reservation(ref_type, ref_id);
CREATE INDEX idx_stock_res_status  ON public.stock_reservation(status);

GRANT SELECT, INSERT, UPDATE ON public.stock_reservation TO authenticated;
GRANT ALL ON public.stock_reservation TO service_role;

ALTER TABLE public.stock_reservation ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_res_select_scoped
  ON public.stock_reservation FOR SELECT TO authenticated
  USING (public.has_any_stock_role(auth.uid()));

CREATE POLICY stock_res_insert_writers
  ON public.stock_reservation FOR INSERT TO authenticated
  WITH CHECK (public.has_stock_write_role(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY stock_res_update_writers
  ON public.stock_reservation FOR UPDATE TO authenticated
  USING (public.has_stock_write_role(auth.uid()))
  WITH CHECK (public.has_stock_write_role(auth.uid()));

CREATE TRIGGER trg_stock_res_updated_at
  BEFORE UPDATE ON public.stock_reservation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. stock_balance (view)
-- Saldo = SUM(entradas) - SUM(saídas), reservado = SUM(reservas ativas)
-- ============================================================
CREATE OR REPLACE VIEW public.stock_balance AS
SELECT
  i.id  AS item_id,
  w.id  AS warehouse_id,
  i.code AS item_code,
  i.name AS item_name,
  w.code AS warehouse_code,
  COALESCE(SUM(CASE
    WHEN m.kind IN ('in','transfer_in','count') THEN m.qty
    WHEN m.kind IN ('out','transfer_out')       THEN -m.qty
    WHEN m.kind = 'adjust'                      THEN m.qty
    ELSE 0
  END), 0) AS qty_on_hand,
  COALESCE((
    SELECT SUM(r.qty) FROM public.stock_reservation r
    WHERE r.item_id = i.id AND r.warehouse_id = w.id AND r.status = 'ativa'
  ), 0) AS qty_reserved
FROM public.stock_item i
CROSS JOIN public.warehouse w
LEFT JOIN public.stock_movement m
  ON m.item_id = i.id AND m.warehouse_id = w.id
GROUP BY i.id, w.id, i.code, i.name, w.code;

GRANT SELECT ON public.stock_balance TO authenticated;
GRANT SELECT ON public.stock_balance TO service_role;
