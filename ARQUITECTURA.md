# 🏗️ Arquitectura del Sistema

## 📊 Diagrama de componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIOS                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├──────┬──────┬──────┬──────┐
                              │      │      │      │      │
                         ┌────▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼───┐ │
                         │ Admin │ │Tab │ │Str │ │Mobi │ │
                         │ Panel │ │let │ │eam │ │le   │ │
                         └───┬───┘ └─┬──┘ └─┬──┘ └──┬──┘ │
                             │       │      │       │     │
                             └───────┴──────┴───────┴─────┘
                                          │
                                    HTTPS/WSS
                                          │
┌─────────────────────────────────────────▼────────────────────────┐
│                    VERCEL (Frontend)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Next.js App                                              │   │
│  │  • pages/admin/[community].js                           │   │
│  │  • pages/tablet/[sessionId].js                          │   │
│  │  • pages/stream/[sessionId].js                          │   │
│  │  • src/hooks/useWebSocket.js ◄── Conecta al WebSocket  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Environment Variables:                                          │
│  • NEXT_PUBLIC_SOCKET_URL = https://tu-servidor.onrender.com   │
└───────────────────────────────────┬───────────────────────────────┘
                                    │
                              WebSocket
                              (Socket.IO)
                                    │
┌───────────────────────────────────▼───────────────────────────────┐
│            RENDER / FLY.IO (Backend WebSocket)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Node.js Server (server/server.js)                       │   │
│  │  • HTTP Server (health checks)                          │   │
│  │  • Socket.IO Server (WebSocket)                         │   │
│  │  • Session Management (en memoria)                      │   │
│  │  • Stage Ban Logic                                      │   │
│  │  • Tournament Rules (Mendoza/Córdoba)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Puerto: 8080 (Fly.io) o variable PORT (Render)                 │
│  Endpoints:                                                       │
│  • GET /health    → Health check                                │
│  • WebSocket      → Socket.IO connection                        │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de datos

### 1. Creación de sesión

```
Admin Panel
    │
    │ 1. Crear sesión (player1, player2, format)
    ├──────────────────────────────────────────►
    │                                           WebSocket Server
    │                                                  │
    │                                           2. Crear session
    │                                              en memoria
    │                                                  │
    │ 3. session-created event                        │
    ◄──────────────────────────────────────────┤
    │                                                  │
    │ 4. Mostrar links:                               │
    │    /tablet/[sessionId]                          │
    │    /stream/[sessionId]                          │
    │
```

### 2. Join de tablet/stream

```
Tablet/Stream
    │
    │ 1. Conectar WebSocket
    ├──────────────────────────────────────────►
    │                                           WebSocket Server
    │                                                  │
    │ 2. emit('join-session', sessionId)              │
    ├──────────────────────────────────────────►     │
    │                                                  │
    │                                           3. Buscar session
    │                                              en memoria
    │                                                  │
    │ 4. session-joined event                         │
    ◄──────────────────────────────────────────┤
    │    (datos completos de la sesión)               │
    │
```

### 3. Actualización en tiempo real

```
Tablet
    │
    │ 1. Banear stage
    ├──────────────────────────────────────────►
    │                                           WebSocket Server
    │                                                  │
    │                                           2. Actualizar
    │                                              session data
    │                                                  │
    │                                           3. Broadcast a
    │                                              todos los
    │                                              clientes
    │                                                  │
    │ 4. session-updated event                        │
    ◄──────────────────────────────────────────┤
Stream                                                │
    │ 5. session-updated event                        │
    ◄──────────────────────────────────────────┘
Admin
    │ 6. session-updated event
    ◄──────────────────────────────────────────┐
```

---

## 🗂️ Estructura de datos

### Session Object (en memoria)

