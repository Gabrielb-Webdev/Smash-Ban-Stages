// API para que jugadores consulten sus notificaciones pendientes
import redis, { notifsKey } from '../../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'name requerido' });

    const nameLower = decodeURIComponent(name).trim().toLowerCase();
    if (nameLower.length > 100) return res.status(400).json({ error: 'name demasiado largo' });

    const notifs = (await redis.get(notifsKey(nameLower))) || [];
    return res.status(200).json(notifs.slice(-20));
  }

  res.status(405).json({ error: 'Method not allowed' });
}
