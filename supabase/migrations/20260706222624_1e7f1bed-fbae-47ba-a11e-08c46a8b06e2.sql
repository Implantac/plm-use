
DROP POLICY IF EXISTS "capa_events_insert_authenticated" ON public.capa_events;
CREATE POLICY "capa_events_insert_own" ON public.capa_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor);
