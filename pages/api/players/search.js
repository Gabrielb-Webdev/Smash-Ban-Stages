// API para buscar jugadores por nombre (para agregar amigos)
import redis, { rankedBoardKey, rankedStatsKey, playersIndexKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const q = sanitize(req.query.q || '').toLowerCase();
  if (!q || q.length < 2) return res.status(200).json([]);

  const results = [];
  const seenIds = new Set();

  // Buscar en ranked boards
  for (const plat of ['switch', 'parsec']) {
    const ids = (await redis.zrange(rankedBoardKey(plat), 0, -1)) || [];
    const stats = await Promise.all(ids.map(id => redis.get(rankedStatsKey(id, plat))));
    for (const s of stats) {
      if (!s?.userName) continue;
      if (s.userName.toLowerCase().includes(q) && !seenIds.has(s.userId)) {
        seenIds.add(s.userId);
        results.push({ userId: s.userId, userName: s.userName });
      }
    }
  }

  // Buscar en índice de jugadores registrados (incluye quienes nunca jugaron ranked)
  const playersIdx = (await redis.get(playersIndexKey)) || [];
  for (const p of playersIdx) {
    if (!p.name || seenIds.has(p.id)) continue;
    if (p.name.toLowerCase().includes(q)) {
      seenIds.add(p.id);
      results.push({ userId: p.id, userName: p.name });
    }
    if (results.length >= 15) break;
  }

  return res.status(200).json(results.slice(0, 15));
}
