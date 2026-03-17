// GET /api/ranked/leaderboard?platform=switch&limit=50
// Devuelve el top de jugadores por puntos ranked para la plataforma pedida.
// Smashers quedan primeros por tener los puntos más altos.

import redis, { rankedStatsKey, rankedBoardKey } from '../../../lib/redis';

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

  // zrevrange devuelve miembros del sorted set de mayor a menor score
  const playerIds = await redis.zrevrange(rankedBoardKey(platform), 0, limit - 1);

  if (!playerIds || playerIds.length === 0) {
    return res.status(200).json([]);
  }

  const statsArray = await Promise.all(
    playerIds.map(id => redis.get(rankedStatsKey(id, platform)))
  );

  const leaderboard = statsArray
    .filter(Boolean)
    .sort((a, b) => (b.rankedPoints || 0) - (a.rankedPoints || 0));

  return res.status(200).json(leaderboard);
}
