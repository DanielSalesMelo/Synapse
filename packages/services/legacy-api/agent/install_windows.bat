@echo off
setlocal
title Synapse Agent Installer
color 0A

set "DEFAULT_SERVER=https://synapse-backend-ds2026.azurewebsites.net"
set "INSTALL_DIR=%ProgramFiles%\SynapseAgent"
set "AGENT_EXE=%INSTALL_DIR%\synapse-agent.exe"
set "PAIR_CODE="

echo.
echo =====================================================
echo  SYNAPSE - Instalador do Agente Windows
echo =====================================================
echo.

set /p PAIR_CODE=Digite o codigo de pareamento (SYNC-XXXX-XXXX):
if "%PAIR_CODE%"=="" (
  echo [ERRO] Codigo invalido.
  pause
  exit /b 1
)

set /p SERVER_URL=URL do servidor Synapse [%DEFAULT_SERVER%]:
if "%SERVER_URL%"=="" set "SERVER_URL=%DEFAULT_SERVER%"

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Baixando agente...
powershell -Command "Invoke-WebRequest -Uri '%SERVER_URL%/api/agent/download/windows' -OutFile '%AGENT_EXE%'"
if errorlevel 1 (
  echo [ERRO] Falha ao baixar o agente .exe.
  pause
  exit /b 1
)

echo Pareando dispositivo...
"%AGENT_EXE%" --pair "%PAIR_CODE%" --server "%SERVER_URL%" --pair-only
if errorlevel 1 (
  echo [ERRO] Falha no pareamento.
  pause
  exit /b 1
)

echo Registrando inicializacao automatica...
schtasks /create /tn "SynapseAgent" /tr "\"%AGENT_EXE%\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>&1
if errorlevel 1 (
  echo [AVISO] Nao foi possivel criar a tarefa automatica. Inicie manualmente por %AGENT_EXE%
) else (
  echo [OK] Tarefa automatica criada.
)

start "" "%AGENT_EXE%"

echo.
echo =====================================================
echo  Instalacao concluida
echo  Pasta: %INSTALL_DIR%
echo  Servidor: %SERVER_URL%
echo =====================================================
echo.
pause
