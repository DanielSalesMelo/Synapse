@echo off
title Instalador do Agente Synapse
color 0A
echo.
echo  =====================================================
echo   SYNAPSE - Agente de Monitoramento - Instalador
echo  =====================================================
echo.

:: Verifica se Python esta instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instalando Python...
    echo Baixando Python 3.11...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile '%TEMP%\python_installer.exe'"
    echo Instalando Python silenciosamente...
    %TEMP%\python_installer.exe /quiet InstallAllUsers=1 PrependPath=1
    echo Python instalado com sucesso!
    echo Por favor, reinicie este script apos a instalacao do Python.
    pause
    exit /b
)

echo [OK] Python encontrado.
echo.

:: Instala dependencias
echo Instalando dependencias (psutil, requests)...
pip install psutil requests --quiet
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias. Verifique sua conexao com a internet.
    pause
    exit /b
)
echo [OK] Dependencias instaladas.
echo.

:: Pergunta o codigo de pareamento
set /p PAIR_CODE="Digite o codigo de pareamento gerado no Synapse (ex: SYNC-XXXX-XXXX): "
if "%PAIR_CODE%"=="" (
    echo [ERRO] Codigo de pareamento nao pode ser vazio.
    pause
    exit /b
)

:: Pergunta a URL do servidor
set /p SERVER_URL="URL do servidor Synapse (ex: https://seu-servidor.com): "
if "%SERVER_URL%"=="" (
    echo [ERRO] URL do servidor nao pode ser vazia.
    pause
    exit /b
)

:: Cria pasta de instalacao na pasta do usuario para evitar erros de permissao
set INSTALL_DIR=%APPDATA%\SynapseAgent
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copia o agente
echo Copiando arquivos...
copy /Y "%~dp0synapse_agent.py" "%INSTALL_DIR%\synapse_agent.py" >nul

:: Cria arquivo de configuracao
echo Criando configuracao...
(
echo SERVER_URL=%SERVER_URL%
echo PAIR_CODE=%PAIR_CODE%
) > "%INSTALL_DIR%\synapse_agent.conf"

:: Cria o script de inicializacao
(
echo @echo off
echo python "%INSTALL_DIR%\synapse_agent.py" --config "%INSTALL_DIR%\synapse_agent.conf"
) > "%INSTALL_DIR%\start_agent.bat"

:: Registra como servico de inicializacao automatica via Task Scheduler
echo Registrando inicializacao automatica...
schtasks /create /tn "SynapseAgent" /tr "\"%INSTALL_DIR%\start_agent.bat\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Nao foi possivel registrar inicializacao automatica.
) else (
    echo [OK] Agente registrado para iniciar automaticamente.
)

:: Executa o pareamento inicial
echo.
echo Realizando pareamento com o servidor Synapse...
python "%INSTALL_DIR%\synapse_agent.py" --config "%INSTALL_DIR%\synapse_agent.conf" --pair-only
if errorlevel 1 (
    echo [AVISO] Pareamento nao foi concluido. O agente tentara novamente ao iniciar.
) else (
    echo [OK] Pareamento realizado com sucesso!
)

echo.
echo  =====================================================
echo   Instalacao concluida!
echo   O agente sera iniciado automaticamente no proximo
echo   login do Windows.
echo.
echo   Para iniciar agora: %INSTALL_DIR%\start_agent.bat
echo  =====================================================
echo.
pause
