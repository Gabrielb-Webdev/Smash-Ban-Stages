// API de amigos — agregar, listar y eliminar amigos
// Almacena listas bidireccionales en Redis

import redis, { friendsKey, mmQueueKey, rankedStatsKey } from '../../lib/redis';

const MAX_FRIENDS = 50;
const QUEUE_TTL_MS = 10 * 60 * 1000;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function userRoomKey(id) { return `mm:user:room:${id}`; }

async function getOnlineStatus(userId) {
  // Verificar si está en cola de búsqueda
  for (const plat of ['switch', 'parsec']) {
    const queue = (await redis.get(mmQueueKey(plat))) || [];
    const now = Date.now();
    if (queue.find(e => e.userId === userId && now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS)) {
      return 'searching';
    }
  }
  // Verificar si tiene sala activa
  const roomCode = await redis.get(userRoomKey(userId));
  if (roomCode) return 'in_match';
  return 'offline';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: listar amigos con estado online
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const clean = sanitize(userId);

    const friends = (await redis.get(friendsKey(clean))) || [];

    // Enriquecer con estado online y stats
    const enriched = await Promise.all(friends.map(async (f) => {
      const status = await getOnlineStatus(f.userId);
      const switchStats = await redis.get(rankedStatsKey(f.userId, 'switch'));
      const parsecStats = await redis.get(rankedStatsKey(f.userId, 'parsec'));
      const bestStats = (switchStats && parsecStats)
        ? ((switchStats.rankIndex || 0) >= (parsecStats.rankIndex || 0) ? switchStats : parsecStats)
        : (switchStats || parsecStats || null);
      return {
        ...f,
        online: status,
        rank: bestStats?.rank || null,
        placementDone: bestStats?.placementDone || false,
      };
    }));

    // Ordenar: in_match primero, luego searching, luego offline
    const order = { in_match: 0, searching: 1, offline: 2 };
    enriched.sort((a, b) => (order[a.online] ?? 2) - (order[b.online] ?? 2));

    return res.status(200).json(enriched);
  }

  // POST: agregar amigo por nombre de usuario
  if (req.method === 'POST') {
    const { userId, userName, friendId, friendName } = req.body || {};
    if (!userId || !friendId || !friendName) {
      return res.status(400).json({ error: 'userId, friendId y friendName requeridos' });
    }
    if (userId === friendId) {
      return res.status(400).json({ error: 'No podés agregarte a vos mismo' });
    }

    const cleanUserId = sanitize(userId);
    const cleanUserName = sanitize(userName);
    const cleanFriendId = sanitize(friendId);
    const cleanFriendName = sanitize(friendName);

    // Agregar a ambas listas (bidireccional)
    const myFriends = (await redis.get(friendsKey(cleanUserId))) || [];
    if (myFriends.length >= MAX_FRIENDS) {
      return res.status(400).json({ error: 'Límite de amigos alcanzado' });
    }
    if (myFriends.find(f => f.userId === cleanFriendId)) {
      return res.status(409).json({ error: 'Ya es tu amigo' });
    }

    myFriends.push({ userId: cleanFriendId, userName: cleanFriendName, addedAt: new Date().toISOString() });
    await redis.set(friendsKey(cleanUserId), myFriends);

    const theirFriends = (await redis.get(friendsKey(cleanFriendId))) || [];
    if (!theirFriends.find(f => f.userId === cleanUserId)) {
      theirFriends.push({ userId: cleanUserId, userName: cleanUserName, addedAt: new Date().toISOString() });
      await redis.set(friendsKey(cleanFriendId), theirFriends);
    }

    return res.status(200).json({ success: true });
  }

  // DELETE: eliminar amigo
  if (req.method === 'DELETE') {
    const { userId, friendId } = req.body || {};
    if (!userId || !friendId) {
      return res.status(400).json({ error: 'userId y friendId requeridos' });
    }
    const cleanUserId = sanitize(userId);
    const cleanFriendId = sanitize(friendId);

    const myFriends = (await redis.get(friendsKey(cleanUserId))) || [];
    await redis.set(friendsKey(cleanUserId), myFriends.filter(f => f.userId !== cleanFriendId));

    const theirFriends = (await redis.get(friendsKey(cleanFriendId))) || [];
    await redis.set(friendsKey(cleanFriendId), theirFriends.filter(f => f.userId !== cleanUserId));

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
