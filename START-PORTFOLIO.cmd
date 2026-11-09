@echo off
setlocal
cd /d "%~dp0"

echo.
echo  LEGIONIZ - PERSONAL PORTFOLIO
echo ==============================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Install Node.js 20.19+ or 22.12+, then reopen this file.
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
  echo [SETUP] Installing portfolio dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [START] Launching the local development server...
call npm run dev
if errorlevel 1 (
  echo.
  echo [ERROR] The development server stopped with an error.
  pause
  exit /b 1
)
endlocal
