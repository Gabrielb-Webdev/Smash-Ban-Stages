// GET  /api/tournaments/player-chars?name=PlayerName
//   → { chars: ['terry', 'pikachu', ...] }   (hasta 20, más recientes primero)
// POST /api/tournaments/player-chars
//   body: { name: 'PlayerName', chars: ['terry', 'pikachu'] }
//   → { ok: true }

import redis from '../../../lib/redis';

// clave por tag del jugador (sobrevive entre torneos)
const charKey = (name) =>
  `tournament:player-chars:${name.toLowerCase().replace(/[^a-z0-9|_-]/g, '-')}`;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { name } = req.query;
    if (!name || typeof name !== 'string' || name.length > 200) {
      return res.status(400).json({ error: 'name requerido' });
    }
    // Sorted set: score = timestamp → ZREVRANGE para más recientes primero
    const raw = await redis.zrange(charKey(name), 0, 19, { rev: true });
    return res.status(200).json({ chars: raw || [] });
  }

  if (req.method === 'POST') {
    const { name, chars } = req.body || {};
    if (!name || typeof name !== 'string' || name.length > 200) {
      return res.status(400).json({ error: 'name requerido' });
    }
    if (!Array.isArray(chars) || chars.length === 0) {
      return res.status(400).json({ error: 'chars requerido' });
    }
    const now = Date.now();
    // ZADD: score = timestamp (sobrescribe si ya existe → actualiza recencia)
    const members = chars
      .filter(c => typeof c === 'string' && c.length > 0 && c.length <= 60)
      .map(c => ({ score: now, member: c }));
    if (members.length > 0) {
      await redis.zadd(charKey(name), ...members);
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
