# Ranked Offline Tournament — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistema de Ranked Offline para torneos presenciales: el organizador activa una sesión desde `/?panel=1`, configura pantallas disponibles (genera código automáticamente), y asigna partidas a jugadores inscritos; los resultados cuentan para el ranking de Switch Online.

**Architecture:** Estado de sesión completo en 3 claves Redis (`offline:session`, `offline:queue`, `offline:matches`). 5 API routes nuevas bajo `/api/offline/`. Panel admin en `/?panel=1` (nueva sección colapsable). Jugadores se unen desde `home#match` ingresando el código. Admin reporta resultados que actualizan `ranked:stats:{userId}:switch` igual que ranked online.

**Tech Stack:** Next.js API Routes, Upstash Redis (`@upstash/redis`), React (polling intervals), `lib/ranks.js` reutilizado para calcular RR/MMR, `ADMIN_SECRET` env var para auth de admin.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `lib/redis.js` | Modificar | Agregar 4 key helpers para offline |
| `pages/api/offline/session.js` | Crear | CRUD de sesión (admin) |
| `pages/api/offline/join.js` | Crear | Inscripción de jugadores con código |
| `pages/api/offline/status.js` | Crear | Polling de estado por jugador |
| `pages/api/offline/assign.js` | Crear | Admin asigna partidas a pantallas libres |
| `pages/api/offline/result.js` | Crear | Admin reporta ganador, aplica ranked stats |
| `pages/index.js` | Modificar | Nueva sección "Ranked Offline" en panel admin |
| `pages/home.js` | Modificar | Nueva opción en TabMatch para unirse con código |

---

## Estructuras de datos Redis

```json
// offline:session (TTL 24h)
{
  "code": "K7MX2A",
  "active": true,
  "totalScreens": 3,
  "screens": [
    { "id": 1, "label": "Tele 1", "available": true, "busy": false },
    { "id": 2, "label": "Tele 2", "available": true, "busy": true },
    { "id": 3, "label": "Tele 3", "available": false, "busy": false }
  ],
  "createdAt": 1714950000000
}

// offline:queue (TTL 24h)
[
  { "userId": "123", "userName": "Sora", "charId": "sora", "charAlt": 0, "mmr": 1500, "joinedAt": 1714950100000 }
]

// offline:matches (TTL 24h)
[
  {
    "matchId": "offline-1714950200000-ab3x2c",
    "screenId": 2,
    "player1": { "userId": "123", "userName": "Sora", "charId": "sora", "charAlt": 0, "mmr": 1500 },
    "player2": { "userId": "456", "userName": "Link", "charId": "link", "charAlt": 0, "mmr": 1520 },
    "status": "active",
    "startedAt": 1714950200000
  }
]

// offline:result:{userId} (TTL 600s — para que el jugador vea su resultado)
{ "won": true, "rpDelta": 18, "newRank": "Hierro II", "newRankPoints": 62, "matchId": "offline-..." }
```

---

## Task 1: Key helpers en lib/redis.js

**Archivos:**
- Modificar: `lib/redis.js` (agregar al final)

- [ ] **Paso 1: Agregar exports al final de lib/redis.js**

```javascript
/** Sesión de Ranked Offline activa */
export const offlineSessionKey = () => 'offline:session';

/** Cola de jugadores esperando ser asignados */
export const offlineQueueKey = () => 'offline:queue';

/** Partidas activas/terminadas en la sesión */
export const offlineMatchesKey = () => 'offline:matches';

/** Resultado de la última partida offline de un jugador (TTL corto) */
export const offlineResultKey = (userId) => `offline:result:${userId}`;
```

- [ ] **Paso 2: También necesitamos importar `MMR_DEFAULT` en los nuevos archivos. Verificar que ya está exportado en lib/ranks.js:**

```bash
grep -n "export const MMR_DEFAULT" lib/ranks.js
```

Resultado esperado: `14: export const MMR_DEFAULT = 1000;`  
Si no aparece, agregar `export` antes de `const MMR_DEFAULT = 1000;` en lib/ranks.js.

- [ ] **Paso 3: Commit**

```bash
git add lib/redis.js
git commit -m "feat: add offline ranked Redis key helpers"
```

---

## Task 2: Session API — `pages/api/offline/session.js`

**Archivos:**
- Crear: `pages/api/offline/session.js`

Maneja GET (público), POST/PATCH/DELETE (admin). El código de sesión se genera una sola vez y persiste mientras la sesión esté activa.

- [ ] **Paso 1: Crear `pages/api/offline/session.js`**

```javascript
import redis, { offlineSessionKey, offlineQueueKey, offlineMatchesKey } from '../../../lib/redis';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

function requireAdmin(req) {
  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  return auth === ADMIN_SECRET;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: cualquiera puede ver si hay sesión activa
  if (req.method === 'GET') {
    const session = await redis.get(offlineSessionKey());
    return res.status(200).json({ session: session || null });
  }

  if (!requireAdmin(req)) return res.status(401).json({ error: 'No autorizado' });

  // POST: crear/actualizar sesión (cambia totalScreens, genera código si no existe)
  if (req.method === 'POST') {
    const { totalScreens } = req.body || {};
    const n = Math.min(10, Math.max(1, parseInt(totalScreens) || 3));
    const existing = await redis.get(offlineSessionKey());
    const code = existing?.code || generateCode();
    const screens = Array.from({ length: n }, (_, i) => {
      const prev = existing?.screens?.find(s => s.id === i + 1);
      return {
        id: i + 1,
        label: `Tele ${i + 1}`,
        available: prev ? prev.available : true,
        busy: prev ? prev.busy : false,
      };
    });
    const sessionObj = {
      code,
      active: true,
      totalScreens: n,
      screens,
      createdAt: existing?.createdAt || Date.now(),
    };
    await redis.set(offlineSessionKey(), sessionObj, { ex: 24 * 60 * 60 });
    return res.status(200).json({ ok: true, session: sessionObj });
  }

  // PATCH: toggle disponibilidad de pantalla individual
  if (req.method === 'PATCH') {
    const { screenId, available } = req.body || {};
    const session = await redis.get(offlineSessionKey());
    if (!session) return res.status(404).json({ error: 'No hay sesión activa' });
    const screen = session.screens.find(s => s.id === parseInt(screenId));
    if (!screen) return res.status(404).json({ error: 'Pantalla no encontrada' });
    screen.available = !!available;
    await redis.set(offlineSessionKey(), session, { ex: 24 * 60 * 60 });
    return res.status(200).json({ ok: true, session });
  }

  // DELETE: terminar sesión y limpiar queue + matches
  if (req.method === 'DELETE') {
    await redis.del(offlineSessionKey());
    await redis.del(offlineQueueKey());
    await redis.del(offlineMatchesKey());
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

- [ ] **Paso 2: Probar manualmente con curl**

```bash
# Crear sesión con 3 pantallas
curl -X POST http://localhost:3000/api/offline/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer afk-admin-2025" \
  -d '{"totalScreens": 3}'
