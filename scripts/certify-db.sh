#!/usr/bin/env bash
# =============================================================================
# Certificacao do banco: aplica TODAS as migrations num Postgres limpo e roda a
# suite E2E do fluxo de pedido (supabase/tests/*.sql).
#
# Por que existe: em 21/10/2026 a revisao ponta a ponta achou um defeito que
# nenhum teste de TypeScript pegaria — a migration do pedido dependia de tabelas
# que so existiam na trilha Drizzle, entao `supabase db push` num projeto novo
# quebrava. Este script e o gate que impede a reincidencia.
#
# Uso:
#   scripts/certify-db.sh                 # usa DATABASE_URL do ambiente
#   DATABASE_URL=postgres://... scripts/certify-db.sh
#
# Requisitos: psql 15+ no PATH. Em CI o job `db-certification` sobe o Postgres.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/postgres}"
PSQL=(psql "$URL" -v ON_ERROR_STOP=1 -q --no-psqlrc)

echo "== limpar schema public (banco de teste descartavel)"
"${PSQL[@]}" <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;
DROP SCHEMA IF EXISTS realtime CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
SQL

echo "== stub do ambiente Supabase (auth/storage/realtime/roles)"
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"

echo "== migrations"
applied=0
skipped=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$f")"
  # pg_cron so existe no Supabase hospedado; o agendador nao tem o que testar aqui.
  case "$name" in
    *schedule_cloud_crons*)
      echo "   -- $name (pg_cron: so no Supabase hospedado)"
      skipped=$((skipped + 1))
      continue
      ;;
  esac
  if ! "${PSQL[@]}" -f "$f" >/tmp/migration.out 2>&1; then
    echo "   FALHOU: $name"
    sed -n '1,20p' /tmp/migration.out
    exit 1
  fi
  applied=$((applied + 1))
done
echo "   $applied migrations aplicadas, $skipped pulada(s)"

echo "== E2E do fluxo de pedido"
for f in "$ROOT"/supabase/tests/[0-9][0-9]_*.sql; do
  name="$(basename "$f")"
  case "$name" in 00_*) continue ;; esac
  if ! "${PSQL[@]}" -f "$f" >/tmp/e2e.out 2>&1; then
    echo "   FALHOU: $name"
    grep -E "FALHOU|ERROR" /tmp/e2e.out | sed 's/^psql:[^ ]* //' | head -20
    exit 1
  fi
  ok=$(grep -c "NOTICE:    ok" /tmp/e2e.out || true)
  echo "   $name: $ok assercoes"
done

echo
echo "CERTIFICACAO: banco limpo + fluxo operacional do pedido OK"
