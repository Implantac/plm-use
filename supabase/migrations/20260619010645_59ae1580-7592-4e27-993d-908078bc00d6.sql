
ALTER TABLE public.pcp_lots REPLICA IDENTITY FULL;
ALTER TABLE public.pcp_occurrences REPLICA IDENTITY FULL;
ALTER TABLE public.influencers REPLICA IDENTITY FULL;
ALTER TABLE public.quality_capa REPLICA IDENTITY FULL;
ALTER TABLE public.tech_sheets REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.pcp_lots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pcp_occurrences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.influencers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quality_capa;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tech_sheets;
