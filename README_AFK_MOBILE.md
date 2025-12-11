# 📱 la App sin H - Sistema Móvil AFK

## 🎯 Estado del Proyecto

### ✅ Completado (Backend Infrastructure)

1. **Autenticación Start.gg OAuth**
   - `/api/auth/startgg/authorize` - Iniciar OAuth flow
   - `/api/auth/startgg/callback` - Procesar callback y crear usuario
   - `/api/auth/startgg/refresh` - Refrescar access tokens
   - `/api/auth/me` - Obtener usuario autenticado

2. **Base de Datos Supabase**
   - Schema SQL completo (`supabase-schema.sql`)
   - 7 tablas: users, tournaments, setups, matches, match_results, notifications, admin_actions
   - Row Level Security (RLS) policies
   - Triggers automáticos (updated_at, notificaciones)
   - Views para queries comunes

3. **GraphQL Start.gg Utilities**
   - Cliente GraphQL configurado (`lib/startgg.js`)
   - Queries: Usuario, torneos, sets, entrants
   - Mutations: Reportar sets, actualizar scores
   - Helpers: Mapeo de stages/characters

4. **API Endpoints**
   - `/api/tournaments/[id]/matches` - Matches del jugador
   - `/api/matches/[id]/report` - Reportar resultado
   - `/api/admin/results/[id]` - Aprobar/rechazar (admins)
   - Middleware de autenticación JWT

5. **Utilidades**
   - Cliente Supabase con funciones CRUD (`lib/supabase.js`)
   - Auth middleware reutilizable (`lib/auth-middleware.js`)
   - Manejo de sessions con JWT

### 🚧 Pendiente (Mobile App + Features)

1. **Setup Expo React Native**
   - Inicializar proyecto
   - Configurar navegación
   - Integrar OAuth WebView

2. **Pantallas Mobile**
   - Login con Start.gg
   - Home (torneos activos)
   - Match detail (TabletControl)
   - Report results
   - Admin dashboard

3. **Push Notifications**
   - Firebase Cloud Messaging setup
   - Triggers de notificaciones
   - Deep linking

4. **Sincronización Start.gg**
   - Importar torneos
   - Sync automático de brackets
   - Actualización en tiempo real

---

## 📁 Estructura de Archivos Creados

```
Smash-Ban-Stages/
├── .env.local.example          # Template de variables de entorno
├── supabase-schema.sql         # Schema completo de BD
├── PROYECTO_AFK_APP_MOVIL.md   # Documento de arquitectura
├── INSTALACION_BACKEND_AFK.md  # Guía de instalación paso a paso
│
├── lib/
│   ├── startgg.js              # Cliente GraphQL Start.gg
│   ├── supabase.js             # Cliente Supabase + utilidades
│   └── auth-middleware.js      # Middleware de autenticación
│
└── pages/api/
    ├── auth/
    │   ├── me.js                      # GET - Usuario actual
    │   └── startgg/
    │       ├── authorize.js           # GET - Iniciar OAuth
    │       ├── callback.js            # GET - Callback OAuth
    │       └── refresh.js             # POST - Refrescar token
    │
    ├── tournaments/
    │   └── [tournamentId]/
    │       └── matches.js             # GET - Matches del torneo
    │
    ├── matches/
    │   └── [matchId]/
    │       └── report.js              # POST - Reportar resultado
    │
    └── admin/
        └── results/
            └── [resultId].js          # POST - Aprobar/rechazar
```

---

## 🔑 Variables de Entorno Requeridas

Copia `.env.local.example` a `.env.local` y rellena:

```bash
# Start.gg OAuth
STARTGG_CLIENT_ID=              # De tu app OAuth en Start.gg
STARTGG_CLIENT_SECRET=          # Secret de tu app OAuth
STARTGG_REDIRECT_URI=           # URL de callback
STARTGG_API_TOKEN=              # Token personal para queries

# Supabase
NEXT_PUBLIC_SUPABASE_URL=       # URL de tu proyecto
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Key pública (anon)
SUPABASE_SERVICE_ROLE_KEY=      # Key privada (server-only)

# JWT
JWT_SECRET=                     # Genera con: openssl rand -base64 32

# Firebase (futuro)
FIREBASE_SERVER_KEY=            # Para push notifications
```

---

## 🚀 Cómo Usar

### 1. Instalación

```bash
# Instalar dependencias
npm install

# Copiar template de env
cp .env.local.example .env.local

# Editar .env.local con tus credenciales
```

### 2. Setup Supabase

```bash
# 1. Crear proyecto en https://supabase.com
# 2. Ir a SQL Editor
# 3. Ejecutar todo el contenido de supabase-schema.sql
```

### 3. Configurar Start.gg OAuth

```bash
# 1. Crear app en https://start.gg/admin/profile/developer/applications
# 2. Configurar Redirect URI: tu-dominio/api/auth/startgg/callback
# 3. Copiar Client ID y Secret a .env.local
```

### 4. Desarrollo Local

```bash
npm run dev
```

Abre http://localhost:3000

### 5. Testing OAuth Flow

```bash
# Visita en tu navegador:
http://localhost:3000/api/auth/startgg/authorize

# Deberías:
# 1. Ser redirigido a Start.gg
# 2. Autorizar la app
# 3. Volver con sesión creada
# 4. Ver tu usuario en Supabase
```

---

## 🔌 API Reference

### Autenticación

#### `GET /api/auth/startgg/authorize`
Inicia el flujo OAuth con Start.gg.

**Response:** Redirect a Start.gg

---

#### `GET /api/auth/startgg/callback`
Procesa el callback de Start.gg.

