@echo off
rem Radiografia do espelho local: salva TUDO em deploy-local\plm-status.txt e
rem mostra na tela. Envie o .txt no chat (ou cole o conteudo dele).
setlocal
if "%~1"=="tee" goto corpo
cmd /c ""%~f0" tee" > "%~dp0plm-status.txt" 2>&1
type "%~dp0plm-status.txt"
echo.
echo [ok] Relatorio salvo em deploy-local\plm-status.txt  ^<- anexe este arquivo no chat
pause
exit /b

:corpo
cd /d "%~dp0.."
set "COMPOSE=deploy-local\docker-compose.yml"
for /f "tokens=2 delims==" %%p in ('findstr /b APP_PORT= deploy-local\.env') do set "PORT=%%p"
if "%PORT%"=="" set "PORT=18080"
echo ===== data/hora =====
echo %date% %time%
echo ===== 1) Docker vivo? =====
docker version --format "server={{.Server.Version}}" 2>&1
echo ===== 2) Contêineres (esperado: todos Up; db healthy) =====
docker compose -f "%COMPOSE%" ps -a 2>&1
echo ===== 3) Alguem escutando em :%PORT% ? (vazio = gateway nao escuta) =====
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" 2>&1
echo ===== 4) HTTP direto no gateway e no host =====
curl -s -o nul -w "GET /              -> HTTP %%{http_code}\n" http://localhost:%PORT%/ 2>&1
curl -s -o nul -w "GET /auth/v1/health  -> HTTP %%{http_code}\n" http://localhost:%PORT%/auth/v1/health 2>&1
curl -s -o nul -w "GET /rest/v1/        -> HTTP %%{http_code}\n" http://localhost:%PORT%/rest/v1/ 2>&1
echo ===== 5) Ultimas linhas: db =====
docker compose -f "%COMPOSE%" logs --tail=25 db 2>&1
echo ===== 6) Ultimas linhas: gateway =====
docker compose -f "%COMPOSE%" logs --tail=15 gateway 2>&1
echo ===== 7) Ultimas linhas: web =====
docker compose -f "%COMPOSE%" logs --tail=15 web 2>&1
echo ===== 8) Imagens presentes (falta de pin = pacote antigo) =====
docker images --format "{{.Repository}}:{{.Tag}}" | findstr /i "gotrue postgrest storage-api plmuse postgres nginx" 2>&1
echo ===== FIM DO RELATORIO =====
