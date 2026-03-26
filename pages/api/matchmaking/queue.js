// API de cola de matchmaking para Switch Online y Parsec — Upstash Redis
// Matchmaking basado en MMR con expansión progresiva y anti queue-sniping

import redis, { mmQueueKey, rankedStatsKey, mmMatchupKey } from '../../../lib/redis';
import { sendPush } from '../../../lib/push.js';
import { MMR_DEFAULT } from '../../../lib/ranks';

const QUEUE_TTL_MS   = 10 * 60 * 1000;

// ─── MMR brackets de búsqueda (expansión progresiva) ─────────────
// Cada entrada: [segundos en cola, rango ±MMR]
const MMR_BRACKETS = [
  [0,  75],   // 0–30s: ±75 MMR
  [30, 150],  // 30–60s: ±150 MMR
  [60, 250],  // 60–90s: ±250 MMR
  [90, 400],  // 90s+:   ±400 MMR
];
const MMR_HARD_CAP = 600; // NUNCA emparejar con >600 MMR de diferencia

// Anti queue-sniping: máximo de matchups repetidos en un día
const MAX_DAILY_MATCHUPS = 3;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function roomKey(code)   { return `mm:room:${code}`; }
function userRoomKey(id) { return `mm:user:room:${id}`; }

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

async function pruneQueue(platform) {
  const now = Date.now();
  const queue = (await redis.get(mmQueueKey(platform))) || [];
  const fresh = queue.filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS);
  if (fresh.length !== queue.length) await redis.set(mmQueueKey(platform), fresh);
  return fresh;
}

/**
 * Devuelve la clave de matchup ordenada entre 2 usuarios (para anti-snipe)
 */
function matchupPairKey(userId1, userId2) {
  return [String(userId1), String(userId2)].sort().join(':');
}

/**
 * Matchmaking basado en MMR con expansión progresiva.
 * Busca el mejor rival para cada jugador según:
 * 1. Diferencia de MMR dentro del bracket correspondiente a su tiempo en cola
 * 2. Anti queue-sniping: evita emparejar >3 veces al día
 * 3. Prioriza la menor diferencia de MMR
 */
