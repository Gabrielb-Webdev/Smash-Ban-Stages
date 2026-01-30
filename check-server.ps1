# Script de verificación del estado del servidor WebSocket
# Ejecutar para verificar que el servidor responde correctamente

param(
    [string]$Url = "http://localhost:3001"
)

Write-Host "🔍 VERIFICACIÓN DEL SERVIDOR WEBSOCKET" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 URL: $Url" -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "Realizando health check..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$Url/health" -Method Get -TimeoutSec 10
    
    Write-Host "✅ SERVIDOR ACTIVO Y FUNCIONANDO" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   Status:    $($response.status)" -ForegroundColor White
    Write-Host "   Service:   $($response.service)" -ForegroundColor White
    Write-Host "   Uptime:    $([math]::Round($response.uptime, 2)) segundos" -ForegroundColor White
    Write-Host "   Sessions:  $($response.sessions)" -ForegroundColor White
    Write-Host "   Timestamp: $($response.timestamp)" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ El servidor está listo para usar" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Puedes configurar esta URL en:" -ForegroundColor Yellow
    Write-Host "   - Archivo .env: NEXT_PUBLIC_SOCKET_URL=$Url" -ForegroundColor Gray
    Write-Host "   - Vercel: Settings > Environment Variables" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ ERROR: No se pudo conectar al servidor" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles causas:" -ForegroundColor Yellow
    Write-Host "   1. El servidor no está corriendo" -ForegroundColor Gray
    Write-Host "      → Ejecuta: node server/server.js" -ForegroundColor Gray
    Write-Host "   2. La URL es incorrecta" -ForegroundColor Gray
    Write-Host "      → Verifica: $Url" -ForegroundColor Gray
    Write-Host "   3. Firewall bloqueando la conexión" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Detalles del error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    exit 1
}