**Query Params:**
- `code` - Authorization code de Start.gg
- `state` - CSRF protection token

**Response:** Redirect con session cookie

---

#### `GET /api/auth/me`
Obtiene el usuario autenticado.

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "gamer_tag": "MkLeo",
    "prefix": "T1",
    "email": "leo@example.com",
    "avatar_url": "https://...",
    "is_admin": false
  }
}
```

---

### Matches

#### `GET /api/tournaments/:tournamentId/matches`
Obtiene los matches del jugador en un torneo.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "matches": [
    {
      "id": "uuid",
      "round_text": "Winner's Finals",
      "state": "called",
      "player1_name": "MkLeo",
      "player2_name": "Tweek",
      "setup": {
        "name": "Setup 3"
      }
    }
  ]
}
```

---

#### `POST /api/matches/:matchId/report`
Reporta el resultado de un match.

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "winnerId": "uuid",
  "player1Score": 3,
  "player2Score": 1,
  "gamesData": [
    {
      "gameNum": 1,
      "winnerId": "uuid",
      "stageId": 1,
      "characters": [
        { "entrantId": 123, "characterId": 70 }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "id": "uuid",
    "status": "pending",
    "message": "Result submitted for admin approval"
  }
}
```

---

### Admin

#### `POST /api/admin/results/:resultId`
Aprueba o rechaza un resultado (solo admins).

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "action": "approve",  // or "reject"
  "reason": "Score incorrecto"  // required for reject
}
```

**Response:**
```json
{
  "success": true,
  "message": "Result approved",
  "result": {
    "id": "uuid",
    "status": "approved",
    "synced_to_startgg": true
  }
}
```

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│  Mobile App     │
│  (Expo/RN)      │
│  - Login OAuth  │
│  - Match View   │
│  - Report       │
└────────┬────────┘
         │
         │ HTTPS/JWT
         ▼
┌─────────────────┐      ┌──────────────┐
│  Next.js API    │◄────►│  Supabase    │
│  - Auth         │      │  - Users     │
│  - Matches      │      │  - Matches   │
│  - Admin        │      │  - Results   │
└────────┬────────┘      └──────────────┘
         │
         │ GraphQL
         ▼
┌─────────────────┐
│  Start.gg API   │
│  - Tournaments  │
│  - Sets         │
│  - Report       │
└─────────────────┘
```

---

## 🔐 Seguridad

### JWT Tokens
- Generados con `jsonwebtoken`
- Expiración: 7 días
- Almacenados en HttpOnly cookies (web) o secure storage (mobile)

### Supabase RLS
- Row Level Security habilitado en todas las tablas
- Usuarios solo ven sus propios datos
- Admins tienen permisos especiales

### Start.gg Tokens
- Access tokens encriptados en BD
- Refresh tokens para renovación automática
- Scopes mínimos necesarios

---

## 📊 Database Schema

### users
- Usuarios autenticados con Start.gg
- Almacena tokens OAuth
- Push notification tokens

### tournaments
- Torneos importados de Start.gg
- Configuración de auto-sync
- Por comunidad (afk, cordoba, mendoza)

### matches
- Sets del bracket
- Asignación a setups
- Estados: pending, called, in_progress, completed

### match_results
- Resultados reportados por jugadores
- Workflow de aprobación admin
- Sincronización a Start.gg

### setups
- Consolas físicas en el venue
- Disponibilidad
- Stream vs regular

### notifications
- Push notifications enviadas
- Estado de lectura
- Deep links

### admin_actions
- Audit log de acciones admin
- Trazabilidad completa

---

## 🧪 Testing

### Unit Tests (TODO)
```bash
npm test
```

### API Testing con curl

**Login flow:**
```bash
# 1. Obtener session token
open http://localhost:3000/api/auth/startgg/authorize

# 2. Copiar token de cookie/dev tools
export TOKEN="tu_token_aqui"

# 3. Test endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/me
```

---

## 📱 Próximos Pasos

### Inmediato (Semana 1-2)
1. [ ] Configurar credenciales (Start.gg, Supabase, Firebase)
2. [ ] Ejecutar schema SQL en Supabase
3. [ ] Testear OAuth flow completo
4. [ ] Crear primer usuario admin

### Mobile App (Semana 3-4)
1. [ ] Inicializar proyecto Expo
2. [ ] Configurar navegación
3. [ ] Pantalla de login con WebView
4. [ ] Home con lista de torneos

### Features (Semana 5-8)
1. [ ] Import torneos desde Start.gg
2. [ ] Sistema de notificaciones push
3. [ ] Reportar resultados desde app
4. [ ] Panel admin en mobile

### Deploy (Semana 9-10)
1. [ ] Build Android (APK/AAB)
2. [ ] Build iOS (TestFlight)
3. [ ] Testing con usuarios reales
4. [ ] Publicar en stores

---

## 🆘 Troubleshooting

Ver [INSTALACION_BACKEND_AFK.md](./INSTALACION_BACKEND_AFK.md) sección de Troubleshooting.

---

## 📞 Contacto

Para dudas o soporte, revisar:
- [PROYECTO_AFK_APP_MOVIL.md](./PROYECTO_AFK_APP_MOVIL.md) - Arquitectura completa
- [INSTALACION_BACKEND_AFK.md](./INSTALACION_BACKEND_AFK.md) - Guía paso a paso

---

## 📄 Licencia

Proyecto privado para comunidad AFK de Smash Bros.

---

**¿Listo para empezar? Sigue [INSTALACION_BACKEND_AFK.md](./INSTALACION_BACKEND_AFK.md)** 🚀
