# Script para probar el servidor WebSocket localmente
# Ejecutar este script para verificar que todo funciona antes de desplegar

Write-Host "🧪 PRUEBA DEL SERVIDOR WEBSOCKET LOCAL" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Node.js está instalado
Write-Host "1️⃣  Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Node.js instalado: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js NO encontrado. Instálalo desde https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Verificar dependencias
Write-Host ""
Write-Host "2️⃣  Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Instalando dependencias..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Dependencias instaladas correctamente" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error al instalar dependencias" -ForegroundColor Red
        exit 1
    }
}

# Iniciar servidor
Write-Host ""
Write-Host "3️⃣  Iniciando servidor WebSocket..." -ForegroundColor Yellow
Write-Host "   Puerto: 3001" -ForegroundColor Gray
Write-Host "   URL: http://localhost:3001" -ForegroundColor Gray
Write-Host ""
Write-Host "   📝 IMPORTANTE: Este servidor debe estar corriendo para que la app funcione" -ForegroundColor Yellow
Write-Host "   📝 En producción, usa Render o Fly.io (ver SOLUCION_RAILWAY.md)" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
Write-Host "   -------------------------------------------" -ForegroundColor Gray
Write-Host ""

# Ejecutar servidor
node server/server.js
