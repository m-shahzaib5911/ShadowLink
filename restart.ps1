# ShadowLink - Restart Both Servers
# Run this script to restart both backend and frontend

Write-Host "============================================" -ForegroundColor Green
Write-Host "      ShadowLink - Restarting Servers" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Stop existing servers
Write-Host "[1/3] Stopping existing servers..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start backend
Write-Host "[2/3] Starting Backend (port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -ArgumentList "server.js" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Minimized

# Start frontend
Write-Host "[3/3] Starting Frontend..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd", "$PSScriptRoot\frontend", "&&", "npm", "start" -WindowStyle Minimized

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "      Servers Restarting..." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
