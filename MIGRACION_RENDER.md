# 🚀 Migración de Railway a Render.com

## ¿Por qué Render?
- ✅ **750 horas gratis al mes** (suficiente para tu proyecto)
- ✅ Soporte nativo para WebSockets
- ✅ Sin tarjeta de crédito requerida para empezar
- ✅ Se mantiene activo (no se duerme tan rápido como Heroku)

## Pasos de Migración

### 1. Crear cuenta en Render
1. Ve a https://render.com
2. Regístrate con tu cuenta de GitHub
3. Autoriza el acceso a tu repositorio

### 2. Desplegar el servidor WebSocket

1. En el dashboard de Render, haz clic en **"New +"** → **"Web Service"**

2. Conecta tu repositorio de GitHub `Smash-Ban-Stages`

3. Configura el servicio:
   - **Name:** `smash-websocket-server`
   - **Region:** Selecciona la más cercana (US o Europe)
   - **Branch:** `main` (o tu rama principal)
   - **Root Directory:** (déjalo vacío)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/server.js`

4. En **Plan**, selecciona:
   - **Free** (750 horas/mes gratuitas)

5. Haz clic en **"Create Web Service"**

### 3. Configurar variables de entorno (Opcional)

Si necesitas variables de entorno:
1. Ve a tu servicio en Render
2. Click en **"Environment"** en el menú lateral
3. Agrega las variables que necesites

### 4. Obtener la URL de tu servicio

Una vez desplegado, Render te dará una URL como:
```
https://smash-websocket-server.onrender.com
```

⚠️ **IMPORTANTE:** Copia esta URL, la necesitarás en el siguiente paso.

### 5. Actualizar tu aplicación Next.js (Vercel)

Debes actualizar la variable de entorno en Vercel:

1. Ve a tu proyecto en Vercel: https://vercel.com
2. Ve a **Settings** → **Environment Variables**
3. Busca o crea `NEXT_PUBLIC_SOCKET_URL`
4. Actualiza el valor a: `https://smash-websocket-server.onrender.com`
5. Haz un **Redeploy** de tu aplicación

### 6. Actualizar archivo .env local

Actualiza tu archivo `.env` local:
```env
NEXT_PUBLIC_SOCKET_URL=https://smash-websocket-server.onrender.com
```

### 7. Verificar que funciona

1. Visita: `https://smash-websocket-server.onrender.com/health`
2. Deberías ver algo como:
   ```json
   {
     "status": "healthy",
     "service": "Smash Ban Stages WebSocket Server",
     "uptime": 123.45,
     "sessions": 0
   }
   ```

3. Abre tu aplicación en Vercel y verifica que el WebSocket conecte correctamente.

## Ventajas vs Railway
- ✅ **Gratis de forma permanente** (750 horas/mes)
- ✅ No requiere tarjeta de crédito
- ✅ Más estable que el tier gratuito de otros servicios
- ✅ Logs en tiempo real
- ✅ Auto-despliegue desde GitHub

## Notas importantes

⚠️ **Servicio gratuito:** El servicio gratuito puede "dormirse" después de 15 minutos de inactividad. Se despierta automáticamente cuando recibe una petición (puede tardar 30 segundos la primera vez).

💡 **Solución al sleep:** Si necesitas que esté siempre activo:
- Opción 1: Pagar $7/mes por el plan Starter (siempre activo)
- Opción 2: Usar un servicio de "ping" como https://uptimerobot.com (gratis) para hacer ping cada 10 minutos

## Troubleshooting

### El WebSocket no conecta
- Verifica que la URL en Vercel sea correcta (sin trailing slash)
- Revisa los logs en Render: Dashboard → Tu servicio → Logs
- Asegúrate de que el servicio esté "Live" (verde) en Render

### Error de CORS
El servidor ya está configurado con CORS abierto, pero si tienes problemas:
- Verifica en los logs de Render
- Asegúrate de que tu dominio de Vercel esté permitido

### El servicio está "down"
- Render puede tardar 1-2 minutos en desplegar
- Si está en "sleep mode", la primera conexión lo despertará (espera 30 segundos)

## Comparación de costos

| Servicio | Gratis | Precio básico | WebSocket |
|----------|--------|---------------|-----------|
| Railway  | ❌ (solo trial) | $5/mes | ✅ |
| Render   | ✅ 750h/mes | $7/mes | ✅ |
| Vercel   | ✅ Ilimitado | $20/mes | ⚠️ Limitado |
| Fly.io   | ✅ Limitado | $3-5/mes | ✅ |

## Alternativa: Fly.io

Si Render no te funciona, otra opción gratuita es Fly.io:
- Ver archivo `MIGRACION_FLY.md` para instrucciones
