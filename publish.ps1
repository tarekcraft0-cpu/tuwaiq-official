# تشغيل سيرفر طويق + نفق Cloudflare العام
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$listening = Get-NetTCPConnection -LocalPort 3847 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) {
  Start-Process -WindowStyle Minimized -FilePath "npm" -ArgumentList "start" -WorkingDirectory $PSScriptRoot
  Start-Sleep -Seconds 2
}

Write-Host "سيرفر طويق على http://localhost:3847"
Write-Host "جاري فتح الرابط العام عبر Cloudflare..."
cloudflared tunnel --url http://localhost:3847
