@echo off
setlocal EnableExtensions EnableDelayedExpansion
title AI Architect
chcp 65001 >nul 2>&1

set "PROJECT_ROOT=%~dp0"
set "WEBAPP_DIR=%PROJECT_ROOT%webapp"

echo.
echo  AI Architect - Electron Dev
echo  ============================
echo.

REM --------------------------------------------------
REM Sanity check
REM --------------------------------------------------
if not exist "%WEBAPP_DIR%\package.json" (
    echo [ERROR] Webapp not found at: %WEBAPP_DIR%
    pause
    exit /b 1
)

REM --------------------------------------------------
REM Launch Electron app (starts Vite dev server + Electron window)
REM ComfyUI can be launched from within the app via the Launch panel.
REM --------------------------------------------------
echo [1/1] Starting AI Architect...
echo        Vite dev server + Electron window will open automatically.
echo.

cd /d "%WEBAPP_DIR%"
pnpm electron:dev

endlocal
