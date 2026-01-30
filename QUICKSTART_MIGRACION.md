# 🚀 QUICK START - Arregla tu WebSocket en 10 minutos

## ❌ Problema actual
```
❌ WebSocket connection to 'wss://web-production-80c11.up.railway.app/...' failed
❌ Service is offline (Railway)
```

## ✅ Solución
Migrar de Railway a **Render.com** (gratis, 10 minutos)

---

## 📋 Pasos rápidos

### 1️⃣ Crear cuenta en Render (2 min)
1. Ve a https://render.com
2. Click en "Get Started"
3. Regístrate con GitHub
4. Autoriza el acceso

### 2️⃣ Crear servicio (3 min)
1. Click en **"New +"** (botón azul arriba a la derecha)
2. Selecciona **"Web Service"**
3. Conecta tu repositorio: **Smash-Ban-Stages**
4. Configura:
   ```
   Name: smash-websocket-server
   Region: Oregon (US West)
   Branch: main
   Root Directory: (dejar vacío)
   Environment: Node
   Build Command: npm install
   Start Command: node server/server.js
   Plan: Free
   ```
5. Click en **"Create Web Service"**

### 3️⃣ Esperar deploy (2-3 min)
- Render construirá tu app automáticamente
- Espera a que aparezca **"Live"** en verde
- Copia la URL (ej: `https://smash-websocket-server.onrender.com`)

### 4️⃣ Actualizar Vercel (2 min)
1. Ve a https://vercel.com
2. Selecciona tu proyecto
3. Click en **"Settings"** → **"Environment Variables"**
4. Busca `NEXT_PUBLIC_SOCKET_URL`
   - Si existe: Click en "Edit" y cambia el valor
   - Si no existe: Click en "Add New" y crea la variable
5. Valor nuevo: `https://smash-websocket-server.onrender.com` (tu URL de Render)
6. Click en **"Save"**
7. Ve a **"Deployments"**
8. Click en el menú ︙ del último deployment
9. Click en **"Redeploy"**

### 5️⃣ Verificar (1 min)
1. Abre tu app de Vercel en el navegador
2. Verifica que diga: **"WebSocket Conectado"** (en verde)
3. Crea una sesión de prueba
4. ✅ ¡Listo! Tu app funciona de nuevo

---

## 🎯 URLs importantes

Guarda estas URLs:

| Servicio | URL | Para qué |
|----------|-----|----------|
| **Render Dashboard** | https://dashboard.render.com | Ver logs, reiniciar servicio |
| **Tu WebSocket** | `https://tu-app.onrender.com` | URL del servidor WebSocket |
| **Health Check** | `https://tu-app.onrender.com/health` | Verificar que funciona |
| **Vercel Dashboard** | https://vercel.com/dashboard | Configurar variables de entorno |
| **Tu App** | `https://tu-app.vercel.app` | Tu aplicación web |

---

## 🧪 Testing rápido

### Verificar servidor WebSocket
Abre en el navegador:
```
https://tu-servidor.onrender.com/health
```

Deberías ver:
```json
{
  "status": "healthy",
  "service": "Smash Ban Stages WebSocket Server",
  "uptime": 123.45,
  "sessions": 0
}
```

### Verificar frontend
1. Abre tu app en Vercel
2. Abre DevTools (F12)
3. Busca en la consola:
   ```
   ✅ Conectado al servidor WebSocket
   ```

---

## ⚠️ Notas importantes

### Auto-sleep (servicios gratuitos)
- Render **duerme** tu servicio tras 15 min sin uso
- La primera conexión **tarda ~30 segundos** en despertar
- Después funciona normal

**Solución (opcional):**
- Usa https://uptimerobot.com (gratis) para hacer ping cada 10 min
- O paga $7/mes en Render para que esté siempre activo

### URLs correctas
❌ **NO usar:**
```
https://tu-app.onrender.com/     ← No pongas / al final
http://tu-app.onrender.com       ← Debe ser HTTPS
wss://tu-app.onrender.com        ← No usar wss:// directamente
```

✅ **SÍ usar:**
```
https://tu-app.onrender.com      ← Correcto
```

---

## 🆘 Problemas comunes

### "Service is down"
**Causa:** El servicio está dormido (sleep mode)
**Solución:** Espera 30 segundos, la primera conexión lo despierta

### "WebSocket still failing"
1. Verifica la URL en Vercel (sin `/` al final)
2. Verifica que Render esté "Live" (verde)
3. Espera 1-2 minutos después del deploy
4. Limpia cache: Ctrl + Shift + R

### "Build failed" en Render
1. Ve a Render → Logs
2. Verifica que `package.json` esté en la raíz
3. Build Command debe ser: `npm install`
4. Start Command debe ser: `node server/server.js`

---

## 📖 Más ayuda

Si algo no funciona:
1. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Problemas comunes
2. **[MIGRACION_RENDER.md](MIGRACION_RENDER.md)** - Guía completa
3. **[COMANDOS_UTILES.md](COMANDOS_UTILES.md)** - Comandos de referencia

---

## 🎓 Alternativa: Fly.io (mejor rendimiento)

Si Render no te convence o estás en Argentina y necesitas baja latencia:

**[⚡ MIGRACION_FLY.md](MIGRACION_FLY.md)** - Servidor en Chile (latencia <50ms)

Pros:
- ✅ Latencia ultra-baja desde Argentina
- ✅ Wake-up más rápido (~5s vs 30s)
- ✅ Gratis permanente

Contras:
- ⚠️ Requiere usar terminal (CLI)
- ⚠️ Más pasos de configuración

---

## ✅ Checklist final

Antes de terminar, verifica:

- [ ] Cuenta en Render creada
- [ ] Servicio WebSocket desplegado y "Live" (verde)
- [ ] URL del servidor copiada
- [ ] Variable `NEXT_PUBLIC_SOCKET_URL` actualizada en Vercel
- [ ] Vercel redeployeado
- [ ] Health check responde: `/health`
- [ ] WebSocket conecta (verde) en tu app
- [ ] Puedes crear sesiones y funciona todo

**¡Listo!** 🎉 Tu app está funcionando de nuevo.

---

## 💰 Costos

### Gratis (lo que configuraste):
- ✅ Render: 750 horas/mes gratis
- ✅ Vercel: Hobby tier gratis
- ✅ Total: **$0/mes**

### Si quieres eliminar el auto-sleep:
- Render: $7/mes (siempre activo)
- Fly.io: $5/mes (siempre activo)
- UptimeRobot: Gratis (hace ping para mantener activo)

---

## 🔄 Mantener Railway?

**NO recomendado.** Railway ya no tiene tier gratuito.

Si decides quedarte con Railway:
- Costo: ~$5-10/mes dependiendo uso
- No vale la pena vs Render/Fly.io que son gratis

**Recomendación:** Elimina tu proyecto de Railway para evitar cargos.

---

**🎮 ¡Disfruta tu app funcionando!**

¿Preguntas? Revisa [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
