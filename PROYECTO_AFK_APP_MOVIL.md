# 📱 Proyecto: la App sin H - Versión Móvil para AFK

## 🎯 Objetivo
Crear una aplicación móvil (Android/iOS) para la comunidad **AFK** que permita:
- Autenticación con Start.gg OAuth
- Notificaciones de setups y partidas
- Carga de resultados desde cualquier setup
- Sincronización automática con brackets de Start.gg

**Importante:** Córdoba y Mendoza mantienen el sistema actual web sin cambios.

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

#### Frontend Móvil
- **Expo + React Native** (recomendado)
  - Ventajas: Reutilizar código React existente, desarrollo rápido
  - Soporte: Android + iOS desde un solo codebase
  - OTA Updates: Actualizaciones sin pasar por stores
  - EAS Build: Compilación en la nube

#### Backend
- **Next.js API Routes** (sistema actual extendido)
  - `/api/auth/startgg` - OAuth flow
  - `/api/matches/assign` - Asignación de setups
  - `/api/matches/report` - Carga de resultados
  - `/api/admin/validate` - Validación de admins

#### Base de Datos
- **Supabase** (PostgreSQL + Realtime)
  - Usuarios con tokens de Start.gg
  - Matches/Sets pendientes
  - Resultados reportados
  - Configuración de setups/consolas
  - Subscriptions en tiempo real

#### Notificaciones
- **Expo Notifications** + **Firebase Cloud Messaging**
  - Push notifications cross-platform
  - Triggers: setup asignado, match llamado, resultado aprobado

---

## 🔐 Sistema de Autenticación Start.gg

### Flujo OAuth 2.0

```
1. Usuario toca "Iniciar sesión con Start.gg"
2. App redirige a: https://start.gg/oauth/authorize
3. Usuario autoriza en Start.gg
4. Start.gg redirige con authorization code
5. Backend intercambia code por access_token
6. Backend guarda token + refresh_token en Supabase
7. App recibe session token propio
```

### Scopes Necesarios
```
user.identity    - Nombre, avatar, gamer tag
user.email       - Email del usuario
tournament.admin - Para TO's reportar resultados (opcional)
```

### Datos del Usuario Start.gg
```graphql
query GetCurrentUser {
  currentUser {
    id
    gamerTag
    prefix
    name
    location {
      city
      state
      country
    }
    images {
      url
      type
    }
  }
}
```

---

## 🏟️ Sistema de Torneos y Matches

### Flujo de Torneo

```
1. Admin crea torneo en Start.gg
2. Admin vincula torneo en la App sin H
3. App obtiene bracket via GraphQL
4. Jugadores se registran con Start.gg OAuth
5. App sincroniza entrants del torneo
```

### Query de Torneo Start.gg
```graphql
query GetTournament($slug: String!) {
  tournament(slug: $slug) {
    id
    name
    events {
      id
      name
      phases {
        id
        name
        sets(perPage: 100) {
          nodes {
            id
            fullRoundText
            round
            state
            slots {
              entrant {
                id
                name
                participants {
                  gamerTag
                  user {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 📊 Estructura de Base de Datos (Supabase)

### Tabla: `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startgg_user_id INTEGER UNIQUE NOT NULL,
  gamer_tag TEXT NOT NULL,
  prefix TEXT,
  email TEXT,
  avatar_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  push_token TEXT, -- Para notificaciones
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: `tournaments`
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startgg_tournament_id INTEGER UNIQUE NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  community TEXT CHECK (community IN ('afk')), -- Solo AFK por ahora
  event_id INTEGER,
  phase_id INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: `setups`
```sql
CREATE TABLE setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id),
  name TEXT NOT NULL, -- "Setup 1", "Stream Setup", etc.
  type TEXT CHECK (type IN ('regular', 'stream')),
  is_available BOOLEAN DEFAULT TRUE,
  assigned_device_id TEXT, -- Device fijo para stream
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: `matches`
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id),
  startgg_set_id INTEGER UNIQUE NOT NULL,
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  setup_id UUID REFERENCES setups(id),
  round_text TEXT,
  state TEXT CHECK (state IN ('pending', 'called', 'in_progress', 'completed')),
  called_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: `match_results`
```sql
CREATE TABLE match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  reported_by UUID REFERENCES users(id),
  winner_id UUID REFERENCES users(id),
  player1_score INTEGER NOT NULL,
  player2_score INTEGER NOT NULL,
  stage_selections JSONB, -- Stages elegidos por game
  character_selections JSONB, -- Personajes por game
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id), -- Admin que revisó
  reviewed_at TIMESTAMP,
  synced_to_startgg BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔔 Sistema de Notificaciones

