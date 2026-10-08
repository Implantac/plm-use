-- Configuração ÚNICA por ambiente: roda no SQL editor como service_role, NUNCA
-- commite os valores reais. Este arquivo tem apenas placeholders.
--
-- Depois de rodar, os crons agendados por 20261008203000_schedule_cloud_crons.sql
-- passam a achar segredo + URL. Enquanto não houver linha aqui, run_cloud_cron
-- grava 'config ausente' em app_cron_runs (não quebra silencioso).

-- Gere um segredo por job (devem ser os MESMOS valores no deploy do app):
--   openssl rand -hex 32

insert into public.app_cron_config (job, base_url, secret, header, path, enabled)
values
  (
    'launch-performance',
    'https://SEU-DOMINIO',                 -- ex.: https://usemoda.app (sem / no fim)
    'TROQUE_POR_OPENSSL_RAND_HEX_32',       -- = LAUNCH_CRON_SECRET do app
    'x-launch-signature',
    '/api/public/cron/launch-performance',
    true
  ),
  (
    'abc-classify',
    'https://SEU-DOMINIO',
    'TROQUE_POR_OUTRO_OPENSSL_RAND_HEX_32', -- = ABC_CRON_SECRET do app
    'x-abc-signature',
    '/api/public/cron/abc-classify',
    true
  )
on conflict (job) do update
  set base_url = excluded.base_url,
      secret   = excluded.secret,
      header   = excluded.header,
      path     = excluded.path,
      updated_at = now();

-- Para disparar um teste manual sem esperar o horário:
--   select public.run_cloud_cron('launch-performance');
--   select job, status, ok, detail, started_at
--     from public.app_cron_runs order by id desc limit 5;
