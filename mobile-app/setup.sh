#!/bin/bash
# Script de instalación rápida para AFK Smash Mobile App

echo "🚀 Iniciando setup de AFK Smash Mobile App..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio mobile-app"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Instalar dependencias específicas de Expo
echo "📱 Instalando dependencias de Expo..."
npx expo install @react-native-async-storage/async-storage expo-linear-gradient

# Verificar instalación de EAS CLI
if ! command -v eas &> /dev/null; then
    echo "🔧 Instalando EAS CLI..."
    npm install -g eas-cli
fi

# Configurar proyecto EAS (si no está configurado)
if [ ! -f "eas.json" ]; then
    echo "⚙️ Configurando proyecto EAS..."
    eas project:init
fi

echo "✅ Setup completado!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Configurar start.gg OAuth en src/config/startgg.ts"
echo "2. Actualizar Project ID en app.json"
echo "3. Ejecutar: expo start"
echo ""
echo "📖 Ver INSTALACION_APP_MOVIL.md para instrucciones completas"