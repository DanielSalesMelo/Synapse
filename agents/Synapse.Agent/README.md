# Synapse.Agent v2

Official direction for the Synapse TI Agent.

This project is the .NET 8 Windows agent that will replace the Python legacy agent after validation gates. The Python agent remains only for production compatibility and fallback while v2 is tested on real machines.

## Scope in this alpha

- Windows Service / Worker Service runtime.
- Single instance lock.
- Structured JSON logs in `C:\ProgramData\Synapse\Agent\Logs`.
- Centralized config in `C:\ProgramData\Synapse\Agent\Config\appsettings.local.json`.
- Device pairing through the current Synapse backend.
- Heartbeat through `/api/agent/heartbeat` with fallback to `/api/agent/metrics`.
- Basic inventory through WMI without spawning visible shells.
- Basic telemetry for CPU, RAM, disk, uptime and network.
- Reconnect loop for HTTP and future WebSocket realtime channel.
- PowerShell execution through `Microsoft.PowerShell.SDK`, disabled by default.
- Policy validation with initial blocklist and command execution disabled by default.

## Important gates

The official web download must stay on the legacy agent until v2 passes:

- Pairing on clean Windows.
- Heartbeat and inventory in production.
- Reconnect after network loss.
- Service restart after reboot.
- Log review.
- Command job policy tests.
- TI/common-user permission tests.

## Local build

```powershell
C:\Dev\.dotnet\dotnet.exe restore C:\Dev\Synapse\agents\Synapse.Agent\Synapse.Agent.csproj
C:\Dev\.dotnet\dotnet.exe build C:\Dev\Synapse\agents\Synapse.Agent\Synapse.Agent.csproj -c Release
C:\Dev\.dotnet\dotnet.exe publish C:\Dev\Synapse\agents\Synapse.Agent\Synapse.Agent.csproj -c Release -r win-x64 --self-contained true
```

## Install as service

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-service.ps1 -PairingCode SYNC-XXXX-XXXX
```

Command execution and PowerShell are intentionally disabled unless enabled by policy in config. No VBS, no startup folder hacks and no visible shell are used by the agent runtime.
