# 🚀 Guía Rápida: Migración desde Railway

Tu servicio de Railway ha expirado. Aquí están tus opciones **GRATUITAS** para reemplazarlo:

---

## ⚡ OPCIÓN 1: Render.com (MÁS FÁCIL - RECOMENDADO)

**Tiempo:** 10 minutos | **Dificultad:** ⭐☆☆☆☆

### Paso a paso:
1. **Crear cuenta en Render:**
   - Ve a https://render.com
   - Registrate con tu GitHub

2. **Crear Web Service:**
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio GitHub
   - Configuración:
     - **Name:** smash-websocket-server
     - **Build Command:** `npm install`
     - **Start Command:** `node server/server.js`
     - **Plan:** FREE
   - Click "Create Web Service"

3. **Obtener URL:**
   - Una vez desplegado, copia la URL (ej: `https://smash-websocket-server.onrender.com`)

4. **Actualizar en Vercel:**
   - Ve a tu proyecto en Vercel → Settings → Environment Variables
   - Busca `NEXT_PUBLIC_SOCKET_URL`
   - Cambia el valor a tu nueva URL de Render
   - Haz "Redeploy"

5. **Listo!** ✅

**Ventajas:**
- ✅ Configuración desde el navegador (sin comandos)
- ✅ 750 horas gratis/mes (más que suficiente)
- ✅ Auto-despliegue desde GitHub

**Desventajas:**
- ⚠️ Se duerme tras 15 min sin uso (tarda ~30s en despertar)
- ⚠️ Servidores en US/Europa (latencia +150ms)

📖 **Ver guía completa:** `MIGRACION_RENDER.md`

---

## 🚀 OPCIÓN 2: Fly.io (MEJOR RENDIMIENTO)

**Tiempo:** 15 minutos | **Dificultad:** ⭐⭐☆☆☆

### Paso a paso:
1. **Instalar Fly CLI:**
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```
   Reinicia la terminal después.

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Desplegar:**
   ```bash
   cd "e:\Users\gabri\Documentos\Brodev Lab\Smash Ban Stages"
   fly launch --no-deploy
   fly regions set scl
   fly deploy
   ```

4. **Obtener URL:**
   ```bash
   fly status
   ```
   Copia la URL (ej: `https://smash-websocket-server.fly.dev`)

5. **Actualizar en Vercel:**
   - Ve a Vercel → Settings → Environment Variables
   - Cambia `NEXT_PUBLIC_SOCKET_URL` a tu nueva URL
   - Redeploy

**Ventajas:**
- ✅ Servidor en Santiago, Chile (latencia <50ms desde Argentina)
- ✅ Se despierta MÁS rápido (~5s vs 30s de Render)
- ✅ Gratis permanente (3 VMs)
- ✅ Mejor para gaming (baja latencia)

**Desventajas:**
- ⚠️ Requiere usar la terminal (CLI)

📖 **Ver guía completa:** `MIGRACION_FLY.md`

---

## 📊 Comparación rápida

| Característica | Render | Fly.io |
|----------------|--------|--------|
| **Facilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐☆☆ |
| **Latencia (Argentina)** | ~150-200ms | ~30-50ms |
| **Wake-up speed** | ~30 segundos | ~5 segundos |
| **Horas gratis/mes** | 750h | Ilimitado* |
| **Setup** | Web UI | CLI |
| **Recomendado para** | Principiantes | Gaming/Latencia crítica |

*Con límites de CPU y bandwidth

---

## 🎯 ¿Cuál elegir?

### Elige **Render** si:
- ❓ No te sientes cómodo con la terminal
- ❓ La latencia no es crítica (casual play)
- ❓ Quieres algo rápido y simple

### Elige **Fly.io** si:
- ❓ Estás en Argentina/Chile/LATAM
- ❓ Necesitas baja latencia (torneos/competitivo)
- ❓ No te molesta usar comandos
- ❓ Quieres mejor rendimiento general

---

## ⚠️ IMPORTANTE

Ambos servicios gratuitos tienen **auto-sleep**:
- Se duermen tras 15-30 min sin uso
- Se despiertan automáticamente cuando alguien conecta
- La primera conexión tras dormir tarda más (5-30s)

**Solución al sleep:**
1. **Gratis:** Usa un ping service como UptimeRobot.com
2. **Pagado:** Render $7/mes o Fly.io $5/mes (siempre activo)

---

## 🆘 ¿Problemas?

### El WebSocket no conecta
1. Verifica que la URL en Vercel NO tenga `/` al final
2. Espera 1-2 minutos tras el deploy
3. Revisa los logs del servicio

### "Service is down"
- Normal si está en sleep mode
- La primera conexión lo despierta (espera 30s)

### Errores en el deploy
- Verifica que `package.json` esté correcto
- Asegúrate de que `node server/server.js` funcione localmente

---

## 🔄 Migración de emergencia

Si necesitas algo funcionando **YA MISMO**:

1. **Localmente (temporal):**
   ```bash
   node server/server.js
   ```
   Luego usa ngrok:
   ```bash
   ngrok http 3001
   ```
   Copia la URL de ngrok y úsala en Vercel (temporal, se cae al cerrar)

2. **Render (rápido):** Usa la Opción 1, tarda solo 10 minutos

---

## 📚 Documentación completa

- [MIGRACION_RENDER.md](MIGRACION_RENDER.md) - Guía detallada Render
- [MIGRACION_FLY.md](MIGRACION_FLY.md) - Guía detallada Fly.io

---

**¿Dudas?** Pregúntame lo que necesites. ¡Éxito con la migración! 🚀
