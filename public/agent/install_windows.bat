@echo off
title Instalador Synapse
color 0A
echo.
echo  =====================================================
echo   SYNAPSE - Agente de Monitoramento - Instalador
echo  =====================================================
echo.

:: Verifica Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Por favor instale o Python 3.
    pause
    exit /b
)

:: Instala dependencias
echo Instalando dependencias...
pip install psutil requests --quiet
echo [OK] Dependencias instaladas.
echo.

:: Pergunta o codigo APENAS UMA VEZ
set /p PAIR_CODE="Digite o codigo de pareamento (ex: SYNC-XXXX-XXXX): "
if "%PAIR_CODE%"=="" (
    echo [ERRO] Codigo obrigatorio.
    pause
    exit /b
)

set INSTALL_DIR=%APPDATA%\SynapseAgent
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo Copiando arquivos...
copy /Y "%~dp0synapse_agent.py" "%INSTALL_DIR%\synapse_agent.py" >nul

:: Cria o script de inicializacao sem perguntar nada
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo python "%INSTALL_DIR%\synapse_agent.py"
) > "%INSTALL_DIR%\start_agent.bat"

:: Registra inicializacao
schtasks /create /tn "SynapseAgent" /tr "\"%INSTALL_DIR%\start_agent.bat\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>&1

echo.
echo Realizando pareamento...
python "%INSTALL_DIR%\synapse_agent.py" --pair %PAIR_CODE%
if errorlevel 1 (
    echo.
    echo [ERRO] Falha no pareamento. Verifique o codigo no painel.
    pause
    exit /b
)

echo.
echo [OK] Pareamento realizado com sucesso!
echo O agente iniciara automaticamente no proximo login.
echo.
echo Para iniciar agora: %INSTALL_DIR%\start_agent.bat
echo.
pause
