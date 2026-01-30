# Sistema de Baneos para Torneos de Super Smash Bros Ultimate

Un sistema web completo para gestionar el proceso de baneos de stages y selección de personajes en torneos de Super Smash Bros Ultimate, tanto presenciales como online.

## 📚 Documentación

### 🚨 Migración desde Railway (IMPORTANTE)
- **[🚀 SOLUCION_RAILWAY.md](SOLUCION_RAILWAY.md)** ⭐ **EMPIEZA AQUÍ** - Guía rápida (10 min)
- **[📖 MIGRACION_RENDER.md](MIGRACION_RENDER.md)** - Migración a Render.com (recomendado)
- **[✈️ MIGRACION_FLY.md](MIGRACION_FLY.md)** - Migración a Fly.io (mejor rendimiento)
- **[📝 MIGRACION_RESUMEN.md](MIGRACION_RESUMEN.md)** - Resumen completo de la migración

### 📖 Guías generales
- **[🔧 TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solución de problemas comunes
- **[⚡ COMANDOS_UTILES.md](COMANDOS_UTILES.md)** - Referencia rápida de comandos

## 🎮 Características

- **Sincronización en Tiempo Real**: Todas las pantallas se actualizan instantáneamente vía WebSocket
- **Sistema de Baneos Completo**: Implementa el sistema 1-2-1 para Game 1 y 3-ban para Games subsecuentes
- **DSR (Dave's Stupid Rule)**: Previene que un jugador vuelva a elegir un stage donde ya ganó
- **Soporte BO3 y BO5**: Compatible con ambos formatos de torneo
- **Animaciones para Stream**: Efectos visuales atractivos para transmisiones
- **Responsive Design**: Funciona en PC, tablets y móviles
- **Multi-comunidad**: Soporte para diferentes rulesets (Mendoza, Córdoba, etc.)

## ⚠️ IMPORTANTE: Migración desde Railway

Si vienes desde Railway y el servicio dejó de funcionar, **lee esto primero:**

👉 **[SOLUCION_RAILWAY.md](SOLUCION_RAILWAY.md)** - Guía rápida de migración (10 minutos)

Tu servicio de Railway expiró. Tienes dos opciones gratuitas:
1. **Render.com** - Más fácil (web UI)
2. **Fly.io** - Mejor rendimiento (CLI)

## 📦 Instalación Local

### Requisitos
- Node.js 18+ (https://nodejs.org)
- npm o yarn

### Pasos

1. **Clonar el repositorio:**
```bash
git clone https://github.com/tu-usuario/smash-ban-stages.git
cd smash-ban-stages
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env y configurar:
# NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

4. **Iniciar el servidor WebSocket:**
```bash
npm run server
```

El servidor se ejecutará en `http://localhost:3001`

5. **Iniciar la aplicación Next.js (en otra terminal):**
```bash
npm run dev
```

La aplicación se ejecutará en `http://localhost:3000`

### Scripts útiles

```bash
# Probar que el servidor WebSocket funciona
.\test-server.ps1

# Verificar estado del servidor
.\check-server.ps1

# Verificar servidor remoto
.\check-server.ps1 -Url "https://tu-servidor.onrender.com"
```

## 🚀 Despliegue en Producción

### Frontend (Vercel) - YA DESPLEGADO
Tu frontend ya está en Vercel. Solo necesitas actualizar la variable de entorno:

1. Ve a https://vercel.com → Tu proyecto → Settings → Environment Variables
2. Actualiza `NEXT_PUBLIC_SOCKET_URL` con la URL de tu servidor WebSocket
3. Redeploy

### Backend WebSocket (Elige una opción)

#### Opción 1: Render.com (Recomendado - Más fácil)
- 📖 Ver guía completa: **[MIGRACION_RENDER.md](MIGRACION_RENDER.md)**
- ⏱️ Tiempo: 10 minutos
- 💰 Gratis: 750 horas/mes
- 🖱️ Interfaz web (sin CLI)

#### Opción 2: Fly.io (Mejor rendimiento)
- 📖 Ver guía completa: **[MIGRACION_FLY.md](MIGRACION_FLY.md)**
- ⏱️ Tiempo: 15 minutos
- 💰 Gratis: Ilimitado (con límites de recursos)
- 🔧 Requiere CLI
- ⚡ Baja latencia desde Argentina/Chile

## 🚀 Uso

### 1. Panel de Administración
Accede a `http://localhost:3000` para:
- Crear una nueva sesión de torneo
- Ingresar nombres de jugadores y formato (BO3/BO5)
- Obtener links para tablet y stream
- Marcar ganadores de cada game
- Reiniciar series

### 2. Control de Tablet
Usa el link generado (ej: `http://localhost:3000/tablet/[sessionId]`) para:
- Seleccionar ganador de Piedra, Papel o Tijera
- Banear stages
- Seleccionar stage final
- Elegir personajes

### 3. Vista de Stream
Usa el link de stream (ej: `http://localhost:3000/stream/[sessionId]`) para:
- Mostrar el proceso de baneos con animaciones
- Visualizar selecciones de personajes
- Mostrar marcador actualizado en tiempo real

## 🎯 Flujo de Trabajo

### Game 1:
1. **RPS**: Determinar quién ganó Piedra, Papel o Tijera
2. **Stage Striking (1-2-1)**:
   - Ganador RPS banea 1 stage
   - Perdedor RPS banea 2 stages
   - Ganador RPS banea 1 stage
   - Perdedor RPS elige stage final
3. **Selección de Personajes**:
   - Ganador RPS elige primero (blind pick)
   - Perdedor RPS elige segundo

### Games 2+:
1. **Stage Banning (3-ban)**:
   - Ganador del game anterior banea 3 stages
   - Perdedor elige de los 5 restantes
   - DSR activo: No se pueden repetir stages ganados
2. **Selección de Personajes**:
   - Ganador elige primero
   - Perdedor puede counter-pick

## 🗺️ Stages Disponibles

### Game 1 (5 stages):
- Battlefield
- Small Battlefield
- Pokémon Stadium 2
- Smashville
- Town and City

### Games 2+ (8 stages):
- Los 5 anteriores +
- Hollow Bastion
- Final Destination
- Kalos

## 🛠️ Tecnologías

- **Frontend**: Next.js, React, TailwindCSS
- **Animaciones**: Framer Motion
- **Backend**: Node.js, Express
- **WebSocket**: Socket.io
- **Tiempo Real**: Sincronización automática entre todos los clientes

## 📁 Estructura del Proyecto

```
/project
├── pages/
│   ├── index.js                    # Panel de Admin
│   ├── tablet/[sessionId].js       # Control de Tablet
│   └── stream/[sessionId].js       # Vista de Stream
├── src/
│   ├── components/
│   │   ├── AdminPanel.jsx
│   │   ├── TabletControl.jsx
│   │   └── StreamOverlay.jsx
│   ├── hooks/
│   │   └── useWebSocket.js
│   └── utils/
│       └── constants.js
├── server/
│   └── server.js                   # Servidor WebSocket
├── styles/
│   └── globals.css
└── public/
    └── images/
        ├── stages/                 # Imágenes de stages
        └── characters/             # Iconos de personajes
```

## 🎨 Personalización

### Agregar Imágenes de Stages
Coloca las imágenes en `public/images/stages/` con los siguientes nombres:
- battlefield.png
- small-battlefield.png
- pokemon-stadium-2.png
- smashville.png
- town-and-city.png
- hollow-bastion.png
- final-destination.png
- kalos.png

### Agregar Iconos de Personajes
Coloca los iconos en `public/images/characters/` siguiendo el formato:
- mario.png
- fox.png
- joker.png
- etc.

## 🐛 Solución de Problemas

### El servidor WebSocket no se conecta
- Verifica que el servidor esté corriendo en el puerto 3001
- Revisa la consola del navegador para errores de conexión

### Las pantallas no se sincronizan
- Asegúrate de que todas las ventanas usen el mismo sessionId
- Verifica que el servidor WebSocket esté activo

### Imágenes no se muestran
- Coloca las imágenes en las carpetas correctas dentro de `public/`
- Verifica que los nombres coincidan con los definidos en `constants.js`

## 📝 Notas

- El sistema almacena las sesiones en memoria, por lo que se perderán al reiniciar el servidor
- Para producción, considera usar una base de datos (MongoDB, PostgreSQL)
- Las animaciones están optimizadas para streams a 60fps

## 🤝 Contribuciones

Este es un proyecto de código abierto. Siéntete libre de:
- Reportar bugs
- Sugerir nuevas características
- Mejorar el código
- Agregar soporte para más reglas de torneos

## 📜 Licencia

MIT License - Úsalo libremente para tus torneos

## 🎯 Roadmap

- [ ] Base de datos para persistencia de sesiones
- [ ] Historial de torneos y estadísticas
- [ ] Sistema de autenticación
- [ ] Modo offline completo
- [ ] Exportación de resultados
- [ ] Temas personalizables por torneo
- [ ] Soporte para más rulesets

---

Desarrollado con ❤️ para la comunidad de Super Smash Bros Ultimate
