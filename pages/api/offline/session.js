import redis, { offlineSessionKey, offlineQueueKey, offlineMatchesKey } from '../../../lib/redis';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

function requireAdmin(req) {
  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  return auth === ADMIN_SECRET;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: público para jugadores; admin recibe también queue y matches
  if (req.method === 'GET') {
    const session = await redis.get(offlineSessionKey());
    if (requireAdmin(req) && session) {
      const [queue, matches] = await Promise.all([
        redis.get(offlineQueueKey()),
        redis.get(offlineMatchesKey()),
      ]);
      return res.status(200).json({ session, queue: queue || [], matches: matches || [] });
    }
    return res.status(200).json({ session: session || null });
  }

  if (!requireAdmin(req)) return res.status(401).json({ error: 'No autorizado' });

  // POST: crear/actualizar sesión
  if (req.method === 'POST') {
    const { totalScreens } = req.body || {};
    const n = Math.min(10, Math.max(1, parseInt(totalScreens) || 3));
    const existing = await redis.get(offlineSessionKey());
    const code = existing?.code || generateCode();
    const screens = Array.from({ length: n }, (_, i) => {
      const prev = existing?.screens?.find(s => s.id === i + 1);
      return {
        id: i + 1,
        label: `Tele ${i + 1}`,
        available: prev ? prev.available : true,
        busy: prev ? prev.busy : false,
      };
    });
    const sessionObj = {
      code,
      active: true,
      totalScreens: n,
      screens,
      createdAt: existing?.createdAt || Date.now(),
    };
    await redis.set(offlineSessionKey(), sessionObj, { ex: 24 * 60 * 60 });
    return res.status(200).json({ ok: true, session: sessionObj });
  }

  // PATCH: toggle disponibilidad de pantalla individual
  if (req.method === 'PATCH') {
    const { screenId, available } = req.body || {};
    const session = await redis.get(offlineSessionKey());
    if (!session) return res.status(404).json({ error: 'No hay sesión activa' });
    const screen = session.screens.find(s => s.id === parseInt(screenId));
    if (!screen) return res.status(404).json({ error: 'Pantalla no encontrada' });
    screen.available = !!available;
    await redis.set(offlineSessionKey(), session, { ex: 24 * 60 * 60 });
    return res.status(200).json({ ok: true, session });
  }

  // DELETE: terminar sesión y limpiar cola y partidas
  if (req.method === 'DELETE') {
    await redis.del(offlineSessionKey());
    await redis.del(offlineQueueKey());
    await redis.del(offlineMatchesKey());
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
