@echo off
setlocal
title Synapse Agent Installer
color 0A

set "DEFAULT_SERVER=https://synapse-backend-ds2026.azurewebsites.net"
set "INSTALL_DIR=%ProgramFiles%\SynapseAgent"
set "FALLBACK_DIR=%LocalAppData%\SynapseAgent"
set "AGENT_EXE=%INSTALL_DIR%\synapse-agent.exe"
set "TEMP_EXE=%TEMP%\synapse-agent.exe"
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

if not exist "%INSTALL_DIR%" (
  mkdir "%INSTALL_DIR%" >nul 2>&1
)

if not exist "%INSTALL_DIR%" (
  echo [AVISO] Sem permissao para instalar em "%ProgramFiles%".
  echo [INFO] Usando a pasta do usuario atual.
  set "INSTALL_DIR=%FALLBACK_DIR%"
  set "AGENT_EXE=%INSTALL_DIR%\synapse-agent.exe"
)

if not exist "%INSTALL_DIR%" (
  mkdir "%INSTALL_DIR%" >nul 2>&1
)

if not exist "%INSTALL_DIR%" (
  echo [ERRO] Nao foi possivel criar a pasta de instalacao.
  pause
  exit /b 1
)

echo Baixando agente...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SERVER_URL%/api/agent/download/windows' -OutFile '%TEMP_EXE%'"
if errorlevel 1 (
  echo [ERRO] Falha ao baixar o agente .exe.
  pause
  exit /b 1
)

copy /Y "%TEMP_EXE%" "%AGENT_EXE%" >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Falha ao copiar o agente para "%INSTALL_DIR%".
  echo [INFO] Tente executar este instalador como Administrador ou use a pasta do usuario atual.
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
