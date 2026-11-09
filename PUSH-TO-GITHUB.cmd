@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "REPO_URL=https://github.com/Legioniz/Legioniz.github.io.git"
set "REMOTE_NAME=portfolio-live"

echo.
echo  LEGIONIZ PORTFOLIO - FIRST GITHUB PUSH
echo  =======================================
echo.
echo Target: %REPO_URL%
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git was not found. Install Git for Windows and reopen this file.
  pause
  exit /b 1
)

if not exist .git (
  echo [SETUP] Initializing Git repository...
  git init
  if errorlevel 1 goto :failed
)

where npm >nul 2>nul
if not errorlevel 1 if not exist package-lock.json (
  echo [LOCK] Attempting to create a reproducible npm lockfile...
  call npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  if errorlevel 1 echo [WARN] Lockfile generation was unavailable; the workflow will still install exact direct dependency versions.
)

git branch -M main
if errorlevel 1 goto :failed

git remote get-url %REMOTE_NAME% >nul 2>nul
if errorlevel 1 (
  git remote add %REMOTE_NAME% %REPO_URL%
) else (
  git remote set-url %REMOTE_NAME% %REPO_URL%
)
if errorlevel 1 goto :failed

echo [STAGE] Adding project files (ignored secrets/build files stay excluded)...
git add -A
if errorlevel 1 goto :failed

git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Deploy portfolio to GitHub Pages"
  if errorlevel 1 goto :failed
) else (
  echo [INFO] No staged changes; using the existing local commit.
)

echo.
echo [PUSH] Sending main to GitHub...
echo [NOTE] This does not force-push or overwrite remote history.
git push -u %REMOTE_NAME% main
if errorlevel 1 goto :failed

echo.
echo [SUCCESS] Source pushed successfully.
echo [LIVE] GitHub Actions will build, verify, and deploy the site.
echo       https://legioniz.github.io/
echo       https://legioniz.github.io/?view=recruiter
echo.
pause
exit /b 0

:failed
echo.
echo [ERROR] Push did not complete.
echo Check that the public repository exists, is empty, and your GitHub login has write access.
echo Do not use force-push to bypass a rejected update.
pause
exit /b 1
