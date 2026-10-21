#!/bin/bash
# Reconstrói uma réplica fiel do banco de produção (estado SEM o fluxo de pedido).
# Uso: ./scripts/replica-producao.sh [nome_do_banco]
#
# Requisitos: um cluster PostgreSQL 18 escutando em :5433 e um Postgres local
# com permissão de superusuário. O caminho dos binários vem de $PG_BIN.
set -euo pipefail

DB=${1:-plm_replica}
PG_BIN=${PG_BIN:-$(dirname "$(command -v psql)")}
REPO=$(cd "$(dirname "$0")/.." && pwd)

"$PG_BIN/psql" -h localhost -p 5433 -U postgres -q \
  -c "DROP DATABASE IF EXISTS $DB;" -c "CREATE DATABASE $DB;" >/dev/null

"$PG_BIN/psql" -h localhost -p 5433 -U postgres -q -d "$DB" -v ON_ERROR_STOP=1 \
  -f "$REPO/supabase/tests/00_supabase_stub.sql" >/dev/null

n=0
for f in $(ls "$REPO"/supabase/migrations/*.sql | sort); do
  b=$(basename "$f")
  case "$b" in
    *persist_materials*|2026102108*|2026102109*|*schedule_cloud_crons*) continue ;;
  esac
  "$PG_BIN/psql" -h localhost -p 5433 -U postgres -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null
  n=$((n + 1))
done

for m in 0000 0001 0002 0003 0004 0005 0011; do
  f=$(ls "$REPO"/drizzle/migrations/${m}_*.sql | head -1)
  "$PG_BIN/psql" -h localhost -p 5433 -U postgres -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f" >/dev/null
done

tabelas=$("$PG_BIN/psql" -h localhost -p 5433 -U postgres -d "$DB" -tAc \
  "select count(*) from pg_tables where schemaname='public'")
echo "réplica $DB: $tabelas tabelas ($n migrations supabase + 7 drizzle)"
