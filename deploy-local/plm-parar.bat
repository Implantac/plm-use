@echo off
rem Para a stack (dados preservados no volume). Reabra com plm-local.bat.
cd /d "%~dp0.."
docker compose -f deploy-local\docker-compose.yml down
pause
