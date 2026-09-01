CREATE TABLE public.reference_gate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.references(id) ON DELETE CASCADE,
  gate text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  parecer text,
  due_date date,
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reference_gate_status_chk CHECK (status IN ('pendente','aprovado','reprovado','dispensado')),
  CONSTRAINT reference_gate_unique UNIQUE (reference_id, gate)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reference_gate TO authenticated;
GRANT ALL ON public.reference_gate TO service_role;

ALTER TABLE public.reference_gate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gates_select_members" ON public.reference_gate
  FOR SELECT TO authenticated USING (public.is_member(auth.uid()));

CREATE POLICY "gates_insert_members" ON public.reference_gate
  FOR INSERT TO authenticated WITH CHECK (public.is_member(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "gates_update_members" ON public.reference_gate
  FOR UPDATE TO authenticated USING (public.is_member(auth.uid())) WITH CHECK (public.is_member(auth.uid()));

CREATE POLICY "gates_delete_admin" ON public.reference_gate
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_reference_gate_reference ON public.reference_gate(reference_id);
CREATE INDEX idx_reference_gate_status ON public.reference_gate(status);

CREATE TRIGGER trg_reference_gate_updated_at
BEFORE UPDATE ON public.reference_gate
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.trg_reference_gate_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pendente' THEN
    NEW.decided_at := COALESCE(NEW.decided_at, now());
    NEW.decided_by := COALESCE(NEW.decided_by, auth.uid());
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'pendente' AND OLD.status <> 'pendente' THEN
    NEW.decided_at := NULL;
    NEW.decided_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reference_gate_decision
BEFORE UPDATE ON public.reference_gate
FOR EACH ROW EXECUTE FUNCTION public.trg_reference_gate_decision();

CREATE OR REPLACE FUNCTION public.log_reference_gate_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, to_status, actor, note, payload)
    VALUES ('reference', NEW.reference_id, 'gate.created', NEW.status, NEW.created_by, NEW.parecer,
            jsonb_build_object('gate', NEW.gate, 'gate_id', NEW.id, 'due_date', NEW.due_date));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.entity_events(entity_type, entity_id, event_type, from_status, to_status, actor, note, payload)
    VALUES ('reference', NEW.reference_id,
            CASE NEW.status
              WHEN 'aprovado'  THEN 'gate.approved'
              WHEN 'reprovado' THEN 'gate.rejected'
              WHEN 'dispensado' THEN 'gate.waived'
              ELSE 'gate.reopened'
            END,
            OLD.status, NEW.status, COALESCE(NEW.decided_by, NEW.updated_by), NEW.parecer,
            jsonb_build_object('gate', NEW.gate, 'gate_id', NEW.id, 'decided_at', NEW.decided_at));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reference_gate_event
AFTER INSERT OR UPDATE ON public.reference_gate
FOR EACH ROW EXECUTE FUNCTION public.log_reference_gate_event();