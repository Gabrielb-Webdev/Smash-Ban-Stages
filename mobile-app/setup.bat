@echo off
REM Script de instalación rápida para AFK Smash Mobile App (Windows)

echo 🚀 Iniciando setup de AFK Smash Mobile App...

REM Verificar que estamos en el directorio correcto
if not exist "package.json" (
    echo ❌ Error: Este script debe ejecutarse desde el directorio mobile-app
    exit /b 1
)

REM Instalar dependencias
echo 📦 Instalando dependencias...
npm install

REM Instalar dependencias específicas de Expo
echo 📱 Instalando dependencias de Expo...
npx expo install @react-native-async-storage/async-storage expo-linear-gradient

REM Verificar instalación de EAS CLI
where eas >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 🔧 Instalando EAS CLI...
    npm install -g eas-cli
)

echo ✅ Setup completado!
echo.
echo 📋 Próximos pasos:
echo 1. Configurar start.gg OAuth en src/config/startgg.ts
echo 2. Actualizar Project ID en app.json
echo 3. Ejecutar: expo start
echo.
echo 📖 Ver INSTALACION_APP_MOVIL.md para instrucciones completas

pause