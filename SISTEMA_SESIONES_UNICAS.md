# Sistema de Sesiones Únicas por Comunidad

## 🎯 Problema Resuelto

**Antes**: Todas las comunidades compartían el mismo `sessionId` (el nombre de la comunidad), causando que:
- Solo pudiera haber UNA sesión activa por comunidad
- Córdoba, AFK y Mendoza no podían tener torneos simultáneos
- Los datos se mezclaban entre diferentes partidas

**Ahora**: Cada sesión tiene un ID único generado automáticamente, permitiendo:
- ✅ Múltiples sesiones simultáneas en la misma comunidad
- ✅ Córdoba, AFK y Mendoza pueden tener torneos al mismo tiempo
- ✅ Los datos están completamente aislados entre sesiones
- ✅ Cada stream/tablet tiene su propio link único

## 🔧 Cómo Funciona

### 1. Generación de Session ID Único

Cada sesión ahora tiene un ID único generado con este formato:
```
[comunidad]-[timestamp]-[random]
```

**Ejemplo**:
```
cordoba-1702234567890-a4f9x2k
afk-1702234567891-b8g3y5m
mendoza-1702234567892-c2h7z9n
```

### 2. Metadata de Comunidad

Cada sesión incluye un campo `community` que identifica a qué comunidad pertenece:
```javascript
{
  sessionId: "cordoba-1702234567890-a4f9x2k",
  community: "cordoba",
  player1: { ... },
  player2: { ... },
  // ... más datos
}
```

### 3. Tracking de Sesiones por Comunidad

El panel de administración mantiene un registro de qué sesiones pertenecen a cada comunidad:
```javascript
communitySessions = {
  cordoba: ["cordoba-123-abc", "cordoba-124-def"],
  afk: ["afk-125-ghi"],
  mendoza: ["mendoza-126-jkl", "mendoza-127-mno"]
}
```

## 📱 Flujo de Uso

### Crear una Nueva Sesión

1. **Usuario** accede a `/admin/cordoba`
2. **Panel** muestra el formulario para crear sesión
3. **Usuario** ingresa nombres de jugadores y formato
4. **Sistema** genera ID único: `cordoba-1702234567890-a4f9x2k`
5. **Servidor** crea la sesión con metadata de comunidad
6. **Panel** recibe la sesión y genera links únicos:
   - Stream: `https://tu-dominio.vercel.app/stream/cordoba-1702234567890-a4f9x2k`
   - Tablet: `https://tu-dominio.vercel.app/tablet/cordoba-1702234567890-a4f9x2k`

### Múltiples Sesiones Simultáneas

**Escenario**: Tres comunidades jugando al mismo tiempo

**Córdoba - Sesión 1**:
- ID: `cordoba-1702234567890-a4f9x2k`
- Jugadores: "Mango" vs "Armada"
- Stream: `/stream/cordoba-1702234567890-a4f9x2k`

**AFK - Sesión 1**:
- ID: `afk-1702234567891-b8g3y5m`
- Jugadores: "Leffen" vs "Hbox"
- Stream: `/stream/afk-1702234567891-b8g3y5m`

**Mendoza - Sesión 1**:
- ID: `mendoza-1702234567892-c2h7z9n`
- Jugadores: "PPMD" vs "M2K"
- Stream: `/stream/mendoza-1702234567892-c2h7z9n`

✅ **Resultado**: Cada stream muestra SOLO su partida correspondiente, sin interferencia.

## 🔄 Sincronización en Tiempo Real

### Cliente → Servidor
```javascript
// Crear sesión
adminSocket.emit('create-session', {
  player1: "Mango",
  player2: "Armada",
  format: "BO3",
  sessionId: "cordoba-1702234567890-a4f9x2k", // ID único
  community: "cordoba" // Metadata
});
```

### Servidor → Clientes
```javascript
// El servidor notifica solo a los clientes conectados a esta sesión
io.to("cordoba-1702234567890-a4f9x2k").emit('session-updated', {
  session: { /* datos actualizados */ }
});
```

### Obtener Sesiones de una Comunidad
```javascript
// Cliente solicita
adminSocket.emit('get-community-sessions', { 
  community: "cordoba" 
});

// Servidor responde
socket.emit('community-sessions', {
  community: "cordoba",
  sessions: [
    { sessionId: "cordoba-123-abc", ... },
    { sessionId: "cordoba-124-def", ... }
  ]
});
```

