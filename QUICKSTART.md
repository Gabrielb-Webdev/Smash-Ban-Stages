# Guía Rápida de Inicio

## 🚀 Inicio Rápido

### Opción 1: Script Automático (Recomendado)
```powershell
.\start.ps1
```

### Opción 2: Manual

**Terminal 1 - Servidor WebSocket:**
```powershell
npm run server
```

**Terminal 2 - Aplicación Next.js:**
```powershell
npm run dev
```

## 📱 URLs del Sistema

- **Panel Admin**: http://localhost:3000
- **Control Tablet**: http://localhost:3000/tablet/[sessionId]
- **Vista Stream**: http://localhost:3000/stream/[sessionId]

## 🎯 Flujo de Uso Rápido

1. Abre http://localhost:3000
2. Ingresa nombres de jugadores y formato (BO3/BO5)
3. Copia el link de Tablet a tu dispositivo móvil/tablet
4. Copia el link de Stream a OBS/Streamlabs
5. En la tablet, selecciona ganador de RPS
6. Sigue el proceso de baneos y selecciones
7. Marca ganador de cada game en el Panel Admin

## ⚙️ Configuración de OBS

1. Agrega Browser Source
2. URL: http://localhost:3000/stream/[tu-sessionId]
3. Ancho: 1920, Alto: 1080
4. Marca: "Shutdown source when not visible"
5. Marca: "Refresh browser when scene becomes active"

## 🎨 Agregar Imágenes

### Stages (obligatorio para mejor experiencia):
Coloca imágenes en `public/images/stages/`:
- battlefield.png
- small-battlefield.png
- pokemon-stadium-2.png
- smashville.png
- town-and-city.png
- hollow-bastion.png
- final-destination.png
- kalos.png

### Personajes (opcional, actualmente usa emojis):
Coloca iconos en `public/images/characters/`:
- mario.png, fox.png, joker.png, etc.

## 🐛 Problemas Comunes

### "Error: EADDRINUSE"
- Puerto 3000 o 3001 ya está en uso
- Solución: Cierra otras aplicaciones o cambia el puerto

### No se conecta WebSocket
- Verifica que ambos servidores estén corriendo
- Revisa que no haya firewall bloqueando

### Tablet no se actualiza
- Refresca la página del tablet
- Verifica que el sessionId sea correcto

## 📞 Soporte

Si encuentras problemas, revisa:
1. Consola del navegador (F12)
2. Terminal del servidor WebSocket
3. Terminal de Next.js

Para más información, consulta el README.md completo.
