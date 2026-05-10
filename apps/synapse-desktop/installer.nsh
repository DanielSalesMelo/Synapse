!macro customInit
  SetShellVarContext current
  DetailPrint "Encerrando instâncias antigas do Synapse..."
  nsExec::ExecToLog 'taskkill /F /IM synapse-agent.exe'
  nsExec::ExecToLog 'taskkill /F /IM "Synapse para Windows.exe"'
!macroend

!macro customInstall
  SetShellVarContext current
  DetailPrint "Arquivando dados locais antigos do Synapse..."
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand JABFAHIAcgBvAHIAQQBjAHQAaQBvAG4AUAByAGUAZgBlAHIAZQBuAGMAZQAgAD0AIAAnAFMAaQBsAGUAbgB0AGwAeQBDAG8AbgB0AGkAbgB1AGUAJwAKACQAcwB0AGEAbQBwACAAPQAgAEcAZQB0AC0ARABhAHQAZQAgAC0ARgBvAHIAbQBhAHQAIAAnAHkAeQB5AHkATQBNAGQAZAAtAEgASABtAG0AcwBzACcACgAkAGEAcgBjAGgAaQB2AGUAIAA9ACAASgBvAGkAbgAtAFAAYQB0AGgAIAAkAGUAbgB2ADoATABPAEMAQQBMAEEAUABQAEQAQQBUAEEAIAAoACIAUwB5AG4AYQBwAHMAZQBcAGEAcgBjAGgAaQB2AGUAXABwAHIAZQBpAG4AcwB0AGEAbABsAC0AMgAuADQALgAwAC0AJABzAHQAYQBtAHAAIgApAAoATgBlAHcALQBJAHQAZQBtACAALQBJAHQAZQBtAFQAeQBwAGUAIABEAGkAcgBlAGMAdABvAHIAeQAgAC0ARgBvAHIAYwBlACAALQBQAGEAdABoACAAJABhAHIAYwBoAGkAdgBlACAAfAAgAE8AdQB0AC0ATgB1AGwAbAAKACQAcABhAHQAaABzACAAPQAgAEAAKAAKACAAIAAoAEoAbwBpAG4ALQBQAGEAdABoACAAJABlAG4AdgA6AFUAUwBFAFIAUABSAE8ARgBJAEwARQAgACcALgBzAHkAbgBhAHAAcwBlAC0AYQBnAGUAbgB0ACcAKQAsAAoAIAAgACgASgBvAGkAbgAtAFAAYQB0AGgAIAAkAGUAbgB2ADoAQQBQAFAARABBAFQAQQAgACcAUwB5AG4AYQBwAHMAZQAgAHAAYQByAGEAIABXAGkAbgBkAG8AdwBzACcAKQAsAAoAIAAgACgASgBvAGkAbgAtAFAAYQB0AGgAIAAkAGUAbgB2ADoAQQBQAFAARABBAFQAQQAgACcAcwB5AG4AYQBwAHMAZQAtAGQAZQBzAGsAdABvAHAAJwApACwACgAgACAAKABKAG8AaQBuAC0AUABhAHQAaAAgACQAZQBuAHYAOgBMAE8AQwBBAEwAQQBQAFAARABBAFQAQQAgACcAcwB5AG4AYQBwAHMAZQAtAGQAZQBzAGsAdABvAHAAJwApACwACgAgACAAKABKAG8AaQBuAC0AUABhAHQAaAAgACQAZQBuAHYAOgBMAE8AQwBBAEwAQQBQAFAARABBAFQAQQAgACcAUwB5AG4AYQBwAHMAZQBBAGcAZQBuAHQAJwApAAoAKQAKAGYAbwByAGUAYQBjAGgAIAAoACQAcAAgAGkAbgAgACQAcABhAHQAaABzACkAIAB7AAoAIAAgAGkAZgAgACgAVABlAHMAdAAtAFAAYQB0AGgAIAAtAEwAaQB0AGUAcgBhAGwAUABhAHQAaAAgACQAcAApACAAewAKACAAIAAgACAAJAB0AGEAcgBnAGUAdAAgAD0AIABKAG8AaQBuAC0AUABhAHQAaAAgACQAYQByAGMAaABpAHYAZQAgACgAUwBwAGwAaQB0AC0AUABhAHQAaAAgAC0ATABlAGEAZgAgACQAcAApAAoAIAAgACAAIABNAG8AdgBlAC0ASQB0AGUAbQAgAC0ATABpAHQAZQByAGEAbABQAGEAdABoACAAJABwACAALQBEAGUAcwB0AGkAbgBhAHQAaQBvAG4AIAAkAHQAYQByAGcAZQB0ACAALQBGAG8AcgBjAGUACgAgACAAfQAKAH0A'

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