### Triggers de Notificación

#### 1. Setup Asignado
```
Título: "¡Tu match está listo!"
Mensaje: "[Round] vs [Oponente] - Setup [N]"
Acción: Abrir app en pantalla de match
```

#### 2. Match Llamado
```
Título: "¡Es tu turno!"
Mensaje: "Dirígete a Setup [N] para jugar vs [Oponente]"
Acción: Confirmar asistencia
```

#### 3. Resultado Aprobado
```
Título: "Resultado confirmado"
Mensaje: "Tu set vs [Oponente] fue aprobado"
Acción: Ver bracket actualizado
```

### Implementación Firebase
```javascript
// Backend: Enviar notificación
await admin.messaging().send({
  token: user.push_token,
  notification: {
    title: '¡Tu match está listo!',
    body: 'Winner Finals vs MkLeo - Setup 2'
  },
  data: {
    type: 'match_assigned',
    match_id: match.id,
    setup_id: setup.id
  },
  android: {
    priority: 'high',
    notification: { sound: 'default' }
  },
  apns: {
    payload: {
      aps: { sound: 'default' }
    }
  }
});
```

---

## 📱 Pantallas de la App Móvil

### 1. Auth Screen
- Logo "la App sin H"
- Botón único: "Iniciar sesión con Start.gg"
- WebView para OAuth flow

### 2. Home Screen
```
┌─────────────────────────────┐
│ 👤 [Avatar] Hola, [GamerTag] │
├─────────────────────────────┤
│ 🏆 Torneos Activos           │
│                              │
│ ┌─────────────────────────┐ │
│ │ AFK Monthly #42         │ │
│ │ Winner's Finals         │ │
│ │ Setup 3 - En progreso   │ │
│ └─────────────────────────┘ │
│                              │
│ 📋 Próximo Match            │
│ ┌─────────────────────────┐ │
│ │ Loser's R2              │ │
│ │ vs. Sparg0              │ │
│ │ Setup: Por asignar      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### 3. Match Screen (Tablet Interface)
- **Reutilizar TabletControl.jsx existente**
- Adaptado a React Native
- Selección de stages/personajes
- Botón "Reportar Resultado"

### 4. Report Result Screen
```
┌─────────────────────────────┐
│ Reportar Resultado          │
├─────────────────────────────┤
│ [Player1] vs [Player2]      │
│                              │
│ Score [Player1]: [▲2▼]      │
│ Score [Player2]: [▲1▼]      │
│                              │
│ Ganador: [✓ Player1]        │
│                              │
│ [Confirmar Resultado] 📤    │
└─────────────────────────────┘
```

### 5. Admin Dashboard
```
┌─────────────────────────────┐
│ Panel Admin - AFK           │
├─────────────────────────────┤
│ 🔴 Resultados Pendientes (3)│
│                              │
│ ┌─────────────────────────┐ │
│ │ Winner's Finals         │ │
│ │ MkLeo 3-1 Tweek        │ │
│ │ Reportado por: MkLeo    │ │
│ │ [✓ Aprobar] [✗ Rechazar]│ │
│ └─────────────────────────┘ │
│                              │
│ 📊 Setups Activos           │
│ ┌─────────────────────────┐ │
│ │ Setup 1: Disponible     │ │
│ │ Setup 2: En uso         │ │
│ │ Stream: Asignado        │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## 🔄 Sincronización con Start.gg

### Mutation: Reportar Resultado
```graphql
mutation ReportBracketSet($setId: ID!, $winnerId: ID!, $gameData: [BracketSetGameDataInput]) {
  reportBracketSet(setId: $setId, winnerId: $winnerId, gameData: $gameData) {
    id
    state
    slots {
      standing {
        stats {
          score {
            value
          }
        }
      }
    }
  }
}
```

### Variables Example
```json
{
  "setId": 12345678,
  "winnerId": 987654,
  "gameData": [
    {
      "winnerId": 987654,
      "gameNum": 1,
      "stageId": 1, // Battlefield
      "selections": [
        { "entrantId": 987654, "characterId": 70 }, // Fox
        { "entrantId": 123456, "characterId": 23 }  // Marth
      ]
    }
  ]
}
```

---

## 🚀 Fases de Implementación

