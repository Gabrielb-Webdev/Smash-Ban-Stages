// GET /api/ranked/smasher?platform=switch
// Devuelve el threshold dinámico de SMASHer (percentil 98)
// y el leaderboard de SMASHers con ranking por MMR.

import redis, { smasherPoolKey, smasherBoardKey, rankedStatsKey, playerKey } from '../../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const platform = ['switch', 'parsec'].includes(req.query.platform)
    ? req.query.platform
    : 'switch';

  const action = req.query.action || 'threshold'; // threshold | leaderboard

  if (action === 'threshold') {
    // Percentil 98 de todos los MMR activos (últimos 30 días)
    const totalPlayers = await redis.zcard(smasherPoolKey(platform));
    if (totalPlayers === 0) {
      return res.status(200).json({ threshold: 3200, totalPlayers: 0, platform });
    }

    // Índice del percentil 98: descartamos el top 2%
    const cutoffIndex = Math.max(0, Math.floor(totalPlayers * 0.02) - 1);

    // zrange con rev=true ordena de mayor a menor; el elemento en cutoffIndex es el threshold
    const members = await redis.zrange(smasherPoolKey(platform), cutoffIndex, cutoffIndex, { rev: true, withScores: true });

    const threshold = members?.length > 0 ? members[0].score : 3200;

    return res.status(200).json({ threshold, totalPlayers, platform });
  }

  if (action === 'leaderboard') {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    // Top SMASHers ordenados por MMR (score del sorted set)
    const members = await redis.zrange(smasherBoardKey(platform), 0, limit - 1, { rev: true, withScores: true });

    if (!members || members.length === 0) {
      return res.status(200).json({ players: [], total: 0, platform });
    }

    const total = await redis.zcard(smasherBoardKey(platform));

    const playerIds = members.map(m => m.member);
    const [statsArray, profilesArray] = await Promise.all([
      Promise.all(playerIds.map(id => redis.get(rankedStatsKey(id, platform)))),
      Promise.all(playerIds.map(id => redis.get(playerKey(id)))),
    ]);

    const players = members.map((m, i) => ({
      userId: m.member,
      mmr: m.score,
      rank: statsArray[i]?.rank || 'SMASHer',
      wins: statsArray[i]?.wins || 0,
      losses: statsArray[i]?.losses || 0,
      userName: statsArray[i]?.userName || profilesArray[i]?.name || 'Unknown',
      mainCharId: profilesArray[i]?.mainChar || null,
      mainCharAlt: profilesArray[i]?.mainCharAlt || null,
      country: profilesArray[i]?.country || null,
      smasherRanking: i + 1,
    }));

    return res.status(200).json({ players, total, platform });
  }

  return res.status(400).json({ error: 'Invalid action. Use ?action=threshold or ?action=leaderboard' });
}
