# ✅ Checklist de Implementación - la App sin H Mobile

## 📋 Fase 1: Backend Infrastructure (COMPLETADO ✅)

### Autenticación & Seguridad
- [x] API endpoint: `/api/auth/startgg/authorize`
- [x] API endpoint: `/api/auth/startgg/callback`
- [x] API endpoint: `/api/auth/startgg/refresh`
- [x] API endpoint: `/api/auth/me`
- [x] Middleware de autenticación JWT
- [x] Sistema de session cookies HttpOnly

### Base de Datos
- [x] Schema SQL completo (7 tablas)
- [x] Row Level Security policies
- [x] Triggers automáticos (updated_at)
- [x] Views para queries comunes
- [x] Indexes optimizados

### GraphQL Start.gg
- [x] Cliente GraphQL configurado
- [x] Queries: usuarios, torneos, sets, entrants
- [x] Mutations: reportar sets, actualizar scores
- [x] Mapeo de stages/characters a IDs Start.gg

### APIs de Matches
- [x] GET `/api/tournaments/[id]/matches`
- [x] POST `/api/matches/[id]/report`
- [x] POST `/api/admin/results/[id]` (aprobar/rechazar)

### Utilidades
- [x] Cliente Supabase con funciones CRUD
- [x] Helpers para manejo de usuarios, torneos, matches
- [x] Sistema de notificaciones (base)

### Documentación
- [x] Documento de arquitectura completa
- [x] Guía de instalación paso a paso
- [x] README técnico con API reference
- [x] Script de setup automatizado

---

## 📋 Fase 2: Configuración Inicial (PENDIENTE)

### Start.gg
- [ ] Crear aplicación OAuth en Start.gg
  - [ ] Configurar nombre: "la App sin H - AFK"
  - [ ] Configurar Redirect URI
  - [ ] Obtener Client ID
  - [ ] Obtener Client Secret
- [ ] Crear API Token personal
- [ ] Agregar credenciales a `.env.local`

### Supabase
- [ ] Crear proyecto "la-app-sin-h-afk"
- [ ] Ejecutar `supabase-schema.sql` completo
- [ ] Verificar que se crearon las 7 tablas
- [ ] Obtener Project URL
- [ ] Obtener anon key
- [ ] Obtener service_role key
- [ ] Agregar credenciales a `.env.local`

### Firebase
- [ ] Crear proyecto "la-app-sin-h"
- [ ] Habilitar Cloud Messaging
- [ ] Descargar `google-services.json` (Android)
- [ ] Descargar `GoogleService-Info.plist` (iOS)
- [ ] Obtener Server Key
- [ ] Agregar a `.env.local`

### Local Setup
- [ ] Ejecutar `npm install`
- [ ] Ejecutar `./setup-backend.sh`
- [ ] Configurar todas las variables en `.env.local`
- [ ] Testear servidor local: `npm run dev`
- [ ] Verificar OAuth flow funcionando

---

## 📋 Fase 3: Mobile App Setup (PENDIENTE)

### Inicializar Proyecto Expo
- [ ] Instalar Expo CLI: `npm install -g expo-cli`
- [ ] Crear proyecto: `npx create-expo-app la-app-sin-h-mobile`
- [ ] Configurar `app.json` (bundle ID, scheme)
- [ ] Setup EAS Build: `eas build:configure`

### Dependencias Mobile
- [ ] `expo-auth-session` - OAuth flow
- [ ] `expo-web-browser` - WebView para login
- [ ] `@react-navigation/native` - Navegación
- [ ] `@react-navigation/stack` - Stack navigation
- [ ] `expo-notifications` - Push notifications
- [ ] `@supabase/supabase-js` - Cliente DB
- [ ] `expo-secure-store` - Almacenar tokens
- [ ] `@react-native-async-storage/async-storage` - Cache

### Configuración Expo
- [ ] Configurar deep linking scheme: `la-app-sin-h://`
- [ ] Agregar Firebase config (Android)
- [ ] Agregar Firebase config (iOS)
- [ ] Configurar push notification permissions

---

## 📋 Fase 4: Pantallas Mobile (PENDIENTE)

### Navigation Setup
- [ ] Configurar React Navigation
- [ ] Auth Stack (login)
- [ ] Main Stack (home, match, profile)
- [ ] Admin Stack (dashboard, results)

### Pantalla: Login
- [ ] Diseño UI (logo, botón Start.gg)
- [ ] WebView OAuth flow
- [ ] Manejo de deep link callback
- [ ] Guardar session token en SecureStore
- [ ] Transición a Home al autenticar

### Pantalla: Home
- [ ] Header con avatar y gamer tag
- [ ] Lista de torneos activos
- [ ] Card por torneo (nombre, fecha)
- [ ] Badge de "próximo match"
- [ ] Pull to refresh
- [ ] Navigate a Match detail

### Pantalla: Match Detail
- [ ] Adaptar TabletControl.jsx a React Native
- [ ] Mostrar info del match (round, opponent)
- [ ] Setup asignado
- [ ] Fase RPS (si aplica)
- [ ] Selección de stages
- [ ] Selección de personajes
- [ ] Botón "Reportar Resultado"

### Pantalla: Report Result
- [ ] Formulario de scores
- [ ] Selector de ganador
- [ ] (Opcional) Detalles por game
- [ ] Confirmar y enviar
- [ ] Feedback de éxito/error
- [ ] Navigate back a Home

