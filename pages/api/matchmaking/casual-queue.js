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
const casualQueue2v2Key = (platform) => `mm:casual:queue:2v2:${platform}`;

async function pruneQueue(platform) {
  const now = Date.now();
  const queue = (await redis.get(casualQueueKey(platform))) || [];
  const fresh = queue.filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS);
  if (fresh.length !== queue.length) await redis.set(casualQueueKey(platform), fresh);
  return fresh;
}

async function pruneQueue2v2(platform) {
  const now = Date.now();
  const queue = (await redis.get(casualQueue2v2Key(platform))) || [];
  const fresh = queue.filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS);
  if (fresh.length !== queue.length) await redis.set(casualQueue2v2Key(platform), fresh);
  return fresh;
}

async function tryMatch2v2(platform) {
  const queue = await pruneQueue2v2(platform);
  if (queue.length < 2) return;
  const t1 = queue[0];
  const t2 = queue[1];
  const newQueue = queue.slice(2);
  await redis.set(casualQueue2v2Key(platform), newQueue);
  await createRoom2v2(platform, t1, t2);
}

async function createRoom2v2(platform, t1, t2) {
  let code;
  for (let i = 0; i < 10; i++) {
    code = genCode();
    if (!(await redis.get(roomKey(code)))) break;
  }
  const matchId = `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const room = {
    code, platform, type: 'casual', mode: '2v2',
    team1: t1.team, team2: t2.team,
    status: 'pending_accept', matchId,
    acceptedBy: [], pendingAcceptAt: new Date().toISOString(), createdAt: new Date().toISOString(),
  };
  await redis.set(roomKey(code), room, { ex: 3600 });
  for (const p of [...t1.team, ...t2.team]) {
    await redis.set(userRoomKey(p.userId), code, { ex: 3600 });
  }
  await redis.set(casualMatchKey(matchId), {
    matchId, platform, type: 'casual', mode: '2v2',
    team1: t1.team, team2: t2.team,
    status: 'pending_accept', reports: [], pendingResult: null,
    createdAt: new Date().toISOString(),
  }, { ex: 3600 });

  const platLabel = platform === 'switch' ? 'Switch Online' : 'Parsec';
  const allPlayers = [...t1.team, ...t2.team];
  const t1names = t1.team.map(p => p.userName).join(' + ');
  const t2names = t2.team.map(p => p.userName).join(' + ');
  await Promise.all(allPlayers.map(p => {
    const isTeam1 = t1.team.some(x => x.userId === p.userId);
    const rivals = isTeam1 ? t2names : t1names;
    return sendPush(p.userId, { title: '¡Rivales encontrados! ⚔️', body: `vs ${rivals} · ${platLabel} (2v2 Normal)`, tag: 'match-found', data: { url: '/home?open=match' } });
  }));
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

    // Check si tiene sala activa
    const roomCode = await redis.get(userRoomKey(clean));
    if (roomCode) {
      const room = await redis.get(roomKey(roomCode));
      if (room) {
        const status = ['pending_accept','active','pending_confirm','finished'].includes(room.status) ? room.status : room.status;
        return res.status(200).json({ status, room, matchId: room.matchId });
      }
    }

    // Check cola 1v1
    const queue = await pruneQueue(platform);
    const entry = queue.find(e => e.userId === clean);
    if (entry) {
      if (queue.length >= 2) tryMatch(platform).catch(() => {});
      return res.status(200).json({ status: 'searching', joinedAt: entry.joinedAt, queueSize: queue.length });
    }

    // Check cola 2v2
    const queue2v2 = await pruneQueue2v2(platform);
    const entry2v2 = queue2v2.find(e => e.team?.some(p => p.userId === clean));
    if (entry2v2) {
      if (queue2v2.length >= 2) tryMatch2v2(platform).catch(() => {});
      return res.status(200).json({ status: 'searching', mode: '2v2', joinedAt: entry2v2.joinedAt || entry2v2.team?.[0]?.joinedAt, queueSize: queue2v2.length });
    }

    return res.status(200).json({ status: 'idle' });
  }

  // ── POST: entrar a la cola casual ─────────────────────────────
  if (req.method === 'POST') {
    const { userId, userName, platform, charId, parsecRole, mode, team } = req.body || {};
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

    // ── 2v2: equipo completo a la cola ────────────────────────────
    if (mode === '2v2' && Array.isArray(team) && team.length === 2) {
      const cleanTeam = team.map(p => ({
        userId: sanitize(p.userId), userName: sanitize(p.userName), charId: p.charId ? sanitize(p.charId) : null,
      }));
      const queue2v2 = await pruneQueue2v2(platform);
      const alreadyIn = queue2v2.find(e => e.team?.some(p => cleanTeam.some(t => t.userId === p.userId)));
      if (alreadyIn) return res.status(409).json({ error: 'Ya están en cola 2v2 casual' });
      queue2v2.push({ team: cleanTeam, platform, joinedAt: new Date().toISOString() });
      await redis.set(casualQueue2v2Key(platform), queue2v2);
      await tryMatch2v2(platform);
      return res.status(200).json({ status: 'queued', mode: '2v2' });
    }

    // ── 1v1: búsqueda individual ──────────────────────────────────
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
    // Quitar de cola 1v1
    const queue = await pruneQueue(platform);
    await redis.set(casualQueueKey(platform), queue.filter(e => e.userId !== cleanId));
    // Quitar de cola 2v2 (si está como parte del equipo)
    const queue2v2 = await pruneQueue2v2(platform);
    await redis.set(casualQueue2v2Key(platform), queue2v2.filter(e => !e.team?.some(p => p.userId === cleanId)));
    return res.status(200).json({ status: 'removed' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
