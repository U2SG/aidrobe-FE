param(
  [switch]$Restart,
  [string]$HostIp = "100.89.226.13",
  [int]$Port = 8082,
  [string]$ApiBaseUrl = "http://100.89.226.13:8000",
  [ValidateSet("Normal", "Minimized")]
  [string]$WindowStyle = "Normal"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$expo = Join-Path $root "node_modules\.bin\expo.CMD"

if (-not (Test-Path $expo)) {
  Write-Error "Expo CLI shim not found: $expo. Run pnpm install first."
  exit 1
}

$listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

if ($Restart) {
  foreach ($processId in $listeners) {
    if ($processId -and $processId -ne $PID) {
      Write-Host "Stopping existing listener on port $Port, pid=$processId."
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }

  if ($listeners) {
    Start-Sleep -Seconds 1
  }
} elseif ($listeners) {
  $pidList = ($listeners -join ", ")
  Write-Host "Aidrobe Expo is already listening on port $Port, pid=$pidList."
  Write-Host "Expo Go URL : exp://$HostIp`:$Port"
  Write-Host "API base    : $ApiBaseUrl"
  exit 0
}

$command = @"
`$env:APP_ENV='development'
`$env:API_BASE_URL='$ApiBaseUrl'
`$env:REACT_NATIVE_PACKAGER_HOSTNAME='$HostIp'
Set-Location '$root'
& '$expo' start --go --port $Port --host lan
"@

$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))

Start-Process -FilePath "powershell.exe" `
  -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encodedCommand) `
  -WorkingDirectory $root `
  -WindowStyle $WindowStyle | Out-Null

Write-Host "Aidrobe Expo is starting in a separate window."
Write-Host "Expo Go URL : exp://$HostIp`:$Port"
Write-Host "API base    : $ApiBaseUrl"