# Esperado: { ok: true, session: { code: "XXXXXX", screens: [...3 pantallas], active: true } }

# Leer sesión (público)
curl http://localhost:3000/api/offline/session
# Esperado: { session: { code: "XXXXXX", ... } }

# Toggle pantalla 2 a inactiva
curl -X PATCH http://localhost:3000/api/offline/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer afk-admin-2025" \
  -d '{"screenId": 2, "available": false}'
# Esperado: { ok: true, session: { screens: [{ id:2, available: false }, ...] } }

# Terminar sesión
curl -X DELETE http://localhost:3000/api/offline/session \
  -H "Authorization: Bearer afk-admin-2025"
# Esperado: { ok: true }
```

- [ ] **Paso 3: Commit**

```bash
git add pages/api/offline/session.js
git commit -m "feat: add offline session CRUD API"
```

---

## Task 3: Join + Status APIs

**Archivos:**
- Crear: `pages/api/offline/join.js`
- Crear: `pages/api/offline/status.js`

- [ ] **Paso 1: Crear `pages/api/offline/join.js`**

```javascript
import redis, {
  offlineSessionKey, offlineQueueKey, offlineMatchesKey,
  rankedStatsKey,
} from '../../../lib/redis';
import { MMR_DEFAULT } from '../../../lib/ranks';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: jugador se une con código
  if (req.method === 'POST') {
    const { userId, userName, charId, charAlt, code } = req.body || {};
    if (!userId || !userName || !charId || !code) {
      return res.status(400).json({ error: 'userId, userName, charId y code son requeridos' });
    }
    const cleanUserId   = sanitize(userId);
    const cleanUserName = sanitize(userName);
    const cleanCharId   = sanitize(charId);
    const cleanCode     = sanitize(code).toUpperCase();

    const session = await redis.get(offlineSessionKey());
    if (!session || !session.active) {
      return res.status(404).json({ error: 'No hay sesión activa' });
    }
    if (session.code !== cleanCode) {
      return res.status(403).json({ error: 'Código inválido' });
    }

    // Ya está en cola
    const queue = (await redis.get(offlineQueueKey())) || [];
    if (queue.some(p => p.userId === cleanUserId)) {
      return res.status(200).json({ ok: true, alreadyJoined: true, position: queue.findIndex(p => p.userId === cleanUserId) + 1 });
    }

    // Ya está en un match activo
    const matches = (await redis.get(offlineMatchesKey())) || [];
    const inMatch = matches.find(m =>
      m.status === 'active' &&
      (m.player1.userId === cleanUserId || m.player2.userId === cleanUserId)
    );
    if (inMatch) {
      return res.status(200).json({ ok: true, alreadyPlaying: true, matchId: inMatch.matchId });
    }

    // Obtener MMR para el emparejamiento por ranking
    const stats = (await redis.get(rankedStatsKey(cleanUserId, 'switch'))) || {};
    const mmr = stats.mmr || MMR_DEFAULT;

    queue.push({
      userId: cleanUserId,
      userName: cleanUserName,
      charId: cleanCharId,
      charAlt: parseInt(charAlt) || 0,
      mmr,
      joinedAt: Date.now(),
    });
    await redis.set(offlineQueueKey(), queue, { ex: 24 * 60 * 60 });
    return res.status(200).json({ ok: true, position: queue.length });
  }

  // DELETE: jugador abandona la cola
  if (req.method === 'DELETE') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const cleanUserId = sanitize(userId);
    const queue = (await redis.get(offlineQueueKey())) || [];
    const filtered = queue.filter(p => p.userId !== cleanUserId);
    await redis.set(offlineQueueKey(), filtered, { ex: 24 * 60 * 60 });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

- [ ] **Paso 2: Crear `pages/api/offline/status.js`**

```javascript
import redis, {
  offlineSessionKey, offlineQueueKey, offlineMatchesKey, offlineResultKey,
} from '../../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId requerido' });
  const cleanUserId = String(userId).replace(/[<>"'`\\]/g, '').trim().slice(0, 100);

  const session = await redis.get(offlineSessionKey());
  if (!session || !session.active) {
    return res.status(200).json({ status: 'no_session' });
  }

  // Ver si hay resultado pendiente de mostrar (TTL 10 min)
  const finished = await redis.get(offlineResultKey(cleanUserId));
  if (finished) {
    return res.status(200).json({ status: 'finished', result: finished });
  }

  // Ver si está en un match activo
  const matches = (await redis.get(offlineMatchesKey())) || [];
  const myMatch = matches.find(m =>
    m.status === 'active' &&
    (m.player1.userId === cleanUserId || m.player2.userId === cleanUserId)
  );
  if (myMatch) {
    const isP1 = myMatch.player1.userId === cleanUserId;
    const opponent = isP1 ? myMatch.player2 : myMatch.player1;
    const screen = session.screens.find(s => s.id === myMatch.screenId);
    return res.status(200).json({
      status: 'assigned',
      matchId: myMatch.matchId,
      screenId: myMatch.screenId,
      screenLabel: screen?.label || `Tele ${myMatch.screenId}`,
      opponent: { userId: opponent.userId, userName: opponent.userName, charId: opponent.charId },
    });
  }

  // Ver posición en cola
  const queue = (await redis.get(offlineQueueKey())) || [];
  const pos = queue.findIndex(p => p.userId === cleanUserId);
  if (pos !== -1) {
    return res.status(200).json({ status: 'waiting', position: pos + 1, total: queue.length });
  }

  return res.status(200).json({ status: 'idle' });
}
```

- [ ] **Paso 3: Probar manualmente**

```bash
# Unirse (usar el código generado en Task 2)
curl -X POST http://localhost:3000/api/offline/join \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","userName":"Sora","charId":"sora","charAlt":0,"code":"XXXXXX"}'
# Esperado: { ok: true, position: 1 }

