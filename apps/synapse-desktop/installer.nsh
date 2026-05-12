!include LogicLib.nsh
!include FileFunc.nsh

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
