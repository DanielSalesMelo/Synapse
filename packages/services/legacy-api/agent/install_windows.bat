@echo off
setlocal
title Synapse Agent Installer
color 0A

set "DEFAULT_SERVER=https://synapse-backend-ds2026.azurewebsites.net"
set "INSTALL_DIR=%LocalAppData%\SynapseAgent"
set "AGENT_EXE=%INSTALL_DIR%\synapse-agent.exe"
set "AGENT_PY=%INSTALL_DIR%\synapse_agent.py"
set "TEMP_EXE=%TEMP%\synapse-agent.exe"
set "TEMP_PY=%TEMP%\synapse_agent.py"
set "PAIR_CODE="
set "DESKTOP_DIR="
set "STARTUP_DIR="
set "SHORTCUT_CREATED=0"
set "AUTOSTART_TASK_CREATED=0"
set "UNINSTALL_BAT=%INSTALL_DIR%\desinstalar_agente.bat"
set "LEGACY_DIR1=%AppData%\SynapseAgent"
set "LEGACY_DIR2=%ProgramData%\SynapseAgent"
set "DESKTOP_ONEDRIVE=%OneDrive%\Desktop"

echo.
echo =====================================================
echo  SYNAPSE - Instalador do Agente Windows
echo =====================================================
echo.

echo Limpando instalacoes antigas...
taskkill /F /IM synapse-agent.exe >nul 2>&1
schtasks /delete /tn "SynapseAgent" /f >nul 2>&1
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::GetFolderPath('Desktop')"`) do set "DESKTOP_DIR=%%i"
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::GetFolderPath('Startup')"`) do set "STARTUP_DIR=%%i"
if "%DESKTOP_DIR%"=="" if exist "%USERPROFILE%\Desktop" set "DESKTOP_DIR=%USERPROFILE%\Desktop"
if "%DESKTOP_DIR%"=="" if exist "%OneDrive%\Desktop" set "DESKTOP_DIR=%OneDrive%\Desktop"
if not "%DESKTOP_DIR%"=="" del /f /q "%DESKTOP_DIR%\Synapse Suporte.lnk" >nul 2>&1
if exist "%DESKTOP_ONEDRIVE%\Synapse Suporte.lnk" del /f /q "%DESKTOP_ONEDRIVE%\Synapse Suporte.lnk" >nul 2>&1
if not "%STARTUP_DIR%"=="" del /f /q "%STARTUP_DIR%\Synapse Agent.lnk" >nul 2>&1
if exist "%LEGACY_DIR1%" rmdir /s /q "%LEGACY_DIR1%" >nul 2>&1
if exist "%LEGACY_DIR2%" rmdir /s /q "%LEGACY_DIR2%" >nul 2>&1
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%" >nul 2>&1

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

echo Baixando script atualizado de suporte...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%SERVER_URL%/api/agent/download/agent' -OutFile '%TEMP_PY%'"
if not errorlevel 1 (
  copy /Y "%TEMP_PY%" "%AGENT_PY%" >nul 2>&1
)

echo Pareando dispositivo...
"%AGENT_EXE%" --pair "%PAIR_CODE%" --server "%SERVER_URL%" --pair-only
if errorlevel 1 (
  echo [ERRO] Falha no pareamento.
  pause
  exit /b 1
)

echo Definindo modo padrao do agente (usuario comum)...
"%AGENT_EXE%" --mode simple >nul 2>&1

echo Registrando inicializacao automatica...
schtasks /create /tn "SynapseAgent" /tr "\"%AGENT_EXE%\"" /sc onlogon /f >nul 2>&1
if errorlevel 1 (
  echo [AVISO] Nao foi possivel criar a tarefa automatica. Sera usado fallback pela pasta Inicializar.
) else (
  set "AUTOSTART_TASK_CREATED=1"
  echo [OK] Tarefa automatica criada.
)

if not "%DESKTOP_DIR%"=="" (
  echo Criando atalho de suporte na area de trabalho...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%DESKTOP_DIR%\Synapse Suporte.lnk'); $Shortcut.TargetPath = '%AGENT_EXE%'; $Shortcut.Arguments = '--support'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.IconLocation = '%AGENT_EXE%,0'; $Shortcut.Save()"
  if exist "%DESKTOP_DIR%\Synapse Suporte.lnk" (
    set "SHORTCUT_CREATED=1"
  ) else (
    echo [AVISO] Nao foi possivel criar o atalho na area de trabalho.
  )
)

if "%AUTOSTART_TASK_CREATED%"=="0" if not "%STARTUP_DIR%"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%STARTUP_DIR%\Synapse Agent.lnk'); $Shortcut.TargetPath = '%AGENT_EXE%'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.IconLocation = '%AGENT_EXE%,0'; $Shortcut.Save()"
)

(
echo @echo off
echo setlocal
echo taskkill /F /IM synapse-agent.exe ^>nul 2^>^&1
echo schtasks /delete /tn "SynapseAgent" /f ^>nul 2^>^&1
echo del /f /q "%STARTUP_DIR%\Synapse Agent.lnk" ^>nul 2^>^&1
echo del /f /q "%DESKTOP_DIR%\Synapse Suporte.lnk" ^>nul 2^>^&1
echo del /f /q "%DESKTOP_ONEDRIVE%\Synapse Suporte.lnk" ^>nul 2^>^&1
echo del /f /q "%AGENT_EXE%" ^>nul 2^>^&1
echo del /f /q "%AGENT_PY%" ^>nul 2^>^&1
echo echo Agente Synapse removido.
echo pause
) > "%UNINSTALL_BAT%"

start "" "%AGENT_EXE%"

echo.
echo =====================================================
echo  Instalacao concluida
echo  Pasta: %INSTALL_DIR%
echo  Servidor: %SERVER_URL%
echo  Desinstalador: %UNINSTALL_BAT%
if "%SHORTCUT_CREATED%"=="1" (
  echo  Atalho de suporte: %DESKTOP_DIR%\Synapse Suporte.lnk
) else (
  echo  Abra manualmente: "%AGENT_EXE%" --support
)
echo =====================================================
echo.
pause
