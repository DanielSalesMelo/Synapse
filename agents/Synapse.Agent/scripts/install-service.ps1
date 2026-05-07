param(
    [string]$InstallDir = "$env:ProgramFiles\Synapse\Agent",
    [string]$ServerUrl = "https://synapse-backend-ds2026.azurewebsites.net",
    [string]$PairingCode = "",
    [string]$ServiceName = "SynapseTIAgent"
)

$ErrorActionPreference = "Stop"

$sourceExe = Join-Path $PSScriptRoot "..\bin\Release\net8.0-windows\win-x64\publish\Synapse.Agent.exe"
if (-not (Test-Path $sourceExe)) {
    throw "Published exe not found. Run dotnet publish before installing: $sourceExe"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -Force $sourceExe (Join-Path $InstallDir "Synapse.Agent.exe")

$configDir = Join-Path $env:ProgramData "Synapse\Agent\Config"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null

$config = @{
    serverUrl = $ServerUrl
    agentVersion = "2.0.0-alpha.1"
    pairingCode = $PairingCode
    heartbeatIntervalSeconds = 30
    inventoryIntervalMinutes = 60
    commandPollIntervalSeconds = 15
    enableWebSocket = $false
    enableCommandExecution = $false
    allowPowerShell = $false
    runCommandsAsAdmin = $false
    allowLocalShell = $false
    maxCommandSeconds = 120
    environment = "production"
}

$config | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 (Join-Path $configDir "appsettings.local.json")

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Start-Sleep -Seconds 2
}

New-Service `
    -Name $ServiceName `
    -BinaryPathName "`"$InstallDir\Synapse.Agent.exe`"" `
    -DisplayName "Synapse TI Agent" `
    -Description "Synapse enterprise Windows agent for telemetry, inventory and secure remote operations." `
    -StartupType Automatic | Out-Null

Start-Service -Name $ServiceName
Write-Host "Synapse TI Agent v2 installed and started."
