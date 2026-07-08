REVOKE EXECUTE ON FUNCTION public.log_showroom_sample_event()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_showroom_publication_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_showroom_decision_event()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_showroom_feedback_event()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_showroom_decision_justificativa() FROM PUBLIC, anon, authenticated;