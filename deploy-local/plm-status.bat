@echo off
rem Diagnostico do espelho local. Cole a saida inteira desta janela no chat.
setlocal
cd /d "%~dp0.."
set "COMPOSE=deploy-local\docker-compose.yml"
for /f "tokens=2 delims==" %%p in ('findstr /b APP_PORT= deploy-local\.env') do set "PORT=%%p"
if "%PORT%"=="" set "PORT=18080"

echo ===== 1) Docker vivo? =====
docker version --format "server={{.Server.Version}}" 2>&1

echo ===== 2) Contêineres (esperado: todos Up, db healthy) =====
docker compose -f "%COMPOSE%" ps -a

echo ===== 3) Alguém escutando em :%PORT% ? (vazio = gateway nao subiu) =====
netstat -ano | findstr /r /c:":%PORT% .*LISTENING"

echo ===== 4) Teste HTTP pelo gateway =====
curl -s -o nul -w "GET /            -> HTTP %%{http_code}\n" http://localhost:%PORT%/
curl -s -o nul -w "GET /auth/v1/health -> HTTP %%{http_code}\n" http://localhost:%PORT%/auth/v1/health
curl -s -o nul -w "GET /rest/v1/       -> HTTP %%{http_code}\n" http://localhost:%PORT%/rest/v1/

echo ===== 5) Últimas linhas: db =====
docker compose -f "%COMPOSE%" logs --tail=25 db
echo ===== 6) Últimas linhas: gateway =====
docker compose -f "%COMPOSE%" logs --tail=15 gateway
echo ===== 7) Últimas linhas: web =====
docker compose -f "%COMPOSE%" logs --tail=15 web
echo ===== FIM — copie TUDO desta janela e cole no chat =====
pause
