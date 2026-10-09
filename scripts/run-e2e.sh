#!/usr/bin/env bash
# Runner oficial dos E2Es (Sprint 3: fim do "duplo runner"). Antes cada spec
# Playwright/Python era chamado à mão (`python file.py`); este script é o único
# entry point — local e CI — e assume por si: venv, chromium, health-check.
#
# Uso:
#   scripts/run-e2e.sh                       # contra http://localhost:8080
#   PLM_E2E_BASE=https://staging... scripts/run-e2e.sh
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="${PLM_E2E_BASE:-http://localhost:8080}"
VENV="${E2E_VENV:-.venv-e2e}"

say() { printf '[e2e] %s\n' "$*"; }

# 1) ambiente python isolado do npm (playwright + pytest)
if [ ! -x "$VENV/bin/python" ]; then
  say "criando venv em $VENV"
  python3 -m venv "$VENV" || { say "FALHA: python3 -m venv"; exit 2; }
fi
PY="$VENV/bin/python"
if ! "$PY" -c "import playwright,pytest" 2>/dev/null; then
  say "instalando playwright+pytest no venv"
  "$PY" -m pip install -q playwright pytest || { say "FALHA: pip install"; exit 2; }
fi

# 2) browser do playwright (idempotente; --with-deps só roda como root)
if [ -w /root ] || [ "$(id -u)" = "0" ]; then
  "$PY" -m playwright install --with-deps chromium >/dev/null 2>&1 \
    || "$PY" -m playwright install chromium
else
  "$PY" -m playwright install chromium
fi

# 3) o alvo precisa estar de pé — sem /api/health, não adianta correr spec
say "aguardando $BASE/api/health"
ok=0
for _ in $(seq 1 30); do
  if curl -fsS -m 5 "$BASE/api/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 2
done
if [ "$ok" != "1" ]; then
  say "FALHA: $BASE não respondeu no /api/health em 60s."
  say "suba o app (npm run dev / deploy de staging) ou ajuste PLM_E2E_BASE."
  exit 3
fi

# 4) specs; um por processo (cada spec é autocontida por design)
fail=0
shopt -s nullglob
for spec in tests/e2e/*.spec.py; do
  say "▶ $(basename "$spec")"
  if PLM_E2E_BASE="$BASE" "$PY" "$spec"; then
    say "✓ $(basename "$spec")"
  else
    say "✗ $(basename "$spec")"
    fail=1
  fi
done
[ "$fail" = "0" ] && say "todos os specs verdes"
exit "$fail"
