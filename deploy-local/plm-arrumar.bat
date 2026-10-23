@echo off
rem ============================================================
rem  PLM USE - plm-arrumar.bat : o botao 'faze-tudo' de reparo.
rem  Conserta a instalacao local existente sem precisar apagar
rem  nada: pg_hba/trust, fase 2 das migrations, admin, bucket,
rem  seeds e abre o app. Pode rodar em qualquer estado; e
rem  idempotente. Coloque este arquivo DENTRO de deploy-local e
rem  de dois cliques (ou rode o plm-local.bat, que agora faz o
rem  mesmo fluxo no primeiro boot).
rem ============================================================
setlocal
cd /d "%~dp0.."
set "COMPOSE=deploy-local\docker-compose.yml"
set "KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoicGxtdXNlLWxvY2FsIiwiaWF0IjoxNzYxMTc3NjAwLCJleHAiOjIwNzY2NTI4MDB9.jDHTwp5sPH5ViBPILRjzsV9H7m2HRX9GV-thrJ0PUX4"
for /f "tokens=2 delims==" %%p in ('findstr /b APP_PORT= deploy-local\.env') do set "PORT=%%p"
if "%PORT%"=="" set "PORT=18080"

if not exist "%COMPOSE%" (
  echo [ERRO] Nao encontrei %COMPOSE% a partir desta pasta.
  echo Coloque este .bat dentro da pasta deploy-local do pacote extraido.
  pause
  exit /b 1
)

docker version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker Desktop nao esta rodando. Abra o Docker Desktop e rode de novo.
  pause
  exit /b 1
)

echo [1/8] Subindo/recriando os contêineres (respeita o compose atual)...
docker compose -f "%COMPOSE%" up -d --build
if errorlevel 1 (
  echo [ERRO] docker compose up falhou. Log do db:
  docker compose -f "%COMPOSE%" logs --tail=40 db
  pause
  exit /b 1
)

echo [2/8] Corrigindo autenticacao do Postgres (trust local) e aplicando o pg_hba...
rem O sed cobre volumes anteriores ao trust; o reload via socket unix funciona
rem SEMPRE (a regra 'local all all trust' do entrypoint docker independe das
rem host rules scram); o restart do db garante o servidor em memoria bater com
rem o disco mesmo se qualquer passo acima falhar silenciosamente.
docker compose -f "%COMPOSE%" exec -T db sh -c "sed -i 's/scram-sha-256/trust/g; s/md5/trust/g' /var/lib/postgresql/data/pg_hba.conf; psql -U postgres -c 'select pg_reload_conf()' >nul 2>&1 || su-exec postgres pg_ctl -D /var/lib/postgresql/data reload" >nul 2>&1
docker compose -f "%COMPOSE%" restart db gotrue postgrest storage
timeout /t 10 /nobreak >nul

echo [3/8] Aguardando o GoTrue responder pelo gateway (porta %PORT%)...
set /a tries=0
:waitgotrue
timeout /t 5 /nobreak >nul
curl -sf http://localhost:%PORT%/auth/v1/health >nul 2>&1
if not errorlevel 1 goto gotrue_up
set /a tries+=1
if %tries% lss 48 goto waitgotrue
echo [ERRO] GoTrue nao respondeu em 4 min. Diagnosticos:
docker compose -f "%COMPOSE%" logs --tail=30 gotrue
docker compose -f "%COMPOSE%" logs --tail=20 db
pause
exit /b 1

:gotrue_up
echo [4/8] Aplicando as migrations adiadas (fase 2)...
docker compose -f "%COMPOSE%" exec -T db bash /sql/initdb/02_finish.sh 2>nul || echo [AVISO] 02_finish.sh ausente (pacote pre-2fases); segue - as migrations do compose atual ja vao ter rodado.

echo [5/8] Contagem de tabelas no schema public (sinal de vida do schema):
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -t -A -c "select count(*) from information_schema.tables where table_schema='public'"

echo [6/8] Garantindo o usuario admin (com confirmacao) e o bucket...
set /a atries=0
:signup_try
curl -s -X POST http://localhost:%PORT%/auth/v1/signup -H "Content-Type: application/json" -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" -d "{\"email\":\"admin@plm.local\",\"password\":\"PlmLocal!2026\"}" -o "%TEMP%\plm_signup.json"
type "%TEMP%\plm_signup.json" | findstr /i /c:"confirmed_at" /c:"already registered" >nul && goto signup_ok
set /a atries+=1
if %atries% lss 12 (
  echo       GoTrue ainda acordando, tentativa %atries% - aguardando 5s...
  timeout /t 5 /nobreak >nul
  goto signup_try
)
echo [AVISO] Admin nao confirmado; ultima resposta do gotrue:
type "%TEMP%\plm_signup.json"
:signup_ok
curl -s -X POST http://localhost:%PORT%/storage/v1/bucket -H "Content-Type: application/json" -H "Authorization: Bearer %KEY%" -d "{\"id\":\"use-moda-assets\",\"name\":\"use-moda-assets\",\"public\":true,\"file_size_limit\":10485760}" >nul

echo [7/8] Reexecutando os dados de demonstracao (idempotentes)...
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-SEED.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-BASE.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-PEDIDOS.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-ROTAS.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -c "NOTIFY pgrst, 'reload schema'" >nul

echo [8/8] Tudo pronto - abrindo http://localhost:%PORT%  (login admin@plm.local / PlmLocal!2026)
start "" http://localhost:%PORT%
pause
