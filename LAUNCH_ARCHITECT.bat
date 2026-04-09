@echo off
setlocal EnableExtensions EnableDelayedExpansion
title AI Architect - Launcher
chcp 65001 >nul 2>&1

REM --------------------------------------------------
REM Defaults — override via .env.secret
REM --------------------------------------------------
set "PROJECT_ROOT=%~dp0"
set "ENV_SECRET=%PROJECT_ROOT%.env.secret"
set "COMFYUI_ROOT=C:\_AI_IMG\ComfyUI"
set "PYTHON_EXE=py -3.12"
set "COMFYUI_PORT=8188"

REM --------------------------------------------------
REM Load private overrides from .env.secret
REM Format: KEY=value  (no quotes, no spaces around =)
REM --------------------------------------------------
if exist "%ENV_SECRET%" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%ENV_SECRET%") do (
        if /I "%%~A"=="COMFYUI_ROOT" set "COMFYUI_ROOT=%%~B"
        if /I "%%~A"=="PYTHON_EXE"   set "PYTHON_EXE=%%~B"
        if /I "%%~A"=="COMFYUI_PORT" set "COMFYUI_PORT=%%~B"
    )
)

REM --------------------------------------------------
REM RTX 5090 CUDA optimizations
REM --------------------------------------------------
set "PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True"
set "CUDA_MODULE_LOADING=LAZY"
set "TORCH_CUDNN_V8_API_ENABLED=1"

REM --------------------------------------------------
REM 1. Start ComfyUI
REM --------------------------------------------------
echo [1/2] Starting ComfyUI on port %COMFYUI_PORT%...
start "ComfyUI" cmd /c "chcp 65001>nul && set PYTHONIOENCODING=utf-8 && cd /d ""%COMFYUI_ROOT%"" && ""%PYTHON_EXE%"" main.py --listen 127.0.0.1 --port %COMFYUI_PORT% --use-pytorch-cross-attention --highvram --cuda-malloc --fast"

REM --------------------------------------------------
REM 2. Wait, then launch Tauri dev app
REM --------------------------------------------------
echo [2/2] Waiting 5 seconds for ComfyUI to initialize...
timeout /t 5 /nobreak >nul

echo [2/2] Launching AI Architect (Tauri)...
cd /d "%PROJECT_ROOT%webapp"
pnpm tauri:dev
