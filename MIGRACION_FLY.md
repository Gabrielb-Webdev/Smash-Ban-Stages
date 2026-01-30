# 🚀 Migración de Railway a Fly.io

## ¿Por qué Fly.io?
- ✅ **Tier gratuito permanente** (3 VMs pequeñas, 160GB bandwidth)
- ✅ Soporte completo para WebSockets
- ✅ Servidores en Latinoamérica (Santiago, Chile - baja latencia)
- ✅ Sin tarjeta de crédito requerida
- ✅ Auto-sleep y auto-wake inteligente

## Requisitos previos
- Node.js instalado
- Git instalado
- Cuenta en Fly.io (gratis)

## Pasos de Migración

### 1. Instalar Fly CLI

En PowerShell:
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

Cierra y abre de nuevo la terminal para que funcione el comando `fly`.

### 2. Login en Fly.io

```bash
fly auth login
```

Esto abrirá tu navegador para autenticarte.

### 3. Crear y desplegar la aplicación

Desde la raíz de tu proyecto:

```bash
# Crear la app (elige un nombre único)
fly apps create smash-websocket-server

# O deja que Fly genere un nombre automático
fly launch --no-deploy

# Configurar región (Santiago, Chile - más cerca de Argentina)
fly regions set scl

# Desplegar
fly deploy
```

### 4. Obtener la URL

Después del deploy, obtendrás una URL como:
```
https://smash-websocket-server.fly.dev
```

Para verificar:
```bash
fly status
```

### 5. Actualizar variables de entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com
2. Settings → Environment Variables
3. Actualiza `NEXT_PUBLIC_SOCKET_URL`:
   ```
   https://smash-websocket-server.fly.dev
   ```
4. Haz un **Redeploy**

### 6. Actualizar .env local

```env
NEXT_PUBLIC_SOCKET_URL=https://smash-websocket-server.fly.dev
```

### 7. Verificar funcionamiento

```bash
# Ver logs en tiempo real
fly logs

# Verificar health check
curl https://smash-websocket-server.fly.dev/health
```

## Comandos útiles

```bash
# Ver estado de la app
fly status

# Ver logs en tiempo real
fly logs

# Abrir la app en el navegador
fly open

# Ver métricas
fly dashboard

# Escalar (si necesitas más recursos)
fly scale vm shared-cpu-1x --memory 512

# Reiniciar la app
fly apps restart

# Ver todas tus apps
fly apps list

# Destruir la app (eliminar)
fly apps destroy smash-websocket-server
```

## Configuración avanzada

### Mantener la app siempre activa

Por defecto, Fly duerme las apps después de inactividad. Para mantenerla activa:

1. Edita `fly.toml`:
   ```toml
   auto_stop_machines = false
   min_machines_running = 1
   ```

2. Redeploy:
   ```bash
   fly deploy
   ```

⚠️ Esto consume más horas del tier gratuito.

### Agregar variables de entorno

```bash
fly secrets set NODE_ENV=production
fly secrets set CUSTOM_VAR=value

# Ver secretos (valores ocultos)
fly secrets list
```

### Cambiar región

```bash
# Ver regiones disponibles
fly platform regions

# Cambiar región (ej: São Paulo, Brasil)
fly regions set gru

# Múltiples regiones (para redundancia)
fly regions add scl gru
```

### Monitoreo

Fly incluye monitoreo básico gratis:
- Ve a https://fly.io/dashboard
- Selecciona tu app
- Ve a "Monitoring"

## Troubleshooting

### Error: "Could not resolve image"
```bash
fly deploy --local-only
```

### WebSocket no conecta
1. Verifica que el servicio esté activo:
   ```bash
   fly status
   ```

2. Revisa los logs:
   ```bash
   fly logs
   ```

3. Verifica el health check:
   ```bash
   curl https://tu-app.fly.dev/health
   ```

### App muy lenta al despertar
Esto es normal en el tier gratuito. La primera petición puede tardar 5-10 segundos.

Solución: Configurar `min_machines_running = 1` en `fly.toml`

### Límite de bandwidth excedido
El tier gratuito incluye 160GB/mes. Si lo excedes:
- Monitorea el uso: `fly dashboard`
- Considera optimizar el tamaño de los mensajes
- O actualiza al plan Paid ($5-10/mes)

## Comparación con Render

| Característica | Fly.io | Render |
|----------------|--------|--------|
| Precio gratis | ✅ 3 VMs | ✅ 750h/mes |
| WebSocket | ✅ Completo | ✅ Completo |
| Latencia LATAM | ✅ Muy baja (SCL) | ⚠️ US/EU |
| Auto-sleep | ✅ Rápido (~5s) | ⚠️ Lento (~30s) |
| Logs | ✅ Excelente | ✅ Bueno |
| Complejidad | ⚠️ CLI required | ✅ Solo web UI |

## Recomendación

- **Si quieres algo simple:** Usa Render (ver `MIGRACION_RENDER.md`)
- **Si quieres mejor rendimiento:** Usa Fly.io (este archivo)
- **Si estás en Argentina/Chile:** Definitivamente Fly.io (latencia <50ms)

## Migrar de Render a Fly.io (o viceversa)

Si ya usaste Render y quieres probar Fly.io:

1. Despliega en Fly.io siguiendo los pasos arriba
2. Actualiza la URL en Vercel
3. Espera 5 minutos para que los DNS se propaguen
4. Opcional: Elimina el servicio de Render

Ambos servicios pueden coexistir sin problemas.