```javascript
{
  sessionId: 'abc123',
  player1: {
    name: 'Player 1',
    score: 2,              // Games ganados
    character: 'mario',    // Personaje actual
    wonStages: ['battlefield', 'smashville']  // DSR
  },
  player2: {
    name: 'Player 2',
    score: 1,
    character: 'fox',
    wonStages: ['pokemon-stadium-2']
  },
  format: 'BO5',           // 'BO3' o 'BO5'
  phase: 'CHARACTER',      // 'RPS', 'BAN', 'STAGE', 'CHARACTER', 'COMPLETE'
  currentGame: 2,          // Game actual (1-5)
  currentTurn: 'player1',  // Quién tiene el turno
  rpsWinner: 'player2',    // Ganador de RPS
  availableStages: [       // Stages disponibles
    'small-battlefield',
    'town-and-city',
    // ...
  ],
  bannedStages: ['hollow-bastion'],  // Stages baneados
  selectedStage: 'battlefield',      // Stage seleccionado
  createdAt: '2026-01-30T...'
}
```

---

## 🔌 Eventos WebSocket

### Cliente → Servidor (emit)

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `create-session` | `{player1, player2, format}` | Crear nueva sesión |
| `join-session` | `sessionId` | Unirse a sesión existente |
| `select-rps-winner` | `{sessionId, winner}` | Resultado de RPS |
| `ban-stage` | `{sessionId, stage}` | Banear un stage |
| `select-stage` | `{sessionId, stage}` | Seleccionar stage |
| `select-character` | `{sessionId, player, character}` | Seleccionar personaje |
| `set-game-winner` | `{sessionId, winner}` | Marcar ganador del game |

### Servidor → Cliente (on)

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `session-created` | `{session}` | Sesión creada exitosamente |
| `session-joined` | `{session}` | Unido a sesión exitosamente |
| `session-updated` | `{session}` | Sesión actualizada (broadcast) |
| `session-error` | `{message}` | Error en la sesión |
| `connect` | - | Conectado al servidor |
| `disconnect` | `reason` | Desconectado del servidor |
| `connect_error` | `error` | Error de conexión |

---

## 📁 Estructura de archivos clave

```
smash-ban-stages/
│
├── server/
│   └── server.js              ← Backend WebSocket (deploy en Render/Fly)
│
├── pages/
│   ├── admin/
│   │   └── [community].js     ← Panel de administración
│   ├── tablet/
│   │   └── [sessionId].js     ← Control de tablet
│   ├── stream/
│   │   └── [sessionId].js     ← Overlay para stream
│   └── api/
│       └── socket.js          ← API de Socket.IO (no usado en producción)
│
├── src/
│   ├── hooks/
│   │   └── useWebSocket.js    ← Hook para conectar al WebSocket
│   ├── components/
│   │   ├── AdminPanel.jsx     ← Componente de admin
│   │   ├── TabletControl.jsx  ← Componente de tablet
│   │   └── StreamOverlay.jsx  ← Componente de stream
│   └── utils/
│       ├── constants.js       ← Constantes (stages, characters)
│       └── themes.js          ← Temas visuales
│
├── public/
│   └── images/
│       ├── stages/            ← Imágenes de stages
│       └── characters/        ← Imágenes de personajes
│
└── Config files:
    ├── package.json           ← Dependencias y scripts
    ├── next.config.js         ← Config de Next.js
    ├── render.yaml            ← Config de Render
    ├── fly.toml               ← Config de Fly.io
    ├── Dockerfile             ← Docker image para Fly.io
    └── .env.example           ← Variables de entorno ejemplo
```

---

## 🌐 URLs y rutas

### Rutas del frontend (Vercel)

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Home / Selector de comunidad | Público |
| `/admin/[community]` | Panel de administración | Público |
| `/tablet/[sessionId]` | Control de tablet/baneos | Por link |
| `/stream/[sessionId]` | Overlay para OBS | Por link |

### Endpoints del backend (Render/Fly)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Health check básico |
| `/health` | GET | Health check detallado |
| `/healthz` | GET | Health check (alias) |
| WebSocket | - | Conexión Socket.IO |

---

## 🔐 Seguridad y consideraciones

### Actual (implementación básica)

