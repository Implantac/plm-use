#!/usr/bin/env bash
# Smoke test dos endpoints de cron assinados — roda contra QUALQUER ambiente.
#
# Uso:
#   APP_URL=https://usemoda.app LAUNCH_CRON_SECRET=... ./scripts/smoke-cron.sh
#   APP_URL=http://localhost:8080 ABC_CRON_SECRET=...   ./scripts/smoke-cron.sh
#
# O que verifica (a matriz que a revisão de prontidão cobrou no papel):
#   1. POST sem assinatura          → deve ser 401 (ou 503 se o segredo não
#                                     estiver configurado no SERVIDOR — fail-closed)
#   2. POST com assinatura correta  → NÃO pode ser 401/503 (autenticação passou).
#                                     200 = rodou; 500 com stack de supressão é
#                                     aceitável em staging sem service_role.
#   3. GET /api/health               → 200 (liveness do deploy)
#
# exit 0 = tudo passou. Qualquer desvio é falha de deploy, não do script.
set -euo pipefail

APP_URL="${APP_URL:?defina APP_URL (ex.: https://meu-app.com)}"

fail=0
# check "rótulo" "200" | "401 503" | "!401 !503"  <curl args...>
# Lista iniciada com "!" é NEGADA: o código NÃO pode ser nenhum dos listados.
check() {
  local label="$1" ; shift
  local spec="$1" ; shift
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 25 "$@" || echo "000")
  local negate=0 codes="$spec"
  if [[ "$codes" == "!401"* ]]; then
    negate=1
    codes="${codes//!/}"
  fi
  local present=0 c
  for c in $codes; do [[ " $code " == *" $c "* ]] && present=1 && break; done
  local ok
  if [[ $negate -eq 1 ]]; then [[ $present -eq 0 ]] && ok=1 || ok=0
  else [[ $present -eq 1 ]] && ok=1 || ok=0; fi
  if [[ $ok -eq 1 ]]; then
    echo "  ✓ $label → HTTP $code"
  else
    echo "  ✗ $label → HTTP $code (esperava: $spec)"
    fail=1
  fi
}

sign() { # body secret
  printf '%s' "$1" | openssl dgst -sha256 -hmac "$2" | sed 's/.*= //'
}

echo "═══ /api/health ═══"
check "liveness" "200" "$APP_URL/api/health"

echo "═══ launch-performance ═══"
if [[ -n "${LAUNCH_CRON_SECRET:-}" ]]; then
  check "sem assinatura (rejeita)" "401 503" -X POST "$APP_URL/api/public/cron/launch-performance"
  check "assinado (aceita)" "!401 !503" -X POST \
    -H "x-launch-signature: $(sign '' "$LAUNCH_CRON_SECRET")" \
    "$APP_URL/api/public/cron/launch-performance"
else
  echo "  · LAUNCH_CRON_SECRET vazio — só o teste negativo roda"
  check "sem assinatura (rejeita)" "401 503" -X POST "$APP_URL/api/public/cron/launch-performance"
fi

echo "═══ abc-classify ═══"
if [[ -n "${ABC_CRON_SECRET:-}" ]]; then
  check "sem assinatura (rejeita)" "401 503" -X POST "$APP_URL/api/public/cron/abc-classify"
  check "assinado (aceita)" "!401 !503" -X POST \
    -H "x-abc-signature: $(sign '' "$ABC_CRON_SECRET")" \
    "$APP_URL/api/public/cron/abc-classify"
else
  echo "  · ABC_CRON_SECRET vazio — só o teste negativo roda"
  check "sem assinatura (rejeita)" "401 503" -X POST "$APP_URL/api/public/cron/abc-classify"
fi

if [[ $fail -eq 0 ]]; then
  echo "OK · smoke test passou"
else
  echo "FALHOU · verifique segredos/rotas do ambiente"
  exit 1
fi
