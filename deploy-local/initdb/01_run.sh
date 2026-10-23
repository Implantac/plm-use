#!/bin/bash
# Driver do initdb: reproduz a história do banco Lovable em ambiente limpo.
#  - supabase/migrations: a canônica (67 arquivos datados) — erro aborta.
#  - drizzle/migrations: 0000-0014 do journal do bot; muitas sobrepõem as
#    canônicas (tabelas já criadas), então erro por arquivo é TOLERADO e
#    logado — exceto 0014 (reserva na liberação), que é exclusivo dele: se
#    falhar, grita no log do contêiner docker logs plmuse-local-db-1.
set -u
psql_flags="-v ON_ERROR_STOP=1 -q"

echo "[initdb] supabase/migrations (estrito)..."
for f in /sql/supabase/*.sql; do
  if ! psql $psql_flags -f "$f"; then
    echo "[initdb] FALHA CRÍTICA em $(basename "$f") — abortando bootstrap."
    exit 1
  fi
done

echo "[initdb] drizzle/migrations (tolerante a sobreposição)..."
for f in /sql/drizzle/0*.sql; do
  base="$(basename "$f")"
  if ! psql $psql_flags -f "$f" 2>/tmp/drizzle_err; then
    if [ "${base}" = "0014_sales_release_reserves_stock.sql" ]; then
      echo "[initdb] *** FALHA EM 0014 (reserva na liberação) — o fluxo venda->estoque ficará sem o elo. Erro:"
      cat /tmp/drizzle_err
    else
      echo "[initdb] ok: ${base} pulado (sobreposição esperada): $(head -c 200 /tmp/drizzle_err)"
    fi
  fi
done

echo "[initdb] bootstrap concluído."
exit 0
