@echo off
rem ============================================================
rem  PLM USE - plm-corrigir-login.bat  (AUTOSUFICIENTE)
rem  Um duplo-clique fecha a cadeia do login inteira:
rem  [1] sobe/rebuild a stack; [2] conserta o Postgres por duas
rem  bandas SEM pre-sonda (ALTER da senha + sed trust + HUP no
rem  caminho TCP real do gotrue) e a sonda TCP vira so verificacao;
rem  [3-4] gotrue/postgrest/storage autenticados pelo gateway;
rem  [5] fase 2 das migrations + contagem de tabelas; [6] admin
rem  com confirmacao; [7] bucket + seeds; [8] POST REAL de login
rem  - so abre o browser com access_token. Elo quebrado gera o
rem  .txt de diagnostico e RECONSTRUI do zero sozinho (Ctrl+C em
rem  5s cancela). Nao depende de nenhum outro arquivo novo: pode
rem  ser copiado sozinho para deploy-local OU posto na raiz do
rem  pacote (autodetecta).
rem ============================================================
setlocal
set "DROOT=%~dp0"
if not exist "%DROOT%docker-compose.yml" if exist "%DROOT%deploy-local\docker-compose.yml" set "DROOT=%DROOT%deploy-local\"
set "COMPOSE=%DROOT%docker-compose.yml"
set "KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoicGxtdXNlLWxvY2FsIiwiaWF0IjoxNzYxMTc3NjAwLCJleHAiOjIwNzY2NTI4MDB9.jDHTwp5sPH5ViBPILRjzsV9H7m2HRX9GV-thrJ0PUX4"
set "ERR=%DROOT%plm-corrigir-login.txt"
rem Artefato visivel mesmo se a janela fechar: log de passo a passo. Nao
rem mexe em errorlevel de nada (redirecionamento simples, linha propria).
set "LOG=%DROOT%plm-corrigir-login.log"
>"%LOG%" echo === plm-corrigir-login %date% %time% ===
for /f "tokens=2 delims==" %%p in ('findstr /b APP_PORT= "%DROOT%.env"') do set "PORT=%%p"
if "%PORT%"=="" set "PORT=18080"

if not exist "%COMPOSE%" goto fail_nopacote
docker version >nul 2>&1
if errorlevel 1 goto fail_docker
cd /d "%DROOT%."

echo [1/8] Subindo a stack (build inclusive)...
docker compose -f "%COMPOSE%" up -d --build
if errorlevel 1 goto report

echo [2/8] Consertando o Postgres por duas bandas (senha + trust TCP)...
rem (pipe p/ psql: nada de aspas aninhadas cmd->docker->sh; cada linha so um nivel)
echo ALTER USER postgres PASSWORD 'PLMLocal2026'| docker compose -f "%COMPOSE%" exec -T db psql -U postgres -q >nul 2>&1
docker compose -f "%COMPOSE%" exec -T db sh -c "sed -i 's/scram-sha-256/trust/g; s/md5/trust/g; s/password/trust/g' /var/lib/postgresql/data/pg_hba.conf; kill -HUP 1" >nul 2>&1 >nul 2>&1
timeout /t 4 /nobreak >nul
call :probetcp
if not errorlevel 1 goto tcp_ok
echo       TCP ainda recusa - restart completo do db para reler o arquivo...
docker compose -f "%COMPOSE%" restart db
timeout /t 8 /nobreak >nul
call :probetcp
if not errorlevel 1 goto tcp_ok
goto report
:probetcp
docker compose -f "%COMPOSE%" exec -T -e PGCONNECT_TIMEOUT=4 db psql -w -U postgres -h 127.0.0.1 -t -A -c "select 'tcp-trust-ok'" >"%TEMP%\plm_tcp.txt" 2>&1
type "%TEMP%\plm_tcp.txt" >>"%LOG%" 2>nul
findstr /c:"tcp-trust-ok" "%TEMP%\plm_tcp.txt" >nul
exit /b

:tcp_ok
echo [3/8] GoTrue reconectando (restart limpo do servico)...
docker compose -f "%COMPOSE%" restart gotrue postgrest storage >nul 2>&1
echo [4/8] Aguardando GoTrue pelo gateway (ate 3 min)...
set /a tries=0
:waitgotrue
timeout /t 5 /nobreak >nul
curl -sf http://localhost:%PORT%/auth/v1/health >nul 2>&1
if not errorlevel 1 goto gotrue_up
set /a tries+=1
if %tries% lss 36 goto waitgotrue
goto report

:gotrue_up
echo [5/8] Fase 2 das migrations (02_finish) + contagem de tabelas...
docker compose -f "%COMPOSE%" exec -T db bash /sql/initdb/02_finish.sh
set TBL=
for /f "delims=" %%t in ('docker compose -f "%COMPOSE%" exec -T db psql -U postgres -t -A -c "select count(*) from information_schema.tables where table_schema='public'" 2^>nul') do set TBL=%%t
>>"%LOG%" echo [5/8] tabelas=%TBL%
echo %TBL%| findstr /r "^[0-9][0-9]*$" >nul
if errorlevel 1 goto report
echo       %TBL% tabelas em public
if %TBL% LSS 30 goto report

