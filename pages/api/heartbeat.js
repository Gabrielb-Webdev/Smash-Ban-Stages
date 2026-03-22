// POST /api/heartbeat — registra presencia online del usuario (TTL 60s)
// Al hacer POST también devuelve notificaciones (consolida round-trips)
import redis, { presenceKey, userStatusKey, notifsKey } from '../../lib/redis';

const PRESENCE_TTL = 60; // segundos
const VALID_STATUSES = ['online', 'away', 'dnd', 'invisible'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const userId = String(req.query?.userId ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const status = (await redis.get(userStatusKey(userId))) || 'online';
    return res.status(200).json({ status });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = String(req.body?.userId ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  // If a manual status is being set
  const newStatus = req.body?.status;
  if (newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) return res.status(400).json({ error: 'Estado inválido' });
    await redis.set(userStatusKey(userId), newStatus);
    // If invisible, remove presence key
    if (newStatus === 'invisible') {
      await redis.del(presenceKey(userId));
      return res.status(200).json({ ok: true, status: newStatus });
    }
  }

  // Set presence heartbeat (skip if invisible)
  const currentStatus = newStatus || (await redis.get(userStatusKey(userId))) || 'online';
  if (currentStatus !== 'invisible') {
    await redis.set(presenceKey(userId), currentStatus, { ex: PRESENCE_TTL });
  }

  // Devolver también las notificaciones para evitar un fetch extra
  const userName = String(req.body?.userName ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100).toLowerCase();
  let notifs = [];
  if (userName) {
    const rawNotifs = (await redis.get(notifsKey(userName))) || [];
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    const now = Date.now();
    notifs = rawNotifs.filter(n => {
      if (!n?.sentAt) return true;
      return (now - new Date(n.sentAt).getTime()) < TWELVE_HOURS;
    });
    // Limpiar notificaciones viejas si se filtraron algunas
    if (notifs.length !== rawNotifs.length) {
      await redis.set(notifsKey(userName), notifs);
    }
    notifs = notifs.slice(-20);
  }

  return res.status(200).json({ ok: true, status: currentStatus, notifs });
}
