# Resumen de Sesión — Santa Fe Smash Overlays

> **INSTRUCCIÓN PARA EL ASISTENTE:** Este archivo debe mantenerse actualizado en todo momento. Ante cada petición o modificación realizada en el proyecto, actualizar este documento agregando los cambios correspondientes en las secciones pertinentes (Archivos Modificados, Cambios por Tema, Arquitectura de Datos, Notas Importantes). También actualizar la fecha al inicio.

**Fecha:** 5 de mayo de 2026  
**Proyecto:** smash-ban-stages (Vercel + Next.js + Socket Server en Render)

---

## Archivos Modificados

| Archivo | Cambios |
|---|---|
| `public/overlays/Santa-fe/Overlay 2/overlay2.html` | Stock icons, triángulo con Logo.png |
| `public/overlays/Santa-fe/Overlay 2/control.html` | Formato BO3/BO5/FREE, push al scoreboard, fix caracteres |
| `public/overlays/Santa-fe/Control V3.html` | **NUEVO** — panel unificado |
| `public/overlays/Santa-fe/Game Scoreboard.html` | Fix Win Border.png |
| `public/overlays/Santa-fe/Resources/Scripts/Game Scoreboard.js` | Fix formato, team logos, "Best of" |
| `pages/api/scoreboard-update.js` | Agregar FreePlays a ALLOWED_BESTOF |
| `pages/admin/_panel.js` | Push a overlay2-state al llamar match de stream |
| `src/components/TabletControlSantaFe.jsx` | Fix getSkinCount, bloqueo jugadores, validación matchToken |
| `lib/redis.js` | Key helpers para Ranked Offline |
| `pages/api/offline/session.js` | **NUEVO** — CRUD sesión offline (admin) |
| `pages/api/offline/join.js` | **NUEVO** — Inscripción de jugadores con código |
| `pages/api/offline/status.js` | **NUEVO** — Polling de estado por jugador |
| `pages/api/offline/assign.js` | **NUEVO** — Admin asigna partidas por MMR a pantallas libres |
| `pages/api/offline/result.js` | **NUEVO** — Admin reporta resultado, aplica stats ranked Switch |
| `pages/index.js` | Sección "Ranked Offline" en panel admin (`/?panel=1`) |
| `pages/home.js` | Banner Ranked Offline en tab Match (`home#match`) |

---

## Cambios por Tema

### 1. Stock Icons en overlay2.html
- Los íconos de personaje ahora aparecen **pegados al borde** de la franja oscura del nombre (fuera del fondo `#16081f`), no en los bordes de la pantalla.
- P1: ícono a la **izquierda** de la barra. P2: ícono a la **derecha** de la barra.
- Se usan archivos locales de `./Stock Icons V2/{Carpeta}/{skin}.png`.
- Se crearon wrappers flex (`.player-side-left` / `.player-side-right`) que agrupan la barra + el ícono.

### 2. Triángulo central en overlay2.html
- El fondo del triángulo SVG cambió de `fill: #16081f` a **`Logo.png` clipeada al triángulo**.
- Se agregó un fondo negro dentro del triángulo detrás del logo.
- Implementado con `<clipPath>` SVG: fondo negro → imagen clipeada → borde rojo encima.

### 3. Control V3.html — Panel Unificado (NUEVO)
Combina `control.html` y `Controls.html` en un solo panel que controla los 3 overlays:
- **Game Scoreboard.html** (vía `santa-fe-scoreboard` localStorage + `/api/scoreboard-update`)
- **Overlay 2/overlay.html** (vía `smash-scoreboard-v2` BroadcastChannel + localStorage + `/api/santa-fe/overlay2-state`)
- **Overlay 2/overlay2.html** (mismo canal que overlay.html)

