# Proyecto AFK - Aplicación Móvil

## 🎯 Objetivos del Proyecto

Crear una aplicación móvil multiplataforma (Android/iOS) que funcione como complemento del sistema de baneos actual, específicamente diseñada para la comunidad AFK con las siguientes funcionalidades principales:

### 🔐 Autenticación
- Login con start.gg usando OAuth
- Gestión de sesiones de usuario
- Verificación de inscripción a torneos

### 👥 Funcionalidades para Jugadores
- Ver torneos de la comunidad AFK
- Inscribirse a torneos (con verificación en start.gg)
- Recibir notificaciones push cuando les toca jugar
- Check-in antes de cada match
- Reportar resultados directamente al panel de admin
- Ver información del setup asignado

### 🛠️ Panel de Administración (Web/App)
- Dashboard para admins de torneos
- Subir resultados al bracket de start.gg automáticamente
- Gestionar assignments de setups
- Enviar notificaciones a jugadores específicos
- Control de check-ins por match

### 📺 Integración con Streaming
- Uso del sistema de streaming existente
- Selección de matches para stream
- Integración con el overlay actual

## 🏗️ Arquitectura Técnica

### Stack de la App Móvil
- **Framework**: React Native con Expo
- **Autenticación**: OAuth 2.0 con start.gg
- **Comunicación**: WebSocket + REST API
- **Notificaciones**: Expo Push Notifications
- **Estado**: Context API + AsyncStorage
- **Navegación**: React Navigation

### Backend Extensions
- Nuevos endpoints para la API mobile
- Integración con start.gg API
- Sistema de notificaciones push
- Gestión de torneos y inscripciones

### Base de Datos
- Extensión del sistema actual con nuevas entidades:
  - Users (vinculados a start.gg)
  - Tournaments
  - Registrations
  - Matches
  - SetupAssignments

## 🔄 Flujo de Trabajo

### 1. Registro/Login
1. Usuario abre la app
2. Presiona "Iniciar sesión con start.gg"
3. OAuth flow redirecciona a start.gg
4. Usuario autoriza la aplicación
5. App recibe token y datos del usuario
6. Se crea/actualiza perfil local

### 2. Inscripción a Torneo
1. Usuario ve lista de torneos AFK disponibles
2. Selecciona torneo y se inscribe
3. App valida inscripción con start.gg
4. Se registra en el sistema local para notificaciones

### 3. Día del Torneo - Jugador
1. Usuario recibe notificación: "Tu match vs [Oponente] en Setup X"
2. Ambos jugadores hacen check-in en la app
3. Juegan el set
4. Ambos reportan resultado (debe coincidir)
5. Resultado se envía al admin panel

### 4. Día del Torneo - Admin
1. Admin ve dashboard con todos los matches
2. Asigna setups a matches específicos
3. Puede forzar resultados si hay discrepancia
4. Sube resultados a start.gg automáticamente
5. Selecciona matches para stream

## 📱 Wireframes/Mockups

### Pantallas Principales
1. **Login**: Botón grande "Login with start.gg"
2. **Home**: Lista de torneos, perfil, notificaciones
3. **Torneo Detail**: Info del torneo, botón inscribirse
4. **Match Notification**: Info del match, check-in, setup
5. **Result Report**: Selección de ganador, confirmación
6. **Admin Dashboard**: Lista de matches, assignments, stream

### Navegación
- Tab Navigation: Home, Tournaments, Profile, Admin (si es admin)
- Modal screens para notifications y result reporting

## 🔧 Implementación Fase 1

### MVP Features
- [ ] Login con start.gg
- [ ] Ver torneos AFK
- [ ] Inscripción básica
- [ ] Notificaciones push simples
- [ ] Check-in básico
- [ ] Report results básico
- [ ] Admin panel web básico

### Endpoints API Nuevos
```
POST /api/auth/startgg - OAuth callback
GET /api/tournaments - Lista torneos
POST /api/tournaments/:id/register - Inscribirse
GET /api/matches/mine - Matches del usuario
POST /api/matches/:id/checkin - Check-in
POST /api/matches/:id/result - Reportar resultado
GET /api/admin/tournaments/:id - Dashboard admin
POST /api/admin/matches/:id/assign-setup - Asignar setup
```

### Estructura de Carpetas Móvil
```
mobile-app/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── callback.tsx
│   ├── (tabs)/
│   │   ├── index.tsx (Home)
│   │   ├── tournaments.tsx
│   │   ├── profile.tsx
│   │   └── admin.tsx
│   └── match/
│       ├── [id].tsx
│       └── result.tsx
├── components/
├── hooks/
├── services/
└── types/
```

## 🚀 Plan de Desarrollo

### Semana 1: Setup y Autenticación
- Configurar React Native con Expo
- Implementar OAuth con start.gg
- Crear endpoints básicos de auth

### Semana 2: Core Features
- Listar torneos y inscripciones
- Sistema de notificaciones push
- Check-in y result reporting

### Semana 3: Admin Panel
- Dashboard para admins
- Gestión de setups y assignments
- Integración con start.gg API

### Semana 4: Integración y Testing
- Conectar con sistema de streaming existente
- Testing end-to-end
- Deploy y distribución

## 📊 Consideraciones Técnicas

### start.gg API Integration
- OAuth 2.0 para autenticación
- GraphQL API para datos de torneos
- Webhooks para actualizaciones en tiempo real
- Rate limiting considerations

### Notificaciones Push
- Expo Push Notifications
- Targeting específico por usuario/match
- Manejo de permisos y estados

### Sincronización de Datos
- WebSocket para updates en tiempo real
- Conflict resolution para resultados
- Offline support básico

### Seguridad
- Token management seguro
- Validación server-side de acciones
- Rate limiting por usuario
- Verificación de permisos de admin

## 🔗 Integración con Sistema Actual

El sistema actual maneja:
- Baneos de stages (se mantiene)
- Streaming overlay (se reutiliza)
- WebSocket infrastructure (se extiende)

La app móvil añade:
- Gestión de torneos y usuarios
- Notificaciones y assignments
- Integration con start.gg
- Admin tools para tournaments

## 📝 Notas de Desarrollo

- Usar el sistema de temas existente para consistencia visual
- Mantener compatibilidad con el sistema actual de sesiones
- Considerar escalabilidad para múltiples comunidades futuras
- Documentation y testing comprehensive