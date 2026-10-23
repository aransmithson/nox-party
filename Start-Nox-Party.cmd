@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  where npm.cmd >nul 2>nul
  if errorlevel 1 (
    echo Install Node.js 24 or newer, then run this launcher again.
    pause
    exit /b 1
  )
  echo Installing Nox Party dependencies for the first run...
  call npm ci
  if errorlevel 1 (
    echo Installation failed. Check the messages above and try again.
    pause
    exit /b 1
  )
)
start "Nox Party" "node_modules\electron\dist\electron.exe" .
