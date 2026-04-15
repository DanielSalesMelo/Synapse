@echo off
echo Iniciando Rotiq - Backend e Frontend...

:: Abre o Backend em uma nova janela
start "Rotiq Backend" cmd /k "npm run dev:server"

:: Abre o Frontend em uma nova janela
start "Rotiq Frontend" cmd /k "npm run dev"

echo Sistema iniciado! Verifique as janelas abertas.
pause
