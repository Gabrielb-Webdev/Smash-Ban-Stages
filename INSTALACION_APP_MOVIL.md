# AFK Smash Mobile App - Setup para Producción

## 🚀 Setup del Proyecto para Producción

### Prerrequisitos

- Node.js (v16 o superior)
- npm o yarn
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`
- Cuenta en start.gg con aplicación OAuth registrada
- Cuenta en Expo para builds y notificaciones push

### URLs de Producción
- **Web App:** https://smash-ban-stages.vercel.app
- **API Backend:** https://smash-ban-stages.vercel.app/api
- **WebSocket:** wss://sweet-insight-production-80c1.up.railway.app

### 1. Configuración de start.gg OAuth

1. **Crear aplicación OAuth en start.gg:**
   - Ve a https://start.gg/admin/developer
   - Crea una nueva aplicación OAuth
   - **Nombre:** AFK Smash Mobile App
   - **Redirect URIs a configurar:**
     ```
     afk-smash://auth/callback
     exp://localhost:19000/--/auth/callback (para desarrollo)
     ```

2. **Scopes necesarios:**
   - `user:read` - Leer datos del usuario
   - `tournament:read` - Leer datos de torneos

### 2. Setup de la App Móvil

1. **Clonar y navegar:**
   ```bash
   cd "e:\Users\gabri\Documentos\Brodev Lab\Smash Ban Stages\mobile-app"
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar Expo:**
   ```bash
   eas login
   eas project:init
   ```

4. **Instalar dependencias adicionales:**
   ```bash
   npx expo install @react-native-async-storage/async-storage expo-linear-gradient
   ```

### 3. Configuración de Credenciales

1. **Actualizar start.gg Client ID:**
   ```bash
   # Editar mobile-app/src/config/startgg.ts
   # Cambiar 'your-startgg-client-id' por tu Client ID real
   ```

2. **Configurar EAS Project:**
   ```bash
   # Actualizar mobile-app/app.json
   # Cambiar 'your-project-id-here' por tu Project ID de Expo
   ```

### 4. Desarrollo y Testing

1. **Modo desarrollo:**
   ```bash
   cd mobile-app
   expo start
   ```

2. **Preview build (APK para testing):**
   ```bash
   eas build --profile preview --platform android
   ```

3. **Testing en dispositivos:**
   - **Android:** Instalar APK generado o usar Expo Go
   - **iOS:** Usar Expo Go o TestFlight (requiere Apple Developer Account)

### 5. Build para Producción

1. **Configurar app signing:**
   ```bash
   eas credentials
   ```

2. **Build Android:**
   ```bash
   eas build --profile production --platform android
   ```

3. **Build iOS:**
   ```bash
   eas build --profile production --platform ios
   ```

### 6. Publicación en Stores

1. **Google Play Store:**
   ```bash
   eas submit --platform android
   ```

2. **App Store:**
   ```bash
   eas submit --platform ios
   ```

### 5. Testing con Mock Data

La aplicación viene con datos mock para facilitar el desarrollo:

- **Torneos:** 3 torneos de ejemplo de la comunidad AFK
- **Usuarios:** Mock user con ID `mock-user-123`
- **Matches:** Matches de ejemplo para testing

### 6. Estructura del Proyecto

```
mobile-app/
├── App.tsx                 # Componente principal con navegación
├── src/
│   ├── components/         # Componentes reutilizables
│   ├── screens/           # Pantallas de la app
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   └── TournamentsScreen.tsx
│   ├── services/          # Servicios para API calls
│   │   ├── authService.ts
│   │   ├── tournamentService.ts
│   │   └── notificationService.ts
│   ├── context/           # React Context para estado global
│   │   └── AuthContext.tsx
│   ├── types/             # Definiciones de TypeScript
│   │   └── index.ts
│   └── hooks/             # Custom React hooks
└── assets/                # Imágenes y assets estáticos
```

## 🔄 Flujo de Desarrollo

### Fase 1: MVP (Actual)
- ✅ Autenticación con start.gg
- ✅ Listado de torneos
- ✅ Registro a torneos
- ✅ Sistema de notificaciones base
- ✅ API endpoints básicos

### Fase 2: Funcionalidad Completa
- [ ] Check-in real a matches
- [ ] Reporte de resultados con validación
- [ ] Panel de administración
- [ ] Integración real con start.gg API
- [ ] Base de datos real (reemplazar mocks)
- [ ] Notificaciones push reales

### Fase 3: Características Avanzadas
- [ ] Sistema de streaming integrado
- [ ] Stats de jugadores
- [ ] Chat entre jugadores
- [ ] Modo offline
- [ ] Push notifications avanzadas

## 🛠️ APIs Disponibles

### Autenticación
- `POST /api/auth/startgg/exchange` - Intercambiar código OAuth por token

### Torneos
- `GET /api/tournaments` - Listar torneos
- `POST /api/tournaments/{id}/register` - Registrarse en torneo
- `DELETE /api/tournaments/{id}/register` - Desregistrarse

### Matches
- `GET /api/matches` - Obtener matches del usuario
- `POST /api/matches/{id}/checkin` - Check-in a match
- `POST /api/matches/{id}/result` - Reportar resultado

### Notificaciones
- `POST /api/notifications/register` - Registrar token push

## 🔧 Troubleshooting

### Error: "Metro bundler no puede resolver módulos"
```bash
cd mobile-app
npx expo install --fix
```

### Error: "start.gg OAuth redirect no funciona"
- Verificar que el redirect URI esté correctamente configurado
- Asegurar que el app scheme coincida con el configurado

### Error: "No se pueden cargar los datos"
- Verificar que el servidor backend esté corriendo en puerto 3001
- Revisar las URLs en los servicios

### Error de notificaciones push
- Verificar que el proyecto de Expo esté correctamente configurado
- Confirmar que los permisos de notificaciones están habilitados

## 📱 Build para Producción

### Android
```bash
cd mobile-app
eas build --platform android
```

### iOS
```bash
cd mobile-app
eas build --platform ios
```

### Configuración EAS
```bash
cd mobile-app
eas build:configure
```

## 🚀 Deploy

1. **Backend:** Desplegar en Railway, Vercel, o similar
2. **App móvil:** Publicar en Expo o build para stores
3. **Configurar variables de entorno de producción**
4. **Configurar base de datos real**

## 📞 Soporte

Para problemas o preguntas:
1. Revisar la documentación de Expo
2. Verificar la configuración de start.gg OAuth
3. Consultar logs del servidor backend
4. Crear issue en el repositorio del proyecto