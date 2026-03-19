// API de party (grupo de 2) para ranked 2v2
// POST: crear party / invitar amigo; PUT: aceptar/rechazar invitación
// GET: estado del party; DELETE: abandonar party

import redis, { partyKey, userPartyKey, friendsKey, notifsKey } from '../../lib/redis';
import { sendPush } from '../../lib/push.js';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: estado del party del usuario
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const clean = sanitize(userId);

    const pid = await redis.get(userPartyKey(clean));
    if (!pid) return res.status(200).json({ status: 'none' });

    const party = await redis.get(partyKey(pid));
    if (!party) {
      await redis.del(userPartyKey(clean));
      return res.status(200).json({ status: 'none' });
    }

    return res.status(200).json({ status: party.status, partyId: pid, party });
  }

  // POST: crear party e invitar amigo
  if (req.method === 'POST') {
    const { userId, userName, friendId, friendName, platform } = req.body || {};
    if (!userId || !userName || !friendId || !friendName || !platform) {
      return res.status(400).json({ error: 'userId, userName, friendId, friendName y platform requeridos' });
    }
    if (!['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'platform debe ser switch o parsec' });
    }

    const cleanUserId = sanitize(userId);
    const cleanUserName = sanitize(userName);
    const cleanFriendId = sanitize(friendId);
    const cleanFriendName = sanitize(friendName);

    // Verificar amistad
    const friends = (await redis.get(friendsKey(cleanUserId))) || [];
    if (!friends.find(f => f.userId === cleanFriendId)) {
      return res.status(403).json({ error: 'No son amigos' });
    }

    // Verificar que ninguno esté en party activo
    const myPartyId = await redis.get(userPartyKey(cleanUserId));
    if (myPartyId) {
      const existing = await redis.get(partyKey(myPartyId));
      if (existing && !['cancelled', 'disbanded'].includes(existing.status)) {
        return res.status(409).json({ error: 'Ya estás en un party' });
      }
      await redis.del(partyKey(myPartyId));
      await redis.del(userPartyKey(cleanUserId));
    }

    const friendPartyId = await redis.get(userPartyKey(cleanFriendId));
    if (friendPartyId) {
      const existing = await redis.get(partyKey(friendPartyId));
      if (existing && !['cancelled', 'disbanded'].includes(existing.status)) {
        return res.status(409).json({ error: 'Tu amigo ya está en un party' });
      }
    }

    const partyId = `party-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const party = {
      id: partyId,
      platform,
      leader: { userId: cleanUserId, userName: cleanUserName },
      invited: { userId: cleanFriendId, userName: cleanFriendName },
      status: 'pending', // pending → ready → searching → matched
      createdAt: new Date().toISOString(),
    };

    await redis.set(partyKey(partyId), party);
    await redis.set(userPartyKey(cleanUserId), partyId);

    // Enviar notificación de invitación
    const notif = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'party_invite',
      targetName: cleanFriendName.toLowerCase(),
      setup: 'Invitación de dobles',
      message: `${cleanUserName} te invita a jugar ranked 2v2 (${platform})`,
      sentBy: cleanUserName,
      fromId: cleanUserId,
      partyId,
      platform,
      sentAt: new Date().toISOString(),
      readAt: null,
    };
    const nKey = notifsKey(cleanFriendName.toLowerCase());
    const notifs = (await redis.get(nKey)) || [];
    notifs.push(notif);
    await redis.set(nKey, notifs.length > 100 ? notifs.slice(-100) : notifs);
    sendPush(cleanFriendId, { title: '👥 Invitación 2v2', body: `${cleanUserName} te invita a jugar ranked 2v2`, tag: 'party-invite', data: { url: '/home' } }).catch(() => {});

    return res.status(200).json({ success: true, partyId, party });
  }

  // PUT: aceptar o rechazar invitación
  if (req.method === 'PUT') {
    const { userId, partyId, action } = req.body || {};
    if (!userId || !partyId || !action) {
      return res.status(400).json({ error: 'userId, partyId y action requeridos' });
    }
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action debe ser accept o reject' });
    }

    const cleanUserId = sanitize(userId);
    const cleanPartyId = sanitize(partyId);

    const party = await redis.get(partyKey(cleanPartyId));
    if (!party) return res.status(404).json({ error: 'Party no encontrado' });
    if (party.invited.userId !== cleanUserId) {
      return res.status(403).json({ error: 'No sos el invitado de este party' });
    }
    if (party.status !== 'pending') {
      return res.status(400).json({ error: 'La invitación ya fue procesada' });
    }

    if (action === 'reject') {
      party.status = 'cancelled';
      await redis.set(partyKey(cleanPartyId), party);
      await redis.del(userPartyKey(party.leader.userId));
      return res.status(200).json({ success: true, rejected: true });
    }

    // accept
    party.status = 'ready';
    await redis.set(partyKey(cleanPartyId), party);
    await redis.set(userPartyKey(cleanUserId), cleanPartyId);

    return res.status(200).json({ success: true, accepted: true, party });
  }

  // DELETE: abandonar party
  if (req.method === 'DELETE') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const clean = sanitize(userId);

    const pid = await redis.get(userPartyKey(clean));
    if (!pid) return res.status(200).json({ success: true });

    const party = await redis.get(partyKey(pid));
    if (party) {
      party.status = 'disbanded';
      await redis.set(partyKey(pid), party);
      // Limpiar ambos miembros
      await redis.del(userPartyKey(party.leader.userId));
      if (party.invited?.userId) await redis.del(userPartyKey(party.invited.userId));
    } else {
      await redis.del(userPartyKey(clean));
    }

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
