# CommerceShorts 렌더 워커 — 이 PC 상시 실행(예약 작업 LEXI-Shorts-Worker).
# 비밀값(SHORTS_WORKER_TOKEN, BLOB_READ_WRITE_TOKEN)은 .env.local 에서만 읽는다.
param([string]$ApiBase = "https://lexistyle.vercel.app")

$root = Split-Path -Parent $PSScriptRoot
foreach ($line in Get-Content (Join-Path $root ".env.local")) {
  if ($line -match '^(SHORTS_WORKER_TOKEN|BLOB_READ_WRITE_TOKEN)=(.*)$') {
    Set-Item "env:$($Matches[1])" ($Matches[2].Trim().Trim('"'))
  }
}
$env:SHORTS_API_BASE = $ApiBase
$env:RENDER_TMP = Join-Path $root "services\remotion\.render-tmp"
New-Item -ItemType Directory -Force $env:RENDER_TMP | Out-Null
$env:TEMP = $env:RENDER_TMP; $env:TMP = $env:RENDER_TMP
$log = Join-Path $env:USERPROFILE ".lexi-local\logs\shorts-worker.log"
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
Set-Location (Join-Path $root "services\remotion")

while ($true) {
  "[$(Get-Date -Format s)] worker start → $ApiBase" | Out-File -Append -Encoding utf8 $log
  node worker.mjs *>> $log
  Start-Sleep -Seconds 10
}
