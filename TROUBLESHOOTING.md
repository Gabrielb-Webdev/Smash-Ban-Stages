# 🔧 Solución de Problemas Comunes

## WebSocket no conecta

### Error: "WebSocket connection failed"

**Síntomas:**
```
WebSocket connection to 'wss://...' failed
```

**Soluciones:**

#### 1. Verifica que el servidor esté corriendo

**Local:**
```bash
# Verificar servidor local
.\check-server.ps1

# O manualmente
curl http://localhost:3001/health
```

**Producción:**
```bash
# Render
.\check-server.ps1 -Url "https://tu-app.onrender.com"

# Fly.io
fly status
fly logs
```

#### 2. Verifica la URL en Vercel

1. Ve a Vercel → Settings → Environment Variables
2. Verifica que `NEXT_PUBLIC_SOCKET_URL` sea correcta
3. **NO debe tener `/` al final**
4. **Debe ser `https://...` en producción**

❌ Incorrecto:
```
https://tu-app.onrender.com/
http://tu-app.onrender.com (si el servidor usa HTTPS)
```

✅ Correcto:
```
https://tu-app.onrender.com
```

#### 3. Verifica que el servidor acepte CORS

El servidor ya está configurado con CORS abierto (`origin: "*"`), pero si tienes problemas:

1. Revisa los logs del servidor
2. Verifica que el servidor esté en modo producción
3. Asegúrate de que no haya proxy/firewall bloqueando

#### 4. Espera el wake-up (servicios gratuitos)

Si estás usando tier gratuito de Render o Fly.io:
- El servicio se "duerme" tras 15 min sin uso
- La primera conexión tarda **30 segundos** en despertar
- Espera y recarga la página

**Solución:** Usar un ping service como https://uptimerobot.com

---

## "Service is offline" en Railway

**Causa:** Tu plan de Railway expiró.

**Solución:** Migrar a Render o Fly.io:
- 📖 [SOLUCION_RAILWAY.md](SOLUCION_RAILWAY.md)
- 📖 [MIGRACION_RENDER.md](MIGRACION_RENDER.md)
- 📖 [MIGRACION_FLY.md](MIGRACION_FLY.md)

---

## Error: "Cannot read property 'session' of undefined"

**Causa:** El WebSocket no está conectado o la sesión no existe.

**Solución:**
1. Verifica que el WebSocket esté conectado (debe aparecer en verde)
2. Asegúrate de que la sesión exista (creada desde el admin)
3. Refresca la página
4. Revisa los logs del servidor

---

## La app funciona local pero no en producción

### Checklist de producción:

1. **Variables de entorno en Vercel:**
   - [ ] `NEXT_PUBLIC_SOCKET_URL` configurada correctamente
   - [ ] URL sin `/` al final
   - [ ] Usa `https://` (no `http://`)

2. **Servidor WebSocket desplegado:**
   - [ ] Render/Fly.io está "Live" (verde)
   - [ ] Health check responde: `/health`
   - [ ] Logs no muestran errores

3. **Vercel redeployeado:**
   - [ ] Después de cambiar variables de entorno
   - [ ] Build sin errores
   - [ ] Deployment activo

4. **Cache limpiado:**
   ```bash
   # En tu navegador
   Ctrl + Shift + R (hard reload)
   ```

---

## Error: "node_modules not found" al desplegar

**Causa:** Build command incorrecto.

**Solución en Render:**
- Build Command: `npm install`
- Start Command: `node server/server.js`

**Solución en Fly.io:**
- Dockerfile ya incluye `npm install`
- Verifica que el Dockerfile esté en la raíz del proyecto

---

## Sessions no se guardan / se pierden al refrescar

**Causa:** Las sesiones se almacenan en memoria (Map).

**Comportamiento esperado:**
- ✅ Sesiones persisten mientras el servidor está corriendo
- ❌ Sesiones se pierden al reiniciar el servidor

**Solución (si necesitas persistencia):**
1. Implementar base de datos (MongoDB, PostgreSQL, Redis)
2. O usar localStorage en el frontend para datos temporales

---

## Latencia alta / lag en el WebSocket

**Síntomas:**
- Los baneos tardan varios segundos en aparecer
- Desconexiones frecuentes
- Mensajes se pierden

**Soluciones:**

#### 1. Usar servidor más cercano

