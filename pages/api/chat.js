// API de chat entre amigos
// GET: obtener mensajes, POST: enviar mensaje

import redis, { chatKey, friendsKey } from '../../lib/redis';
import { sendPush } from '../../lib/push';

const MAX_MSG_LENGTH = 500;
const MAX_MESSAGES = 100;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, MAX_MSG_LENGTH);
}
function sanitizeId(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: obtener mensajes entre dos usuarios, o inbox de todos los chats
  if (req.method === 'GET') {
    const { userId, friendId, offset = 0, inbox } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    const cleanUserId = sanitizeId(userId);

    // Modo inbox: últimos mensajes de cada conversación
    if (inbox === 'true' || inbox === '1') {
      const friends = (await redis.get(friendsKey(cleanUserId))) || [];
      if (friends.length === 0) return res.status(200).json({ conversations: [] });
      // Batch: 1 mget en vez de N gets individuales
      const chatKeys = friends.map(f => chatKey(cleanUserId, f.userId));
      const allMessages = await redis.mget(...chatKeys);
      const conversations = [];
      friends.forEach((f, i) => {
        const messages = allMessages[i] || [];
        if (messages.length > 0) {
          const last = messages[messages.length - 1];
          conversations.push({
            friendId: f.userId,
            friendName: f.userName,
            lastMessage: last,
            total: messages.length,
          });
        }
      });
      // Ordenar por fecha del último mensaje (más reciente primero)
      conversations.sort((a, b) => new Date(b.lastMessage.sentAt) - new Date(a.lastMessage.sentAt));
      return res.status(200).json({ conversations });
    }

    if (!friendId) return res.status(400).json({ error: 'friendId requerido' });
    const cleanFriendId = sanitizeId(friendId);

    // Verificar que son amigos
    const friends = (await redis.get(friendsKey(cleanUserId))) || [];
    if (!friends.find(f => f.userId === cleanFriendId)) {
      return res.status(403).json({ error: 'No son amigos' });
    }

    const key = chatKey(cleanUserId, cleanFriendId);
    const messages = (await redis.get(key)) || [];
    const start = parseInt(offset) || 0;
    const page = messages.slice(start, start + 30);

    return res.status(200).json({ messages: page, total: messages.length });
  }

  // POST: enviar mensaje
  if (req.method === 'POST') {
    const { userId, userName, friendId, message } = req.body || {};
    if (!userId || !friendId || !message) {
      return res.status(400).json({ error: 'userId, friendId y message requeridos' });
    }

    const cleanUserId = sanitizeId(userId);
    const cleanUserName = sanitizeId(userName || 'Jugador');
    const cleanFriendId = sanitizeId(friendId);
    const cleanMessage = sanitize(message);

    if (!cleanMessage) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    // Verificar que son amigos
    const friends = (await redis.get(friendsKey(cleanUserId))) || [];
    if (!friends.find(f => f.userId === cleanFriendId)) {
      return res.status(403).json({ error: 'No son amigos' });
    }

    const key = chatKey(cleanUserId, cleanFriendId);
    const messages = (await redis.get(key)) || [];

    const msg = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      from: cleanUserId,
      fromName: cleanUserName,
      text: cleanMessage,
      sentAt: new Date().toISOString(),
    };

    messages.push(msg);
    // Mantener solo los últimos MAX_MESSAGES
    if (messages.length > MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES);
    }
    await redis.set(key, messages);

    // Push notification al receptor del mensaje
    sendPush(cleanFriendId, {
      title: `💬 ${cleanUserName}`,
      body: cleanMessage.slice(0, 100),
      tag: 'chat-message',
      data: { url: '/home?open=perfil' },
    }).catch(() => {});

    return res.status(200).json({ success: true, message: msg });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