# Ver status
curl "http://localhost:3000/api/offline/status?userId=u1"
# Esperado: { status: "waiting", position: 1, total: 1 }

# Código inválido
curl -X POST http://localhost:3000/api/offline/join \
  -H "Content-Type: application/json" \
  -d '{"userId":"u2","userName":"Link","charId":"link","charAlt":0,"code":"WRONG1"}'
# Esperado: 403 { error: "Código inválido" }
```

- [ ] **Paso 4: Commit**

```bash
git add pages/api/offline/join.js pages/api/offline/status.js
git commit -m "feat: add offline join and status APIs"
```

---

## Task 4: Assign API — `pages/api/offline/assign.js`

**Archivos:**
- Crear: `pages/api/offline/assign.js`

Empareja jugadores de la cola por MMR más cercano y los asigna a pantallas libres.

- [ ] **Paso 1: Crear `pages/api/offline/assign.js`**

```javascript
import redis, {
  offlineSessionKey, offlineQueueKey, offlineMatchesKey,
} from '../../../lib/redis';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (auth !== ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });

  const session = await redis.get(offlineSessionKey());
  if (!session || !session.active) return res.status(404).json({ error: 'No hay sesión activa' });

  const matches = (await redis.get(offlineMatchesKey())) || [];
  const queue   = (await redis.get(offlineQueueKey())) || [];

  // Pantallas libres: available=true y sin match activo asignado
  const busyScreenIds = new Set(matches.filter(m => m.status === 'active').map(m => m.screenId));
  const freeScreens   = session.screens.filter(s => s.available && !busyScreenIds.has(s.id));

  if (freeScreens.length === 0) {
    return res.status(200).json({ ok: true, assigned: [], message: 'No hay pantallas disponibles' });
  }
  if (queue.length < 2) {
    return res.status(200).json({ ok: true, assigned: [], message: 'Se necesitan al menos 2 jugadores en cola' });
  }

  // Ordenar cola por MMR → emparejar adyacentes (diferencia mínima)
  const sortedQueue = [...queue].sort((a, b) => a.mmr - b.mmr);

  const newMatches     = [];
  const assignedUserIds = new Set();
  let screenIndex = 0;

  for (let i = 0; i + 1 < sortedQueue.length && screenIndex < freeScreens.length; i += 2) {
    const p1     = sortedQueue[i];
    const p2     = sortedQueue[i + 1];
    const screen = freeScreens[screenIndex++];
    const rand6  = Math.random().toString(36).slice(2, 8);
    const matchId = `offline-${Date.now()}-${rand6}`;

    newMatches.push({
      matchId,
      screenId: screen.id,
      player1: p1,
      player2: p2,
      status: 'active',
      startedAt: Date.now(),
    });
    assignedUserIds.add(p1.userId);
    assignedUserIds.add(p2.userId);
  }

  // Marcar pantallas como ocupadas en session
  for (const m of newMatches) {
    const screen = session.screens.find(s => s.id === m.screenId);
    if (screen) screen.busy = true;
  }
  await redis.set(offlineSessionKey(), session, { ex: 24 * 60 * 60 });

  // Guardar partidas
  await redis.set(offlineMatchesKey(), [...matches, ...newMatches], { ex: 24 * 60 * 60 });

  // Quitar asignados de la cola
  const remainingQueue = queue.filter(p => !assignedUserIds.has(p.userId));
  await redis.set(offlineQueueKey(), remainingQueue, { ex: 24 * 60 * 60 });

  return res.status(200).json({
    ok: true,
    assigned: newMatches,
    remainingQueue: remainingQueue.length,
  });
}
```

- [ ] **Paso 2: Probar — requiere sesión activa y ≥2 jugadores en cola (de Tasks anteriores)**

```bash
# Con 2+ jugadores en cola y pantallas disponibles:
curl -X POST http://localhost:3000/api/offline/assign \
  -H "Authorization: Bearer afk-admin-2025"
# Esperado: { ok: true, assigned: [{ matchId: "offline-...", screenId: 1, player1: {...}, player2: {...} }] }

