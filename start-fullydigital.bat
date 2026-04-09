@echo off
setlocal EnableExtensions EnableDelayedExpansion
title fullydigital.pictures - Launcher v12
chcp 65001 >nul 2>&1

echo.
echo ============================================
echo   fullydigital.pictures  -  Launcher v12
echo ============================================
echo.

REM --------------------------------------------------
REM ALL PATHS ARE SET HERE - edit only this block
REM (mirrors comfyui-paths.config.json)
REM --------------------------------------------------
set "PROJECT_ROOT=%~dp0"
set "ENV_SECRET=%PROJECT_ROOT%.env.secret"
set "COMFYUI_ROOT=C:\_AI\_test_fresh_all_AI\ComfyUI"
set "PYTHON_EXE=C:\Users\M\AppData\Local\Programs\Python\Python312\python.exe"
set "WEBAPP_DIR=%PROJECT_ROOT%webapp"
set "NODE_DIR=C:\Program Files\nodejs"
set "COMFYUI_PORT=8188"
set "WEBAPP_PORT=5173"

REM --------------------------------------------------
REM Optional private env overrides from .env.secret
REM Expected format: KEY=value (no quotes, no spaces around "=")
REM --------------------------------------------------
if exist "%ENV_SECRET%" (
    echo [INFO] Loading private settings from %ENV_SECRET%
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENV_SECRET%") do (
        if /I "%%~A"=="COMFYUI_ROOT" set "COMFYUI_ROOT=%%~B"
        if /I "%%~A"=="PYTHON_EXE" set "PYTHON_EXE=%%~B"
        if /I "%%~A"=="WEBAPP_DIR" set "WEBAPP_DIR=%%~B"
        if /I "%%~A"=="NODE_DIR" set "NODE_DIR=%%~B"
        if /I "%%~A"=="COMFYUI_PORT" set "COMFYUI_PORT=%%~B"
        if /I "%%~A"=="WEBAPP_PORT" set "WEBAPP_PORT=%%~B"
    )
)

set "COREPACK_CMD=%NODE_DIR%\corepack.cmd"
set "PNPM_CMD=%NODE_DIR%\pnpm.cmd"

REM --------------------------------------------------
REM Sanity checks
REM --------------------------------------------------
echo [CHECK] Python: %PYTHON_EXE%
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python not found at: %PYTHON_EXE%
    echo [ERROR] Update PYTHON_EXE in .env.secret ^(recommended^) or in this script
    pause
    exit /b 1
)

echo [CHECK] Corepack: %COREPACK_CMD%
if not exist "%COREPACK_CMD%" (
    echo [ERROR] corepack.cmd not found at: %COREPACK_CMD%
    echo [ERROR] Install Node.js LTS and/or update NODE_DIR in .env.secret ^(recommended^) or this script.
    pause
    exit /b 1
)

echo [CHECK] pnpm: %PNPM_CMD%
if not exist "%PNPM_CMD%" (
    echo [WARN] pnpm.cmd not found at: %PNPM_CMD%
    echo [WARN] Falling back to corepack pnpm.
)

echo [CHECK] ComfyUI: %COMFYUI_ROOT%
if not exist "%COMFYUI_ROOT%\main.py" (
    echo [ERROR] ComfyUI main.py not found at: %COMFYUI_ROOT%\main.py
    echo [ERROR] Update COMFYUI_ROOT in .env.secret ^(recommended^) or in this script
    pause
    exit /b 1
)

echo [CHECK] Webapp: %WEBAPP_DIR%
if not exist "%WEBAPP_DIR%\package.json" (
    echo [ERROR] Webapp not found at: %WEBAPP_DIR%
    pause
    exit /b 1
)

echo.
echo [OK] All paths verified.
echo.

REM --------------------------------------------------
REM Port preparation and launcher logs
REM --------------------------------------------------
call :find_free_port %WEBAPP_PORT%
if not "!FREE_PORT!"=="%WEBAPP_PORT%" (
    echo [WARN] Webapp port %WEBAPP_PORT% is already in use. Switching to !FREE_PORT!.
    set "WEBAPP_PORT=!FREE_PORT!"
)

