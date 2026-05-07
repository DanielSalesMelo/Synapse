@echo off
setlocal
set "INSTALL_DIR=%LocalAppData%\SynapseAgent"
set "AGENT_EXE=%INSTALL_DIR%\synapse-agent.exe"
set "AGENT_PY=%INSTALL_DIR%\synapse_agent.py"
set "RUN_HIDDEN_VBS=%INSTALL_DIR%\run_agent_hidden.vbs"
set "RUN_SUPPORT_VBS=%INSTALL_DIR%\run_support_hidden.vbs"
set "LEGACY_DIR1=%AppData%\SynapseAgent"
set "LEGACY_DIR2=%ProgramData%\SynapseAgent"

echo Encerrando agente...
taskkill /F /IM synapse-agent.exe >nul 2>&1

echo Removendo inicializacao automatica...
schtasks /delete /tn "SynapseAgent" /f >nul 2>&1

for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::GetFolderPath('Desktop')"`) do set "DESKTOP_DIR=%%i"
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::GetFolderPath('Startup')"`) do set "STARTUP_DIR=%%i"

del /f /q "%DESKTOP_DIR%\Synapse Suporte.lnk" >nul 2>&1
del /f /q "%USERPROFILE%\Desktop\Synapse Suporte.lnk" >nul 2>&1
del /f /q "%OneDrive%\Desktop\Synapse Suporte.lnk" >nul 2>&1
del /f /q "%STARTUP_DIR%\Synapse Agent.lnk" >nul 2>&1
del /f /q "%RUN_HIDDEN_VBS%" >nul 2>&1
del /f /q "%RUN_SUPPORT_VBS%" >nul 2>&1
del /f /q "%AGENT_EXE%" >nul 2>&1
del /f /q "%AGENT_PY%" >nul 2>&1
rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
rmdir /s /q "%LEGACY_DIR1%" >nul 2>&1
rmdir /s /q "%LEGACY_DIR2%" >nul 2>&1

echo Agente Synapse removido com sucesso.
pause
