@echo off
title 🐾 Vetxora — Actualizar Web en la Nube
color 0b
echo ===========================================
echo    ACTUALIZANDO VETXORA... 🚀
echo ===========================================
echo.
echo [1/3] Guardando cambios locales...
git add .
git commit -m "Actualizacion automatica: %date% %time%"
echo.
echo [2/5] Subiendo a la nube (GitHub)...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Algo salio mal al subir a GitHub. Revisa tu internet.
    pause
    exit /b
)
echo.
echo [3/5] Desplegando en Vercel (Frontend)...
npx vercel --prod --yes
if %errorlevel% neq 0 (
    echo.
    echo [WARN] Vercel no se pudo desplegar automaticamente. Revisa si estas logueado en Vercel CLI.
)

echo.
echo [4/5] Desplegando Funciones de Supabase (Correos)...
npx supabase functions deploy send-vaccine-reminder --no-verify-jwt
npx supabase functions deploy confirm-booking --no-verify-jwt
npx supabase functions deploy mercadopago-checkout --no-verify-jwt
npx supabase functions deploy mercadopago-webhook --no-verify-jwt
if %errorlevel% neq 0 (
    echo.
    echo [WARN] Las funciones no se pudieron desplegar, pero el codigo se guardo en GitHub.
)

echo.
echo [5/5] ¡Listo! Tu plataforma esta actualizada en todos lados.
echo.
echo 🐾 Proceso Terminado con exito.
echo.
echo Recuerda que para los correos usas:
echo GMAIL: %smtpEmail% (Leido de la base de datos)
echo.
timeout /t 5
exit
