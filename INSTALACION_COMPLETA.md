# 🎮 Sistema de Baneos para Smash Bros Ultimate - COMPLETO

## ✅ Estado del Proyecto: LISTO PARA USAR

### 📦 Instalación Completada
- ✅ Next.js 14
- ✅ React 18
- ✅ Socket.io (Cliente y Servidor)
- ✅ Framer Motion (Animaciones)
- ✅ TailwindCSS (Estilos)
- ✅ UUID (Generación de IDs)

## 🚀 Cómo Iniciar el Sistema

### Método 1: Script Automático
```powershell
.\start.ps1
```

### Método 2: Manual (2 terminales)

**Terminal 1 - Servidor WebSocket:**
```powershell
npm run server
```

**Terminal 2 - Aplicación Web:**
```powershell
npm run dev
```

## 📱 Acceso a las Interfaces

1. **Panel de Administración**: http://localhost:3000
2. **Control de Tablet**: Se genera automáticamente al crear una sesión
3. **Vista de Stream**: Se genera automáticamente al crear una sesión

## 🎯 Flujo Completo de Uso

### 1. Configuración Inicial (Admin)
1. Abre http://localhost:3000 en tu PC
2. Ingresa el nombre del Jugador 1 (ej: "Nostra")
3. Ingresa el nombre del Jugador 2 (ej: "Iori")
4. Selecciona el formato: BO3 o BO5
5. Clic en "🚀 Crear Sesión"

### 2. Compartir Links
- **Link de Tablet**: Cópialo y ábrelo en la tablet del setup
- **Link de Stream**: Agrégalo como Browser Source en OBS

### 3. Proceso del Torneo

#### Game 1:
1. **RPS** (En la tablet):
   - Los jugadores hacen piedra, papel o tijera
   - Seleccionar quién ganó en la tablet

2. **Baneo de Stages** (Sistema 1-2-1):
   - Ganador RPS: Banea 1 stage
   - Perdedor RPS: Banea 2 stages
   - Ganador RPS: Banea 1 stage más
   - Perdedor RPS: Selecciona el stage final

3. **Selección de Personajes**:
   - Ganador RPS: Elige primero (blind)
   - Perdedor RPS: Elige después

4. **Marcar Ganador** (En el Panel Admin):
   - Después de la partida, clic en "🏆 [Jugador] Ganó"

#### Games 2+:
1. **Baneo de Stages** (Sistema 3-ban):
   - Ganador del game anterior: Banea 3 stages
   - Perdedor: Selecciona de los restantes
   - **DSR activo**: Los stages donde ya ganaste están bloqueados

2. **Selección de Personajes**:
   - Ganador: Elige primero
   - Perdedor: Puede counter-pick

3. **Marcar Ganador** y repetir

## 🗺️ Stages del Sistema

### Game 1 (5 Stages):
- Battlefield
- Small Battlefield
- Pokémon Stadium 2
- Smashville
- Town and City

### Games 2+ (8 Stages):
- Los 5 anteriores +
- Hollow Bastion
- Final Destination
- Kalos

## 🎨 Personalización con Imágenes

### Para mejorar la experiencia visual:

**Stages** (Ubicación: `public/images/stages/`):
- battlefield.png
- small-battlefield.png
- pokemon-stadium-2.png
- smashville.png
- town-and-city.png
- hollow-bastion.png
- final-destination.png
- kalos.png

**Formato recomendado**: PNG, 800x450px

**Personajes** (Ubicación: `public/images/characters/`):
- mario.png, fox.png, joker.png, etc.
- Ver lista completa en `src/utils/constants.js`

**Formato recomendado**: PNG con transparencia, 128x128px

**Nota**: Actualmente el sistema usa placeholders (colores y emojis), pero funcionará perfectamente agregando las imágenes.

## 📺 Configuración de OBS/Streamlabs

### Para mostrar el sistema en stream:

1. Agregar **Browser Source**
2. URL: `http://localhost:3000/stream/[TU-SESSION-ID]`
3. Dimensiones: 1920x1080
4. Marcar:
   - ✅ "Shutdown source when not visible"
   - ✅ "Refresh browser when scene becomes active"
5. FPS Custom: 60

### Ubicación sugerida:
- Como overlay completo, o
- Como recuadro en la parte inferior del stream

## 🔥 Características Implementadas

### ✅ Sistema Completo de Baneos
- Sistema 1-2-1 para Game 1
- Sistema 3-ban para Games subsecuentes
- DSR (Dave's Stupid Rule) funcional

### ✅ Sincronización en Tiempo Real
- WebSocket con Socket.io
- Actualización instantánea en todas las pantallas
- Sin necesidad de refrescar

### ✅ Interfaz Intuitiva
- Diseño inspirado en MapBan de Valorant
- Colores sobrios relacionados con Smash Bros
- Responsive para todos los dispositivos

### ✅ Animaciones para Stream
- Efectos de baneo (fade + X roja)
- Efectos de selección (glow + zoom)
- Transiciones suaves
- Animaciones de score

### ✅ Gestión Completa de Torneos
- Soporte BO3 y BO5
- Marcador actualizado
- Historial de baneos
- Reinicio de series

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Animaciones**: Framer Motion
- **Backend**: Node.js
- **WebSocket**: Socket.io
- **Sincronización**: Tiempo real automática

## 🐛 Solución de Problemas

### Puerto en uso
```
Error: EADDRINUSE
```
**Solución**: Cierra otras aplicaciones que usen los puertos 3000 o 3001

### WebSocket no conecta
**Solución**: 
1. Verifica que el servidor esté corriendo (npm run server)
2. Revisa la consola del navegador (F12)
3. Asegúrate que no haya firewall bloqueando

### Tablet no actualiza
**Solución**:
1. Refresca la página
2. Verifica el sessionId en la URL
3. Confirma que ambos servidores estén activos

### Imágenes no aparecen
**Solución**:
1. Verifica que las imágenes estén en `public/images/`
2. Los nombres deben coincidir con los de `constants.js`
3. Refresca la página con Ctrl+F5

## 📊 Estructura del Proyecto

```
Stages Ban/
├── pages/                      # Páginas de Next.js
│   ├── index.js               # Panel Admin
│   ├── tablet/[sessionId].js  # Control Tablet
│   └── stream/[sessionId].js  # Vista Stream
├── src/
│   ├── components/            # Componentes React
│   ├── hooks/                 # Custom hooks
│   └── utils/                 # Utilidades y constantes
├── server/
│   └── server.js              # Servidor WebSocket
├── styles/
│   └── globals.css            # Estilos globales
├── public/
│   └── images/                # Imágenes (stages y personajes)
├── package.json
├── tailwind.config.js
└── next.config.js
```

## 🎯 Próximos Pasos (Opcional)

- [ ] Agregar imágenes reales de stages
- [ ] Agregar iconos de personajes
- [ ] Implementar base de datos (MongoDB/PostgreSQL)
- [ ] Sistema de estadísticas
- [ ] Modo offline completo
- [ ] Exportación de resultados
- [ ] Temas personalizables

## 📞 Soporte y Contacto

Si encuentras problemas:
1. Revisa este documento
2. Consulta el README.md
3. Verifica la consola del navegador y las terminales
4. Revisa los logs del servidor WebSocket

## 🎉 ¡Todo Listo!

El sistema está **100% funcional** y listo para usar en torneos.

**Para iniciar**: `.\start.ps1` o sigue las instrucciones de inicio manual.

**¡Disfruta organizando tus torneos de Smash Bros Ultimate!** 🎮🏆

---

**Desarrollado para la comunidad de Smash Bros** ❤️
