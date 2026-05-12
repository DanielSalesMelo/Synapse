!include LogicLib.nsh
!include FileFunc.nsh
!include nsDialogs.nsh

!macro customHeader
  !define MUI_ABORTWARNING
  !define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Synapse Desktop"
  !define MUI_WELCOMEPAGE_TEXT "Instale o agente corporativo do Synapse para helpdesk, suporte conversacional, atualização, heartbeat e experiência TI/Admin em um desktop premium."
  !define MUI_DIRECTORYPAGE_TEXT_TOP "Escolha onde o Synapse Desktop será instalado. Para ambientes corporativos, use /S /currentuser /CLEAN=1 em instalações de teste limpo."
  !define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "Finalizando o Synapse Desktop"
  !define MUI_FINISHPAGE_TITLE "Synapse Desktop instalado com sucesso"
  !define MUI_FINISHPAGE_TEXT "O aplicativo está pronto para pareamento, login por perfil e operação enterprise."
  !define MUI_BRANDINGTEXT "Synapse Desktop 2.4.0 Enterprise"
!macroend

!ifndef BUILD_UNINSTALLER
  Var SynapsePageDialog

  !macro customWelcomePage
    Page custom SynapseWelcomePage SynapseWelcomeLeave
  !macroend

  Function SynapseWelcomePage
    nsDialogs::Create 1018
    Pop $SynapsePageDialog
    ${If} $SynapsePageDialog == error
      Abort
    ${EndIf}
    SetCtlColors $SynapsePageDialog 0xFFFFFF 0x111827

    ${NSD_CreateLabel} 18u 14u 246u 20u "Synapse Desktop"
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827

    ${NSD_CreateLabel} 18u 34u 246u 28u "Instalador enterprise para suporte, helpdesk, RMM e IA híbrida."
    Pop $0
    SetCtlColors $0 0xD8DEE9 0x111827

    ${NSD_CreateLabel} 18u 70u 254u 14u "Fluxo de instalação"
    Pop $0
    SetCtlColors $0 0xA78BFA 0x111827

    ${NSD_CreateLabel} 28u 92u 240u 11u "01  Ambiente e capacidade de IA"
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827
    ${NSD_CreateLabel} 28u 108u 240u 11u "02  Modo padrao, avancado ou corporativo"
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827
    ${NSD_CreateLabel} 28u 124u 240u 11u "03  Intune/GPO: /S /currentuser /allusers /CLEAN=1"
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827
    ${NSD_CreateLabel} 28u 140u 240u 11u "04  Primeiro boot com pareamento e login por perfil"
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827

    ${NSD_CreateLabel} 18u 176u 260u 16u "Clique em Proximo para preparar o Synapse neste computador."
    Pop $0
    SetCtlColors $0 0x94A3B8 0x111827

    nsDialogs::Show
  FunctionEnd

  Function SynapseWelcomeLeave
  FunctionEnd

  !macro customPageAfterChangeDir
    Page custom SynapseReadinessPage SynapseReadinessLeave
  !macroend

  Function SynapseReadinessPage
    nsDialogs::Create 1018
    Pop $SynapsePageDialog
    ${If} $SynapsePageDialog == error
      Abort
    ${EndIf}
    SetCtlColors $SynapsePageDialog 0xFFFFFF 0x111827

    ${NSD_CreateLabel} 18u 14u 250u 18u "Preparação corporativa"
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827

    ${NSD_CreateLabel} 18u 42u 252u 34u "O Synapse vai instalar a UI Electron oficial, worker local, rotina de update e limpeza opcional de estado antigo."
    Pop $0
    SetCtlColors $0 0xCBD5E1 0x111827

    ${NSD_CreateLabel} 24u 96u 238u 16u "Padrão: preserva dados locais e atualiza componentes."
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827
    ${NSD_CreateLabel} 24u 122u 238u 16u "Teste limpo: use /CLEAN=1 para arquivar sessão, token e pareamento."
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827
    ${NSD_CreateLabel} 24u 148u 238u 16u "Corporativo: compatível com /S /currentuser /allusers."
    Pop $0
    SetCtlColors $0 0xFFFFFF 0x111827

    ${NSD_CreateLabel} 18u 212u 255u 22u "Nenhum dado é apagado definitivamente; instalações limpas arquivam o estado antigo."
    Pop $0
    SetCtlColors $0 0x94A3B8 0x111827

    nsDialogs::Show
  FunctionEnd

  Function SynapseReadinessLeave
  FunctionEnd
!endif

!macro customInit
  SetShellVarContext current
  DetailPrint "Encerrando instâncias antigas do Synapse..."
  nsExec::ExecToLog 'taskkill /F /IM synapse-agent.exe'
  nsExec::ExecToLog 'taskkill /F /IM "Synapse para Windows.exe"'
!macroend

!macro customInstall
  SetShellVarContext current
  DetailPrint "Validando modo de instalação limpa do Synapse..."
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\installer\clean-install.ps1" -InstallerCommandLine "$CMDLINE"'

  DetailPrint "Modo corporativo: suporta /S /currentuser /allusers /CLEAN=1 para Intune, GPO e testes limpos."
  DetailPrint "Limpando inicializações antigas do agente..."
  nsExec::ExecToLog 'schtasks /Delete /TN SynapseAgent /F'
  nsExec::ExecToLog 'schtasks /Delete /TN "Synapse Agent" /F'
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SynapseAgent"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Synapse Agent"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SynapseSuporte"

  DetailPrint "Removendo atalhos e scripts legados..."
  Delete "$SMSTARTUP\SynapseAgent.lnk"
  Delete "$SMSTARTUP\Synapse Agent.lnk"
  Delete "$SMSTARTUP\Synapse Suporte.lnk"
  Delete "$DESKTOP\Synapse Suporte.lnk"
  Delete "$LOCALAPPDATA\SynapseAgent\run_support_hidden.vbs"
  Delete "$LOCALAPPDATA\SynapseAgent\run_support.vbs"
  Delete "$LOCALAPPDATA\SynapseAgent\run_hidden.vbs"
  Delete "$LOCALAPPDATA\SynapseAgent\run_agent.vbs"
!macroend

!macro customUnInstall
  SetShellVarContext current
  DetailPrint "Encerrando e removendo inicializações do Synapse..."
  nsExec::ExecToLog 'taskkill /F /IM synapse-agent.exe'
  nsExec::ExecToLog 'taskkill /F /IM "Synapse para Windows.exe"'
  nsExec::ExecToLog 'schtasks /Delete /TN SynapseAgent /F'
  nsExec::ExecToLog 'schtasks /Delete /TN "Synapse Agent" /F'
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SynapseAgent"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Synapse Agent"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "SynapseSuporte"
  Delete "$SMSTARTUP\SynapseAgent.lnk"
  Delete "$SMSTARTUP\Synapse Agent.lnk"
  Delete "$SMSTARTUP\Synapse Suporte.lnk"
  Delete "$DESKTOP\Synapse Suporte.lnk"
!macroend