# Verificar que status de jugadores cambió a "assigned":
curl "http://localhost:3000/api/offline/status?userId=u1"
# Esperado: { status: "assigned", screenId: 1, screenLabel: "Tele 1", opponent: { userName: "Link", ... } }
```

- [ ] **Paso 3: Commit**

```bash
git add pages/api/offline/assign.js
git commit -m "feat: add offline match assignment API with MMR pairing"
```

---

## Task 5: Result API — `pages/api/offline/result.js`

**Archivos:**
- Crear: `pages/api/offline/result.js`

Admin reporta el ganador → aplica el mismo cálculo de MMR/RR que ranked online → libera la pantalla.

- [ ] **Paso 1: Crear `pages/api/offline/result.js`**

```javascript
import redis, {
  offlineSessionKey, offlineMatchesKey, offlineResultKey,
  rankedStatsKey, rankedBoardKey, matchHistoryKey,
  charStatsKey, charBoardKey, rankHistoryKey,
  smasherBoardKey, smasherPoolKey,
} from '../../../lib/redis';
import {
  processMatchResult, leaderboardScore, getRankIndex,
  MMR_DEFAULT, RANKS,
} from '../../../lib/ranks';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (auth !== ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });

  const { matchId, winnerId, stocksWon } = req.body || {};
  if (!matchId || !winnerId) return res.status(400).json({ error: 'matchId y winnerId son requeridos' });

  const cleanMatchId  = sanitize(matchId);
  const cleanWinnerId = sanitize(winnerId);
  const finalStocks   = Math.min(3, Math.max(1, parseInt(stocksWon) || 1));

  const matches    = (await redis.get(offlineMatchesKey())) || [];
  const matchIndex = matches.findIndex(m => m.matchId === cleanMatchId);
  if (matchIndex === -1) return res.status(404).json({ error: 'Match no encontrado' });

  const match = matches[matchIndex];
  if (match.status !== 'active') {
    return res.status(400).json({ error: 'El match ya fue reportado' });
  }

  const validWinners = [match.player1.userId, match.player2.userId];
  if (!validWinners.includes(cleanWinnerId)) {
    return res.status(400).json({ error: 'El ganador no es jugador de este match' });
  }

  const loserId      = match.player1.userId === cleanWinnerId ? match.player2.userId : match.player1.userId;
  const winnerName   = match.player1.userId === cleanWinnerId ? match.player1.userName : match.player2.userName;
  const loserName    = match.player1.userId === loserId ? match.player1.userName : match.player2.userName;
  const winnerCharId = match.player1.userId === cleanWinnerId ? match.player1.charId : match.player2.charId;
  const loserCharId  = match.player1.userId === loserId ? match.player1.charId : match.player2.charId;
  const winnerAltId  = match.player1.userId === cleanWinnerId ? match.player1.charAlt : match.player2.charAlt;
  const loserAltId   = match.player1.userId === loserId ? match.player1.charAlt : match.player2.charAlt;
  const platform     = 'switch';

  // Cargar stats actuales de ambos jugadores
  const wKey = rankedStatsKey(String(cleanWinnerId), platform);
  const lKey = rankedStatsKey(String(loserId), platform);

  const wStats = (await redis.get(wKey)) || {
    userId: cleanWinnerId, userName: winnerName, platform,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0, placementDone: false, placementWins: 0, promotionShield: 0,
  };
  wStats.userName = winnerName;
  wStats.mmr      = wStats.mmr || MMR_DEFAULT;
  wStats.rankIndex = wStats.rankIndex ?? getRankIndex(wStats.rank);

  const lStats = (await redis.get(lKey)) || {
    userId: loserId, userName: loserName, platform,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0, placementDone: false, placementWins: 0, promotionShield: 0,
  };
  lStats.userName = loserName;
  lStats.mmr      = lStats.mmr || MMR_DEFAULT;
  lStats.rankIndex = lStats.rankIndex ?? getRankIndex(lStats.rank);

  const winnerRankBefore       = wStats.rank ?? 'Plástico I';
  const winnerRankPointsBefore = wStats.rankPoints ?? 0;
  const loserRankBefore        = lStats.rank ?? 'Plástico I';
  const loserRankPointsBefore  = lStats.rankPoints ?? 0;

  // Actualizar conteo de personajes
  if (winnerCharId) {
    if (!wStats.charCounts) wStats.charCounts = {};
    wStats.charCounts[String(winnerCharId)] = (wStats.charCounts[String(winnerCharId)] || 0) + 1;
  }
  if (loserCharId) {
    if (!lStats.charCounts) lStats.charCounts = {};
    lStats.charCounts[String(loserCharId)] = (lStats.charCounts[String(loserCharId)] || 0) + 1;
  }

  // Procesar resultado — muta wStats y lStats in-place
  const result = processMatchResult(wStats, lStats, { stocksWon: finalStocks });

  // Guardar stats actualizados
  await redis.set(wKey, wStats);
  await redis.set(lKey, lStats);

  // Leaderboard
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: String(cleanWinnerId) });
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: String(loserId) });

  // SMASHer leaderboard
  const SMASHER_INDEX = RANKS.length - 1;
  if (wStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(platform), { score: wStats.mmr, member: String(cleanWinnerId) });
  } else {
    await redis.zrem(smasherBoardKey(platform), String(cleanWinnerId)).catch(() => {});
  }
  if (lStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(platform), { score: lStats.mmr, member: String(loserId) });
  } else {
    await redis.zrem(smasherBoardKey(platform), String(loserId)).catch(() => {});
  }
  await redis.zadd(smasherPoolKey(platform), { score: wStats.mmr, member: String(cleanWinnerId) });
  await redis.zadd(smasherPoolKey(platform), { score: lStats.mmr, member: String(loserId) });
  await redis.expire(smasherPoolKey(platform), 30 * 24 * 60 * 60);

  // Rank history
  if (result.winner.rankChange.promoted || result.winner.rankChange.demoted || result.winner.placementJustDone) {
    await redis.lpush(rankHistoryKey(String(cleanWinnerId)), {
      rankBefore: result.winner.oldRank, subdivisionBefore: result.winner.oldSubdivision,
      rankAfter: wStats.rank, subdivisionAfter: RANKS[wStats.rankIndex]?.subdivision ?? null,
      reason: result.winner.placementJustDone ? 'PLACEMENT' : 'WIN',
      createdAt: new Date().toISOString(),
    });
    await redis.ltrim(rankHistoryKey(String(cleanWinnerId)), 0, 99);
  }
  if (result.loser.rankChange.promoted || result.loser.rankChange.demoted || result.loser.placementJustDone) {
    await redis.lpush(rankHistoryKey(String(loserId)), {
      rankBefore: result.loser.oldRank, subdivisionBefore: result.loser.oldSubdivision,
      rankAfter: lStats.rank, subdivisionAfter: RANKS[lStats.rankIndex]?.subdivision ?? null,
      reason: result.loser.placementJustDone ? 'PLACEMENT' : 'LOSS',
      createdAt: new Date().toISOString(),
    });
    await redis.ltrim(rankHistoryKey(String(loserId)), 0, 99);
  }

  // Match history
  const matchEntry = {
    matchId: cleanMatchId, platform, winnerId: cleanWinnerId, loserId, winnerName, loserName,
    winnerCharId, loserCharId, winnerAltId, loserAltId,
    stocksWon: finalStocks, offline: true,
    rpDelta: result.winner.rrDelta, loserRpDelta: result.loser.rrDelta,
    mmrDelta: result.winner.mmrDelta,
    winnerRankBefore, winnerRankPointsBefore, loserRankBefore, loserRankPointsBefore,
    winnerRankAfter: wStats.rank, loserRankAfter: lStats.rank,
    isPlacementWinner: !wStats.placementDone && ((wStats.wins || 0) + (wStats.losses || 0)) <= 5,
    isPlacementLoser:  !lStats.placementDone && ((lStats.wins || 0) + (lStats.losses || 0)) <= 5,
    playedAt: new Date().toISOString(),
  };
  await redis.lpush(matchHistoryKey(String(cleanWinnerId)), matchEntry);
  await redis.ltrim(matchHistoryKey(String(cleanWinnerId)), 0, 49);
  await redis.lpush(matchHistoryKey(String(loserId)), matchEntry);
  await redis.ltrim(matchHistoryKey(String(loserId)), 0, 49);

  // Stats por personaje
  if (winnerCharId) {
    const wcKey   = charStatsKey(String(cleanWinnerId), platform, winnerCharId);
    const wcStats = (await redis.get(wcKey)) || { userId: cleanWinnerId, userName: winnerName, charId: winnerCharId, platform, wins: 0, losses: 0 };
    wcStats.userName = winnerName;
    wcStats.wins = (wcStats.wins || 0) + 1;
    await redis.set(wcKey, wcStats);
    await redis.zadd(charBoardKey(platform, winnerCharId), { score: wcStats.wins, member: String(cleanWinnerId) });
  }
  if (loserCharId) {
    const lcKey   = charStatsKey(String(loserId), platform, loserCharId);
    const lcStats = (await redis.get(lcKey)) || { userId: loserId, userName: loserName, charId: loserCharId, platform, wins: 0, losses: 0 };
    lcStats.userName = loserName;
    lcStats.losses = (lcStats.losses || 0) + 1;
    await redis.set(lcKey, lcStats);
    const existingScore = await redis.zscore(charBoardKey(platform, loserCharId), String(loserId));
    if (existingScore == null) await redis.zadd(charBoardKey(platform, loserCharId), { score: 0, member: String(loserId) });
  }

  // Guardar resultado para que cada jugador lo vea en su próximo poll (TTL 10 min)
  await redis.set(
    offlineResultKey(String(cleanWinnerId)),
    { won: true,  rpDelta: result.winner.rrDelta, newRank: wStats.rank, newRankPoints: wStats.rankPoints, matchId: cleanMatchId },
    { ex: 600 }
  );
  await redis.set(
    offlineResultKey(String(loserId)),
    { won: false, rpDelta: result.loser.rrDelta,  newRank: lStats.rank, newRankPoints: lStats.rankPoints, matchId: cleanMatchId },
    { ex: 600 }
  );

  // Marcar match como terminado
  matches[matchIndex] = { ...match, status: 'finished', winnerId: cleanWinnerId, finishedAt: Date.now() };
  await redis.set(offlineMatchesKey(), matches, { ex: 24 * 60 * 60 });

  // Liberar pantalla
  const session = await redis.get(offlineSessionKey());
  if (session) {
    const screen = session.screens.find(s => s.id === match.screenId);
    if (screen) screen.busy = false;
    await redis.set(offlineSessionKey(), session, { ex: 24 * 60 * 60 });
  }

  return res.status(200).json({
    ok: true,
    winnerRpDelta:   result.winner.rrDelta,
    loserRpDelta:    result.loser.rrDelta,
    winnerRankAfter: wStats.rank,
    loserRankAfter:  lStats.rank,
  });
}
```

- [ ] **Paso 2: Probar (requiere match activo de Task 4)**

```bash
# Reportar ganador (usar matchId del assign)
curl -X POST http://localhost:3000/api/offline/result \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer afk-admin-2025" \
  -d '{"matchId":"offline-TIMESTAMP-RANDOM","winnerId":"u1","stocksWon":2}'
