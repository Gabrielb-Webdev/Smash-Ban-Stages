import redis, { crTournamentsKey } from '../../../lib/redis';

function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  return auth === (process.env.ADMIN_SECRET || 'afk-admin-2025');
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();
  if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

  const { id, community, year } = req.query;
  if (!id || !community || !year)
    return res.status(400).json({ error: 'id, community y year son requeridos' });

  try {
    const key = crTournamentsKey(community, year);
    const raw = await redis.get(key);
    const existing = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    const filtered = existing.filter(t => t.id !== id);
    if (filtered.length === existing.length)
      return res.status(404).json({ error: 'Torneo no encontrado' });

    await redis.set(key, JSON.stringify(filtered));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[community-ranking/remove-tournament]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
