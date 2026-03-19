// API de cola de matchmaking para Switch Online y Parsec — Upstash Redis
// Cuando matchea 2 jugadores, crea una room con pending_accept para usar
// el flujo de aceptación/partida existente de room.js

import redis, { mmQueueKey } from '../../../lib/redis';
import { sendPush } from '../../../lib/push.js';

const QUEUE_TTL_MS   = 10 * 60 * 1000;

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

async function tryMatch(platform) {
  const queue = (await redis.get(mmQueueKey(platform))) || [];
  if (queue.length < 2) return;

  const [p1, p2] = queue.splice(0, 2);
  // Guardar la cola sin estos 2
  await redis.set(mmQueueKey(platform), queue);

  // Generar código único
  let code;
  for (let i = 0; i < 10; i++) {
    code = genCode();
    if (!(await redis.get(roomKey(code)))) break;
  }

  const matchId = `mm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Crear room con pending_accept — el flow de room.js maneja el resto
  const room = {
    code,
    platform,
    host:  { userId: p1.userId, userName: p1.userName, charId: p1.charId || null },
    guest: { userId: p2.userId, userName: p2.userName, charId: p2.charId || null },
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
    sendPush(p1.userId, { title: '¡Match encontrado! 🎮', body: `Rival: ${p2.userName} · ${platLabel}`, tag: 'match-found', data: { url: '/home' } }),
    sendPush(p2.userId, { title: '¡Match encontrado! 🎮', body: `Rival: ${p1.userName} · ${platLabel}`, tag: 'match-found', data: { url: '/home' } }),
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
    const { userId, userName, platform, charId } = req.body || {};
    if (!userId || !userName || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId, userName y platform requeridos' });
    }

    const cleanUserId   = sanitize(userId);
    const cleanUserName = sanitize(userName);
    const cleanCharId   = sanitize(charId || '');

    // Check si ya está en cola
    const queue = await pruneQueue(platform);
    if (queue.find(e => e.userId === cleanUserId)) {
      return res.status(409).json({ error: 'Ya estás en cola' });
    }

    const entry = {
      userId: cleanUserId, userName: cleanUserName, platform,
      charId: cleanCharId || null,
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
