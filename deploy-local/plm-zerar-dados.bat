@echo off
rem ATENCAO: apaga o banco local (volume) e o storage. O proximo plm-local.bat
rem recomeca do zero: migrations + sementes rodam de novo no primeiro boot.
cd /d "%~dp0.."
docker compose -f deploy-local\docker-compose.yml down -v
pause
