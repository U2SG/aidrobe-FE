# Android real-device debugging via Tailscale + Expo Go.
# Usage:  .\scripts\dev-android.ps1 [-Clear] [-Port 8082]
#   -Clear : clear Metro bundler cache (use after changing babel/tailwind/metro config)
# Phone side: Tailscale app connected, then open exp://<TS-IP>:<Port> in Expo Go (SDK 56).

param(
    [switch]$Clear,
    [int]$Port = 8082
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

# 1) Resolve this PC's Tailscale IPv4 (stable across network changes).
#    Must use the raw IP, NOT the ts.net hostname (HSTS forces HTTPS on it).
try {
    $tsIp = (tailscale ip -4 | Select-Object -First 1).Trim()
} catch {
    Write-Error 'tailscale CLI not found or not running. Start Tailscale first.'
    exit 1
}
if (-not $tsIp) {
    Write-Error 'Could not resolve Tailscale IPv4. Is Tailscale connected?'
    exit 1
}

# 2) Free the port if a previous Metro of THIS project is still on it.
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)" -ErrorAction SilentlyContinue
    if ($proc -and $proc.CommandLine -like "*$projectRoot*") {
        Write-Host "Stopping previous Metro (pid $($proc.ProcessId)) on port $Port"
        Stop-Process -Id $proc.ProcessId -Force -Confirm:$false
        Start-Sleep -Seconds 2
    } else {
        Write-Error "Port $Port is taken by another process (pid $($conn.OwningProcess), not this project). Pick another port: -Port 8083"
        exit 1
    }
}

# 3) Env for app.config.ts / Metro.
$env:APP_ENV = 'development'
$env:API_BASE_URL = "http://${tsIp}:8000"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $tsIp

Write-Host ''
Write-Host '=========================================='
Write-Host "  Phone (Expo Go):  exp://${tsIp}:${Port}"
Write-Host "  API base URL:     http://${tsIp}:8000"
Write-Host '=========================================='
Write-Host ''
Write-Host 'Backend reminders: uvicorn/fastapi must listen on 0.0.0.0;'
Write-Host "for phone-visible images set S3_PUBLIC_BASE_URL=http://${tsIp}:9000/aidrobe"
Write-Host ''

# 4) Start Expo in Expo Go mode.
Set-Location $projectRoot
$expoArgs = @('expo', 'start', '--go', '--port', "$Port")
if ($Clear) { $expoArgs += '--clear' }
npx @expoArgs
