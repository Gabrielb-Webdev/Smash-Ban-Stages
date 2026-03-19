// GET /api/ranked/leaderboard?platform=switch&limit=50
// Devuelve el top de jugadores por puntos ranked para la plataforma pedida.
// Smashers quedan primeros por tener los puntos más altos.

import redis, { rankedStatsKey, rankedBoardKey, rankedDoubleStatsKey, rankedDoubleBoardKey } from '../../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const platform = ['switch', 'parsec'].includes(req.query.platform)
    ? req.query.platform
    : 'switch';
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 50));
  const isDoubles = req.query.mode === 'doubles';

  const boardKey = isDoubles ? rankedDoubleBoardKey(platform) : rankedBoardKey(platform);
  const statsKeyFn = isDoubles ? rankedDoubleStatsKey : rankedStatsKey;

  // zrange con rev:true devuelve miembros del sorted set de mayor a menor score
  const playerIds = await redis.zrange(boardKey, 0, limit - 1, { rev: true });

  if (!playerIds || playerIds.length === 0) {
    return res.status(200).json({ players: [], total: 0 });
  }

  const total = await redis.zcard(boardKey);

  const [statsArray, recentCharsArray] = await Promise.all([
    Promise.all(playerIds.map(id => redis.get(statsKeyFn(id, platform)))),
    Promise.all(playerIds.map(id => redis.get(`recent:chars:${id}`))),
  ]);

  const leaderboard = statsArray
    .map((s, i) => s ? { ...s, mainCharId: recentCharsArray[i]?.[0] || null } : null)
    .filter(Boolean)
    .sort((a, b) => {
      const sa = (a.rankIndex || 0) * 100 + (a.rankPoints || 0);
      const sb = (b.rankIndex || 0) * 100 + (b.rankPoints || 0);
      return sb - sa;
    });

  return res.status(200).json({ players: leaderboard, total: total || leaderboard.length });
}
