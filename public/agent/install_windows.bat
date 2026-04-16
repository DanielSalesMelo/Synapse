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

:: Limpa configs antigas para evitar conflitos
if exist "%INSTALL_DIR%\config.json" del /f /q "%INSTALL_DIR%\config.json"
if exist "%INSTALL_DIR%\synapse_agent.conf" del /f /q "%INSTALL_DIR%\synapse_agent.conf"

echo Copiando arquivos...
copy /Y "%~dp0synapse_agent.py" "%INSTALL_DIR%\synapse_agent.py" >nul

:: Cria o script de inicializacao
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo python "%INSTALL_DIR%\synapse_agent.py"
) > "%INSTALL_DIR%\start_agent.bat"

:: Registra inicializacao
schtasks /create /tn "SynapseAgent" /tr "\"%INSTALL_DIR%\start_agent.bat\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>&1

echo.
echo Realizando pareamento com o servidor oficial...
:: Chama o script com a flag --pair e o codigo, sem chance de pedir URL
python "%INSTALL_DIR%\synapse_agent.py" --pair %PAIR_CODE%
if errorlevel 1 (
    echo.
    echo [ERRO] Falha no pareamento. 
    echo Certifique-se de que o codigo %PAIR_CODE% e valido no painel.
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
