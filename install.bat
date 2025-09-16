@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Change to repo root (location of this script)
cd /d "%~dp0"

echo.
echo === Scripture Buddy Installer (Windows / Web-only) ===

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

call :install_app "apps\web" || goto :error
echo.
echo All dependencies for the web app installed.
echo You can now run start.bat to launch the dev server.
pause
exit /b 0

:install_app
set "APPDIR=%~1"
if not exist "%APPDIR%\package.json" (
  echo Skipping %APPDIR% (no package.json found)
  exit /b 0
)

echo.
echo === %APPDIR%: installing dependencies ===
pushd "%APPDIR%" >nul
if exist "node_modules" (
  echo Updating dependencies in %APPDIR% ...
  npm install
) else (
  echo Installing dependencies in %APPDIR% ...
  if exist "package-lock.json" (
    npm ci
  ) else (
    npm install
  )
)
if errorlevel 1 (
  echo WARNING: Initial install failed in %APPDIR%. Retrying with --legacy-peer-deps ...
  npm install --legacy-peer-deps
  if errorlevel 1 (
    echo ERROR: Dependency installation failed in %APPDIR%.
    popd >nul
    exit /b 1
  )
)
popd >nul
echo Completed dependency setup for %APPDIR%.
exit /b 0

:error
echo.
echo One or more installation steps failed. See messages above.
pause
exit /b 1