echo [6/8] Admin local com confirmacao (ate 60s)...
set /a atries=0
:signup_try
curl -s -X POST http://localhost:%PORT%/auth/v1/signup -H "Content-Type: application/json" -H "apikey: %KEY%" -H "Authorization: Bearer %KEY%" -d "{\"email\":\"admin@plm.local\",\"password\":\"PlmLocal!2026\"}" -o "%TEMP%\plm_signup.json"
type "%TEMP%\plm_signup.json" | findstr /i /c:"confirmed_at" /c:"already registered" >nul && goto signup_ok
set /a atries+=1
if %atries% lss 12 goto signup_wait
goto report
:signup_wait
echo       gotrue acordando (tentativa %atries%)...
timeout /t 5 /nobreak >nul
goto signup_try

:signup_ok
echo [7/8] Bucket + seeds + cache da API...
set /a stries=0
:waitstorage
curl -sf http://localhost:%PORT%/storage/v1/status >nul 2>&1
if not errorlevel 1 goto storage_go
set /a stries+=1
if %stries% lss 15 goto waitstorage_wait
goto storage_go
:waitstorage_wait
timeout /t 4 /nobreak >nul
goto waitstorage
:storage_go
curl -s -X POST http://localhost:%PORT%/storage/v1/bucket -H "Content-Type: application/json" -H "Authorization: Bearer %KEY%" -d "{\"id\":\"use-moda-assets\",\"name\":\"use-moda-assets\",\"public\":true,\"file_size_limit\":10485760}" >nul
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -v ON_ERROR_STOP=0 -d postgres -f /sql/seed/KARILU-SEED.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -v ON_ERROR_STOP=0 -d postgres -f /sql/seed/KARILU-BASE.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -v ON_ERROR_STOP=0 -d postgres -f /sql/seed/KARILU-PEDIDOS.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -v ON_ERROR_STOP=0 -d postgres -f /sql/seed/KARILU-ROTAS.sql >nul
docker compose -f "%COMPOSE%" exec -T db psql -U postgres -c "NOTIFY pgrst, 'reload schema'" >nul

echo [8/8] AUTOTESTE de login (POST token?grant_type=password)...
curl -s -X POST "http://localhost:%PORT%/auth/v1/token?grant_type=password" -H "Content-Type: application/json" -H "apikey: %KEY%" -d "{\"email\":\"admin@plm.local\",\"password\":\"PlmLocal!2026\"}" -o "%TEMP%\plm_login.json"
findstr /c:"access_token" "%TEMP%\plm_login.json" >nul
if errorlevel 1 goto report
>>"%LOG%" echo [8/8] LOGIN OK - access_token emitido
echo       LOGIN OK (access_token emitido pelo gotrue)
start "" http://localhost:%PORT%
echo Concluido: entre com admin@plm.local / PlmLocal!2026
echo Passo a passo gravado em deploy-local\plm-corrigir-login.log
pause
exit /b 0

:fail_docker
echo [ERRO] Docker Desktop nao esta rodando. Abra-o e rode de novo.
pause
exit /b 1
:fail_nopacote
echo [ERRO] Coloque este .bat DENTRO da pasta deploy-local do pacote.
pause
exit /b 1

:report
echo.
echo [DIAGNOSTICO] Falha em um dos passos. Gerando relatorio e, em 5s,
echo reconstruindo a instalacao inteira (down -v + instalador - dados de
echo demo voltam pelos seeds). Ctrl+C AGORA cancela e so grava o relatorio.
(
echo === plm-corrigir-login %date% %time% ===
echo === ps -a ===
docker compose -f "%COMPOSE%" ps -a
echo === tcp probe ===
type "%TEMP%\plm_tcp.txt" 2>nul
echo === signup ===
type "%TEMP%\plm_signup.json" 2>nul
echo === login ===
type "%TEMP%\plm_login.json" 2>nul
echo === gotrue ===
docker compose -f "%COMPOSE%" logs --tail=40 gotrue
echo === db ===
docker compose -f "%COMPOSE%" logs --tail=40 db
echo === postgrest ===
docker compose -f "%COMPOSE%" logs --tail=20 postgrest
) > "%ERR%" 2>&1
>>"%ERR%" echo === log de passos (%LOG%) ===
type "%LOG%" >>"%ERR%" 2>nul
echo Relatorio em deploy-local\plm-corrigir-login.txt - abrindo no Bloco de Notas...
start "" notepad "%ERR%"
timeout /t 5
docker compose -f "%COMPOSE%" down -v
call "%DROOT%plm-local.bat"
exit /b 1
