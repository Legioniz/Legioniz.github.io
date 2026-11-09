@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  LEGIONIZ PORTFOLIO - LOCAL NETWORK PREVIEW
echo  ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js 20.19+ or 22.12+.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js with npm included.
  pause
  exit /b 1
)
if not exist node_modules (
  echo [SETUP] Installing dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :failed
)

for /f "delims=" %%I in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL|Docker' } | Select-Object -First 1 -ExpandProperty IPAddress)"') do set "LAN_IP=%%I"

echo Local:      http://localhost:5174/
if defined LAN_IP echo Same Wi-Fi: http://%LAN_IP%:5174/
echo.
echo This preview is available only on your local network.
echo For public Internet access, use the GitHub Pages deployment.
echo Press Ctrl+C to stop the session.
echo.
call npm run dev -- --host 0.0.0.0
if errorlevel 1 goto :failed
endlocal
exit /b 0

:failed
echo.
echo [ERROR] Preview could not start.
pause
exit /b 1
