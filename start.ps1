# Script para iniciar el servidor WebSocket y la aplicación Next.js
Write-Host "🎮 Iniciando Sistema de Baneos - Smash Bros Ultimate" -ForegroundColor Cyan
Write-Host ""

# Verificar si node_modules existe
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "🚀 Iniciando servidor WebSocket..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run server"

Start-Sleep -Seconds 2

Write-Host "🌐 Iniciando aplicación Next.js..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Sistema iniciado correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Panel de Administración: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 Servidor WebSocket: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C en ambas ventanas para detener el sistema" -ForegroundColor Yellow