- ✅ CORS abierto (`origin: "*"`)
- ✅ HTTPS en producción (Vercel/Render/Fly)
- ✅ SessionId como identificador único
- ⚠️ Sin autenticación (cualquiera con el link puede acceder)
- ⚠️ Sesiones en memoria (se pierden al reiniciar)

### Mejoras futuras (opcionales)

- [ ] Autenticación con JWT
- [ ] Persistencia en base de datos (MongoDB/PostgreSQL)
- [ ] Rate limiting (evitar spam)
- [ ] Validación de inputs
- [ ] CORS restrictivo (solo dominios permitidos)
- [ ] Sessions con expiración automática

---

## 📊 Escalabilidad

### Limitaciones actuales

| Recurso | Límite |
|---------|--------|
| **Sesiones simultáneas** | ~100-200 (depende de memoria) |
| **Conexiones WebSocket** | ~1000 (Render Free) |
| **Bandwidth** | 100GB/mes (Render Free) |
| **Memoria** | 512MB (Render Free) |

### Para escalar

Si necesitas más:

1. **Render Paid ($7/mes):**
   - 1GB RAM
   - Siempre activo
   - Más bandwidth

2. **Fly.io Paid ($5-10/mes):**
   - Múltiples instancias
   - Auto-scaling
   - Múltiples regiones

3. **Base de datos:**
   - MongoDB Atlas (gratis)
   - Redis (sesiones rápidas)
   - PostgreSQL (Render/Fly)

---

## 🧪 Testing y debugging

### Verificar conexión WebSocket

**Desde el navegador:**
```javascript
// Abrir DevTools (F12) → Console
const socket = io('https://tu-servidor.onrender.com');
socket.on('connect', () => console.log('✅ Conectado'));
socket.on('connect_error', (e) => console.error('❌', e));
```

**Desde Node.js:**
```bash
node -e "const io=require('socket.io-client');const s=io('https://tu-servidor.com');s.on('connect',()=>console.log('OK'))"
```

**Health check:**
```bash
curl https://tu-servidor.onrender.com/health
```

### Logs útiles

**Frontend (navegador):**
- F12 → Console
- Network → WS (para ver mensajes WebSocket)

**Backend:**
- Render: Dashboard → Logs
- Fly.io: `fly logs`
- Local: Terminal donde corre el servidor

---

## 🔄 Ciclo de vida

```
1. Deploy Backend (Render/Fly)
   ↓
2. Backend inicia (server.js)
   ↓
3. Socket.IO server escucha en puerto
   ↓
4. Usuario abre app (Vercel)
   ↓
5. Frontend carga (Next.js)
   ↓
6. useWebSocket hook conecta al backend
   ↓
7. WebSocket establece conexión
   ↓
8. Usuario interactúa (baneos, etc.)
   ↓
9. Eventos van por WebSocket
   ↓
10. Servidor broadcast a todos los clientes
   ↓
11. UI se actualiza en tiempo real
```

---

## 💡 Tips de arquitectura

### Por qué separar frontend y backend?

- ✅ **Vercel es gratis ilimitado** para frontend estático
- ✅ **Mejor para WebSockets** tener servidor dedicado
- ✅ **Escalabilidad independiente** de cada parte
- ✅ **Deploy independiente** (cambios en UI no afectan backend)

### Por qué Socket.IO y no WebSocket nativo?

- ✅ **Fallback automático** a polling si WebSocket falla
- ✅ **Reconnection** automática
- ✅ **Rooms y namespaces** para organizar sesiones
- ✅ **Eventos con nombres** (más fácil de manejar)
- ✅ **Broadcast** incluido

### Por qué sesiones en memoria?

- ✅ **Más rápido** que base de datos
- ✅ **Más simple** para proyecto pequeño
- ✅ **Sin costos** adicionales
- ⚠️ **Limitación:** Se pierden al reiniciar

---

**📖 Ver también:**
- [README.md](README.md) - Documentación principal
- [COMANDOS_UTILES.md](COMANDOS_UTILES.md) - Comandos de referencia
