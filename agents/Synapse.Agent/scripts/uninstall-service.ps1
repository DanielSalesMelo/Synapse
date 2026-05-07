param(
    [string]$ServiceName = "SynapseTIAgent",
    [switch]$RemoveData
)

$ErrorActionPreference = "Stop"

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
}

if ($RemoveData) {
    $dataDir = Join-Path $env:ProgramData "Synapse\Agent"
    if (Test-Path $dataDir) {
        $resolvedDataDir = (Resolve-Path -LiteralPath $dataDir).Path
        $expectedRoot = [System.IO.Path]::GetFullPath((Join-Path $env:ProgramData "Synapse\Agent"))
        if (-not $resolvedDataDir.StartsWith($expectedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove unexpected path: $resolvedDataDir"
        }
        Remove-Item -LiteralPath $resolvedDataDir -Recurse -Force
    }
}

Write-Host "Synapse TI Agent v2 removed."
