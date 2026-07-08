-- 1) Revoke EXECUTE from PUBLIC/authenticated on internal trigger/logging SECURITY DEFINER functions.
DO $$
DECLARE
  fname text;
  internal_funcs text[] := ARRAY[
    'enforce_launch_handoff_immutability',
    'enforce_launch_item_from_approved_decision',
    'enforce_showroom_decision_justificativa',
    'handle_new_user',
    'log_comment_revision',
    'log_launch_handoff_event',
    'log_launch_item_event',
    'log_launch_wave_event',
    'log_piloto_status_change',
    'log_reference_status_change',
    'log_showroom_decision_event',
    'log_showroom_feedback_event',
    'log_showroom_publication_event',
    'log_showroom_sample_event',
    'log_stock_item_event',
    'log_stock_reservation_event',
    'notify_comment_mentions',
    'trg_stock_movement_low_balance',
    'trg_stock_item_calc_params'
  ];
BEGIN
  FOREACH fname IN ARRAY internal_funcs LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I() FROM PUBLIC, authenticated, anon', fname);
  END LOOP;
END $$;

-- 2) Missing DELETE policies (admin-only). Stock movements remain immutable on UPDATE.
CREATE POLICY stock_item_delete_admin ON public.stock_item
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY stock_mov_delete_admin ON public.stock_movement
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY stock_res_delete_admin ON public.stock_reservation
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY warehouse_delete_admin ON public.warehouse
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3) Preserve created_by/created_at on launch* updates so an updater cannot reassign the original author.
CREATE OR REPLACE FUNCTION public.enforce_launch_created_immutability()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_launch_created_immutability() FROM PUBLIC, authenticated, anon;

DROP TRIGGER IF EXISTS trg_launch_wave_created_immut ON public.launch_wave;
CREATE TRIGGER trg_launch_wave_created_immut
  BEFORE UPDATE ON public.launch_wave
  FOR EACH ROW EXECUTE FUNCTION public.enforce_launch_created_immutability();

DROP TRIGGER IF EXISTS trg_launch_item_created_immut ON public.launch_item;
CREATE TRIGGER trg_launch_item_created_immut
  BEFORE UPDATE ON public.launch_item
  FOR EACH ROW EXECUTE FUNCTION public.enforce_launch_created_immutability();

DROP TRIGGER IF EXISTS trg_launch_item_grade_created_immut ON public.launch_item_grade;
CREATE TRIGGER trg_launch_item_grade_created_immut
  BEFORE UPDATE ON public.launch_item_grade
  FOR EACH ROW EXECUTE FUNCTION public.enforce_launch_created_immutability();

DROP TRIGGER IF EXISTS trg_launch_chan_created_immut ON public.launch_channel_target;
CREATE TRIGGER trg_launch_chan_created_immut
  BEFORE UPDATE ON public.launch_channel_target
  FOR EACH ROW EXECUTE FUNCTION public.enforce_launch_created_immutability();

DROP TRIGGER IF EXISTS trg_launch_handoff_created_immut ON public.launch_handoff;
CREATE TRIGGER trg_launch_handoff_created_immut
  BEFORE UPDATE ON public.launch_handoff
  FOR EACH ROW EXECUTE FUNCTION public.enforce_launch_created_immutability();