## 🎮 Uso en Producción (Vercel + Railway)

### Variables de Entorno

**Frontend (Vercel)**:
```env
NEXT_PUBLIC_SOCKET_URL=https://tu-servidor-railway.railway.app
```

**Backend (Railway)**:
- No requiere configuración adicional
- El servidor escucha automáticamente en el puerto asignado por Railway

### Flujo de Datos

```
[Navegador] ← HTTP → [Vercel - Next.js]
                          ↓
                      WebSocket
                          ↓
                  [Railway - Socket.IO Server]
                          ↓
                    [Memory Store]
                    (Map de Sesiones)
```

### Escalabilidad

**Capacidad actual**:
- ✅ Sesiones ilimitadas (limitado solo por memoria RAM)
- ✅ Múltiples comunidades simultáneas
- ✅ Actualizaciones en tiempo real sin latencia

**Consideraciones**:
- Las sesiones se almacenan en memoria (volátil)
- Si el servidor se reinicia, se pierden las sesiones activas
- Para persistencia, considera agregar Redis o base de datos

## 🚨 Casos de Uso

### Caso 1: Torneo Local Único
```
Córdoba tiene un torneo:
- Admin accede a /admin/cordoba
- Crea sesión: cordoba-123-abc
- Genera links para stream y tablets
- Todo funciona normalmente
```

### Caso 2: Torneos Simultáneos
```
3 comunidades al mismo tiempo:

Córdoba:
  - Sesión 1: cordoba-123-abc (Mango vs Armada)
  
AFK:
  - Sesión 1: afk-456-def (Leffen vs Hbox)
  - Sesión 2: afk-457-ghi (PPMD vs M2K)
  
Mendoza:
  - Sesión 1: mendoza-789-jkl (Plup vs Zain)

✅ Todas funcionan independientemente
✅ Los streams no se mezclan
✅ Los datos están aislados
```

### Caso 3: Volver a Sesión Existente
```
1. Admin ve lista de sesiones activas de su comunidad
2. Click en "Volver a Sesión"
3. Se reconecta a la sesión existente
4. Puede continuar administrando
```

## 🔑 Ventajas Clave

1. **Aislamiento Total**: Cada sesión es completamente independiente
2. **Escalabilidad**: Soporta múltiples torneos simultáneos
3. **Flexibilidad**: Cada comunidad puede tener múltiples sesiones
4. **Trazabilidad**: Los IDs únicos permiten identificar cada sesión
5. **Sin Conflictos**: Imposible que dos torneos interfieran entre sí

## 📊 Ejemplo de Estado del Servidor

```javascript
sessions = Map {
  "cordoba-1702234567890-a4f9x2k" => {
    sessionId: "cordoba-1702234567890-a4f9x2k",
    community: "cordoba",
    player1: { name: "Mango", score: 1 },
    player2: { name: "Armada", score: 0 },
    phase: "PLAYING"
  },
  "afk-1702234567891-b8g3y5m" => {
    sessionId: "afk-1702234567891-b8g3y5m",
    community: "afk",
    player1: { name: "Leffen", score: 2 },
    player2: { name: "Hbox", score: 0 },
    phase: "FINISHED"
  },
  "mendoza-1702234567892-c2h7z9n" => {
    sessionId: "mendoza-1702234567892-c2h7z9n",
    community: "mendoza",
    player1: { name: "PPMD", score: 0 },
    player2: { name: "M2K", score: 1 },
    phase: "STAGE_SELECT"
  }
}
```

## 🛠️ Mantenimiento

### Limpiar Sesiones Antiguas
Considera agregar un cron job que elimine sesiones finalizadas después de cierto tiempo:

```javascript
// Ejemplo de limpieza automática
setInterval(() => {
  const now = Date.now();
  sessions.forEach((session, sessionId) => {
    if (session.phase === 'FINISHED') {
      const sessionTime = parseInt(sessionId.split('-')[1]);
      const age = now - sessionTime;
      
      // Eliminar si tiene más de 24 horas
      if (age > 24 * 60 * 60 * 1000) {
        sessions.delete(sessionId);
        console.log('🗑️ Sesión antigua eliminada:', sessionId);
      }
    }
  });
}, 60 * 60 * 1000); // Cada hora
```

---

**Última actualización**: Diciembre 2024
**Versión**: 2.0 - Sistema de Sesiones Únicas