### Pantalla: Admin Dashboard
- [ ] Lista de resultados pendientes
- [ ] Card por resultado (match, scores, reporter)
- [ ] Botones: Aprobar / Rechazar
- [ ] Modal para motivo de rechazo
- [ ] Indicador de sincronización Start.gg
- [ ] Pull to refresh

### Pantalla: Profile
- [ ] Avatar y datos del usuario
- [ ] Historial de matches
- [ ] Configuración de notificaciones
- [ ] Logout

---

## 📋 Fase 5: Features Avanzadas (PENDIENTE)

### Push Notifications
- [ ] Implementar Firebase Cloud Messaging
- [ ] Registrar push token al login
- [ ] Trigger: Setup asignado
- [ ] Trigger: Match llamado
- [ ] Trigger: Resultado aprobado/rechazado
- [ ] Deep linking desde notificación
- [ ] Badge count de notificaciones no leídas

### Sincronización Start.gg
- [ ] Función: Importar torneo por slug
- [ ] Función: Sync sets de una phase
- [ ] Función: Vincular users con entrants
- [ ] Polling periódico (cada 30s en torneo activo)
- [ ] Webhook listener (si Start.gg lo soporta)
- [ ] Actualización en tiempo real via Supabase Realtime

### Gestión de Setups
- [ ] Admin: Crear/editar setups
- [ ] Admin: Asignar match a setup
- [ ] Admin: Marcar setup disponible/ocupado
- [ ] Jugador: Ver ubicación del setup
- [ ] Jugador: Confirmar llegada a setup
- [ ] Notificación si jugador no llega (timeout)

### Offline Support
- [ ] Cache de datos con AsyncStorage
- [ ] Queue de actions pendientes
- [ ] Sincronizar cuando vuelva conexión
- [ ] Indicador de modo offline
- [ ] Refresh manual de datos

### Analytics & Logs
- [ ] Tracking de eventos (login, report, etc)
- [ ] Error logging (Sentry o similar)
- [ ] Performance monitoring
- [ ] Crash reports

---

## 📋 Fase 6: Testing & QA (PENDIENTE)

### Unit Tests
- [ ] Tests de utilidades Start.gg
- [ ] Tests de cliente Supabase
- [ ] Tests de auth middleware
- [ ] Tests de helpers

### Integration Tests
- [ ] OAuth flow completo
- [ ] Report result → Approve → Sync
- [ ] Notificaciones push
- [ ] Realtime subscriptions

### E2E Tests (Detox)
- [ ] Login flow
- [ ] Ver torneos
- [ ] Reportar resultado
- [ ] Aprobar como admin
- [ ] Recibir notificación

### Manual Testing
- [ ] Testing en Android físico
- [ ] Testing en iOS físico
- [ ] Testing con usuarios reales AFK
- [ ] Validación de UX
- [ ] Bug fixing

---

## 📋 Fase 7: Deploy & Launch (PENDIENTE)

### Backend Deploy
- [ ] Deploy a Vercel producción
- [ ] Configurar variables de entorno en Vercel
- [ ] Actualizar Redirect URI en Start.gg
- [ ] Setup dominio custom (opcional)
- [ ] Configurar HTTPS/SSL

### Mobile Build Android
- [ ] Configurar keystore
- [ ] Build APK de prueba
- [ ] Testing en dispositivos
- [ ] Build AAB para Play Store
- [ ] Crear listing en Google Play
- [ ] Screenshots y descripción
- [ ] Publicar en beta testing
- [ ] Release a producción

### Mobile Build iOS
- [ ] Configurar Apple Developer account
- [ ] Crear App ID y certificates
- [ ] Build para TestFlight
- [ ] Testing interno
- [ ] Testing externo (beta)
- [ ] Crear listing en App Store
- [ ] Screenshots y descripción
- [ ] Submit for review
- [ ] Release a producción

### Post-Launch
- [ ] Monitoreo de errores
- [ ] Feedback de usuarios
- [ ] Hotfixes si necesario
- [ ] Plan de updates futuros

---

## 📊 Progreso General

### Completado
- ✅ **Backend Infrastructure** (100%)
- ✅ **Documentación** (100%)

### En Progreso
- 🚧 **Configuración Inicial** (0%)

### Pendiente
- ⏳ **Mobile App Setup** (0%)
- ⏳ **Pantallas Mobile** (0%)
- ⏳ **Features Avanzadas** (0%)
- ⏳ **Testing & QA** (0%)
- ⏳ **Deploy & Launch** (0%)

---

## 🎯 Próximo Paso Inmediato

**👉 Configurar credenciales de Start.gg y Supabase**

1. Ve a https://start.gg/admin/profile/developer/applications
2. Crea tu aplicación OAuth
3. Guarda credenciales en `.env.local`
4. Ejecuta `./setup-backend.sh`
5. Testea OAuth flow

---

## 📞 Necesitas Ayuda?

- **Arquitectura:** Lee `PROYECTO_AFK_APP_MOVIL.md`
- **Instalación:** Sigue `INSTALACION_BACKEND_AFK.md`
- **API Docs:** Consulta `README_AFK_MOBILE.md`
- **Troubleshooting:** Busca en la sección de cada doc

---

**Última actualización:** Diciembre 10, 2025
**Estado:** Backend completado, listo para configuración
