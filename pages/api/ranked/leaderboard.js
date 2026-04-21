// GET /api/ranked/leaderboard?platform=switch&limit=50
// Devuelve el top de jugadores por puntos ranked para la plataforma pedida.
// Smashers quedan primeros por tener los puntos más altos.

import redis, { rankedStatsKey, rankedBoardKey, rankedDoubleStatsKey, rankedDoubleBoardKey, playerKey, matchHistoryKey } from '../../../lib/redis';

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

  // Para jugadores sin charCounts (partidas previas al tracking), calcular desde historial
  const needsHistory = playerIds.filter((id, i) => statsArray[i] && !statsArray[i].charCounts);
  const historyMap = {};
  if (needsHistory.length > 0) {
    const histories = await Promise.all(
      needsHistory.map(id => redis.lrange(matchHistoryKey(id), 0, 49).catch(() => []))
    );
    needsHistory.forEach((id, i) => { historyMap[id] = histories[i] || []; });
  }

  const leaderboard = statsArray
    .map((s, i) => {
      if (!s) return null;
      let topRankedChar = null;

      if (s.charCounts) {
        // Datos nuevos: charCounts acumulado partida a partida
        topRankedChar = Object.entries(s.charCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      } else if (historyMap[playerIds[i]]) {
        // Datos históricos: computar desde matchHistory filtrando por plataforma y ranked
        const counts = {};
        for (const entry of historyMap[playerIds[i]]) {
          if (!entry || entry.platform !== platform) continue;
          if (entry.rpDelta === undefined && entry.mmrDelta === undefined) continue; // solo ranked
          const myId = String(playerIds[i]);
          const charId = String(entry.winnerId) === myId ? entry.winnerCharId : entry.loserCharId;
          if (charId) counts[String(charId)] = (counts[String(charId)] || 0) + 1;
        }
        topRankedChar = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        // Guardar en stats para no volver a calcular (lazy backfill)
        if (topRankedChar) {
          s.charCounts = counts;
          redis.set(statsKeyFn(playerIds[i], platform), s).catch(() => {});
        }
      }

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

  // ── Position change snapshot ──────────────────────────────────────
  // Guarda posiciones en ranked:pos:snapshot:{mode}{platform} cada 24h.
  // Permite mostrar si el jugador subió, bajó o se mantuvo.
  const snapshotKey = `ranked:pos:snapshot:${isDoubles ? 'doubles:' : ''}${platform}`;
  let prevSnapshot = null;
  try { prevSnapshot = await redis.get(snapshotKey); } catch {}
  const prevPositions = prevSnapshot?.positions || null;

  const leaderboardFinal = leaderboard.map((p, i) => {
    const currentPos = i + 1;
    const prevPos    = prevPositions ? (prevPositions[String(p.userId)] ?? null) : null;
    // positivo = subió, negativo = bajó, 0 = igual, null = sin datos previos
    const positionDelta = prevPos !== null ? prevPos - currentPos : null;
    return { ...p, positionDelta };
  });

  // Actualizar snapshot si tiene más de 24h o no existe
  const snapshotAge = prevSnapshot?.savedAt
    ? Date.now() - new Date(prevSnapshot.savedAt).getTime()
    : Infinity;
  if (snapshotAge > 86400000) {
    const newPositions = {};
    leaderboard.forEach((p, i) => { newPositions[String(p.userId)] = i + 1; });
    redis.set(snapshotKey, { positions: newPositions, savedAt: new Date().toISOString() }).catch(() => {});
  }

  return res.status(200).json({ players: leaderboardFinal, total: total || leaderboard.length });
}
