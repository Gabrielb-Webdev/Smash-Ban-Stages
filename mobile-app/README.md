# AFK Smash - Aplicación Móvil

<div align="center">
  <h1>🎮 AFK Smash Mobile</h1>
  <p><strong>Aplicación móvil oficial de la comunidad AFK Buenos Aires</strong></p>
  
  ![React Native](https://img.shields.io/badge/React%20Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
</div>

## 📱 Características

- **🔐 Login con start.gg** - Autenticación OAuth segura
- **🏆 Gestión de Torneos** - Inscripción y seguimiento en tiempo real
- **📲 Notificaciones Push** - Alertas cuando te toca jugar
- **✅ Check-in Digital** - Confirmación automática antes de matches
- **🎯 Reporte de Resultados** - Sistema de validación cruzada
- **⚡ Tiempo Real** - Sincronización instantánea con el sistema web

## 🚀 Instalación Rápida

### Para Windows:
```bash
cd mobile-app
setup.bat
```

### Para macOS/Linux:
```bash
cd mobile-app
chmod +x setup.sh
./setup.sh
```

### Manual:
```bash
cd mobile-app
npm install
npx expo install @react-native-async-storage/async-storage expo-linear-gradient
expo start
```

## ⚙️ Configuración

1. **start.gg OAuth:**
   - Editar `src/config/startgg.ts`
   - Reemplazar `'your-startgg-client-id'` con tu Client ID

2. **Expo Project:**
   - Editar `app.json`
   - Actualizar `extra.eas.projectId`

3. **Desarrollo:**
   ```bash
   expo start
   ```

## 📦 Build para Producción

### Preview (Testing):
```bash
eas build --profile preview --platform android
```

### Producción:
```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

### Publicar en Stores:
```bash
eas submit --platform android  # Google Play
eas submit --platform ios      # App Store
```

## 🔗 Integración con Backend

La app se conecta automáticamente a:
- **API:** https://smash-ban-stages.vercel.app/api
- **WebSocket:** wss://sweet-insight-production-80c1.up.railway.app

## 🎯 Funcionalidades Principales

### Para Jugadores:
- Ver torneos disponibles de AFK
- Registrarse/desregistrarse de torneos
- Recibir notificaciones de matches
- Check-in antes de jugar
- Reportar resultados post-match

### Para Admins:
- Panel de gestión de torneos
- Asignación de setups
- Subida automática a start.gg
- Control de streaming

## 📁 Estructura del Proyecto

```
mobile-app/
├── src/
│   ├── components/         # Componentes reutilizables
│   ├── screens/           # Pantallas principales
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   └── TournamentsScreen.tsx
│   ├── services/          # Comunicación con APIs
│   │   ├── authService.ts
│   │   ├── tournamentService.ts
│   │   └── notificationService.ts
│   ├── context/           # Estado global
│   ├── config/            # Configuración
│   └── types/             # Definiciones TypeScript
├── App.tsx               # Componente principal
├── app.json             # Configuración de Expo
├── eas.json             # Configuración de builds
└── package.json
```

## 🔧 Desarrollo

### Scripts Disponibles:
- `npm start` - Iniciar en modo desarrollo
- `npm run android` - Ejecutar en Android
- `npm run ios` - Ejecutar en iOS
- `npm run web` - Ejecutar en navegador

### Features Flags:
Editar `src/config/environment.ts` para habilitar/deshabilitar características:
```typescript
FEATURES: {
  PUSH_NOTIFICATIONS: true,
  REAL_START_GG_API: false,
  ADMIN_PANEL: false,
  STREAMING_INTEGRATION: false,
}
```

## 🐛 Troubleshooting

### Error de dependencias:
```bash
npx expo install --fix
```

### Error de OAuth:
- Verificar redirect URI en start.gg
- Confirmar que el app scheme coincide

### Error de build:
```bash
eas build:configure
```

## 📚 Documentación Adicional

- [Instalación Completa](../INSTALACION_APP_MOVIL.md)
- [Documentación del Proyecto](../PROYECTO_AFK_APP_MOVIL.md)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Guide](https://reactnative.dev/)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una branch para tu feature
3. Commit tus cambios
4. Push a la branch
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---

<div align="center">
  <p>Hecho con ❤️ para la comunidad AFK Buenos Aires</p>
  <p><strong>🎮 ¡Nos vemos en los torneos! 🏆</strong></p>
</div>