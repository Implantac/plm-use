
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'operator', 'viewer');
CREATE TYPE public.lot_status AS ENUM ('planejado', 'em_producao', 'pausado', 'concluido', 'cancelado');
CREATE TYPE public.lot_priority AS ENUM ('baixa', 'media', 'alta', 'critica');
CREATE TYPE public.occurrence_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE public.occurrence_status AS ENUM ('aberta', 'em_tratativa', 'resolvida');

-- =========================================================
-- updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- USER ROLES (separate table to avoid privilege escalation)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- POLICIES: profiles
-- =========================================================
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- POLICIES: user_roles
-- =========================================================
CREATE POLICY "Users view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admin manages roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- PCP LOTS
-- =========================================================
CREATE TABLE public.pcp_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  collection TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  current_stage TEXT,
  due_date DATE,
  status public.lot_status NOT NULL DEFAULT 'planejado',
  priority public.lot_priority NOT NULL DEFAULT 'media',
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcp_lots TO authenticated;
GRANT ALL ON public.pcp_lots TO service_role;

ALTER TABLE public.pcp_lots ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_pcp_lots_updated_at
BEFORE UPDATE ON public.pcp_lots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pcp_lots_status ON public.pcp_lots(status);
CREATE INDEX idx_pcp_lots_due_date ON public.pcp_lots(due_date);

CREATE POLICY "Authenticated read lots"
ON public.pcp_lots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Manager+ insert lots"
ON public.pcp_lots FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Manager+ update lots"
ON public.pcp_lots FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin delete lots"
ON public.pcp_lots FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- PCP OCCURRENCES
-- =========================================================
CREATE TABLE public.pcp_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID REFERENCES public.pcp_lots(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity public.occurrence_severity NOT NULL DEFAULT 'warning',
  description TEXT NOT NULL,
  sector TEXT,
  status public.occurrence_status NOT NULL DEFAULT 'aberta',
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcp_occurrences TO authenticated;
GRANT ALL ON public.pcp_occurrences TO service_role;

ALTER TABLE public.pcp_occurrences ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_pcp_occurrences_updated_at
BEFORE UPDATE ON public.pcp_occurrences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pcp_occurrences_lot ON public.pcp_occurrences(lot_id);
CREATE INDEX idx_pcp_occurrences_status ON public.pcp_occurrences(status);

CREATE POLICY "Authenticated read occurrences"
ON public.pcp_occurrences FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert occurrences"
ON public.pcp_occurrences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reported_by OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Manager+ update occurrences"
ON public.pcp_occurrences FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admin delete occurrences"
ON public.pcp_occurrences FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Auto-create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
