#!/bin/bash
# FASE 1 de 2 do bootstrap: reproduz a historia do banco Lovable num Postgres
# limpo. Migrations que referenciam auth.users / storage.objects / publicacao
# supabase_realtime so podem rodar DEPOIS que gotrue/storage-api sobem e
# criam os esquemas canonicos (na nuvem eles ja vao no proprio servidor).
# Cada arquivo roda em transacao propria (tudo-ou-nada, sem estado parcial);
# o que falhar e registrado em $PGDATA e a fase 2 (02_finish.sh) reaplica
# quando a stack ficar sadia.
#
# ATENCAO (bug real de 23/out): o entrypoint do postgres FAZ SOURCE (. file)
# de qualquer .sh do initdb.d que nao tenha bit de execucao — e em mounts do
# Windows o bit e loteria. Um `exit` aqui mataria o entrypoint inteiro. Por
# isso tudo mora em funcao com `return`, nunca `exit`.
plm_fase1() {
  set -u
  local fails="$PGDATA/.plm_fails.txt"
  local total=0 plmf out

  : > "$fails"

  plm_run_file() { # $1 = rotulo; $2 = arquivo
    total=$((total+1))
    if out=$(psql -U postgres -v ON_ERROR_STOP=1 --single-transaction -q -f "$2" 2>&1); then
      return 0
    fi
    echo "$2" >> "$fails"
    echo "[initdb][$1] adiada: $(basename "$2") — $(echo "$out" | grep -m1 -i error | head -c 160)"
    return 1
  }

  echo "[initdb] fase 1: supabase/migrations (canonicas)..."
  for plmf in /sql/supabase/*.sql; do plm_run_file supa "$plmf" || true; done
  echo "[initdb] fase 1: drizzle/migrations (journal do bot; sobreposicoes sao esperadas)..."
  for plmf in /sql/drizzle/0*.sql; do plm_run_file driz "$plmf" || true; done

  local pend
  pend=$(wc -l < "$fails" | tr -d " ")
  echo "[initdb] fase 1 concluida: $total arquivos, $pend adiados para a fase 2."
  return 0
}
plm_fase1
