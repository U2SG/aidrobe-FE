param(
  [string]$Profile = "preview",
  [string]$ApiBaseUrl = "http://100.89.226.13:8000",
  [string]$DevUserId = "00000000-0000-4000-8000-000000000001",
  [switch]$LocalGradle
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$env:APP_ENV = if ($Profile -eq "production") { "production" } else { "development" }
$env:API_BASE_URL = $ApiBaseUrl
$env:DEV_USER_ID = $DevUserId

Write-Host "Aidrobe APK build"
Write-Host "Profile      : $Profile"
Write-Host "APP_ENV      : $env:APP_ENV"
Write-Host "API_BASE_URL : $env:API_BASE_URL"
Write-Host ""

if ($LocalGradle) {
  Write-Host "Using local Gradle build. This requires Android SDK and JDK on this PC."
  npx expo prebuild -p android
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Push-Location (Join-Path $root "android")
  try {
    .\gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  } finally {
    Pop-Location
  }

  $apk = Join-Path $root "android\app\build\outputs\apk\release\app-release.apk"
  Write-Host ""
  Write-Host "APK output: $apk"
  exit 0
}

Write-Host "Using EAS cloud build. This requires Expo/EAS login and network access."
npx eas-cli build -p android --profile $Profile
exit $LASTEXITCODE
