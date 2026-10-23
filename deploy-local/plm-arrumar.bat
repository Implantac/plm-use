@echo off
rem ============================================================
rem  PLM USE - plm-arrumar.bat v2: o botao que NAO pede ajuda.
rem  Diagnostica, conserta, e se ainda assim trava, reconstrói
rem  a instalacao local inteira sozinho (down -v + instalador)
rem  e so entao grava deploy-local\plm-arrumar-erro.txt para
rem  e esse relatorio e so voce mandar no chat. Idempotente; dados
rem  de demonstracao voltam pelo proprio caminho dos seeds.
rem  Colocar em deploy-local e dar dois cliques.
rem ============================================================
setlocal
cd /d "%~dp0.."
set "COMPOSE=deploy-local\docker-compose.yml"
set "KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoicGxtdXNlLWxvY2FsIiwiaWF0IjoxNzYxMTc3NjAwLCJleHAiOjIwNzY2NTI4MDB9.jDHTwp5sPH5ViBPILRjzsV9H7m2HRX9GV-thrJ0PUX4"
set "ERR=%~dp0plm-arrumar-erro.txt"
for /f "tokens=2 delims==" %%p in ('findstr /b APP_PORT= deploy-local\.env') do set "PORT=%%p"
if "%PORT%"=="" set "PORT=18080"

if not exist "%COMPOSE%" goto fail_nopacote
docker version >nul 2>&1
if errorlevel 1 goto fail_docker

echo [1/9] Subindo/recriando os contêineres...
docker compose -f "%COMPOSE%" up -d --build
if errorlevel 1 goto fail_up

echo [2/9] Postgres aceita conexao sem senha (trust)?
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -t -A -c "select 'trust-ok'" >"%TEMP%\plm_trust.txt" 2>&1
findstr /c:"trust-ok" "%TEMP%\plm_trust.txt" >nul && goto trust_ok
echo       nao ainda - reescrevendo pg_hba e dando SIGHUP no servidor...
docker compose -f "%COMPOSE%" exec -T db sh -c "sed -i 's/scram-sha-256/trust/g; s/md5/trust/g; s/password/trust/g' /var/lib/postgresql/data/pg_hba.conf; kill -HUP 1"
timeout /t 4 /nobreak >nul
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -t -A -c "select 'trust-ok'" >"%TEMP%\plm_trust.txt" 2>&1
findstr /c:"trust-ok" "%TEMP%\plm_trust.txt" >nul && goto trust_ok
goto fail_trust
:trust_ok
echo [3/9] Re-sincronizando servicos (gotrue/postgrest/storage)...
docker compose -f "%COMPOSE%" restart gotrue postgrest storage >nul 2>&1
timeout /t 6 /nobreak >nul

echo [4/9] Aguardando o GoTrue pelo gateway (ate 3 min)...
set /a tries=0
:waitgotrue
timeout /t 5 /nobreak >nul
curl -sf http://localhost:%PORT%/auth/v1/health >nul 2>&1
if not errorlevel 1 goto gotrue_up
set /a tries+=1
if %tries% lss 36 goto waitgotrue
goto fail_gotrue

:gotrue_up
echo [5/9] Migrations adiadas (fase 2)...
docker compose -f "%COMPOSE%" exec -T db bash /sql/initdb/02_finish.sh 2>nul || echo       (02_finish ausente - segue com o que houver)

echo [6/9] Contagem de tabelas em public...
set TBL=
for /f "delims=" %%t in ('docker compose -f "%COMPOSE%" exec -T db psql -U postgres -t -A -c "select count(*) from information_schema.tables where table_schema='public'" 2^>nul') do set TBL=%%t
if not defined TBL goto fail_schema
echo %TBL%| findstr /r "^[0-9][0-9]*$" >nul || goto fail_schema
echo       %TBL% tabelas
if %TBL% LSS 30 goto fail_schema

echo [7/9] Admin local (com confirmacao; ate 60s)...
set /a atries=0
:signup_try
curl -s -X POST http://localhost:%PORT%/auth/v1/signup -H "Content-Type: application/json" -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" -d "{\"email\":\"admin@plm.local\",\"password\":\"PlmLocal!2026\"}" -o "%TEMP%\plm_signup.json"
type "%TEMP%\plm_signup.json" | findstr /i /c:"confirmed_at" /c:"already registered" >nul && goto signup_ok
set /a atries+=1
if %atries% lss 12 goto signup_wait
goto fail_signup
:signup_wait
echo       gotrue ainda acordando (tentativa %atries%)...
timeout /t 5 /nobreak >nul
goto signup_try
:signup_ok
curl -s -X POST http://localhost:%PORT%/storage/v1/bucket -H "Content-Type: application/json" -H "Authorization: Bearer %KEY%" -d "{\"id\":\"use-moda-assets\",\"name\":\"use-moda-assets\",\"public\":true,\"file_size_limit\":10485760}" >nul

echo [8/9] Seeds de demonstracao (idempotentes)...
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-SEED.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-BASE.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-PEDIDOS.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -v ON_ERROR_STOP=0 -U postgres -d postgres -f /sql/seed/KARILU-ROTAS.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -c "NOTIFY pgrst, 'reload schema'" >nul

echo [9/9] Concluido - abrindo http://localhost:%PORT%
start "" http://localhost:%PORT%
exit /b 0

:fail_docker
echo [ERRO] Docker Desktop nao esta rodando. Abra-o e rode de novo.
pause
exit /b 1
:fail_nopacote
echo [ERRO] deploy-local nao encontrado a partir deste .bat.
echo Extraia o zip e coloque este arquivo dentro de deploy-local.
pause
exit /b 1
:fail_up
set WHY=compose up falhou
goto report
:fail_trust
set WHY=Postgres recusa conexao sem senha mesmo apos correcao do pg_hba
goto report
:fail_gotrue
set WHY=GoTrue nao respondeu pelo gateway em 3 min
goto report
:fail_schema
set WHY=schema public com menos de 30 tabelas (migrations nao aplicadas)
goto report
:fail_signup
set WHY=signup do admin nao confirmou em 60s
goto report

:report
echo.
echo [DIAGNOSTICO] %WHY%. Gerando relatorio + reconstrucao completa em 5s...
echo (para CANCELAR e me mandar so o relatorio: Ctrl+C agora)
(
echo === %date% %time% ===
echo MOTIVO: %WHY%
echo === ps -a ===
docker compose -f "%COMPOSE%" ps -a
echo === logs gotrue ===
docker compose -f "%COMPOSE%" logs --tail=40 gotrue
echo === logs db ===
docker compose -f "%COMPOSE%" logs --tail=40 db
echo === logs postgrest ===
docker compose -f "%COMPOSE%" logs --tail=20 postgrest
echo === logs storage ===
docker compose -f "%COMPOSE%" logs --tail=20 storage
) > "%ERR%" 2>&1
echo Relatorio gravado em deploy-local\plm-arrumar-erro.txt
timeout /t 5 /nobreak
echo [RECONSTRUCAO] Apagando volumes locais e refazendo tudo do zero...
docker compose -f "%COMPOSE%" down -v
call deploy-local\plm-local.bat
exit /b
