@echo off
title 🐾 VetCare Manager — Actualizar Web en la Nube
color 0b
echo ===========================================
echo    ACTUALIZANDO VETCARE MANAGER... 🚀
echo ===========================================
echo.
echo [1/3] Guardando cambios locales...
git add .
git commit -m "Actualizacion automatica: %date% %time%"
echo.
echo [2/3] Subiendo a la nube (GitHub)...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Algo salio mal al subir. Revisa tu internet o si hay cambios pendientes.
    pause
    exit /b
)
echo.
echo [3/3] ¡Listo! Vercel detectara el cambio y actualizara tu web en segundos.
echo.
echo 🐾 Proceso Terminado con exito.
echo.
timeout /t 5
exit
