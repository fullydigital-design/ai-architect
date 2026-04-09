@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1

if "%WEBAPP_DIR%"=="" (
    echo [WEBAPP][ERROR] WEBAPP_DIR is not set.
    pause
    exit /b 1
)

if not exist "%WEBAPP_DIR%\package.json" (
    echo [WEBAPP][ERROR] package.json not found in: %WEBAPP_DIR%
    pause
    exit /b 1
)

cd /d "%WEBAPP_DIR%"
echo [WEBAPP] Working directory: %WEBAPP_DIR%
echo [WEBAPP] Port: %WEBAPP_PORT%

if exist "%PNPM_CMD%" (
    echo [WEBAPP] Starting with pnpm: %PNPM_CMD%
    call "%PNPM_CMD%" dev --host 127.0.0.1 --port %WEBAPP_PORT% --strictPort
) else (
    echo [WEBAPP] pnpm.cmd not found. Falling back to corepack.
    call "%COREPACK_CMD%" pnpm dev --host 127.0.0.1 --port %WEBAPP_PORT% --strictPort
)

set "EC=%ERRORLEVEL%"
if not "%EC%"=="0" (
    echo [WEBAPP][ERROR] Dev server exited with code %EC%.
)
echo [WEBAPP] Press any key to close this window.
pause >nul
exit /b %EC%
