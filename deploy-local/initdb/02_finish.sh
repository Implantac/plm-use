#!/bin/bash
# FASE 2: reaplica os arquivos que a fase 1 adiou porque dependiam do
# auth.users real (GoTrue) ou do storage.objects (storage-api). Chamada pelo
# plm-local.bat depois que a stack fica sadia. Idempotente: sem lista de
# pendencias (boot 2+), nao faz nada.
set -u
FAILS="$PGDATA/.plm_fails.txt"
[ -f "$FAILS" ] || { echo "[finish] Nada adiado na fase 1 — schema completo."; exit 0; }

remaining=0
applied=0
: > "$FAILS.new"
while IFS= read -r f; do
  [ -f "$f" ] || continue
  if psql -U postgres -v ON_ERROR_STOP=1 --single-transaction -q -f "$f" 2>/tmp/finish_err; then
    applied=$((applied+1))
  else
    remaining=$((remaining+1))
    echo "$f" >> "$FAILS.new"
    echo "[finish][AVISO] ainda falha: $(basename "$f") — $(head -c 160 /tmp/finish_err | tr '\n' ' ')"
  fi
done < "$FAILS"

if [ "$remaining" -gt 0 ]; then
  mv "$FAILS.new" "$FAILS"
  echo "[finish] $applied aplicadas; $remaining permanecem pendentes (o app sobe; rode o .bat de novo depois)."
else
  rm -f "$FAILS" "$FAILS.new"
  echo "[finish] $applied adiadas aplicadas — schema completo."
fi
exit 0