# Esperado: { ok: true, winnerRpDelta: N, loserRpDelta: -N, winnerRankAfter: "...", loserRankAfter: "..." }

# Verificar que el status del ganador cambió a finished
curl "http://localhost:3000/api/offline/status?userId=u1"
# Esperado: { status: "finished", result: { won: true, rpDelta: N, newRank: "..." } }
```

- [ ] **Paso 3: Commit**

```bash
git add pages/api/offline/result.js
git commit -m "feat: add offline result API applying Switch Online ranked stats"
```

---

## Task 6: Admin Panel UI — `pages/index.js`

**Archivos:**
- Modificar: `pages/index.js`

Agregar sección colapsable "Ranked Offline" que permite activar sesión, configurar pantallas, ver cola y partidas activas, y reportar resultados.

- [ ] **Paso 1: Agregar state variables después de la línea `const [bcastOpen, setBcastOpen] = useState(false);` (~línea 30)**

```javascript
// Ranked Offline
const [offlineAdminOpen, setOfflineAdminOpen]   = useState(false);
const [offlineAdminData, setOfflineAdminData]   = useState({ session: null, queue: [], matches: [] });
const [offlineAdminScreens, setOfflineAdminScreens] = useState(3);
const [offlineAdminLoading, setOfflineAdminLoading] = useState(false);
const [offlineAdminMsg, setOfflineAdminMsg]     = useState(null); // null | { type:'ok'|'err', text }
```

- [ ] **Paso 2: Agregar función de carga de datos offline después de las funciones existentes (antes del `return (`, ~línea 415)**

```javascript
async function loadOfflineAdminData() {
  const [sessionRes, queueRes, matchesRes] = await Promise.all([
    fetch('/api/offline/session').then(r => r.json()).catch(() => ({ session: null })),
    fetch('/api/offline/status?userId=__admin__').then(() => null).catch(() => null), // no usamos esto
    Promise.resolve(null),
  ]);
  // Obtenemos queue y matches directamente de la sesión no, necesitamos APIs internas.
  // Como no hay un endpoint admin para ver todo junto, hacemos GET session y extraemos
  // lo que necesitamos. Para queue y matches necesitamos un endpoint extra.
  // Por ahora usamos el GET session que da la lista de screens.
  setOfflineAdminData(prev => ({
    ...prev,
    session: sessionRes.session,
  }));
}

async function loadOfflineFullData() {
  try {
    const [sessionRes, queueRes, matchesRes] = await Promise.all([
      fetch('/api/offline/session').then(r => r.json()),
      fetch('/api/offline/admin-state', { headers: { Authorization: 'Bearer afk-admin-2025' } }).then(r => r.json()).catch(() => ({ queue: [], matches: [] })),
    ]);
    setOfflineAdminData({
      session:  sessionRes.session || null,
      queue:    queueRes.queue    || [],
      matches:  queueRes.matches  || [],
    });
  } catch {}
}
```

**NOTA:** Para evitar crear un endpoint extra de admin-state, modificamos la approach: el GET de `/api/offline/session` solo devuelve la sesión. Vamos a agregar queue y matches a ese GET cuando hay auth de admin. Editar `pages/api/offline/session.js` para agregar esto al GET:

```javascript
// Al inicio del GET handler, ANTES del return:
if (req.method === 'GET') {
  const session = await redis.get(offlineSessionKey());
  // Si es admin, incluir queue y matches también
  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (auth === ADMIN_SECRET && session) {
    const [queue, matches] = await Promise.all([
      redis.get(offlineQueueKey()),
      redis.get(offlineMatchesKey()),
    ]);
    return res.status(200).json({ session, queue: queue || [], matches: matches || [] });
  }
  return res.status(200).json({ session: session || null });
}
```

Luego la función de carga del admin queda simple:

```javascript
async function loadOfflineFullData() {
  try {
    const r = await fetch('/api/offline/session', {
      headers: { Authorization: 'Bearer afk-admin-2025' },
    });
    const d = await r.json();
    setOfflineAdminData({
      session:  d.session  || null,
      queue:    d.queue    || [],
      matches:  d.matches  || [],
    });
    if (d.session) setOfflineAdminScreens(d.session.totalScreens || 3);
  } catch {}
}
```

- [ ] **Paso 3: Agregar polling effect para cuando offlineAdminOpen es true (después de los useEffects existentes, antes del `return (`)**

```javascript
useEffect(() => {
  if (!offlineAdminOpen) return;
  loadOfflineFullData();
  const iv = setInterval(loadOfflineFullData, 4000);
  return () => clearInterval(iv);
}, [offlineAdminOpen]); // eslint-disable-line
```

- [ ] **Paso 4: Agregar la sección UI de Ranked Offline en el JSX del panel admin**

Buscar la línea que dice `{bcastResult === 'error' && (` y el bloque de cierre de la sección bcast:

```javascript
            {bcastResult === 'error' && (
              <p style={{ margin: 0, fontSize: 12, color: '#f87171', textAlign: 'center' }}>Error al enviar. Intentá de nuevo.</p>
            )}
          </div>
        )}
      </div>
    )}
