@echo off
echo Sincronizando com o GitHub a cada 30 segundos...
echo Pressione CTRL + C para parar.
:loop
git pull origin main
timeout /t 30 >nul
goto loop