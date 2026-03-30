// POST /api/status — endpoint unificado: heartbeat + estado de amigos + chat inbox
// Reemplaza 3 llamadas separadas (heartbeat + friends + chat?inbox) con 1 sola.
// Redis: ~8 comandos vs ~12 con 3 endpoints separados. HTTP: 3 requests → 1.

import redis, {
  presenceKey, userStatusKey, notifsKey, broadcastNotifsKey,
  friendsKey, chatKey, rankedStatsKey, playerKey, mmQueueKey,
} from '../../lib/redis';

const PRESENCE_TTL = 90;
const QUEUE_TTL_MS = 10 * 60 * 1000;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;
const VALID_STATUSES = ['online', 'away', 'dnd', 'invisible'];

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function userRoomKey(id) { return `mm:user:room:${id}`; }

function resolveOnlineStatus(userId, roomVal, presenceVal, switchQueue, parsecQueue) {
  if (roomVal) return 'in_match';
  const now = Date.now();
  for (const queue of [switchQueue, parsecQueue]) {
    if (Array.isArray(queue) && queue.find(e => e.userId === userId && now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS)) {
      return 'searching';
    }
  }
  if (presenceVal) {
    if (presenceVal === 'away') return 'away';
    if (presenceVal === 'dnd') return 'dnd';
    return 'online';
  }
  return 'offline';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId   = sanitize(req.body?.userId ?? '');
  const userName = sanitize(req.body?.userName ?? '').toLowerCase();
  const newStatus = req.body?.status;

  if (!userId) return res.status(400).json({ error: 'userId requerido' });
  if (newStatus && !VALID_STATUSES.includes(newStatus)) return res.status(400).json({ error: 'Estado inválido' });

  // ── 1. Batch read: status + notifs + broadcasts + lista de amigos ──────────
  const baseKeys = [userStatusKey(userId)];
  if (userName) baseKeys.push(notifsKey(userName));
  baseKeys.push(broadcastNotifsKey);

  const [baseData, friendsList] = await Promise.all([
    redis.mget(...baseKeys),
    redis.get(friendsKey(userId)),
  ]);

  // ── 2. Actualizar presencia ───────────────────────────────────────────────
  const currentStatus = newStatus || baseData[0] || 'online';
  const writes = [];
  if (newStatus) writes.push(redis.set(userStatusKey(userId), newStatus));
  if (currentStatus === 'invisible') {
    if (newStatus === 'invisible') writes.push(redis.del(presenceKey(userId)));
  } else {
    writes.push(redis.set(presenceKey(userId), currentStatus, { ex: PRESENCE_TTL }));
  }
  // Fire-and-forget: no necesitamos esperar para responder
  Promise.all(writes).catch(() => {});

  // ── 3. Notificaciones ─────────────────────────────────────────────────────
  const now = Date.now();
  let notifs = [];
  if (userName) {
    const rawNotifs = baseData[1] || [];
    notifs = rawNotifs.filter(n => !n?.sentAt || (now - new Date(n.sentAt).getTime()) < TWELVE_HOURS);
    if (notifs.length !== rawNotifs.length) redis.set(notifsKey(userName), notifs).catch(() => {});
  }
  try {
    const broadcasts = (userName ? baseData[2] : baseData[1]) || [];
    const recent = broadcasts.filter(n => !n?.sentAt || (now - new Date(n.sentAt).getTime()) < TWELVE_HOURS);
    if (recent.length > 0) {
      const existingIds = new Set(notifs.map(n => n.id));
      let added = false;
      for (const b of recent) { if (!existingIds.has(b.id)) { notifs.push(b); added = true; } }
      if (added && userName) redis.set(notifsKey(userName), notifs).catch(() => {});
    }
  } catch {}
  notifs.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
  notifs = notifs.slice(0, 25);

  // ── 4. Amigos + inbox: un solo batch si hay amigos ────────────────────────
  const friends = Array.isArray(friendsList) ? friendsList : [];
  let enrichedFriends = [];
  let inbox = [];

  if (friends.length > 0) {
    const ids = friends.map(f => f.userId);

    // 5 mget en paralelo: colas + rooms + presences + stats/profiles + chats
    const [queues, rooms, presences, statsAndProfiles, chatMessages] = await Promise.all([
      redis.mget(mmQueueKey('switch'), mmQueueKey('parsec')),
      redis.mget(...ids.map(id => userRoomKey(id))),
      redis.mget(...ids.map(id => presenceKey(id))),
      redis.mget(...ids.flatMap(id => [rankedStatsKey(id, 'switch'), rankedStatsKey(id, 'parsec'), playerKey(id)])),
      redis.mget(...ids.map(id => chatKey(userId, id))),
    ]);

    const switchQueue = queues[0] || [];
    const parsecQueue = queues[1] || [];

    enrichedFriends = friends.map((f, i) => {
      const status = resolveOnlineStatus(f.userId, rooms[i], presences[i], switchQueue, parsecQueue);
      const switchStats = statsAndProfiles[i * 3]     || null;
      const parsecStats = statsAndProfiles[i * 3 + 1] || null;
      const profile     = statsAndProfiles[i * 3 + 2] || null;
      const bestStats   = (switchStats && parsecStats)
        ? ((switchStats.rankIndex || 0) >= (parsecStats.rankIndex || 0) ? switchStats : parsecStats)
        : (switchStats || parsecStats || null);
      return {
        ...f,
        online: status,
        rank: bestStats?.rank || null,
        placementDone: bestStats?.placementDone || false,
        country: profile?.country || null,
      };
    });
    const order = { in_match: 0, searching: 1, online: 2, away: 3, dnd: 4, offline: 5 };
    enrichedFriends.sort((a, b) => (order[a.online] ?? 5) - (order[b.online] ?? 5));

    // Inbox: ya tenemos los mensajes de cada chat del mget anterior
    friends.forEach((f, i) => {
      const messages = chatMessages[i] || [];
      if (messages.length > 0) {
        inbox.push({
          friendId: f.userId,
          friendName: f.userName,
          lastMessage: messages[messages.length - 1],
          total: messages.length,
        });
      }
    });
    inbox.sort((a, b) => new Date(b.lastMessage.sentAt) - new Date(a.lastMessage.sentAt));
  }

  return res.status(200).json({ ok: true, status: currentStatus, notifs, friends: enrichedFriends, inbox });
}
