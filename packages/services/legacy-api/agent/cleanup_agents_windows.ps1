$ErrorActionPreference = "SilentlyContinue"

Write-Host "============================================="
Write-Host " SYNAPSE - Limpeza total de agentes antigos"
Write-Host "============================================="

Write-Host "`n[1/7] Encerrando processos..."
Get-Process synapse-agent -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process python -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -like "*SynapseAgent*" -or $_.ProcessName -like "*synapse*"
} | Stop-Process -Force

Write-Host "[2/7] Removendo tarefas agendadas..."
schtasks /delete /tn "SynapseAgent" /f | Out-Null
schtasks /delete /tn "Synapse Agent" /f | Out-Null
schtasks /delete /tn "SynapseMonitoringAgent" /f | Out-Null

Write-Host "[3/7] Removendo serviços antigos..."
sc.exe stop SynapseAgent | Out-Null
sc.exe delete SynapseAgent | Out-Null
sc.exe stop synapse-agent | Out-Null
sc.exe delete synapse-agent | Out-Null

$localApp = [Environment]::GetFolderPath("LocalApplicationData")
$home = [Environment]::GetFolderPath("UserProfile")
$desktop = [Environment]::GetFolderPath("Desktop")
$startup = [Environment]::GetFolderPath("Startup")

$pathsToDelete = @(
  "$localApp\SynapseAgent",
  "$home\.synapse-agent",
  "C:\Program Files\SynapseAgent",
  "C:\SynapseAgent"
)

Write-Host "[4/7] Removendo pastas antigas..."
foreach ($p in $pathsToDelete) {
  if (Test-Path $p) {
    Remove-Item $p -Recurse -Force
  }
}

Write-Host "[5/7] Removendo atalhos..."
Remove-Item "$desktop\Synapse Suporte.lnk" -Force
Remove-Item "$startup\Synapse Agent.lnk" -Force

Write-Host "[6/7] Limpando variáveis de ambiente antigas..."
[Environment]::SetEnvironmentVariable("SYNAPSE_SERVER_URL", $null, "User")
[Environment]::SetEnvironmentVariable("SYNAPSE_TOKEN", $null, "User")

Write-Host "[7/7] Verificação rápida..."
$leftTasks = schtasks /query /fo LIST | Select-String -Pattern "Synapse" -SimpleMatch
$leftProc = Get-Process | Where-Object { $_.ProcessName -match "synapse|python" }

Write-Host "`n============================================="
Write-Host " Limpeza concluída."
Write-Host " Agora instale novamente APENAS o agente v2.2"
Write-Host " servidor: https://synapse-backend-ds2026.azurewebsites.net"
Write-Host "============================================="

