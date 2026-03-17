// API de cola de matchmaking para Switch Online y Parsec — Upstash Redis

import redis, { mmQueueKey, mmMatchKey } from '../../../lib/redis';

const STAGES = [
  'Battlefield', 'Final Destination', 'Small Battlefield',
  'Pokémon Stadium 2', 'Town & City', 'Smashville',
  'Hollow Bastion', 'Kalos Pokémon League',
];

const QUEUE_TTL_MS   = 10 * 60 * 1000;
const MATCH_TTL_MS   = 60 * 60 * 1000;
const MATCH_LIST_KEY = 'mm:matches:index';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function randomStage() {
  return STAGES[Math.floor(Math.random() * STAGES.length)];
}

function safeMatch(m, requestingUserId) {
  const isP1 = m.player1.userId === requestingUserId;
  const self     = isP1 ? m.player1 : m.player2;
  const opponent = isP1 ? m.player2 : m.player1;
  return {
    id: m.id, platform: m.platform, stage: m.stage,
    status: m.status, result: m.result, reports: m.reports, createdAt: m.createdAt,
    self:     { name: self.userName },
    opponent: { name: opponent.userName, userId: opponent.userId },
    selfIsP1: isP1,
  };
}

async function pruneQueue(platform) {
  const now = Date.now();
  const queue = (await redis.get(mmQueueKey(platform))) || [];
  const fresh = queue.filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS);
  if (fresh.length !== queue.length) await redis.set(mmQueueKey(platform), fresh);
  return fresh;
}

async function getPlayerStatus(userId, platform) {
  const matchIds = (await redis.get(MATCH_LIST_KEY)) || [];
  for (const mid of matchIds) {
    const m = await redis.get(mmMatchKey(mid));
    if (!m || m.platform !== platform) continue;
    const isP1 = m.player1.userId === userId;
    const isP2 = m.player2.userId === userId;
    if (!isP1 && !isP2) continue;
    if (Date.now() - new Date(m.createdAt).getTime() > MATCH_TTL_MS && m.status !== 'active') continue;
    if (m.status === 'active' || m.status === 'pending_result' || m.status === 'disputed') {
      return { status: 'matched', match: safeMatch(m, userId) };
    }
    if (m.status === 'finished') return { status: 'finished', match: safeMatch(m, userId) };
  }

  const queue = await pruneQueue(platform);
  const idx = queue.findIndex(e => e.userId === userId);
  if (idx !== -1) {
    const entry = queue[idx];
    if (entry.matchId) {
      const m = await redis.get(mmMatchKey(entry.matchId));
      if (m) {
        await redis.set(mmQueueKey(platform), queue.filter(e => e.userId !== userId));
        return { status: 'matched', match: safeMatch(m, userId) };
      }
    }
    return { status: 'waiting', position: idx + 1, queueSize: queue.length, waitingSince: entry.joinedAt };
  }
  return { status: 'idle' };
}

async function tryMatch(platform) {
  const queue = (await redis.get(mmQueueKey(platform))) || [];
  if (queue.length < 2) return;
  const [p1, p2] = queue.splice(0, 2);
  const match = {
    id: `mm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    platform, stage: randomStage(), player1: p1, player2: p2,
    status: 'active', reports: [], result: null, createdAt: new Date().toISOString(),
  };
  await redis.set(mmMatchKey(match.id), match);
  const index = (await redis.get(MATCH_LIST_KEY)) || [];
  index.push(match.id);
  await redis.set(MATCH_LIST_KEY, index.length > 500 ? index.slice(-500) : index);
  p1.matchId = match.id;
  p2.matchId = match.id;
  queue.push(p1, p2);
  await redis.set(mmQueueKey(platform), queue);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: poll de estado ────────────────────────────────
  if (req.method === 'GET') {
    const { userId, platform } = req.query;
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    return res.status(200).json(await getPlayerStatus(sanitize(userId), platform));
  }

  // ── POST: unirse a la cola ────────────────────────────
  if (req.method === 'POST') {
    const { userId, userName, platform } = req.body || {};
    if (!userId || !userName || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId, userName y platform requeridos' });
    }

    const cleanUserId   = sanitize(userId);
    const cleanUserName = sanitize(userName);
    const current = await getPlayerStatus(cleanUserId, platform);
    if (current.status === 'waiting') return res.status(409).json({ error: 'Ya estás en cola', ...current });
    if (current.status === 'matched' || current.status === 'active') return res.status(409).json({ error: 'Ya tenés un match activo', ...current });

    const entry = {
      userId: cleanUserId, userName: cleanUserName, platform,
      joinedAt: new Date().toISOString(), matchId: null,
    };

    const queue = (await redis.get(mmQueueKey(platform))) || [];
    queue.push(entry);
    await redis.set(mmQueueKey(platform), queue);
    await tryMatch(platform);
    return res.status(200).json(await getPlayerStatus(cleanUserId, platform));
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