async function tryMatch(platform) {
  const queue = (await redis.get(mmQueueKey(platform))) || [];
  if (queue.length < 2) return;

  const now = Date.now();
  // Cargar matchups del día para anti-snipe
  const matchupsRaw = (await redis.get(mmMatchupKey(platform))) || {};

  // Pre-cargar MMR de todos los jugadores en cola
  const mmrMap = {};
  for (const entry of queue) {
    const stats = await redis.get(rankedStatsKey(String(entry.userId), platform));
    mmrMap[entry.userId] = (stats?.mmr) || MMR_DEFAULT;
  }

  // Intentar emparejar: recorrer cada jugador, buscar el mejor match
  let bestPair = null;
  let bestDiff = Infinity;

  for (let i = 0; i < queue.length; i++) {
    const p1 = queue[i];
    const p1Mmr = mmrMap[p1.userId];
    const p1Wait = (now - new Date(p1.joinedAt).getTime()) / 1000;

    // Determinar bracket de MMR según tiempo en cola
    let p1Range = MMR_BRACKETS[0][1];
    for (const [seconds, range] of MMR_BRACKETS) {
      if (p1Wait >= seconds) p1Range = range;
    }

    for (let j = i + 1; j < queue.length; j++) {
      const p2 = queue[j];
      const p2Mmr = mmrMap[p2.userId];
      const p2Wait = (now - new Date(p2.joinedAt).getTime()) / 1000;

      // Determinar bracket del segundo jugador
      let p2Range = MMR_BRACKETS[0][1];
      for (const [seconds, range] of MMR_BRACKETS) {
        if (p2Wait >= seconds) p2Range = range;
      }

      const mmrDiff = Math.abs(p1Mmr - p2Mmr);

      // Hard cap: nunca >600
      if (mmrDiff > MMR_HARD_CAP) continue;

      // Ambos jugadores deben aceptar la diferencia dentro de SU bracket
      if (mmrDiff > p1Range || mmrDiff > p2Range) continue;

      // Bloquear no-host vs no-host en Parsec
      if (platform === 'parsec' && p1.parsecRole === 'nohost' && p2.parsecRole === 'nohost') continue;

      // Anti queue-sniping
      const pairKey = matchupPairKey(p1.userId, p2.userId);
      const dailyCount = matchupsRaw[pairKey] || 0;
      if (dailyCount >= MAX_DAILY_MATCHUPS) continue;

      // Mejor match = menor diferencia de MMR
      if (mmrDiff < bestDiff) {
        bestDiff = mmrDiff;
        bestPair = [i, j];
      }
    }
  }

  if (!bestPair) return; // nadie matcheó

  const [iP1, iP2] = bestPair;
  const p1 = queue[iP1];
  const p2 = queue[iP2];

  // Sacar ambos de la cola
  const newQueue = queue.filter((_, idx) => idx !== iP1 && idx !== iP2);
  await redis.set(mmQueueKey(platform), newQueue);

  // Registrar matchup anti-snipe (expira a medianoche)
  const pairKey = matchupPairKey(p1.userId, p2.userId);
  matchupsRaw[pairKey] = (matchupsRaw[pairKey] || 0) + 1;
  await redis.set(mmMatchupKey(platform), matchupsRaw);
  // TTL hasta medianoche: calcular segundos restantes del día
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  const ttlSeconds = Math.ceil((midnight.getTime() - now) / 1000);
  await redis.expire(mmMatchupKey(platform), Math.max(60, ttlSeconds));

  // Generar código único
  let code;
  for (let i = 0; i < 10; i++) {
    code = genCode();
    if (!(await redis.get(roomKey(code)))) break;
  }

  const matchId = `mm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Crear room con pending_accept
  const room = {
    code,
    platform,
    host:  { userId: p1.userId, userName: p1.userName, charId: p1.charId || null, mmr: mmrMap[p1.userId] },
    guest: { userId: p2.userId, userName: p2.userName, charId: p2.charId || null, mmr: mmrMap[p2.userId] },
    password: null,
    status: 'pending_accept',
    matchId,
    stage: null,
    acceptedBy: [],
    pendingAcceptAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await redis.set(roomKey(code), room);
  await redis.set(userRoomKey(p1.userId), code);
  await redis.set(userRoomKey(p2.userId), code);

  // Push: match encontrado
  const platLabel = platform === 'switch' ? 'Switch Online' : 'Parsec';
  await Promise.all([
    sendPush(p1.userId, { title: '¡Match encontrado! 🎮', body: `Rival: ${p2.userName} · ${platLabel}`, tag: 'match-found', data: { url: '/home?open=match' } }),
    sendPush(p2.userId, { title: '¡Match encontrado! 🎮', body: `Rival: ${p1.userName} · ${platLabel}`, tag: 'match-found', data: { url: '/home?open=match' } }),
  ]);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: check si el usuario está en cola ────────────────
  if (req.method === 'GET') {
    const { userId, platform } = req.query;
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    const clean = sanitize(userId);
    const queue = await pruneQueue(platform);
    const entry = queue.find(e => e.userId === clean);
    if (entry) {
      return res.status(200).json({ status: 'waiting', position: queue.indexOf(entry) + 1, queueSize: queue.length });
    }
    return res.status(200).json({ status: 'idle' });
  }

  // ── POST: unirse a la cola ────────────────────────────
  if (req.method === 'POST') {
    const { userId, userName, platform, charId, parsecRole } = req.body || {};
    if (!userId || !userName || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId, userName y platform requeridos' });
    }

    const cleanUserId    = sanitize(userId);
    const cleanUserName  = sanitize(userName);
    const cleanCharId    = sanitize(charId || '');
    const cleanParsecRole = parsecRole === 'host' || parsecRole === 'nohost' ? parsecRole : null;

    // Check si ya está en cola
    const queue = await pruneQueue(platform);
    if (queue.find(e => e.userId === cleanUserId)) {
      return res.status(409).json({ error: 'Ya estás en cola' });
    }

    const entry = {
      userId: cleanUserId, userName: cleanUserName, platform,
      charId: cleanCharId || null,
      parsecRole: cleanParsecRole,
      joinedAt: new Date().toISOString(),
    };

    queue.push(entry);
    await redis.set(mmQueueKey(platform), queue);

    // Intentar matchear
    await tryMatch(platform);

    return res.status(200).json({ status: 'searching' });
  }

  // ── DELETE: salir de la cola ──────────────────────────
  if (req.method === 'DELETE') {
    const { userId, platform } = req.body || {};
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    const clean = sanitize(userId);
    const queue = (await redis.get(mmQueueKey(platform))) || [];
    await redis.set(mmQueueKey(platform), queue.filter(e => e.userId !== clean));
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
