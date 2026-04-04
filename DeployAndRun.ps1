param()

$cwd = $PSScriptRoot
Set-Location $cwd

# 1. Chequear Vite y encenderlo
Write-Host "[1/3] Revisando Servidor de Desarrollo Local (Vite)..." -ForegroundColor Yellow
$portOpen = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if (-not $portOpen) {
    Write-Host "      -> Iniciando npm run dev (en ventana secundaria)..." -ForegroundColor Green
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm run dev" -WorkingDirectory $cwd -WindowStyle Minimized
} else {
    Write-Host "      -> Vite ya está encendido en el puerto 5173. ¡Listo!" -ForegroundColor Cyan
}

# 2. Correr Vercel
Write-Host ""
Write-Host "[2/3] Creando Despliegue en la Nube con Vercel..." -ForegroundColor Yellow
Write-Host "      (Esto demorará unos segundos o minutos dependiendo del tamaño de la app)" -ForegroundColor DarkGray

# Ejecutar vercel de forma asíncrona pero capturando el output
$vercelOutput = vercel 2>&1
Write-Host ""
foreach ($line in $vercelOutput) {
    Write-Host "   $line" -ForegroundColor DarkGray
}

# 3. Detectar Link y abrir en navegador
Write-Host ""
Write-Host "[3/3] Buscando el link de tu App..." -ForegroundColor Yellow
# Vercel envia el stdout como strings o errores. Vamos bloque a bloque.
$url = ""
foreach ($line in $vercelOutput) {
    if ($line -match "https://[a-zA-Z0-9-]+\.vercel\.app") {
        $url = $matches[0]
        break
    }
}

if ($url) {
    Write-Host "      -> ¡Link Encontrado! Abriendo en el navegador: $url" -ForegroundColor Green
    Start-Process $url
} else {
    Write-Host "      -> No se pudo extraer el Link del output automático. Verifica la consola arriba." -ForegroundColor Red
}

Write-Host ""
Write-Host "🐾 Proceso Terminado. Cierra esta ventana cuando prefieras." -ForegroundColor White
Start-Sleep -Seconds 10
