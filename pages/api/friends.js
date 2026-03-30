// API de amigos — solicitudes, aceptar/rechazar, listar y eliminar
// Sistema de solicitudes: POST envía solicitud, PUT acepta/rechaza

import redis, { friendsKey, friendRequestsKey, sentRequestsKey, mmQueueKey, rankedStatsKey, notifsKey, presenceKey, userStatusKey, playerKey } from '../../lib/redis';
import { sendPush } from '../../lib/push.js';

const MAX_FRIENDS = 50;
const QUEUE_TTL_MS = 10 * 60 * 1000;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function userRoomKey(id) { return `mm:user:room:${id}`; }

/** Determina el estado online a partir de datos pre-cargados (evita gets individuales) */
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: listar amigos o solicitudes pendientes
  if (req.method === 'GET') {
    const { userId, type } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const clean = sanitize(userId);

    if (type === 'requests') {
      const requests = (await redis.get(friendRequestsKey(clean))) || [];
      return res.status(200).json(requests);
    }

    if (type === 'sent') {
      const sent = (await redis.get(sentRequestsKey(clean))) || [];
      return res.status(200).json(sent);
    }

    const friends = (await redis.get(friendsKey(clean))) || [];
    if (friends.length === 0) return res.status(200).json([]);

    // Batch: leer todas las keys de una vez con mget (1 comando por mget en vez de N gets)
    const ids = friends.map(f => f.userId);
    const [queues, rooms, presences, statsAndProfiles] = await Promise.all([
      redis.mget(mmQueueKey('switch'), mmQueueKey('parsec')),
      redis.mget(...ids.map(id => userRoomKey(id))),
      redis.mget(...ids.map(id => presenceKey(id))),
      redis.mget(...ids.flatMap(id => [rankedStatsKey(id, 'switch'), rankedStatsKey(id, 'parsec'), playerKey(id)])),
    ]);
    const switchQueue = queues[0] || [];
    const parsecQueue = queues[1] || [];

    const enriched = friends.map((f, i) => {
      const status = resolveOnlineStatus(f.userId, rooms[i], presences[i], switchQueue, parsecQueue);
      const switchStats = statsAndProfiles[i * 3] || null;
      const parsecStats = statsAndProfiles[i * 3 + 1] || null;
      const profile = statsAndProfiles[i * 3 + 2] || null;
      const bestStats = (switchStats && parsecStats)
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
    enriched.sort((a, b) => (order[a.online] ?? 5) - (order[b.online] ?? 5));
    return res.status(200).json(enriched);
  }

  // POST: enviar solicitud de amistad
  if (req.method === 'POST') {
    const { userId, userName, friendId, friendName } = req.body || {};
    if (!userId || !friendId || !friendName) {
      return res.status(400).json({ error: 'userId, friendId y friendName requeridos' });
    }
    if (userId === friendId) {
      return res.status(400).json({ error: 'No podés agregarte a vos mismo' });
    }

    const cleanUserId = sanitize(userId);
    const cleanUserName = sanitize(userName || 'Jugador');
    const cleanFriendId = sanitize(friendId);
    const cleanFriendName = sanitize(friendName);

    // Ya son amigos?
    const myFriends = (await redis.get(friendsKey(cleanUserId))) || [];
    if (myFriends.find(f => f.userId === cleanFriendId)) {
      return res.status(200).json({ success: true, alreadyFriends: true });
    }

    // Ya hay solicitud pendiente tuya?
    const theirRequests = (await redis.get(friendRequestsKey(cleanFriendId))) || [];
    if (theirRequests.find(r => r.fromId === cleanUserId)) {
      // Asegurar que sentRequests del remitente esté sincronizado
      const mySent = (await redis.get(sentRequestsKey(cleanUserId))) || [];
      if (!mySent.find(s => s.toId === cleanFriendId)) {
        mySent.push({ toId: cleanFriendId, toName: cleanFriendName, sentAt: new Date().toISOString() });
        await redis.set(sentRequestsKey(cleanUserId), mySent);
      }
      return res.status(200).json({ success: true, requestSent: true, alreadyPending: true });
    }

    // Ellos ya te enviaron? → auto-accept
    const myRequests = (await redis.get(friendRequestsKey(cleanUserId))) || [];
    const theirReq = myRequests.find(r => r.fromId === cleanFriendId);
    if (theirReq) {
      if (myFriends.length >= MAX_FRIENDS) {
        return res.status(400).json({ error: 'Límite de amigos alcanzado' });
      }
      myFriends.push({ userId: cleanFriendId, userName: cleanFriendName, addedAt: new Date().toISOString() });
      await redis.set(friendsKey(cleanUserId), myFriends);

      const theirFriends = (await redis.get(friendsKey(cleanFriendId))) || [];
      if (!theirFriends.find(f => f.userId === cleanUserId)) {
        theirFriends.push({ userId: cleanUserId, userName: cleanUserName, addedAt: new Date().toISOString() });
        await redis.set(friendsKey(cleanFriendId), theirFriends);
      }
      await redis.set(friendRequestsKey(cleanUserId), myRequests.filter(r => r.fromId !== cleanFriendId));
      // Limpiar sent de ambos
      const mySent = (await redis.get(sentRequestsKey(cleanUserId))) || [];
      await redis.set(sentRequestsKey(cleanUserId), mySent.filter(s => s.toId !== cleanFriendId));
      const theirSent = (await redis.get(sentRequestsKey(cleanFriendId))) || [];
      await redis.set(sentRequestsKey(cleanFriendId), theirSent.filter(s => s.toId !== cleanUserId));
      return res.status(200).json({ success: true, autoAccepted: true });
    }

    // Crear solicitud
    theirRequests.push({ fromId: cleanUserId, fromName: cleanUserName, sentAt: new Date().toISOString() });
    await redis.set(friendRequestsKey(cleanFriendId), theirRequests.length > 50 ? theirRequests.slice(-50) : theirRequests);

    // Guardar en enviadas del remitente
    const mySent = (await redis.get(sentRequestsKey(cleanUserId))) || [];
    mySent.push({ toId: cleanFriendId, toName: cleanFriendName, sentAt: new Date().toISOString() });
    await redis.set(sentRequestsKey(cleanUserId), mySent.length > 50 ? mySent.slice(-50) : mySent);

    // Enviar notificación
    const notif = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'friend_request',
      targetName: cleanFriendName.toLowerCase(),
      setup: 'Solicitud de amistad',
      message: `${cleanUserName} quiere ser tu amigo`,
      sentBy: cleanUserName,
      fromId: cleanUserId,
      sentAt: new Date().toISOString(),
      readAt: null,
    };
    const nKey = notifsKey(cleanFriendName.toLowerCase());
    const notifs = (await redis.get(nKey)) || [];
    notifs.push(notif);
    await redis.set(nKey, notifs.length > 100 ? notifs.slice(-100) : notifs);
    sendPush(cleanFriendId, { title: '👤 Solicitud de amistad', body: `${cleanUserName} quiere ser tu amigo`, tag: 'friend-request', data: { url: '/home?open=perfil' } }).catch(() => {});

    return res.status(200).json({ success: true, requestSent: true });
  }

  // PUT: aceptar o rechazar solicitud
  if (req.method === 'PUT') {
    const { userId, userName, fromId, action } = req.body || {};
    if (!userId || !fromId || !action) {
      return res.status(400).json({ error: 'userId, fromId y action requeridos' });
    }
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action debe ser accept o reject' });
    }

    const cleanUserId = sanitize(userId);
    const cleanUserName = sanitize(userName || 'Jugador');
    const cleanFromId = sanitize(fromId);

    const requests = (await redis.get(friendRequestsKey(cleanUserId))) || [];
    const reqIdx = requests.findIndex(r => r.fromId === cleanFromId);
    if (reqIdx === -1) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const friendRequest = requests[reqIdx];
    requests.splice(reqIdx, 1);
    await redis.set(friendRequestsKey(cleanUserId), requests);

    // Limpiar de enviadas del remitente
    const senderSent = (await redis.get(sentRequestsKey(cleanFromId))) || [];
    await redis.set(sentRequestsKey(cleanFromId), senderSent.filter(s => s.toId !== cleanUserId));

    if (action === 'accept') {
      const myFriends = (await redis.get(friendsKey(cleanUserId))) || [];
      if (myFriends.length >= MAX_FRIENDS) {
        return res.status(400).json({ error: 'Límite de amigos alcanzado' });
      }
      if (!myFriends.find(f => f.userId === cleanFromId)) {
        myFriends.push({ userId: cleanFromId, userName: friendRequest.fromName, addedAt: new Date().toISOString() });
        await redis.set(friendsKey(cleanUserId), myFriends);
      }

      const theirFriends = (await redis.get(friendsKey(cleanFromId))) || [];
      if (!theirFriends.find(f => f.userId === cleanUserId)) {
        theirFriends.push({ userId: cleanUserId, userName: cleanUserName, addedAt: new Date().toISOString() });
        await redis.set(friendsKey(cleanFromId), theirFriends);
      }

      // Notificar aceptación
      const notif = {
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'friend_accepted',
        targetName: friendRequest.fromName.toLowerCase(),
        setup: 'Solicitud aceptada',
        message: `${cleanUserName} aceptó tu solicitud de amistad`,
        sentBy: cleanUserName,
        sentAt: new Date().toISOString(),
        readAt: null,
      };
      const nKey = notifsKey(friendRequest.fromName.toLowerCase());
      const notifs = (await redis.get(nKey)) || [];
      notifs.push(notif);
      await redis.set(nKey, notifs.length > 100 ? notifs.slice(-100) : notifs);
      sendPush(cleanFromId, { title: '✅ Solicitud aceptada', body: `${cleanUserName} aceptó tu solicitud de amistad`, tag: 'friend-accepted', data: { url: '/home?open=perfil' } }).catch(() => {});

      return res.status(200).json({ success: true, accepted: true });
    }

    return res.status(200).json({ success: true, rejected: true });
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
