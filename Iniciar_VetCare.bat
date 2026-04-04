@echo off
title 🐾 VetCare Manager — Iniciador Portatil
echo ===========================================
echo    INICIANDO VETCARE MANAGER... 🐾
echo ===========================================
echo.
REM %~dp0 es la carpeta donde vive este archivo .bat
powershell.exe -ExecutionPolicy Bypass -File "%~dp0DeployAndRun.ps1"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Algo salio mal. Revisa los mensajes arriba.
    pause
)
exit