```

Agregar DESPUÉS de ese bloque (y antes del cierre final `</div></div>`):

```javascript
    {/* ── RANKED OFFLINE ── */}
    {isAdmin && (
      <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', maxWidth: 640, margin: '16px auto 0' }}>
        <button
          onClick={() => setOfflineAdminOpen(p => !p)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <span style={{ fontWeight: 900, fontSize: 15, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            🎮 Ranked Offline
            {offlineAdminData.session?.active && (
              <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: 6 }}>Activo</span>
            )}
          </span>
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)' }}>{offlineAdminOpen ? '▾' : '▸'}</span>
        </button>

        {offlineAdminOpen && (
          <div style={{ padding: '0 22px 22px' }}>

            {/* Código activo */}
            {offlineAdminData.session?.active && (
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>CÓDIGO DE SESIÓN</p>
                  <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 900, color: '#4ade80', letterSpacing: '0.15em', fontFamily: 'monospace' }}>{offlineAdminData.session.code}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(offlineAdminData.session.code)}
                  style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: '8px 14px', color: '#4ade80', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Copiar
                </button>
              </div>
            )}

            {/* Configurar y activar */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600, flexShrink: 0 }}>Pantallas:</label>
              <input
                type="number" min={1} max={10}
                value={offlineAdminScreens}
                onChange={e => setOfflineAdminScreens(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{ width: 60, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 10px', color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }}
              />
              <button
                onClick={async () => {
                  setOfflineAdminLoading(true);
                  setOfflineAdminMsg(null);
                  try {
                    const r = await fetch('/api/offline/session', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
                      body: JSON.stringify({ totalScreens: offlineAdminScreens }),
                    });
                    if (!r.ok) throw new Error();
                    await loadOfflineFullData();
                    setOfflineAdminMsg({ type: 'ok', text: '✅ Sesión activa' });
                  } catch {
                    setOfflineAdminMsg({ type: 'err', text: '❌ Error al activar' });
                  } finally {
                    setOfflineAdminLoading(false);
                    setTimeout(() => setOfflineAdminMsg(null), 3000);
                  }
                }}
                disabled={offlineAdminLoading}
                style={{ flex: 1, background: 'linear-gradient(90deg,#22c55e,#16a34a)', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: offlineAdminLoading ? 0.6 : 1 }}
              >
                {offlineAdminData.session?.active ? 'Actualizar sesión' : 'Activar Ranked Offline'}
              </button>
              {offlineAdminData.session?.active && (
                <button
                  onClick={async () => {
                    if (!window.confirm('¿Terminar la sesión? Se limpiará la cola y las partidas activas.')) return;
                    await fetch('/api/offline/session', { method: 'DELETE', headers: { 'Authorization': 'Bearer afk-admin-2025' } });
                    await loadOfflineFullData();
                  }}
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                >
                  Terminar
                </button>
              )}
            </div>

            {offlineAdminMsg && (
              <p style={{ margin: '0 0 12px', fontSize: 12, color: offlineAdminMsg.type === 'ok' ? '#4ade80' : '#f87171', textAlign: 'center' }}>{offlineAdminMsg.text}</p>
            )}

            {/* Pantallas — toggle individual */}
            {offlineAdminData.session?.screens?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pantallas</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {offlineAdminData.session.screens.map(screen => (
                    <button
                      key={screen.id}
                      onClick={async () => {
                        await fetch('/api/offline/session', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
                          body: JSON.stringify({ screenId: screen.id, available: !screen.available }),
                        });
                        await loadOfflineFullData();
                      }}
                      style={{
                        padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                        background: screen.busy ? 'rgba(251,146,60,0.2)' : screen.available ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                        color: screen.busy ? '#fb923c' : screen.available ? '#4ade80' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {screen.label} {screen.busy ? '🔴' : screen.available ? '🟢' : '⚫'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cola de jugadores */}
            {offlineAdminData.session?.active && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Cola ({offlineAdminData.queue.length} jugadores)
                  </p>
                  <button
                    onClick={async () => {
                      setOfflineAdminLoading(true);
                      try {
                        const r = await fetch('/api/offline/assign', {
                          method: 'POST',
                          headers: { 'Authorization': 'Bearer afk-admin-2025' },
                        });
                        const d = await r.json();
                        await loadOfflineFullData();
                        setOfflineAdminMsg({ type: 'ok', text: `✅ ${d.assigned?.length || 0} partida(s) asignada(s)` });
                      } catch {
                        setOfflineAdminMsg({ type: 'err', text: '❌ Error al asignar' });
                      } finally {
                        setOfflineAdminLoading(false);
                        setTimeout(() => setOfflineAdminMsg(null), 3000);
                      }
                    }}
                    disabled={offlineAdminLoading || offlineAdminData.queue.length < 2}
                    style={{
                      background: offlineAdminData.queue.length >= 2 ? 'linear-gradient(90deg,#FF8C00,#E85D00)' : 'rgba(255,255,255,0.06)',
                      border: 'none', borderRadius: 10, padding: '7px 14px', color: offlineAdminData.queue.length >= 2 ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontWeight: 800, fontSize: 12, cursor: offlineAdminData.queue.length >= 2 ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    }}
                  >
                    Asignar partidas →
                  </button>
                </div>
                {offlineAdminData.queue.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '8px 0' }}>Nadie en cola todavía</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {offlineAdminData.queue.map((p, i) => (
                      <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px' }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700, width: 20 }}>#{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 13, color: '#fff', fontWeight: 700 }}>{p.userName}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.charId}</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>MMR {p.mmr}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Partidas activas */}
            {offlineAdminData.matches.filter(m => m.status === 'active').length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Partidas en juego</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {offlineAdminData.matches.filter(m => m.status === 'active').map(m => {
                    const screen = offlineAdminData.session?.screens?.find(s => s.id === m.screenId);
                    return (
                      <div key={m.matchId} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ fontSize: 12, color: '#fb923c', fontWeight: 700 }}>{screen?.label || `Tele ${m.screenId}`}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{m.matchId.slice(0, 20)}...</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>{m.player1.userName}</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>vs</span>
                          <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>{m.player2.userName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[m.player1, m.player2].map(winner => (
                            <button
                              key={winner.userId}
                              onClick={async () => {
                                const stocks = window.prompt(`¿Cuántos stocks le quedaron a ${winner.userName}? (1-3)`, '1');
                                if (!stocks) return;
                                await fetch('/api/offline/result', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
                                  body: JSON.stringify({ matchId: m.matchId, winnerId: winner.userId, stocksWon: parseInt(stocks) || 1 }),
                                });
                                await loadOfflineFullData();
                              }}
                              style={{ flex: 1, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 9, padding: '8px', color: '#4ade80', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              Ganó {winner.userName}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}
```

- [ ] **Paso 5: Actualizar GET en session.js para incluir queue+matches cuando hay auth admin (editar `pages/api/offline/session.js`)**

Reemplazar el bloque GET actual:

```javascript
// OLD
if (req.method === 'GET') {
  const session = await redis.get(offlineSessionKey());
  return res.status(200).json({ session: session || null });
}
```

Por:

```javascript
// NEW
if (req.method === 'GET') {
  const session = await redis.get(offlineSessionKey());
  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (auth === ADMIN_SECRET && session) {
    const [queue, matches] = await Promise.all([
      redis.get(offlineQueueKey()),
      redis.get(offlineMatchesKey()),
    ]);
    return res.status(200).json({ session, queue: queue || [], matches: matches || [] });
  }
  return res.status(200).json({ session: session || null });
}
```

- [ ] **Paso 6: Verificar en browser**

1. Ir a `http://localhost:3000/?panel=1` (logueado como admin)
2. Debe aparecer la sección "Ranked Offline" al final del panel
3. Configurar 3 pantallas y hacer click en "Activar"
4. Debe mostrarse el código de 6 caracteres
5. El toggle de pantallas individuales debe cambiar su color

- [ ] **Paso 7: Commit**

```bash
git add pages/api/offline/session.js pages/index.js
git commit -m "feat: add Ranked Offline admin panel section"
```

---

## Task 7: Home Match UI — `pages/home.js`

**Archivos:**
- Modificar: `pages/home.js` (función `TabMatch`, línea 7645)

Agrega un banner de "Ranked Offline Activo" en la sección de Match. Cuando el jugador ingresa el código, se une a la cola y puede ver su estado en tiempo real.

- [ ] **Paso 1: Agregar state variables al inicio de `TabMatch` (después de línea 7651)**

```javascript
// Estado para Ranked Offline (agregar después de: const matchStatus = bgMM?.status;)
const [offlineSession, setOfflineSession]       = useState(null);
const [offlinePlayerStatus, setOfflinePlayerStatus] = useState(null); // { status, position, matchId, screenLabel, opponent, result }
const [offlineCode, setOfflineCode]             = useState('');
const [offlineJoining, setOfflineJoining]       = useState(false);
const [offlineJoined, setOfflineJoined]         = useState(false);
const [offlineMsg, setOfflineMsg]               = useState(null);
const [offlineChar, setOfflineChar]             = useState('');
const [offlineCharAlt, setOfflineCharAlt]       = useState(0);
const offlineStatusRef = useRef(null);
```

- [ ] **Paso 2: Agregar polling effects en TabMatch (después de los effects existentes, antes del return)**

```javascript
// Poll sesión offline cada 12s
useEffect(() => {
  let mounted = true;
  const check = async () => {
    try {
      const r = await fetch('/api/offline/session');
      if (!r.ok) return;
      const d = await r.json();
      if (mounted) setOfflineSession(d.session || null);
    } catch {}
  };
  check();
  const iv = setInterval(check, 12000);
  return () => { mounted = false; clearInterval(iv); };
}, []);

// Poll estado del jugador cada 3s cuando está inscrito
useEffect(() => {
  if (!offlineJoined || !uid) return;
  let mounted = true;
  const check = async () => {
    try {
      const r = await fetch(`/api/offline/status?userId=${encodeURIComponent(uid)}`);
      if (!r.ok) return;
      const d = await r.json();
      if (!mounted) return;
      setOfflinePlayerStatus(d);
      // Si el resultado ya fue visto (status finished), marcar como no inscrito después de 15s
      if (d.status === 'finished') {
        clearTimeout(offlineStatusRef.current);
        offlineStatusRef.current = setTimeout(() => {
          if (mounted) { setOfflineJoined(false); setOfflinePlayerStatus(null); }
        }, 15000);
      }
      // Si no hay sesión activa, resetear
      if (d.status === 'no_session') {
        setOfflineJoined(false); setOfflineSession(null); setOfflinePlayerStatus(null);
      }
    } catch {}
  };
  check();
  const iv = setInterval(check, 3000);
  return () => { mounted = false; clearInterval(iv); clearTimeout(offlineStatusRef.current); };
}, [offlineJoined, uid]);
```

- [ ] **Paso 3: Agregar la función de join**

```javascript
async function joinOfflineRanked() {
  if (!uid || !offlineChar || !offlineCode.trim()) return;
  setOfflineJoining(true);
  setOfflineMsg(null);
  try {
    const r = await fetch('/api/offline/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:   uid,
        userName: uName,
        charId:   offlineChar,
        charAlt:  offlineCharAlt,
        code:     offlineCode.trim().toUpperCase(),
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setOfflineMsg({ type: 'err', text: d.error || 'Error al unirse' });
      return;
    }
    setOfflineJoined(true);
    setOfflineMsg({ type: 'ok', text: '✅ ¡Te uniste! Esperá la asignación.' });
  } catch {
    setOfflineMsg({ type: 'err', text: 'Error de conexión' });
  } finally {
    setOfflineJoining(false);
  }
}
```

- [ ] **Paso 4: Agregar el bloque UI de Ranked Offline en el JSX de TabMatch**

Buscar en el return de TabMatch el primer `<div` de contenido principal (el wrapper con scroll). Agregar el banner de Ranked Offline ANTES del contenido regular de Ranked/Normal (busca `{/* ── tabs Ranked / Normal */}` o el primer render de plataformas).

El bloque a insertar (agregar justo después del wrapper de scroll, antes de cualquier otro contenido de matchmaking):

```javascript
{/* ── RANKED OFFLINE BANNER ── */}
{offlineSession?.active && (
  <div style={{ margin: '0 0 20px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 18, padding: '18px 20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 20 }}>🏟️</span>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#4ade80' }}>Ranked Offline Activo</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Cuenta para el ranking de Switch Online</p>
      </div>
    </div>

    {/* Jugador aún no inscrito */}
    {!offlineJoined && offlinePlayerStatus?.status !== 'assigned' && (
      <>
        {/* Selector de personaje simple */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>TU PERSONAJE</p>
          <select
            value={offlineChar}
            onChange={e => setOfflineChar(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 12px', color: offlineChar ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          >
            <option value="">Elegí tu personaje...</option>
            {CHARACTERS.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Input de código */}
        <div style={{ display: 'flex', gap: 8, marginBottom: offlineMsg ? 10 : 0 }}>
          <input
            value={offlineCode}
            onChange={e => setOfflineCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="Código (ej: K7MX2A)"
            maxLength={6}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', outline: 'none', textTransform: 'uppercase' }}
          />
          <button
            onClick={joinOfflineRanked}
            disabled={offlineJoining || !offlineChar || offlineCode.length < 6}
            style={{
              background: offlineJoining || !offlineChar || offlineCode.length < 6 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(90deg,#22c55e,#16a34a)',
              border: 'none', borderRadius: 10, padding: '10px 18px', color: offlineJoining || !offlineChar || offlineCode.length < 6 ? 'rgba(255,255,255,0.3)' : '#fff',
              fontWeight: 800, fontSize: 13, cursor: offlineJoining || !offlineChar || offlineCode.length < 6 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            {offlineJoining ? '...' : 'Unirse'}
          </button>
        </div>
        {offlineMsg && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: offlineMsg.type === 'ok' ? '#4ade80' : '#f87171' }}>{offlineMsg.text}</p>
        )}
      </>
    )}

    {/* Esperando en cola */}
    {offlineJoined && offlinePlayerStatus?.status === 'waiting' && (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Esperando asignación...</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Posición en cola: #{offlinePlayerStatus.position} de {offlinePlayerStatus.total}
        </p>
        <button
          onClick={async () => {
            await fetch(`/api/offline/join?userId=${encodeURIComponent(uid)}`, { method: 'DELETE' });
            setOfflineJoined(false); setOfflinePlayerStatus(null); setOfflineMsg(null);
          }}
          style={{ marginTop: 10, background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 14px', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Salir de la cola
        </button>
      </div>
    )}

    {/* Match asignado */}
    {(offlineJoined || true) && offlinePlayerStatus?.status === 'assigned' && (
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 12, padding: '10px 18px', marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>📺</span>
          <div style={{ textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#fb923c' }}>{offlinePlayerStatus.screenLabel}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>¡Dirigite a esta pantalla!</p>
          </div>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#fff' }}>
          Rival: <strong>{offlinePlayerStatus.opponent?.userName}</strong>
        </p>
      </div>
    )}

    {/* Resultado */}
    {offlinePlayerStatus?.status === 'finished' && offlinePlayerStatus.result && (
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <p style={{ margin: '0 0 6px', fontSize: 24 }}>{offlinePlayerStatus.result.won ? '🏆' : '💀'}</p>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: offlinePlayerStatus.result.won ? '#4ade80' : '#f87171' }}>
          {offlinePlayerStatus.result.won ? '¡Victoria!' : 'Derrota'}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: offlinePlayerStatus.result.rpDelta >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
          {offlinePlayerStatus.result.rpDelta >= 0 ? '+' : ''}{offlinePlayerStatus.result.rpDelta} RR
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{offlinePlayerStatus.result.newRank}</p>
      </div>
    )}
  </div>
)}
```

- [ ] **Paso 5: Verificar en browser**

1. Activar sesión desde el panel admin (`/?panel=1`)
2. Ir a `home#match` en otra ventana/pestaña
3. Debe aparecer el banner "Ranked Offline Activo" con input de código
4. Ingresar el código generado + seleccionar personaje + click "Unirse"
5. Debe mostrar "Esperando asignación... Posición #1 de 1"
6. Con un segundo usuario haciendo lo mismo, ir al panel y hacer "Asignar partidas"
7. Ambos usuarios deben ver "Tele 1 — ¡Dirigite a esta pantalla!"
8. Reportar ganador desde el admin; el ganador debe ver el resultado con el RR cambiado

- [ ] **Paso 6: Commit**

```bash
git add pages/home.js
git commit -m "feat: add offline ranked UI to match tab in home"
```

---

## Revisión Final del Spec

### Cobertura de requerimientos

| Requerimiento | Task | Estado |
|---|---|---|
| Admin activa sesión desde `/?panel=1` | Task 2 + Task 6 | ✅ |
| Genera código automáticamente | Task 2 (generateCode) | ✅ |
| Configura cuántas pantallas | Task 2 (totalScreens) | ✅ |
| Selecciona cuáles están disponibles | Task 2 (PATCH + UI toggle) | ✅ |
| Solo se unen con código | Task 3 (join valida código) | ✅ |
| Opción visible en `home#match` | Task 7 (banner + input) | ✅ |
| Sistema decide quiénes van contra quién | Task 4 (MMR pairing) | ✅ |
| N pantallas = N partidas simultáneas | Task 4 (freeScreens logic) | ✅ |
| Resultados cuentan para ranking Switch Online | Task 5 (processMatchResult + ranked:stats:switch) | ✅ |
| Admin reporta resultado | Task 5 + Task 6 (UI botones) | ✅ |
| Jugador ve su pantalla asignada | Task 3 (status API) + Task 7 (UI) | ✅ |
| Jugador ve cambio de RR | Task 5 (offlineResultKey) + Task 7 (UI) | ✅ |

### Sin placeholders detectados: ✅
### Tipos consistentes entre tasks: ✅ (matchId, userId, screenId usan el mismo formato en todos los tasks)
