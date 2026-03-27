// API de cola de matchmaking CASUAL (sin rango) — Upstash Redis
// Empareja a cualquier jugador sin restricción de MMR

import redis, { casualQueueKey, casualMatchKey } from '../../../lib/redis';
import { sendPush } from '../../../lib/push.js';

const QUEUE_TTL_MS = 10 * 60 * 1000;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function roomKey(code)   { return `mm:casual:room:${code}`; }
function userRoomKey(id) { return `mm:casual:user:room:${id}`; }

async function pruneQueue(platform) {
  const now = Date.now();
  const queue = (await redis.get(casualQueueKey(platform))) || [];
  const fresh = queue.filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS);
  if (fresh.length !== queue.length) await redis.set(casualQueueKey(platform), fresh);
  return fresh;
}

async function tryMatch(platform) {
  const queue = (await redis.get(casualQueueKey(platform))) || [];
  if (queue.length < 2) return;

  // Para casual: simplemente tomar los dos primeros en cola
  // (sin restricción de MMR ni anti-snipe)
  const p1 = queue[0];
  const p2 = queue[1];

  // Bloquear no-host vs no-host en Parsec
  if (platform === 'parsec' && p1.parsecRole === 'nohost' && p2.parsecRole === 'nohost') {
    // Intentar con otros pares
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const a = queue[i];
        const b = queue[j];
        if (platform === 'parsec' && a.parsecRole === 'nohost' && b.parsecRole === 'nohost') continue;
        // Encontramos un par válido
        const newQueue = queue.filter((_, idx) => idx !== i && idx !== j);
        await redis.set(casualQueueKey(platform), newQueue);
        await createRoom(platform, a, b);
        return;
      }
    }
    return; // no hay par válido
  }

  const newQueue = queue.slice(2);
  await redis.set(casualQueueKey(platform), newQueue);
  await createRoom(platform, p1, p2);
}

async function createRoom(platform, p1, p2) {
  let code;
  for (let i = 0; i < 10; i++) {
    code = genCode();
    if (!(await redis.get(roomKey(code)))) break;
  }

  const matchId = `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const room = {
    code,
    platform,
    type: 'casual',
    host:  { userId: p1.userId, userName: p1.userName, charId: p1.charId || null },
    guest: { userId: p2.userId, userName: p2.userName, charId: p2.charId || null },
    password: null,
    status: 'pending_accept',
    matchId,
    acceptedBy: [],
    pendingAcceptAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await redis.set(roomKey(code), room, { ex: 3600 });
  await redis.set(userRoomKey(p1.userId), code, { ex: 3600 });
  await redis.set(userRoomKey(p2.userId), code, { ex: 3600 });
  await redis.set(casualMatchKey(matchId), {
    matchId, platform, type: 'casual',
    player1: { userId: p1.userId, userName: p1.userName, charId: p1.charId || null },
    player2: { userId: p2.userId, userName: p2.userName, charId: p2.charId || null },
    status: 'pending_accept',
    reports: [],
    pendingResult: null,
    createdAt: new Date().toISOString(),
  }, { ex: 3600 });

  const platLabel = platform === 'switch' ? 'Switch Online' : 'Parsec';
  await Promise.all([
    sendPush(p1.userId, { title: '¡Rival encontrado! ⚔️', body: `Rival: ${p2.userName} · ${platLabel} (Normal)`, tag: 'match-found', data: { url: '/home?open=match' } }),
    sendPush(p2.userId, { title: '¡Rival encontrado! ⚔️', body: `Rival: ${p1.userName} · ${platLabel} (Normal)`, tag: 'match-found', data: { url: '/home?open=match' } }),
  ]);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: estado del usuario en cola casual ────────────────────
  if (req.method === 'GET') {
    const { userId, platform } = req.query;
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    const clean = sanitize(userId);
    const queue = await pruneQueue(platform);
    const entry = queue.find(e => e.userId === clean);

    // Check si tiene sala activa
    const roomCode = await redis.get(userRoomKey(clean));
    if (roomCode) {
      const room = await redis.get(roomKey(roomCode));
      if (room) {
        const status = room.status === 'pending_accept' ? 'pending_accept'
          : room.status === 'active' ? 'active'
          : room.status === 'pending_confirm' ? 'pending_confirm'
          : room.status === 'finished' ? 'finished'
          : room.status;
        return res.status(200).json({ status, room, matchId: room.matchId });
      }
    }

    if (entry) {
      return res.status(200).json({ status: 'waiting', position: queue.indexOf(entry) + 1, queueSize: queue.length });
    }
    return res.status(200).json({ status: 'idle' });
  }

  // ── POST: entrar a la cola casual ─────────────────────────────
  if (req.method === 'POST') {
    const { userId, userName, platform, charId, parsecRole } = req.body || {};
    if (!userId || !userName || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId, userName y platform requeridos' });
    }
    const cleanId   = sanitize(userId);
    const cleanName = sanitize(userName);
    const cleanChar = charId ? sanitize(charId) : null;

    // Check si ya tiene sala activa
    const existingRoom = await redis.get(userRoomKey(cleanId));
    if (existingRoom) {
      return res.status(409).json({ error: 'Ya tenés una sala casual activa' });
    }

    const queue = await pruneQueue(platform);
    const alreadyIn = queue.find(e => e.userId === cleanId);
    if (alreadyIn) {
      return res.status(409).json({ error: 'Ya estás en cola casual' });
    }

    queue.push({
      userId: cleanId, userName: cleanName, charId: cleanChar,
      parsecRole: parsecRole || null,
      platform, joinedAt: new Date().toISOString(),
    });
    await redis.set(casualQueueKey(platform), queue);

    // Intentar emparejar
    await tryMatch(platform);

    return res.status(200).json({ status: 'queued' });
  }

  // ── DELETE: salir de la cola ──────────────────────────────────
  if (req.method === 'DELETE') {
    const { userId, platform } = req.body || {};
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    const cleanId = sanitize(userId);
    const queue   = await pruneQueue(platform);
    const newQ    = queue.filter(e => e.userId !== cleanId);
    await redis.set(casualQueueKey(platform), newQ);
    return res.status(200).json({ status: 'removed' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
