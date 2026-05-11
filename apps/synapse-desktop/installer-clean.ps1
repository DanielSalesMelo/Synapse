param(
  [string]$InstallerCommandLine = ""
)

$ErrorActionPreference = "SilentlyContinue"

$cleanRequested = $InstallerCommandLine -match "(?i)(^|\s)/CLEAN(=1)?(\s|$)"
if (-not $cleanRequested) {
  exit 0
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveRoot = Join-Path $env:LOCALAPPDATA "Synapse\archive\clean-install-2.4.0-$stamp"
New-Item -ItemType Directory -Force -Path $archiveRoot | Out-Null

$paths = @(
  (Join-Path $env:USERPROFILE ".synapse-agent"),
  (Join-Path $env:APPDATA "Synapse para Windows"),
  (Join-Path $env:APPDATA "Synapse Agent"),
  (Join-Path $env:APPDATA "synapse-agent"),
  (Join-Path $env:APPDATA "synapse-desktop"),
  (Join-Path $env:LOCALAPPDATA "Synapse para Windows"),
  (Join-Path $env:LOCALAPPDATA "Synapse Agent"),
  (Join-Path $env:LOCALAPPDATA "SynapseAgent"),
  (Join-Path $env:LOCALAPPDATA "synapse-agent"),
  (Join-Path $env:LOCALAPPDATA "synapse-desktop"),
  (Join-Path $env:LOCALAPPDATA "com.synapse.agent"),
  (Join-Path $env:LOCALAPPDATA "br.com.synapse.windows")
)

foreach ($path in $paths) {
  if (-not $path) { continue }
  if (Test-Path -LiteralPath $path) {
    $leaf = Split-Path -Leaf $path
    $target = Join-Path $archiveRoot $leaf
    $suffix = 1
    while (Test-Path -LiteralPath $target) {
      $target = Join-Path $archiveRoot "$leaf-$suffix"
      $suffix++
    }
    Move-Item -LiteralPath $path -Destination $target -Force
  }
}

$startup = [Environment]::GetFolderPath("Startup")
$startupLinks = @(
  (Join-Path $startup "SynapseAgent.lnk"),
  (Join-Path $startup "Synapse Agent.lnk"),
  (Join-Path $startup "Synapse Suporte.lnk")
)
foreach ($link in $startupLinks) {
  Remove-Item -LiteralPath $link -Force
}

schtasks /Delete /TN SynapseAgent /F | Out-Null
schtasks /Delete /TN "Synapse Agent" /F | Out-Null

$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty -Path $runKey -Name "SynapseAgent" -Force
Remove-ItemProperty -Path $runKey -Name "Synapse Agent" -Force
Remove-ItemProperty -Path $runKey -Name "SynapseSuporte" -Force

$manifest = @{
  version = "2.4.0"
  mode = "clean-install"
  archivedAt = (Get-Date).ToString("o")
  archiveRoot = $archiveRoot
  timezone = "America/Sao_Paulo"
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $archiveRoot "manifest.json") -Encoding UTF8

$flagRoot = Join-Path $env:LOCALAPPDATA "Synapse"
New-Item -ItemType Directory -Force -Path $flagRoot | Out-Null
Set-Content -Path (Join-Path $flagRoot "clean-install-2.4.0.flag") -Value "clean install requested by SynapseSetup-2.4.0" -Encoding UTF8
