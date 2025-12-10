# 🚀 Migración al Sistema de Sesiones Únicas

## ⚠️ Cambios Importantes

### Antes vs Ahora

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Session ID** | Nombre de comunidad (`cordoba`) | ID único (`cordoba-1702234567890-a4f9x2k`) |
| **Sesiones simultáneas** | ❌ Una por comunidad | ✅ Ilimitadas por comunidad |
| **Links de stream/tablet** | `/stream/cordoba` | `/stream/cordoba-1702234567890-a4f9x2k` |
| **Torneos simultáneos** | ❌ No permitido | ✅ Completamente soportado |

## 📋 Checklist de Despliegue

### 1. Verificar Variables de Entorno

**En Vercel** (Frontend):
```bash
NEXT_PUBLIC_SOCKET_URL=https://tu-servidor.railway.app
```

**En Railway** (Backend):
- ✅ Puerto automático (asignado por Railway)
- ✅ No requiere configuración adicional

### 2. Desplegar Backend (Railway)

```bash
# Railway detectará automáticamente el server.js
# Solo asegúrate de tener estos archivos:
- server/server.js (actualizado)
- package.json
- Procfile (opcional)
```

### 3. Desplegar Frontend (Vercel)

```bash
# Vercel detectará automáticamente Next.js
# Archivos actualizados:
- pages/index.js (selector de comunidades)
- pages/admin/[community].js (nuevo)
- src/components/AdminPanel.jsx (refactorizado)
```

### 4. Probar en Producción

1. ✅ Accede a tu dominio: `https://tu-app.vercel.app`
2. ✅ Selecciona una comunidad (ej: Córdoba)
3. ✅ Crea una sesión con dos jugadores
4. ✅ Verifica que se generen links únicos
5. ✅ Abre el link de stream en otra pestaña
6. ✅ Verifica que la información se muestre correctamente

### 5. Probar Múltiples Sesiones

**Test de aislamiento**:

1. **Pestaña 1**: `/admin/cordoba`
   - Crea sesión: "Jugador A" vs "Jugador B"
   - Anota el sessionId generado

2. **Pestaña 2**: `/admin/afk`
   - Crea sesión: "Jugador C" vs "Jugador D"
   - Anota el sessionId generado

3. **Pestaña 3**: Abre stream de Córdoba
   - URL: `/stream/cordoba-[ID-de-paso-1]`
   - ✅ Debe mostrar solo "Jugador A" vs "Jugador B"

4. **Pestaña 4**: Abre stream de AFK
   - URL: `/stream/afk-[ID-de-paso-2]`
   - ✅ Debe mostrar solo "Jugador C" vs "Jugador D"

## 🐛 Solución de Problemas

### Problema: "No se conecta al WebSocket"

**Solución**:
1. Verifica que `NEXT_PUBLIC_SOCKET_URL` esté configurado en Vercel
2. Verifica que el servidor Railway esté activo
3. Revisa los logs de Railway para errores

```bash
# En Railway
railway logs
```

### Problema: "Las sesiones se mezclan"

**Causa**: Posiblemente estás usando links antiguos con el formato viejo

**Solución**:
1. Crea una nueva sesión desde el panel de admin
2. Usa los links recién generados (con IDs únicos)
3. Los links viejos ya no funcionarán

### Problema: "Se pierden las sesiones al reiniciar"

**Causa**: Las sesiones se almacenan en memoria (comportamiento esperado)

**Soluciones**:
- **Opción 1** (Recomendada): Esto es normal, cada torneo crea una sesión nueva
- **Opción 2** (Avanzado): Implementar persistencia con Redis o base de datos

### Problema: "El stream no muestra la información correcta"

**Solución**:
1. Verifica que estás usando el sessionId correcto en la URL
2. Refresca el stream (F5)
3. Verifica en el panel de admin que la sesión esté activa

## 📊 Monitoreo

### Verificar Sesiones Activas

**En Railway**, puedes agregar este endpoint temporal al servidor:

```javascript
// En server.js, dentro del createServer
if (req.url === '/sessions') {
  const sessionList = [];
  sessions.forEach((session, id) => {
    sessionList.push({
      id,
      community: session.community,
      players: `${session.player1.name} vs ${session.player2.name}`,
      phase: session.phase
    });
  });
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ sessions: sessionList }, null, 2));
  return;
}
```

Luego accede a: `https://tu-servidor.railway.app/sessions`

## ✅ Validación Final

Después del despliegue, verifica:

- [ ] La página principal muestra las 3 comunidades
- [ ] Puedes acceder a `/admin/cordoba`, `/admin/afk`, `/admin/mendoza`
- [ ] Al crear una sesión, se genera un ID único
- [ ] Los links de stream/tablet usan el sessionId único
- [ ] Múltiples sesiones pueden existir simultáneamente
- [ ] Los streams muestran solo la información de su sesión
- [ ] El botón "Volver a Comunidades" funciona

## 🎯 Notas Importantes

1. **Links Antiguos**: Si alguien tiene guardado un link viejo (ej: `/stream/cordoba`), dejará de funcionar. Deben usar los nuevos links con sessionId único.

2. **Sesiones Temporales**: Las sesiones solo viven mientras el servidor esté activo. Si Railway reinicia el servidor, las sesiones se pierden (esto es esperado).

3. **Performance**: El sistema puede manejar cientos de sesiones simultáneas sin problemas. Railway ofrece suficiente memoria RAM para esto.

4. **Backup de Links**: Recomienda a los administradores guardar/copiar los links de stream/tablet cuando creen una sesión, ya que son únicos.

## 🔄 Rollback (Si algo sale mal)

Si necesitas volver a la versión anterior:

1. En Vercel: Ve a "Deployments" y haz rollback al deployment anterior
2. En Railway: Similar, ve al deployment anterior
3. Restaura las variables de entorno si las cambiaste

---

**Última actualización**: Diciembre 2024
