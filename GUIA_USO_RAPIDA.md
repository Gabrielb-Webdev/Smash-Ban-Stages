# 📱 Guía Rápida - Uso del Sistema

## 🎮 Para Administradores de Torneo

### 1. Acceder al Panel

Abre tu navegador y ve a: `https://tu-app.vercel.app`

Verás una pantalla con 3 opciones:
- 🔵 **Smash Córdoba**
- 🟡 **Smash AFK** (Buenos Aires)
- 🟢 **Smash Mendoza**

👉 **Haz click en tu comunidad**

### 2. Crear una Sesión

Una vez en el panel de tu comunidad:

1. **Ingresa los nombres de los jugadores**:
   - Jugador 1: `Ej: Mango`
   - Jugador 2: `Ej: Armada`

2. **Selecciona el formato**:
   - `BO3` (Best of 3) - Primero a 2 juegos
   - `BO5` (Best of 5) - Primero a 3 juegos

3. **Click en "Crear Sesión"** 🚀

### 3. Compartir Links

Después de crear la sesión, verás dos links importantes:

#### 📺 Link de Stream
```
https://tu-app.vercel.app/stream/cordoba-1702234567890-a4f9x2k
```
- Abre este link en OBS para el overlay del stream
- Muestra: Jugadores, scores, escenarios, personajes, etc.

#### 📱 Link de Tablet
```
https://tu-app.vercel.app/tablet/cordoba-1702234567890-a4f9x2k
```
- Abre este link en la tablet de los jugadores
- Permite seleccionar personajes y escenarios

#### 💡 Consejos:
- ✅ **Copia los links y guárdalos** (son únicos para esta sesión)
- ✅ Puedes escanear el código QR con tu celular
- ✅ Los links funcionan en cualquier dispositivo

### 4. Administrar la Partida

Desde el panel de admin puedes:

#### Durante el Match
- ✅ Registrar ganador de RPS (Piedra, Papel, Tijera)
- ✅ Ver el proceso de stage striking
- ✅ Declarar ganador de cada juego
- ✅ Ver el progreso de la serie (score)

#### Botones Importantes
- 🏆 **"[Jugador] Gana"** - Declara al ganador del juego
- 🔄 **"Reiniciar Serie"** - Empieza una nueva serie con los mismos jugadores
- ✏️ **"Editar Nombres"** - Cambia nombres o formato
- 🏁 **"Terminar Match"** - Finaliza la serie

### 5. Serie Completa

Cuando un jugador alcanza el score necesario:
- BO3: Primero a 2 juegos gana
- BO5: Primero a 3 juegos gana

El sistema:
1. ✅ Declara al ganador
2. ✅ Muestra un mensaje de victoria
3. ✅ Te permite crear una nueva serie con los mismos links

## 📺 Para Streamers

### Configurar OBS

1. **Agrega una fuente de navegador**:
   - Source → Browser
   - URL: El link de stream que te dio el admin
   - Width: `1920`
   - Height: `1080`
   - ✅ Marca "Refresh browser when scene becomes active"

2. **Posicionar el overlay**:
   - El overlay es transparente
   - Colócalo sobre el gameplay
   - Ajusta posición según tu layout

3. **Resultado**:
   - 🎮 Verás los nombres de los jugadores
   - 🏆 El score actualizado en tiempo real
   - 🗺️ El escenario seleccionado
   - 👤 Los personajes de cada jugador

## 🎯 Para Jugadores (Tablet)

### Usando la Tablet

1. **Abrir el link**: El TO te dará el link de tablet

2. **Seleccionar Personaje**:
   - Busca tu personaje en la lista
   - O usa el buscador
   - Click en tu personaje

3. **Durante Stage Striking**:
   - Verás los escenarios disponibles
   - Click en los escenarios que quieres banear
   - Espera tu turno (el sistema alterna automáticamente)

4. **Después de Ganar un Juego**:
   - El ganador elige a qué escenario ir
   - Click en el escenario deseado
   - El perdedor puede banear escenarios primero

## ⚠️ Problemas Comunes

### "No veo la información en el stream"

**Solución**:
1. Verifica que estés usando el link correcto
2. Refresca la fuente de navegador en OBS (Click derecho → Refresh)
3. Verifica que el admin haya creado la sesión

### "La tablet no responde"

**Solución**:
1. Refresca la página (F5 o pull to refresh)
2. Verifica tu conexión a internet
3. Verifica que sea tu turno de banear/seleccionar

### "Los links no funcionan"

**Solución**:
1. Verifica que copies el link completo (incluye el sessionId único)
2. No uses links de sesiones anteriores
3. Pide al admin que te comparta el link nuevamente

## 🔄 Múltiples Torneos Simultáneos

### ¿Puedo hacer dos torneos al mismo tiempo en mi comunidad?

**¡SÍ!** ✅

Simplemente:
1. En el panel de admin, termina la sesión actual
2. Crea una nueva sesión con otros jugadores
3. Obtendrás nuevos links únicos
4. Puedes tener ambas sesiones activas

**Nota**: Cada sesión tiene sus propios links. No mezcles los links entre sesiones.

### ¿Córdoba y AFK pueden tener torneos simultáneos?

**¡SÍ!** ✅

Cada comunidad es completamente independiente:
- Córdoba puede tener su torneo
- AFK puede tener su torneo
- Mendoza puede tener su torneo
- **Al mismo tiempo sin interferencia**

## 💡 Tips y Mejores Prácticas

### Para TOs (Tournament Organizers)

1. **Antes del torneo**:
   - ✅ Prueba crear una sesión de prueba
   - ✅ Verifica que OBS muestre el overlay correctamente
   - ✅ Guarda los links en un lugar seguro

2. **Durante el torneo**:
   - ✅ Mantén el panel de admin abierto todo el tiempo
   - ✅ No cierres la pestaña del navegador
   - ✅ Usa el botón "Reiniciar Serie" entre sets

3. **Después de cada set**:
   - ✅ Click en "Reiniciar Serie" (mantiene los mismos links)
   - ✅ O crea nueva sesión para nuevos jugadores (nuevos links)

### Para Streamers

1. **Layout del Stream**:
   - Deja espacio para el overlay en la parte superior
   - El overlay muestra: nombres, score, escenario
   - Es transparente, así que funciona sobre cualquier gameplay

2. **Backup**:
   - Guarda el link de stream en un archivo de texto
   - Si OBS se cierra, puedes volver a agregarlo

### Para Jugadores

1. **Tablet**:
   - Usa una tablet con pantalla grande si es posible
   - Mantén la batería cargada
   - Ten buena conexión WiFi

2. **Comunicación**:
   - Espera que el TO confirme que la sesión está creada
   - Avisa si no ves las opciones correctamente
   - Coordina con tu oponente durante striking

## 📞 Soporte

Si encuentras algún problema no listado aquí:

1. **Verifica tu conexión a internet**
2. **Refresca la página** (F5)
3. **Contacta al administrador del sistema**
4. **Revisa los logs** (F12 → Console en Chrome)

---

**¡Disfruta tu torneo!** 🎮🏆

