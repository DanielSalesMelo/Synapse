@echo off
title Synapse Agent - Instalador Windows
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║         SYNAPSE MONITORING AGENT - INSTALADOR        ║
echo  ║                    Windows v1.0.0                    ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: Verifica se está rodando como Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [ERRO] Execute este instalador como Administrador!
    echo  Clique com o botão direito e escolha "Executar como administrador"
    pause
    exit /b 1
)

:: Verifica Python
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo  [INFO] Python não encontrado. Instalando Python 3.11...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.0/python-3.11.0-amd64.exe' -OutFile '%TEMP%\python_installer.exe'"
    %TEMP%\python_installer.exe /quiet InstallAllUsers=1 PrependPath=1
    echo  Python instalado. Reinicie o instalador.
    pause
    exit /b 0
)

echo  [OK] Python encontrado.

:: Instala dependências
echo  Instalando dependências (psutil, requests)...
python -m pip install psutil requests --quiet
if %errorLevel% neq 0 (
    echo  [ERRO] Falha ao instalar dependências.
    pause
    exit /b 1
)
echo  [OK] Dependências instaladas.

:: Cria pasta do agente
set AGENT_DIR=%APPDATA%\synapse-agent
if not exist "%AGENT_DIR%" mkdir "%AGENT_DIR%"

:: Copia o script
copy /Y "%~dp0synapse_agent.py" "%AGENT_DIR%\synapse_agent.py" >nul
echo  [OK] Agente copiado para %AGENT_DIR%

:: Solicita configuração
echo.
set /p SERVER_URL=URL do servidor Synapse (ex: https://synapse-backend.railway.app): 
set /p TOKEN=Token do agente (deixe em branco para registrar automaticamente): 

:: Cria config.json
echo { > "%AGENT_DIR%\config.json"
echo   "server_url": "%SERVER_URL%", >> "%AGENT_DIR%\config.json"
echo   "token": "%TOKEN%", >> "%AGENT_DIR%\config.json"
echo   "collect_interval": 60, >> "%AGENT_DIR%\config.json"
echo   "send_interval": 300 >> "%AGENT_DIR%\config.json"
echo } >> "%AGENT_DIR%\config.json"

:: Cria tarefa agendada para iniciar com o Windows
echo  Criando tarefa agendada para iniciar com o Windows...
schtasks /create /tn "SynapseAgent" /tr "python \"%AGENT_DIR%\synapse_agent.py\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>&1
if %errorLevel% equ 0 (
    echo  [OK] Tarefa agendada criada.
) else (
    echo  [WARN] Não foi possível criar tarefa agendada. O agente precisará ser iniciado manualmente.
)

:: Inicia o agente agora
echo  Iniciando o agente...
start /min python "%AGENT_DIR%\synapse_agent.py"

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║            INSTALAÇÃO CONCLUÍDA COM SUCESSO!         ║
echo  ║                                                      ║
echo  ║  O agente está rodando em segundo plano.             ║
echo  ║  Logs: %APPDATA%\synapse-agent\agent.log             ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
pause
