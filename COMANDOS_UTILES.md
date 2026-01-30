# ⚡ Comandos Útiles - Referencia Rápida

## 🏠 Desarrollo Local

### Instalar dependencias
```bash
npm install
```

### Iniciar servidor WebSocket (Terminal 1)
```bash
npm run server
# o directamente:
node server/server.js
```

### Iniciar aplicación Next.js (Terminal 2)
```bash
npm run dev
```

### Probar servidor local
```powershell
# Iniciar y verificar servidor
.\test-server.ps1

# Verificar estado
.\check-server.ps1

# Verificar servidor específico
.\check-server.ps1 -Url "http://localhost:3001"
```

### Verificar health check
```bash
# Local
curl http://localhost:3001/health

# Producción
curl https://tu-servidor.onrender.com/health
```

---

## 🚀 Render.com

### Configuración inicial (Web UI)
1. Ve a https://render.com
2. New + → Web Service
3. Conecta repositorio
4. Configurar:
   - Build: `npm install`
   - Start: `node server/server.js`
   - Plan: Free

### Verificar servicio
```powershell
.\check-server.ps1 -Url "https://tu-app.onrender.com"
```

### Acceder a logs
- Dashboard → Tu servicio → Logs

---

## ✈️ Fly.io

### Instalación de CLI (Windows)
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

Después, **reinicia la terminal**.

### Login
```bash
fly auth login
```

### Crear y desplegar app
```bash
# Navegar al proyecto
cd "e:\Users\gabri\Documentos\Brodev Lab\Smash Ban Stages"

# Crear app (primera vez)
fly launch --no-deploy

# Configurar región (Santiago, Chile)
fly regions set scl

# Desplegar
fly deploy
```

### Gestión de la app
```bash
# Ver estado
fly status

# Ver logs en tiempo real
fly logs

# Abrir dashboard en navegador
fly dashboard

# Abrir la app en navegador
fly open

# Listar todas tus apps
fly apps list

# Reiniciar app
fly apps restart smash-websocket-server

# Destruir app (eliminar)
fly apps destroy smash-websocket-server
```

### Configuración avanzada
```bash
# Ver regiones disponibles
fly platform regions

# Cambiar región
fly regions set scl  # Santiago, Chile
fly regions set gru  # São Paulo, Brasil

# Agregar múltiples regiones
fly regions add scl gru

# Ver/agregar secretos (variables de entorno)
fly secrets list
fly secrets set NODE_ENV=production
fly secrets set MY_VAR=value

# Escalar recursos
fly scale vm shared-cpu-1x --memory 512
fly scale count 1  # Número de instancias
```

### Configurar siempre activo
Edita `fly.toml`:
```toml
auto_stop_machines = false
min_machines_running = 1
```

Luego:
```bash
fly deploy
```

### Debugging
```bash
# Ver logs detallados
fly logs -a smash-websocket-server

# SSH a la instancia
fly ssh console

# Ver métricas
fly dashboard
```

---

## 🔧 Vercel (Frontend)

### Actualizar variable de entorno
1. Ve a https://vercel.com
2. Tu proyecto → Settings → Environment Variables
3. Editar `NEXT_PUBLIC_SOCKET_URL`
4. Redeploy

### Redeploy desde Git
```bash
git add .
git commit -m "Update WebSocket URL"
git push
# Vercel auto-deploys
```

### Redeploy manual
- Dashboard de Vercel → Deployments → Redeploy

### Ver logs
- Dashboard → Tu proyecto → Deployments → Logs

---

## 🐙 Git

### Guardar cambios
```bash
git add .
git commit -m "Migrado de Railway a Render/Fly"
git push
```

### Ver estado
```bash
git status
```

### Ver cambios
```bash
git diff
```

---

## 🔍 Debugging

### Ver qué proceso usa un puerto (Windows)
```powershell
# Ver procesos en puerto 3001
netstat -ano | findstr :3001

# Matar proceso (reemplaza <PID> con el número)
taskkill /PID <PID> /F
```

### Limpiar cache de npm
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### Verificar versiones
```bash
node --version
npm --version
git --version
```

### Ver logs del servidor local
Los logs aparecen en la terminal donde ejecutaste `npm run server`

### Ver logs del navegador
1. F12 (DevTools)
2. Console tab
3. Network tab → WS (para WebSocket)

---

## 🧪 Testing

