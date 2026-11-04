#!/usr/bin/env bash
# check-sync.sh — o app publicado está no mesmo ponto que o main do GitHub?
#
# Compara três coisas:
#   1. BUILD      — baixa o bundle do ar seguindo os imports RELATIVOS entre chunks
#   2. ROTAS      — as rotas registradas no repositório × as que existem no bundle
#   3. BANCO      — as tabelas que as migrations criam × as que respondem na API
#
# Uso:
#   scripts/check-sync.sh
#   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_KEY=sb_publishable_xxx scripts/check-sync.sh
#
# Requisitos: git, curl, python3. Não escreve nada no repositório.
#
# NOTA sobre o rastreio de chunks: o entry point do Vite importa os demais com
# caminho relativo (`import("./_authenticated-xxxx.js")`), não com `/assets/...`.
# Uma versão anterior deste script só seguia `/assets/`, parava nos 11 chunks do
# /login e por isso enxergava uma fração do app — o que dá falso "faltando no ar".
# Aqui o rastreio é em largura, seguindo os dois formatos.

set -uo pipefail

APP=${APP:-https://plmuse.lovable.app}
SUPABASE_URL=${SUPABASE_URL:-https://njmniwsqwohmigroswnl.supabase.co}
SUPABASE_KEY=${SUPABASE_KEY:-}
REPO=${REPO:-$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || echo "$HOME/plm-use")}
MAX_CHUNKS=${MAX_CHUNKS:-600}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "== 1. Build publicado =="
curl -sL --compressed -m 25 "$APP/login" -o "$TMP/login.html" || {
  echo "  falhou ao baixar $APP"
  exit 1
}
python3 - "$TMP" <<'PY'
import re, sys, pathlib
tmp = pathlib.Path(sys.argv[1])
html = (tmp / "login.html").read_text(errors="ignore")
js = sorted(set(re.findall(r"/assets/[A-Za-z0-9_.\-]+\.js", html)))
(tmp / "entry.txt").write_text("\n".join(e.rsplit("/", 1)[-1] for e in js))
print(f"  {len(js)} chunk(s) na entrada")
PY

echo "== 2. Baixando chunks (seguindo imports relativos) =="
: >"$TMP/seen.txt"
cp "$TMP/entry.txt" "$TMP/queue.txt"
n=0
while [ -s "$TMP/queue.txt" ] && [ "$n" -lt "$MAX_CHUNKS" ]; do
  f=$(head -1 "$TMP/queue.txt")
  tail -n +2 "$TMP/queue.txt" >"$TMP/q.tmp" && mv "$TMP/q.tmp" "$TMP/queue.txt"
  grep -qxF "$f" "$TMP/seen.txt" && continue
  curl -sL --compressed -m 20 "$APP/assets/$f" -o "$TMP/$f"
  echo "$f" >>"$TMP/seen.txt"
  grep -aoE '(\./|/assets/)[A-Za-z0-9_.\-]+\.js' "$TMP/$f" 2>/dev/null |
    sed 's#^\./##; s#^/assets/##' >>"$TMP/queue.txt"
  sort -u "$TMP/queue.txt" -o "$TMP/queue.txt"
  n=$((n + 1))
done
echo "  $(ls "$TMP"/*.js 2>/dev/null | wc -l) chunks baixados"

echo "== 3. Rotas: repositório × ar =="
python3 - "$TMP" "$REPO" <<'PY'
import re, sys, glob, pathlib
tmp, repo = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
src = (repo / "src/lib/nav/routes.ts").read_text(errors="ignore")
no_repo = set(re.findall(r'path:\s*"(/[a-z0-9/-]*)"', src))
no_ar = set()
for f in glob.glob(str(tmp / "*.js")):
    no_ar |= set(re.findall(r'path:"(/[a-z0-9/-]+)"', pathlib.Path(f).read_text(errors="ignore")))
so_ar = no_ar - no_repo
so_repo = no_repo - no_ar
print(f"  rotas no repo: {len(no_repo)} | rotas no ar: {len(no_ar)}")
print(f"  no repo e FORA do ar ({len(so_repo)}): {sorted(so_repo) if so_repo else 'nenhuma'}")
# fragmentos de link (filhos de rota) não contam como divergência
fragmentos = {"/login", "/reset-password", "/compare", "/today"}
so_ar_real = so_ar - fragmentos
print(f"  no ar e FORA do repo ({len(so_ar_real)}): {sorted(so_ar_real) if so_ar_real else 'nenhuma'}")
PY

echo "== 4. Marcadores de onda (prova direta do que está no ar) =="
# Cada linha é: <onda>|<texto que só existe no bundle daquela onda ou depois>
while IFS='|' read -r onda texto; do
  [ -z "$onda" ] && continue
  achou=$(grep -al -- "$texto" "$TMP"/*.js 2>/dev/null | wc -l)
  if [ "$achou" -gt 0 ]; then echo "  ✔ $onda — \"$texto\" presente"; else echo "  ✖ $onda — \"$texto\" ausente"; fi
done <<'MARCADORES'
Onda 19|Demonstração — não usar para decidir
Onda 20|Ficha de referência
Onda 21|Consumo e liberação
MARCADORES

echo "== 5. Commit em que o repo está =="
git -C "$REPO" log -1 --pretty="  %h  %ad  %s" --date=format:'%d/%m %H:%M'
echo "  (o bundle não carrega o hash do commit; a prova de sincronia são os marcadores acima)"

if [ -n "$SUPABASE_KEY" ]; then
  echo "== 6. Banco: tabelas do repo × produção =="
  mapfile -t TABELAS < <(
    cd "$REPO" && grep -rhoiE "CREATE TABLE (IF NOT EXISTS )?(public\.)?[a-z_][a-z0-9_]*" \
      supabase/migrations drizzle/migrations 2>/dev/null |
      sed -E 's/.*(EXISTS |public\.)//I' | tr 'A-Z' 'a-z' | grep -v '^public$' | sort -u
  )
  faltando=()
  for t in "${TABELAS[@]}"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 \
      -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" \
      "$SUPABASE_URL/rest/v1/$t?select=*&limit=1")
    [ "$code" = "404" ] && faltando+=("$t")
  done
  echo "  repo: ${#TABELAS[@]} tabelas | ausentes em produção: ${#faltando[@]}"
  [ ${#faltando[@]} -gt 0 ] && printf '    - %s\n' "${faltando[@]}"
fi
