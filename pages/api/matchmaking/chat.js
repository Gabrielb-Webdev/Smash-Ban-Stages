// API de chat en tiempo real para matches — Upstash Redis

import redis from '../../../lib/redis';

function chatKey(matchId) { return `mm:chat:${matchId}`; }
function sanitize(s) { return String(s ?? '').replace(/[<>"'`\\]/g, '').trim(); }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET: traer mensajes (opcionalmente desde un timestamp)
  if (req.method === 'GET') {
    const { matchId, since } = req.query;
    if (!matchId) return res.status(400).json({ error: 'matchId requerido' });

    const messages = (await redis.get(chatKey(sanitize(matchId).slice(0, 100)))) || [];
    const sinceMs  = since ? Number(since) : 0;
    const filtered = sinceMs > 0 ? messages.filter(m => m.ts > sinceMs) : messages;
    return res.status(200).json({ messages: filtered });
  }

  // POST: enviar mensaje
  if (req.method === 'POST') {
    const { matchId, userId, userName, message } = req.body || {};
    if (!matchId || !userId || !message?.trim()) {
      return res.status(400).json({ error: 'matchId, userId y message son requeridos' });
    }

    const cleanMatchId = sanitize(matchId).slice(0, 100);
    const msg = {
      id:       `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      userId:   sanitize(userId).slice(0, 100),
      userName: sanitize(userName || 'Jugador').slice(0, 50),
      message:  sanitize(message).slice(0, 200),
      ts:       Date.now(),
    };

    const messages = (await redis.get(chatKey(cleanMatchId))) || [];
    messages.push(msg);
    await redis.set(chatKey(cleanMatchId), messages.slice(-100));
    return res.status(200).json({ message: msg });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