**Funcionalidades de Control V3:**
- Grid de 3 columnas: P1 | Centro (scores) | P2
- Panel de evento: torneo línea 1/2, ronda, botones BO3/BO5/FREE
- Por jugador: sponsor, tag, color sponsor (picker + hex sincronizados), país, bandera (dropdown con búsqueda), Twitter, seed, pronombres
- Botones W/L/— (para Game Scoreboard)
- Selector de color de jugador (Red/Blue/Yellow/etc.)
- Grid de personajes con stock icons de `./Overlay 2/Stock Icons V2/`
- Strip de alts (skins)
- Preview del personaje seleccionado
- Score +/- con display, Reset, Swap, Enviar
- Panel de casters
- Auto-envío en cada cambio de input
- **`syncFromSession()`** — cada 1.5s consulta `/api/santa-fe/stream-session` y auto-llena todos los campos cuando el admin llama un match al stream

**Formato en overlay.html:** El campo `event-bracket` recibe "BO3", "BO5" o "FREE PLAYS", que aparece donde antes decía "TOP 16".

### 4. Fix: `getSkinCount` en TabletControlSantaFe.jsx
- **Bug:** Al seleccionar personaje en `/tablet/santafe-stream` solo se marcaba visualmente pero no abría el modal de skins.
- **Causa:** Se llamaba a `getSantaFeSkinCount()` que nunca estuvo definida. La función correcta importada es `getSkinCount`.
- **Fix:** `getSantaFeSkinCount(characterId)` → `getSkinCount(characterId)`

### 5. Bloqueo de jugadores de matches anteriores
- **Bug:** Jugadores de una partida anterior (ej. Luli2204) podían interactuar con el match nuevo (ej. iiori_ vs The_Senpai).
- **Causa raíz:** El `playerIndex` del URL (`?p=player1&mt=TOKEN1`) queda guardado en estado React. Aunque la sesión cambie a nuevos jugadores con nuevo `matchToken`, `playerIndex` sigue siendo `'player1'` y toma precedencia sobre el matching por nombre → el jugador nunca queda como `null`.
- **Fix en TabletControlSantaFe.jsx:**
  ```javascript
  const tokenIsValid = !matchToken || !session?.matchToken || matchToken === session.matchToken;
  const _rawIdentity = (tokenIsValid ? playerIndex : null) || manualIdentity || ...
  ```
  Si el token del URL no coincide con el token de la sesión actual, `playerIndex` se ignora.
- **También:** Early return que muestra pantalla "Esperando tu match..." cuando el dispositivo tiene un `playerName` que no matchea con ningún jugador del match activo.

### 6. Formato BO3/BO5 llegando al Game Scoreboard
- **Bug:** El Game Scoreboard mostraba "Best of " pero sin el número ("3" o "5").
- **Causa:** Se enviaba `bestOf: 'Bo3'` pero el scoreboard lee TWO campos separados: `bestOf` (prefijo) y `format` (número).
- **Fix:** Se agrega `format: S.format === 'Bo3' ? '3' : S.format === 'Bo5' ? '5' : ''` al payload del scoreboard en Control V3 y en control.html.

### 7. Caracteres llegando con nombre incorrecto al Game Scoreboard
- **Bug:** Los personajes no aparecían en el scoreboard.
- **Causa:** El scoreboard usa la ruta `/images/Stock Icons V2/{NombreCarpeta}/{skin}.png` con Title Case (`Mario`, `Donkey Kong`). Los controles enviaban slugs en minúscula (`mario`, `donkey_kong`).
- **Fix en Control V3 — `parseChar()`:**
  ```javascript
  const charDef = CHARS.find(c => c.id === id);
  return { character: charDef ? charDef.folder : id, skin };
  ```
- **Fix en control.html — `parseCharState()`:** Agregado objeto `CHAR_FOLDER_MAP` con el mapeo slug → carpeta.

### 8. "Best of 5" en lugar de "First to 5"
- **Bug:** El Game Scoreboard mostraba "First to 5" para Bo5.
- **Fix en Game Scoreboard.js:** Reemplazado `"First to "` por `"Best of "` en todas las instancias (startup y update loop).

