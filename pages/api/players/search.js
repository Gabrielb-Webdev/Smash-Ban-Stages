// API para buscar jugadores por nombre (para agregar amigos)
import redis, { rankedBoardKey, rankedStatsKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const q = sanitize(req.query.q || '').toLowerCase();
  if (!q || q.length < 2) return res.status(200).json([]);

  const results = [];

  for (const plat of ['switch', 'parsec']) {
    const ids = (await redis.zrange(rankedBoardKey(plat), 0, -1)) || [];
    const stats = await Promise.all(ids.map(id => redis.get(rankedStatsKey(id, plat))));
    for (const s of stats) {
      if (!s?.userName) continue;
      if (s.userName.toLowerCase().includes(q) && !results.find(r => r.userId === s.userId)) {
        results.push({ userId: s.userId, userName: s.userName });
      }
    }
    if (results.length >= 10) break;
  }

  return res.status(200).json(results.slice(0, 10));
}
