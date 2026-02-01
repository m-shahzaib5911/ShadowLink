# ShadowLink - Production Restart Script
# For when frontend is built and served by backend

Write-Host "============================================" -ForegroundColor Green
Write-Host "      ShadowLink - Production Restart" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Build frontend (optional - if you made frontend changes)
Write-Host "[1/2] Building frontend..." -ForegroundColor Yellow
$frontendPath = "$PSScriptRoot\frontend"
Push-Location $frontendPath
npm run build 2>&1 | Out-Null
Pop-Location
Write-Host "      Frontend built successfully" -ForegroundColor Green

# Stop existing server
Write-Host "[2/2] Restarting backend server..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start backend (serves both API and static frontend files)
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "server.js" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "      Production Server Restarted!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Website: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API: http://localhost:3000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: In production, frontend is served by backend." -ForegroundColor Gray
Write-Host "      No separate frontend server needed." -ForegroundColor Gray
Write-Host ""
