#!/usr/bin/env bash
# Regressão operacional contra o app publicado (ou um vite local).
# Uso: scripts/regressao-producao.sh [BASE_URL] [DIR_SAIDA]
# Requer: python3 com playwright (pip install playwright && playwright install --with-deps chromium).
# Cada prova injeta uma sessão simulada (token local): mede UX, motivos de erro e
# 0 pageerror — seus 401/403 NÃO representam um usuário autenticado real.
set -u
BASE="${1:-https://plmuse.lovable.app}"
OUT="${2:-auditoria/regressao}"
PY="${PYTHON:-python3}"
DIR="$(cd "$(dirname "$0")/provas" && pwd)"
mkdir -p "$OUT"
falhas=0
for p in "$DIR"/prova_*.py; do
  n="$(basename "$p" .py)"
  echo "=== $n"
  timeout 300 "$PY" "$p" "$BASE" "$OUT/$n.png" 2>&1 | grep -v "SyntaxWarning\|^  if\|^<" | tail -6 > "$OUT/$n.log"
  cat "$OUT/$n.log"
  if ! grep -q "pageerror: 0" "$OUT/$n.log"; then
    echo "!!! $n sem 'pageerror: 0'"; falhas=$((falhas+1))
  fi
done
echo "=== auditoria_nomes"; timeout 900 "$PY" "$DIR/auditoria_nomes.py" "$BASE" "$OUT/nomes.png" 2>&1 | grep "TOTAL\|pageerror" | tee "$OUT/nomes.log"
echo "=== auditoria_campos"; timeout 900 "$PY" "$DIR/auditoria_campos.py" "$BASE" "$OUT/campos.png" 2>&1 | grep "TOTAL\|pageerror" | tee "$OUT/campos.log"
echo "provas com falha: $falhas"
exit $falhas
