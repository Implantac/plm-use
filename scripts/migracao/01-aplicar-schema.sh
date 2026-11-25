#!/usr/bin/env bash
# Onda 126 — reproduz o schema do PLM num Postgres do Supabase NOVO (ou qualquer Postgres).
# Provado em Postgres 17 limpo: 76/77 migrations passam; a 77ª (crons) exige pg_cron + pg_net,
# que no Supabase se habilitam em Database → Extensions ANTES de rodar este script.
#
# Uso:  DATABASE_URL='postgresql://postgres.<ref>:<senha>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres' \
#       bash scripts/migracao/01-aplicar-schema.sh
# (use a connection string "Session mode"/porta 5432 do painel Connect; precisa do psql instalado)
set -u
: "${DATABASE_URL:?Defina DATABASE_URL (Supabase → Connect → Session pooler, porta 5432)}"
cd "$(dirname "$0")/../.."
command -v psql >/dev/null || { echo "psql não encontrado (instale o cliente PostgreSQL)."; exit 1; }

echo "== Pré-checagem de extensões =="
psql "$DATABASE_URL" -Atc "select string_agg(extname, ', ') from pg_extension where extname in ('pgcrypto','pg_cron','pg_net','uuid-ossp')"
faltam=$(psql "$DATABASE_URL" -Atc "select string_agg(e, ', ') from unnest(array['pgcrypto','pg_cron','pg_net']) e where e not in (select extname from pg_extension)")
if [ -n "$faltam" ]; then
  echo "AVISO: extensões ausentes: $faltam. Habilite em Database → Extensions e rode de novo (ou aceite que a migration de crons fique pendente)."
fi

ok=0; fail=0; : > /tmp/plm-migracao-falhas.txt
rodar() {
  if out=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -q -f "$1" 2>&1); then
    ok=$((ok+1)); printf '  ok   %s\n' "$(basename "$1")"
  else
    fail=$((fail+1)); printf '  FALHA %s — %s\n' "$(basename "$1")" "$(echo "$out" | grep -m1 -i error | head -c 200)"
    echo "$1" >> /tmp/plm-migracao-falhas.txt
  fi
}
echo "== supabase/migrations (ordem cronológica) =="
for f in supabase/migrations/*.sql; do rodar "$f"; done
echo "== complemento drizzle (só o que não existe nas canônicas) =="
for f in drizzle/migrations/0000_official_models.sql drizzle/migrations/0001_official_models_collection.sql; do rodar "$f"; done

echo
echo "Resultado: $ok aplicadas, $fail com falha."
echo "Tabelas em public: $(psql "$DATABASE_URL" -Atc "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")"
[ "$fail" -eq 0 ] || { echo "Arquivos com falha em /tmp/plm-migracao-falhas.txt (se for só a de crons, habilite pg_cron/pg_net e rode: psql \"\$DATABASE_URL\" -f supabase/migrations/20261008203000_schedule_cloud_crons.sql)"; }
echo
echo "Buckets de storage (criar no painel se faltarem, privados): use-moda-assets, official-models"