### 9. Pronombres fuera del Game Scoreboard
- Eliminado `p1Pron`/`p2Pron` del payload que se envía al Game Scoreboard en Control V3 y control.html.

### 10. Formato y datos del admin llegando a overlay2.html
- **Bug:** Al llamar un match desde `/admin/santafe`, `overlay2.html` no se actualizaba automáticamente.
- **Causa:** El admin empujaba al servidor WebSocket y a `player-meta` en Redis, pero NO a `/api/santa-fe/overlay2-state` que es lo que overlay2.html consulta cada 500ms.
- **Fix en `_panel.js`:** Al llamar un stream match de Santa Fe, se agrega un fetch a `/api/santa-fe/overlay2-state` con: nombres de jugadores (parsea `Sponsor | Tag`), scores en 0, chars vacíos, ronda, formato (`event-bracket`), país, bandera, seed, pronombres.

### 11. Errores 404 en Game Scoreboard.html
Tres causas:

**`Win Border.png` (6 referencias):**
- El archivo no existe en el servidor.
- Fix: Reemplazadas todas las referencias por `Resources/Literally Nothing.png` (archivo transparente que sí existe).

**`TeamLogos/.png` (team vacío):**
- Cuando un jugador no tiene equipo, la ruta resultaba en `Resources/TeamLogos/.png`.
- Fix: Guard `if (!pTeam) { showNothing(logoEL); return; }` en `updateTeamLogo`.

**`TeamLogos/Luli2204.png` (carpeta inexistente):**
- La carpeta `TeamLogos/` no existe en el servidor.
- Fix: `logoEL.onerror = () => showNothing(logoEL)` siempre (antes solo se asignaba en startup), así cada intento de cargar un logo inexistente muestra limpiamente la imagen vacía.

---

## Arquitectura de Datos — Canales de Comunicación

```
Admin (/admin/santafe)
  ├─→ WebSocket Server (jugadores, formato, ronda)
  ├─→ /api/santa-fe/player-meta (Redis: seed, país, bandera, prefix)
  └─→ /api/santa-fe/overlay2-state (NUEVO: auto-actualiza overlay2.html)

Control V3 / control.html
  ├─→ BroadcastChannel 'smash-scoreboard-v2'  ──→ overlay.html, overlay2.html
  ├─→ localStorage 'smash-scoreboard-v2'       ──→ overlay.html, overlay2.html (fallback)
  ├─→ /api/santa-fe/overlay2-state             ──→ overlay2.html (cross-browser/OBS)
  ├─→ localStorage 'santa-fe-scoreboard'       ──→ Game Scoreboard.html (mismo browser)
  └─→ /api/scoreboard-update (Redis)           ──→ Game Scoreboard.html (OBS/cross-browser)

Tablet (/tablet/santafe-stream)
  └─→ WebSocket Server ←→ overlay.html, overlay2.html
        char1/char2/skin1/skin2 → stock icons en overlay2

Control V3 ← /api/santa-fe/stream-session (polling 1.5s)
  └─ Auto-llena campos cuando admin envía nuevo match al stream
```

---

## Notas Importantes

- El **formato en overlay.html** llega como `event-bracket` ("BO3"/"BO5"/"FREE PLAYS") y reemplaza el antiguo "TOP 16" hardcodeado.
- Los **stock icons en overlay2.html** usan `./Stock Icons V2/{Carpeta}/{skin}.png` (relativo a overlay2.html). Los del Game Scoreboard usan `/images/Stock Icons V2/{Carpeta}/{skin}.png` (absoluto desde raíz del sitio).
- La carpeta `TeamLogos/` no existe — si se quieren logos de equipos hay que crearla y agregar los PNGs con el nombre exacto del equipo.
- El **matchToken** en la URL (`?mt=TOKEN`) es la clave para detectar si un jugador pertenece al match actual o a uno anterior.
