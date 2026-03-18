import redis from '../../../lib/redis';

const RECENT_KEY = (userId) => `recent:chars:${userId}`;
const MAX_RECENT = 6;

export default async function handler(req, res) {
  const userId = req.query.userId || req.body?.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  if (req.method === 'GET') {
    try {
      const data = await redis.get(RECENT_KEY(userId));
      return res.json(data || []);
    } catch {
      return res.json([]);
    }
  }

  if (req.method === 'POST') {
    const { charId, chars } = req.body;

    // Migración masiva: recibir array completo
    if (Array.isArray(chars)) {
      try {
        const clean = chars.slice(0, MAX_RECENT);
        await redis.set(RECENT_KEY(userId), clean);
        return res.json(clean);
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    if (!charId) return res.status(400).json({ error: 'charId required' });
    try {
      const current = (await redis.get(RECENT_KEY(userId))) || [];
      const next = [charId, ...current.filter(id => id !== charId)].slice(0, MAX_RECENT);
      await redis.set(RECENT_KEY(userId), next);
      return res.json(next);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
