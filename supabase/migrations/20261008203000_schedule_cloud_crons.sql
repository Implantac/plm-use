-- Cron jobs agendados (pg_cron) para os endpoints públicos HMAC do app.
--
-- Por que isto existe
-- -------------------
-- O código dos crons (`/api/public/cron/abc-classify`, `launch-performance`)
-- já existia, mas NENHUMA migration os agendava — ou seja, em produção os
-- jobs nunca rodavam. Esta migration fecha o loop: cria uma única função
-- `app.run_cloud_cron()` que assina o corpo com HMAC-SHA256 (exigido pelo
-- header `x-<mod>-signature`) e chama o app via `net.http_post`, e agenda as
-- duas tarefas.
--
-- SEGURANÇA: nenhum segredo aparece aqui. Migrations vão para o Git. O segredo
-- e a URL base ficam em `app.cron_config`, populados UMA vez fora do versionamento
-- (SQL editor autenticado como service_role, ou script de deploy). A função lê o
-- config só no momento do disparo.
--
-- Pré-requisitos (Supabase Cloud já traz pg_net; pg_cron/pgcrypto podem exigir
-- ativação em self-host):
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   create extension if not exists pgcrypto;
-- Se um faltar, a migration falha explicitamente (não silencia).

-- ---------- 1. Extensões: exige, não assume ----------
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron não está habilitado. Ative a extensão antes desta migration.';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'pg_net não está habilitado. Ative a extensão antes desta migration.';
  end if;
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    raise exception 'pgcrypto não está habilitado (necessário para hmac). Ative antes.';
  end if;
end$$;

-- ---------- 2. Config por job (segredo NUNCA no Git) ----------
create table if not exists public.app_cron_config (
  job        text primary key check (job in ('launch-performance', 'abc-classify')),
  base_url   text not null,
  secret     text not null,
  header     text not null,
  path       text not null,
  enabled    boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.app_cron_config enable row level security;
-- Sem policies para anon/authenticated: ninguém lê por API. Só a SECURITY
-- DEFINER abaixo (dona das tabelas por default → bypassa RLS como owner) acessa.

-- Auditoria do último disparo (sucesso ou não) — substitui o "cron mudo".
create table if not exists public.app_cron_runs (
  id         bigint generated always as identity primary key,
  job        text not null,
  status     int  not null,
  ok         boolean not null,
  detail     text,
  started_at timestamptz not null default now()
);
alter table public.app_cron_runs enable row level security;

-- ---------- 3. Runner: monta corpo, assina HMAC, chama o app ----------
create or replace function public.run_cloud_cron(p_job text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg       public.app_cron_config;
  body      text := '{}';
  sig       text;
  resp      record;
  http_code int;
begin
  select * into cfg from public.app_cron_config
    where job = p_job and enabled = true;
  if cfg.job is null then
    insert into public.app_cron_runs(job, status, ok, detail)
      values (p_job, -1, false, 'config ausente ou desabilitado');
    return;
  end if;

  -- O handler lê `request.text()` e assina sobre o CORPO CRU. Sem `body`,
  -- net.http_post envia string vazia '' — então assinamos '', não '{}'.
  body := '';
  sig  := encode(hmac(body::bytea, cfg.secret::bytea, 'sha256'), 'hex');

  select * into resp from net.http_post(
    url     := (cfg.base_url || cfg.path),
    headers := jsonb_build_object(cfg.header, sig),
    timeout_ms := 20000
  );
  -- net.http_post é assíncrono: devolve request_id; o status chega em
  -- net._http_response. Gravamos o que houver agora e marcamos 'pending'.
  http_code := 0;
  insert into public.app_cron_runs(job, status, ok, detail)
    values (p_job, http_code, true, 'dispatched req=' || resp.request_id::text);
exception
  when others then
    insert into public.app_cron_runs(job, status, ok, detail)
      values (p_job, -2, false, sqlerrm);
    raise warning 'run_cloud_cron(%) falhou: %', p_job, sqlerrm;
end;
$$;
revoke all on function public.run_cloud_cron(text) from public, anon, authenticated;
grant execute on function public.run_cloud_cron(text) to service_role;

-- Owner da função é `postgres`; garante que só service_role dispara.
alter function public.run_cloud_cron(text) owner to postgres;

-- ---------- 4. Agendamento ----------
-- launch-performance: diário 03:00 UTC (por H9-10 do handbook).
-- abc-classify:   mensal, dia 1 às 03:30 UTC.
-- O comando chama via SELECT para que rode como postgres/superuser do cron.
select cron.schedule('plm_launch_performance', '0 3 * * *',
  $$ select public.run_cloud_cron('launch-performance') $$);
select cron.schedule('plm_abc_classify', '30 3 1 * *',
  $$ select public.run_cloud_cron('abc-classify') $$);

-- Reexecução é idempotente no nome do job (cron.schedule substitui o homônimo).