REM RTX 5090 CUDA optimizations
set "PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True"
set "CUDA_MODULE_LOADING=LAZY"
set "TORCH_CUDNN_V8_API_ENABLED=1"

REM --------------------------------------------------
REM 1. Start ComfyUI
REM --------------------------------------------------
echo [1/4] Starting ComfyUI...
start "ComfyUI" cmd /c "chcp 65001>nul && set PYTHONIOENCODING=utf-8 && cd /d ""%COMFYUI_ROOT%"" && ""%PYTHON_EXE%"" main.py --listen 127.0.0.1 --port %COMFYUI_PORT% --use-pytorch-cross-attention --highvram --cuda-malloc --fast"

REM --------------------------------------------------
REM 2. Start Webapp (Vite dev server)
REM --------------------------------------------------
echo [2/4] Starting Workflow Architect...
start "Webapp" cmd /k ""%PROJECT_ROOT%scripts\launch-webapp-dev.bat""

REM --------------------------------------------------
REM 3. Wait for both servers
REM --------------------------------------------------
echo [3/4] Waiting for servers...
echo.

set "COMFY_READY=0"
set "WEBAPP_READY=0"
set "RETRIES=0"
set "MAX_RETRIES=60"

:WAIT_LOOP
if !RETRIES! geq !MAX_RETRIES! (
    echo.
    echo [TIMEOUT] Servers did not start within !MAX_RETRIES! seconds.
    if !COMFY_READY!==0 echo   - ComfyUI ^(port %COMFYUI_PORT%^) NOT responding
    if !WEBAPP_READY!==0 echo   - Webapp ^(port %WEBAPP_PORT%^) NOT responding
    echo.
    echo Check the ComfyUI and Webapp terminal windows for errors.
    pause
    exit /b 1
)

REM Check ComfyUI
if !COMFY_READY!==0 (
    curl.exe -s -f -o NUL "http://127.0.0.1:%COMFYUI_PORT%/system_stats" >nul 2>&1
    if not errorlevel 1 (
        set "COMFY_READY=1"
        echo        ComfyUI ready on port %COMFYUI_PORT%.
    ) else (
        echo        Waiting for ComfyUI ^(127.0.0.1:%COMFYUI_PORT%^)...
    )
)

REM Check Webapp
if !WEBAPP_READY!==0 (
    echo        Waiting for Webapp ^(127.0.0.1:%WEBAPP_PORT%^)...
    curl.exe -s -f -o NUL "http://127.0.0.1:%WEBAPP_PORT%/" >nul 2>&1
    if not errorlevel 1 (
        set "WEBAPP_READY=1"
        echo        Webapp ready on port %WEBAPP_PORT%.
    )
)

REM Both ready?
if !COMFY_READY!==1 if !WEBAPP_READY!==1 goto READY

set /a RETRIES+=1
ping -n 2 127.0.0.1 >nul
goto WAIT_LOOP

:READY
echo.
echo ============================================
echo   ALL SYSTEMS GO
echo ============================================
echo.
echo   ComfyUI:  http://127.0.0.1:%COMFYUI_PORT%
echo   Webapp:   http://127.0.0.1:%WEBAPP_PORT%
echo.

REM --------------------------------------------------
REM 4. Open browser
REM --------------------------------------------------
echo [4/4] Opening browser tabs...
start "" "http://127.0.0.1:%WEBAPP_PORT%/?launcher=%RANDOM%%RANDOM%"
start "" "http://127.0.0.1:%COMFYUI_PORT%/"

echo.
echo Press any key to stop all servers...
pause >nul

REM --------------------------------------------------
REM Cleanup: kill the server processes
REM --------------------------------------------------
echo.
echo Shutting down...
taskkill /fi "WINDOWTITLE eq ComfyUI*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq Webapp*" /f >nul 2>&1
echo Done.

endlocal
exit /b 0

:find_free_port
set "FREE_PORT=%~1"
:find_free_port_loop
netstat -ano | findstr /R /C:":!FREE_PORT! .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    set /a FREE_PORT+=1
    goto :find_free_port_loop
)
exit /b 0
