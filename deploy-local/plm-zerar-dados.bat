@echo off
rem ATENCAO: apaga o banco local (volume) e o storage. Em seguida RECHAINA o
rem plm-local.bat, que refaz migrations + sementes do zero automaticamente.
rem (Versao antiga parava aqui — quem abria o navegador via ERR_CONNECTION_REFUSED.)
cd /d "%~dp0.."
echo [1/2] Apagando volumes de dados (pgdata/storage)... 
docker compose -f deploy-local\docker-compose.yml down -v
echo [2/2] Recriando tudo do zero...
call deploy-local\plm-local.bat