### Probar conexión WebSocket (Node.js)
```javascript
// test-ws.js
const io = require('socket.io-client');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Conectado!');
  socket.disconnect();
});

socket.on('connect_error', (error) => {
  console.error('❌ Error:', error.message);
});
```

Ejecutar:
```bash
node test-ws.js
```

### Health check con PowerShell
```powershell
# Local
Invoke-RestMethod -Uri "http://localhost:3001/health"

# Producción
Invoke-RestMethod -Uri "https://tu-servidor.com/health"
```

### Health check con curl
```bash
curl -v http://localhost:3001/health
```

---

## 📦 NPM

### Instalar dependencia específica
```bash
npm install socket.io@4.6.0
npm install --save-dev typescript
```

### Actualizar dependencias
```bash
npm update
```

### Verificar dependencias desactualizadas
```bash
npm outdated
```

### Limpiar e reinstalar
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🛠️ Mantenimiento

### Verificar estado de servicios
```powershell
# Local
.\check-server.ps1

# Render
.\check-server.ps1 -Url "https://tu-app.onrender.com"

# Fly.io
fly status
```

### Backup de código
```bash
git add .
git commit -m "Backup before changes"
git push
```

### Ver logs de todos los servicios
```bash
# Servidor local: Ver terminal donde corre
# Render: Dashboard → Logs
# Fly.io: fly logs
# Vercel: Dashboard → Deployments → Logs
```

---

## 🔗 Links útiles

### Dashboards
- **Render:** https://dashboard.render.com
- **Fly.io:** https://fly.io/dashboard
- **Vercel:** https://vercel.com/dashboard
- **Railway:** https://railway.app/dashboard (para eliminar)

### Documentación
- **Socket.IO:** https://socket.io/docs/v4/
- **Render Docs:** https://render.com/docs
- **Fly.io Docs:** https://fly.io/docs
- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs

### Herramientas online
- **UptimeRobot:** https://uptimerobot.com (para mantener servicio activo)
- **WebSocket Test:** https://www.piesocket.com/websocket-tester
- **JSON Formatter:** https://jsonformatter.curiousconcept.com

---

## 💾 Scripts personalizados (ya incluidos)

```powershell
# Probar servidor local
.\test-server.ps1

# Verificar servidor (local o remoto)
.\check-server.ps1
.\check-server.ps1 -Url "https://tu-servidor.com"
```

---

## 🚨 En caso de emergencia

### Servidor caído en producción
```bash
# Render: Ve al dashboard y reinicia manualmente
# Fly.io:
fly apps restart

# Ver logs para diagnosticar
fly logs
```

### WebSocket no conecta
```bash
# 1. Verificar servidor
.\check-server.ps1 -Url "https://tu-servidor.com"

# 2. Ver logs
# Render: Dashboard → Logs
# Fly.io: fly logs

# 3. Reiniciar
# Render: Dashboard → Manual Restart
# Fly.io: fly apps restart
```

### Frontend no actualiza
```bash
# 1. Verificar variables de entorno en Vercel
# 2. Hacer redeploy en Vercel
# 3. Limpiar cache del navegador (Ctrl + Shift + R)
```

---

## 📝 Notas importantes

1. **Siempre verifica que el servidor esté corriendo antes de probar la app**
2. **En producción, espera 30s después del deploy antes de probar**
3. **Los servicios gratuitos se duermen tras 15 min sin uso**
4. **La primera conexión tras sleep tarda ~30s en Render, ~5s en Fly.io**
5. **Siempre usa HTTPS en producción (no HTTP)**
6. **No pongas `/` al final de las URLs**

---

## 🎯 Workflow típico

### Desarrollo local:
```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev

# Terminal 3
.\check-server.ps1
```

### Desplegar cambios:
```bash
# 1. Guardar cambios
git add .
git commit -m "Descripción del cambio"
git push

# 2. Desplegar servidor (si usas Fly.io)
fly deploy

# 3. Vercel auto-deploys desde Git

# 4. Verificar
.\check-server.ps1 -Url "https://tu-servidor.com"
```

### Monitoreo:
```bash
# Cada cierto tiempo, verificar:
fly status              # Estado general
fly logs                # Ver logs recientes
.\check-server.ps1      # Health check
```

---

**📖 Ver también:**
- [README.md](README.md) - Documentación principal
- [SOLUCION_RAILWAY.md](SOLUCION_RAILWAY.md) - Guía de migración
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solución de problemas
