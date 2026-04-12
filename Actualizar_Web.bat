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
echo [2/4] Subiendo a la nube (GitHub)...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Algo salio mal al subir a GitHub. Revisa tu internet.
    pause
    exit /b
)
echo.
echo [3/4] Desplegando Funciones de Supabase (Correos)...
npx supabase functions deploy send-vaccine-reminder --no-verify-jwt
npx supabase functions deploy confirm-booking --no-verify-jwt
if %errorlevel% neq 0 (
    echo.
    echo [WARN] Las funciones no se pudieron desplegar, pero el codigo se guardo en GitHub.
)

echo.
echo [4/4] ¡Listo! Vercel detectara el cambio y actualizara tu web en segundos.
echo.
echo 🐾 Proceso Terminado con exito.
echo.
echo Recuerda que para que los correos funcionen, debes tener:
echo 1. RESEND_API_KEY en los Secrets de Supabase.
echo 2. Tu cuenta de Resend configurada (onboarding@resend.dev para pruebas).
echo.
timeout /t 5
exit
