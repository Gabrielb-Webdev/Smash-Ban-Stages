// API de cola de matchmaking 2v2 — Upstash Redis
// Cuando matchea 2 parties, crea una room 2v2 con pending_accept

import redis, { mmQueueDoublesKey, partyKey, userPartyKey, mmMatchKey } from '../../../lib/redis';
import { sendPush } from '../../../lib/push.js';

const QUEUE_TTL_MS = 10 * 60 * 1000;

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
  const queue = (await redis.get(mmQueueDoublesKey(platform))) || [];
  const fresh = queue.filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS);
  if (fresh.length !== queue.length) await redis.set(mmQueueDoublesKey(platform), fresh);
  return fresh;
}

async function tryMatchDoubles(platform) {
  const queue = (await redis.get(mmQueueDoublesKey(platform))) || [];
  if (queue.length < 2) return;

  const [team1, team2] = queue.splice(0, 2);
  await redis.set(mmQueueDoublesKey(platform), queue);

  // Generar código único
  let code;
  for (let i = 0; i < 10; i++) {
    code = genCode();
    if (!(await redis.get(roomKey(code)))) break;
  }

  const matchId = `mm2v2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const room = {
    code,
    platform,
    mode: '2v2',
    team1: { player1: team1.player1, player2: team1.player2, partyId: team1.partyId },
    team2: { player1: team2.player1, player2: team2.player2, partyId: team2.partyId },
    status: 'pending_accept',
    matchId,
    stage: null,
    acceptedBy: [],
    pendingAcceptAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await redis.set(roomKey(code), room);
  // Asignar room a los 4 jugadores
  for (const p of [team1.player1, team1.player2, team2.player1, team2.player2]) {
    await redis.set(userRoomKey(p.userId), code);
  }

  // Actualizar status de ambos parties
  for (const pid of [team1.partyId, team2.partyId]) {
    const party = await redis.get(partyKey(pid));
    if (party) {
      party.status = 'matched';
      await redis.set(partyKey(pid), party);
    }
  }

  // Push: match 2v2 encontrado
  const platLabel = platform === 'switch' ? 'Switch Online' : 'Parsec';
  const allPlayers = [team1.player1, team1.player2, team2.player1, team2.player2];
  await Promise.all(allPlayers.map(p =>
    sendPush(p.userId, { title: '¡Match 2v2 encontrado! 👥', body: `¡Tu equipo está listo! · ${platLabel}`, tag: 'match-found-2v2', data: { url: '/home' } })
  ));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET: check si el party está en cola
  if (req.method === 'GET') {
    const { userId, platform } = req.query;
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    const clean = sanitize(userId);
    const queue = await pruneQueue(platform);
    const entry = queue.find(e =>
      e.player1.userId === clean || e.player2.userId === clean
    );
    if (entry) {
      return res.status(200).json({ status: 'searching', queueSize: queue.length });
    }
    return res.status(200).json({ status: 'idle' });
  }

  // POST: unirse a la cola como party
  if (req.method === 'POST') {
    const { userId, platform } = req.body || {};
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }

    const cleanUserId = sanitize(userId);

    // Verificar que tiene party ready
    const pid = await redis.get(userPartyKey(cleanUserId));
    if (!pid) return res.status(400).json({ error: 'No estás en un party' });

    const party = await redis.get(partyKey(pid));
    if (!party) return res.status(400).json({ error: 'Party no encontrado' });
    if (party.leader.userId !== cleanUserId) {
      return res.status(403).json({ error: 'Solo el líder puede buscar partida' });
    }
    if (party.status !== 'ready') {
      return res.status(400).json({ error: 'El party no está listo (falta aceptar invitación)' });
    }
    if (party.platform !== platform) {
      return res.status(400).json({ error: 'La plataforma no coincide con la del party' });
    }

    // Check si ya está en cola
    const queue = await pruneQueue(platform);
    if (queue.find(e => e.partyId === pid)) {
      return res.status(409).json({ error: 'Ya estás en cola' });
    }

    const entry = {
      partyId: pid,
      player1: { userId: party.leader.userId, userName: party.leader.userName },
      player2: { userId: party.invited.userId, userName: party.invited.userName },
      platform,
      joinedAt: new Date().toISOString(),
    };

    queue.push(entry);
    await redis.set(mmQueueDoublesKey(platform), queue);

    // Actualizar party status
    party.status = 'searching';
    await redis.set(partyKey(pid), party);

    // Intentar matchear
    await tryMatchDoubles(platform);

    return res.status(200).json({ status: 'searching' });
  }

  // DELETE: salir de la cola
  if (req.method === 'DELETE') {
    const { userId, platform } = req.body || {};
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    const clean = sanitize(userId);

    const pid = await redis.get(userPartyKey(clean));
    const queue = (await redis.get(mmQueueDoublesKey(platform))) || [];
    await redis.set(mmQueueDoublesKey(platform), queue.filter(e => {
      if (pid && e.partyId === pid) return false;
      if (e.player1.userId === clean || e.player2.userId === clean) return false;
      return true;
    }));

    // Volver party a ready
    if (pid) {
      const party = await redis.get(partyKey(pid));
      if (party && party.status === 'searching') {
        party.status = 'ready';
        await redis.set(partyKey(pid), party);
      }
    }

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
