@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Change to repo root (location of this script)
cd /d "%~dp0"

echo.
echo === Scripture Buddy Starter (Windows / Web-only) ===

rem Check Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js not found. Please install Node.js 20+ from https://nodejs.org/
  pause
  exit /b 1
)

rem Check npm
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm not found. Ensure Node.js installation added npm to PATH.
  pause
  exit /b 1
)

rem Node version warning (recommend 20+)
set "NODEVER="
set "NODEMAJOR="
for /f "usebackq tokens=* delims=" %%i in (`node -p "process.versions.node"`) do set "NODEVER=%%i"
for /f "tokens=1 delims=." %%i in ("!NODEVER!") do set "NODEMAJOR=%%i"
if defined NODEMAJOR (
  if !NODEMAJOR! LSS 20 (
    echo WARNING: Detected Node v!NODEVER!. Node 20+ is recommended.
  )
)

rem Ensure dependencies installed
if not exist "apps\web\node_modules" (
  echo.
  echo ERROR: apps\web dependencies not installed. Run install.bat first.
  goto :missingdeps
)

echo.
echo Launching web dev server in a new terminal...

set "REPOROOT=%CD%"
start "web-dev" cmd /k "cd /d ""%REPOROOT%\apps\web"" && npm run dev"

echo.
echo Done. Two new terminals should be running (web and expo).
echo - Web:    http://localhost:4000
echo.
pause
exit /b 0

:missingdeps
echo.
echo One or more dependencies are missing. Run install.bat and try again.
pause
exit /b 1

