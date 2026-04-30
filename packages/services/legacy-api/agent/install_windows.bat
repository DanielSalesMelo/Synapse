@echo off
setlocal
title Synapse Agent Installer
color 0A

set "DEFAULT_SERVER=https://synapse-backend-ds2026.azurewebsites.net"
set "INSTALL_DIR=%ProgramFiles%\SynapseAgent"

echo.
echo =====================================================
echo  SYNAPSE - Instalador do Agente de Monitoramento
echo =====================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Python nao encontrado. Instale o Python 3 e rode novamente.
  echo Link sugerido: https://www.python.org/downloads/windows/
  pause
  exit /b 1
)

echo [OK] Python encontrado.
echo Instalando dependencias...
python -m pip install --quiet psutil requests
if errorlevel 1 (
  echo [ERRO] Nao foi possivel instalar psutil/requests.
  pause
  exit /b 1
)

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
powershell -Command "Invoke-WebRequest -Uri '%SERVER_URL%/api/agent/download/agent' -OutFile '%INSTALL_DIR%\synapse_agent.py'"
if errorlevel 1 (
  echo [ERRO] Falha ao baixar o agente.
  pause
  exit /b 1
)

echo Pareando dispositivo...
python "%INSTALL_DIR%\synapse_agent.py" --pair "%PAIR_CODE%" --server "%SERVER_URL%"
if errorlevel 1 (
  echo [ERRO] Falha no pareamento.
  pause
  exit /b 1
)

(
echo @echo off
echo python "%INSTALL_DIR%\synapse_agent.py"
) > "%INSTALL_DIR%\start_agent.bat"

echo Registrando inicializacao automatica...
schtasks /create /tn "SynapseAgent" /tr "\"%INSTALL_DIR%\start_agent.bat\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>&1
if errorlevel 1 (
  echo [AVISO] Nao foi possivel criar a tarefa automatica. Inicie manualmente por %INSTALL_DIR%\start_agent.bat
) else (
  echo [OK] Tarefa automatica criada.
)

start "" "%INSTALL_DIR%\start_agent.bat"

echo.
echo =====================================================
echo  Instalacao concluida
echo  Pasta: %INSTALL_DIR%
echo  Servidor: %SERVER_URL%
echo =====================================================
echo.
pause
