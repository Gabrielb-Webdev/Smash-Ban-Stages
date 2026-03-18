// API: stats + ranking de personaje por plataforma
// GET /api/matchmaking/char-stats?platform=switch&charId=sora&userId=xxx
//   → top 50 jugadores con ese personaje + posición del userId

import redis, { charStatsKey, charBoardKey } from '../../../lib/redis';
import { getCharById } from '../../../lib/characters';

const VALID_PLATFORMS = ['switch', 'parsec', 'tournament'];

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const platform = sanitize(req.query.platform || '');
    const charId   = sanitize(req.query.charId   || '');
    const userId   = sanitize(req.query.userId   || '');

    if (!VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: 'Plataforma inválida' });
    }
    if (!charId || !getCharById(charId)) {
      return res.status(400).json({ error: 'Personaje inválido' });
    }

    const boardKey = charBoardKey(platform, charId);

    // Top 50 por victorias (score desc)
    const playerIds = await redis.zrange(boardKey, 0, 49, { rev: true });

    // Buscar stats de cada jugador en paralelo
    const statsArray = playerIds && playerIds.length > 0
      ? await Promise.all(playerIds.map(id => redis.get(charStatsKey(String(id), platform, charId))))
      : [];

    const leaderboard = (playerIds || []).map((uid, i) => {
      const s = statsArray[i];
      const wins   = s?.wins   || 0;
      const losses = s?.losses || 0;
      return {
        userId:   uid,
        userName: s?.userName || uid,
        wins,
        losses,
        games:   wins + losses,
        winRate: (wins + losses) > 0 ? Math.round(wins / (wins + losses) * 100) : 0,
      };
    });

    // Posición y stats del usuario solicitante
    let myStats   = null;
    let myRank    = null;
    if (userId) {
      const raw = await redis.get(charStatsKey(userId, platform, charId));
      if (raw) {
        myStats = {
          wins:    raw.wins    || 0,
          losses:  raw.losses  || 0,
          games:   (raw.wins || 0) + (raw.losses || 0),
          winRate: ((raw.wins || 0) + (raw.losses || 0)) > 0
                     ? Math.round((raw.wins || 0) / ((raw.wins || 0) + (raw.losses || 0)) * 100)
                     : 0,
        };
      }
      // Rango 1-based: cuántos jugadores tienen más wins
      const rank = await redis.zrevrank(boardKey, userId);
      myRank = rank != null ? rank + 1 : null;
    }

    return res.status(200).json({ leaderboard, myStats, myRank });
  } catch (err) {
    console.error('[char-stats] Error:', err);
    return res.status(500).json({ error: 'Error del servidor', details: err.message });
  }
}
