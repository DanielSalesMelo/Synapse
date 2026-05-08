!macro customInit
  SetShellVarContext current
  DetailPrint "Encerrando instâncias antigas do Synapse..."
  nsExec::ExecToLog 'taskkill /F /IM synapse-agent.exe'
  nsExec::ExecToLog 'taskkill /F /IM "Synapse para Windows.exe"'
!macroend

!macro customInstall
  SetShellVarContext current
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