### Fase 1: Setup Básico (Semana 1-2)
- ✅ Crear aplicación OAuth en Start.gg
- ✅ Setup proyecto Expo React Native
- ✅ Configurar Supabase database
- ✅ Implementar OAuth flow completo
- ✅ Pantalla de login funcional

### Fase 2: Core Features (Semana 3-4)
- ✅ Query torneos desde Start.gg
- ✅ Sistema de matches y setups
- ✅ Pantalla de home con torneos activos
- ✅ Adaptar TabletControl a React Native
- ✅ Reportar resultados localmente

### Fase 3: Admin & Sync (Semana 5-6)
- ✅ Dashboard admin en app móvil
- ✅ Sistema de aprobación de resultados
- ✅ Mutation a Start.gg para sync automática
- ✅ Testing de sincronización end-to-end

### Fase 4: Notificaciones (Semana 7-8)
- ✅ Setup Firebase Cloud Messaging
- ✅ Registro de push tokens
- ✅ Triggers para setups asignados
- ✅ Notificaciones de match llamado
- ✅ Testing en dispositivos físicos

### Fase 5: Polish & Deploy (Semana 9-10)
- ✅ UI/UX refinement
- ✅ Testing con usuarios AFK
- ✅ Build para Android (APK/AAB)
- ✅ Build para iOS (TestFlight)
- ✅ Deployment a Google Play / App Store

---

## 📋 Checklist Pre-Implementación

### Start.gg
- [ ] Crear aplicación OAuth en https://start.gg/admin/profile/developer/applications
- [ ] Configurar redirect URI: `la-app-sin-h://oauth/callback`
- [ ] Obtener Client ID y Client Secret
- [ ] Generar API token personal para testing

### Expo/React Native
- [ ] Instalar Expo CLI: `npm install -g expo-cli`
- [ ] Crear proyecto: `expo init la-app-sin-h-mobile`
- [ ] Configurar app.json con bundle ID
- [ ] Setup EAS Build: `eas build:configure`

### Supabase
- [ ] Crear proyecto en https://supabase.com
- [ ] Crear tablas (users, tournaments, setups, matches, match_results)
- [ ] Configurar Row Level Security (RLS)
- [ ] Obtener API keys (anon, service_role)

### Firebase
- [ ] Crear proyecto en https://console.firebase.google.com
- [ ] Habilitar Cloud Messaging
- [ ] Descargar google-services.json (Android)
- [ ] Descargar GoogleService-Info.plist (iOS)

### Next.js Backend
- [ ] Crear rutas API en `/api/startgg/`
- [ ] Variables de entorno (.env.local):
  ```
  STARTGG_CLIENT_ID=xxx
  STARTGG_CLIENT_SECRET=xxx
  STARTGG_API_TOKEN=xxx
  SUPABASE_URL=xxx
  SUPABASE_SERVICE_KEY=xxx
  FIREBASE_SERVER_KEY=xxx
  ```

---

## 🛡️ Seguridad

### JWT Tokens
- Access token de Start.gg almacenado encriptado
- Session token propio de la app (corta duración)
- Refresh tokens para renovación automática

### Validaciones
- Solo usuarios autenticados pueden reportar
- Admins verificados pueden aprobar/rechazar
- Rate limiting en API endpoints
- Validación de permisos por torneo

### Privacidad
- No guardar datos sensibles en plain text
- HTTPS/TLS para todas las comunicaciones
- Cumplimiento GDPR (derecho a borrar cuenta)

---

## 🧪 Testing

### Unit Tests
- OAuth flow con tokens mock
- GraphQL queries/mutations
- Validación de resultados

### Integration Tests
- Flujo completo: login → match → report → sync
- Notificaciones push
- Realtime subscriptions Supabase

### E2E Tests
- Detox para React Native
- Simulación de torneo completo
- Testing en dispositivos reales (Android/iOS)

---

## 📞 Soporte y Documentación

### Para Jugadores
- Tutorial in-app al primer uso
- FAQ dentro de la app
- Notificación de ayuda en primer match

### Para Admins
- Video tutorial de gestión de torneo
- Manual de aprobación de resultados
- Troubleshooting común

### Para Developers
- README técnico en repo
- Swagger/OpenAPI para API
- Diagrams de arquitectura (Mermaid)

---

## 🎯 Próximos Pasos Inmediatos

1. **Crear aplicación OAuth en Start.gg**
2. **Inicializar proyecto Expo**
3. **Setup Supabase database**
4. **Implementar pantalla de login**

¿Quieres que empiece con alguna de estas tareas específicas?
