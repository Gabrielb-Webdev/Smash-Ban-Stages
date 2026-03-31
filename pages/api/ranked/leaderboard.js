// GET /api/ranked/leaderboard?platform=switch&limit=50
// Devuelve el top de jugadores por puntos ranked para la plataforma pedida.
// Smashers quedan primeros por tener los puntos más altos.

import redis, { rankedStatsKey, rankedBoardKey, rankedDoubleStatsKey, rankedDoubleBoardKey, playerKey } from '../../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // HTTP cache: Vercel Edge sirve desde CDN sin invocar la función durante s-maxage
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=15');

  const platform = ['switch', 'parsec'].includes(req.query.platform)
    ? req.query.platform
    : 'switch';
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 50));
  const isDoubles = req.query.mode === 'doubles';

  const boardKey = isDoubles ? rankedDoubleBoardKey(platform) : rankedBoardKey(platform);
  const statsKeyFn = isDoubles ? rankedDoubleStatsKey : rankedStatsKey;

  // Paralizar zrange + zcard (2 comandos concurrentes en vez de 2 secuenciales)
  const [playerIds, total] = await Promise.all([
    redis.zrange(boardKey, 0, limit - 1, { rev: true }),
    redis.zcard(boardKey),
  ]);

  if (!playerIds || playerIds.length === 0) {
    return res.status(200).json({ players: [], total: 0 });
  }

  // mget: 2 mget en paralelo (stats y perfiles)
  const [statsArray, profilesArray] = await Promise.all([
    redis.mget(...playerIds.map(id => statsKeyFn(id, platform))),
    redis.mget(...playerIds.map(id => playerKey(id))),
  ]);

  const leaderboard = statsArray
    .map((s, i) => {
      if (!s) return null;
      // Personaje más usado en ranked (calculado desde charCounts acumulado en cada partida)
      const topRankedChar = s.charCounts
        ? (Object.entries(s.charCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null)
        : null;
      return {
        ...s,
        // Prioridad: mainChar del perfil (elegido explícitamente) > más usado en partidas ranked
        mainCharId: profilesArray[i]?.mainChar || topRankedChar || null,
        mainCharAlt: profilesArray[i]?.mainCharAlt || null,
        country: profilesArray[i]?.country || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aRanked = !!a.placementDone;
      const bRanked = !!b.placementDone;
      // Rankeados siempre antes que los que están en placement
      if (aRanked !== bRanked) return aRanked ? -1 : 1;
      if (aRanked) {
        // Dentro de rankeados: por tier (rankIndex) y luego puntos
        const sa = (a.rankIndex || 0) * 100 + (a.rankPoints || 0);
        const sb = (b.rankIndex || 0) * 100 + (b.rankPoints || 0);
        return sb - sa;
      }
      // Ambos en placement: por victorias
      return (b.wins || 0) - (a.wins || 0);
    });

  return res.status(200).json({ players: leaderboard, total: total || leaderboard.length });
}