**Render:** Servidores en US/Europa (latencia ~150-200ms desde LATAM)
**Fly.io:** Servidor en Santiago, Chile (latencia ~30-50ms desde Argentina)

```bash
# Fly.io: Cambiar región
fly regions set scl  # Santiago, Chile
fly regions set gru  # São Paulo, Brasil
```

#### 2. Verificar internet

```bash
# Ping al servidor
ping tu-servidor.onrender.com

# Debería ser < 200ms para buena experiencia
```

#### 3. Optimizar configuración Socket.IO

Ya está optimizado, pero puedes ajustar en [server.js](server/server.js):

```javascript
pingTimeout: 60000,     // Reducir si tienes buena conexión
pingInterval: 25000,    // Ajustar según necesidad
```

---

## Error: "Port already in use"

**Causa:** El puerto 3001 ya está siendo usado por otro proceso.

**Solución en Windows:**

```powershell
# Ver qué proceso usa el puerto 3001
netstat -ano | findstr :3001

# Matar el proceso (reemplaza PID con el número que obtuviste)
taskkill /PID <PID> /F
```

**Solución alternativa:** Cambiar el puerto

En [server.js](server/server.js):
```javascript
const PORT = process.env.PORT || 3002; // Cambiar a 3002
```

Y en `.env`:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
```

---

## Páginas 404 al navegar directamente

**Causa:** Configuración de Next.js en Vercel.

**Solución:** Ya está configurada, pero si tienes problemas:

Crea `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

---

## Mobile app no conecta al WebSocket

**En la app móvil:**

1. Verifica que `SOCKET_URL` en `mobile-app/App.js` sea correcta
2. Debe ser la URL pública (no `localhost`)
3. Debe usar `https://` (no `http://`)

Ejemplo correcto:
```javascript
const SOCKET_URL = 'https://tu-servidor.onrender.com';
```

❌ Incorrecto:
```javascript
const SOCKET_URL = 'http://localhost:3001'; // No funciona en móvil
```

---

## "Failed to fetch" al hacer requests

**Causa:** CORS o servidor no responde.

**Solución:**

1. Verifica CORS en el servidor (ya configurado con `origin: "*"`)
2. Asegúrate de que el servidor esté corriendo
3. Verifica que la URL sea correcta (sin typos)
4. Revisa los logs del servidor

---

## Caracteres especiales no se muestran bien

**Causa:** Encoding incorrecto.

**Solución:**

En `next.config.js`:
```javascript
module.exports = {
  i18n: {
    locales: ['es'],
    defaultLocale: 'es',
  },
}
```

En HTML:
```html
<meta charset="UTF-8" />
```

---

## Render/Fly.io: "Build failed"

### Error común en Render:
```
Error: Cannot find module 'socket.io'
```

**Solución:**
- Verifica que `package.json` tenga todas las dependencias
- Build Command debe ser: `npm install`

### Error común en Fly.io:
```
Error: No Dockerfile found
```

**Solución:**
- Asegúrate de que `Dockerfile` esté en la raíz del proyecto
- Verifica que se llame exactamente `Dockerfile` (sin extensión)

---

## Logs útiles para debugging

### Frontend (Next.js):
```javascript
// En componentes
console.log('WebSocket conectado:', socket.connected);
console.log('Session actual:', session);
```

### Backend (servidor):
```bash
# Render: Ve a Dashboard → Logs
# Fly.io: fly logs
# Local: Los logs aparecen en la terminal donde ejecutaste npm run server
```

### Navegador:
1. Abre DevTools (F12)
2. Ve a Console
3. Ve a Network → WS (WebSocket)
4. Verifica que haya conexión activa

---

## Obtener ayuda

Si ninguna de estas soluciones funciona:

1. **Revisa los logs del servidor**
2. **Revisa la consola del navegador** (F12 → Console)
3. **Verifica el estado del servicio:**
   ```bash
   .\check-server.ps1 -Url "https://tu-servidor.com"
   ```
4. **Captura de pantalla del error**
5. **Comparte los logs relevantes**

### Información útil para reportar problemas:
- Sistema operativo
- Navegador y versión
- URL del error (si aplica)
- Logs del servidor
- Logs del navegador (Console)
- Pasos para reproducir el error

---

## Recursos adicionales

- [Documentación de Socket.IO](https://socket.io/docs/v4/)
- [Documentación de Render](https://render.com/docs)
- [Documentación de Fly.io](https://fly.io/docs)
- [Documentación de Vercel](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
