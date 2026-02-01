@echo off
echo ============================================
echo      ShadowLink - Starting Servers
echo ============================================

echo.
echo [1/2] Stopping existing servers...
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue" 2>nul
powershell -Command "Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue" 2>nul
timeout /t 2 /nobreak >nul

echo [2/2] Starting servers...

echo.
echo Starting Backend (port 3000)...
start "ShadowLink Backend" /MIN cmd /c "cd backend && node server.js"

echo Starting Frontend (port 3000)...
start "ShadowLink Frontend" /MIN cmd /c "cd frontend && npm start"

echo.
echo ============================================
echo      Servers Starting...
echo ============================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
