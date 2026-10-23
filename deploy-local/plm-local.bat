@echo off
rem ============================================================
rem  PLM USE - instalacao local em 1 clique (Docker + Postgres)
rem  Clica duas vezes e espera. O navegador abre sozinho no fim.
rem  Requisitos: Docker Desktop rodando (WSL2). ~1 GB de download
rem  na primeira execucao; pode levar de 5 a 15 minutos.
rem  Este pacote NAO toca no Lovable nem na producao.
rem ============================================================
setlocal
cd /d "%~dp0.."
set "COMPOSE=deploy-local\docker-compose.yml"
set "KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoicGxtdXNlLWxvY2FsIiwiaWF0IjoxNzYxMTc3NjAwLCJleHAiOjIwNzY2NTI4MDB9.jDHTwp5sPH5ViBPILRjzsV9H7m2HRX9GV-thrJ0PUX4"
for /f "tokens=2 delims==" %%p in ('findstr /b APP_PORT= deploy-local\.env') do set "PORT=%%p"
if "%PORT%"=="" set "PORT=18080"

docker version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker Desktop nao esta rodando. Abra o Docker Desktop e rode de novo.
  pause
  exit /b 1
)

echo [1/6] Subindo a stack (build do app incluso; primeira vez demora)...
docker compose -f "%COMPOSE%" up -d --build
if errorlevel 1 (
  echo [ERRO] docker compose falhou. Log do db (costuma conter a causa):
  docker compose -f "%COMPOSE%" logs --tail=60 db
  pause
  exit /b 1
)

rem 23/out self-repair: POSTGRES_HOST_AUTH_METHOD=trust so e escrita no initdb
rem (volume vazio). Volumes criados por versoes antigas continuam com scram no
rem pg_hba.conf e o gotrue (DSM sem senha) morria em 'failed SASL auth'. Isto
rem converge o pg_hba do volume herdado p/ trust no boot, em qualquer caso.
docker compose -f "%COMPOSE%" exec -T db sh -c "psql -U postgres -q -c \"ALTER USER postgres PASSWORD 'PLMLocal2026';\"; sed -i 's/scram-sha-256/trust/g; s/md5/trust/g; s/password/trust/g' /var/lib/postgresql/data/pg_hba.conf; kill -HUP 1" >nul 2>&1
echo [2/6] Esperando o banco executar as migrations (fase 1) e o GoTrue responder...
set /a tries=0
:waitloop
timeout /t 5 /nobreak >nul
curl -sf http://localhost:%PORT%/auth/v1/health >nul 2>&1
if not errorlevel 1 goto api_up
set /a tries+=1
if %tries% lss 60 goto waitloop
echo [ERRO] API nao respondeu em 5 min. Log de diagnostico:
docker compose -f "%COMPOSE%" logs --tail=40 db gotrue
pause
exit /b 1

:api_up
echo [3/6] Aguardando Storage e reaplicando migrations adiadas (fase 2)...
set /a stries=0
:storage_wait
timeout /t 4 /nobreak >nul
curl -sf http://localhost:%PORT%/storage/v1/status >nul 2>&1
if not errorlevel 1 goto storage_ok
set /a stries+=1
if %stries% lss 20 goto storage_wait
echo [AVISO] Storage nao respondeu em ~80s; rodando a fase 2 mesmo assim.
:storage_ok
docker compose -f "%COMPOSE%" exec -T db bash /sql/initdb/02_finish.sh

echo [4/6] Criando usuario admin (com verificacao) e o bucket de anexos...
rem 23/out: o signup original era fogo-unico com saida em >nul — se o GoTrue ainda
rem estivesse migrando, um 502 silencioso deixava o admin NAO criado e o login
rem dizia "Invalid credentials". Agora: tenta ate ~60s e so segue quando a
rem resposta confirma (usuario criado ou ja existente).
set /a atries=0
:signup_try
curl -s -X POST http://localhost:%PORT%/auth/v1/signup -H "Content-Type: application/json" -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" -d "{\"email\":\"admin@plm.local\",\"password\":\"PlmLocal!2026\"}" -o "%TEMP%\plm_signup.json"
type "%TEMP%\plm_signup.json" | findstr /i /c:"confirmed_at" /c:"already registered" >nul && goto signup_ok
set /a atries+=1
if %atries% lss 12 (
  echo       gotrue ainda acordando, tentativa atual: %atries% - aguardando 5s...
  timeout /t 5 /nobreak >nul
  goto signup_try
)
echo [AVISO] Admin nao confirmado. Ultima resposta do gotrue:
type "%TEMP%\plm_signup.json"
echo [AVISO] Rode o plm-local.bat de novo mais tarde; o login pode falhar ate la.
:signup_ok
curl -s -X POST http://localhost:%PORT%/storage/v1/bucket -H "Content-Type: application/json" -H "Authorization: Bearer %KEY%" -d "{\"id\":\"use-moda-assets\",\"name\":\"use-moda-assets\",\"public\":true,\"file_size_limit\":10485760}" >nul

echo [5/6] Semeados dados de demonstracao (catalogo, base, pedidos, rotas PCP)...
rem  Ordem canonica dos arquivos aceitos em producao; todos reexecutaveis.
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-SEED.sql
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-BASE.sql
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-PEDIDOS.sql
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-ROTAS.sql

echo       Atualizando o cache de schema da API...
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -c "NOTIFY pgrst, 'reload schema'" >nul
echo [6/6] Tudo pronto.
start "" http://localhost:%PORT%
echo  Login local: admin@plm.local  /  senha: PlmLocal!2026
echo  (a tabela acima do "5/5" traz a prova das rotas: 5 produtos, etapas 6/5/5)
pause
