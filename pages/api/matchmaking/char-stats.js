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
  const topIds = await redis.zrevrange(boardKey, 0, 49, { withScores: true });

  // Construir lista desde [id, score, id, score, ...]
  const leaderboard = [];
  for (let i = 0; i < topIds.length; i += 2) {
    const uid   = topIds[i];
    const score = Number(topIds[i + 1]);
    const stats = await redis.get(charStatsKey(String(uid), platform, charId));
    leaderboard.push({
      userId:   uid,
      userName: stats?.userName || uid,
      wins:     stats?.wins  || 0,
      losses:   stats?.losses || 0,
      games:    (stats?.wins || 0) + (stats?.losses || 0),
      winRate:  stats && (stats.wins + stats.losses) > 0
                  ? Math.round(stats.wins / (stats.wins + stats.losses) * 100)
                  : 0,
    });
  }

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
        winRate: (raw.wins + raw.losses) > 0
                   ? Math.round(raw.wins / (raw.wins + raw.losses) * 100)
                   : 0,
      };
    }
    // Rango 1-based: cuántos jugadores tienen más wins
    const rank = await redis.zrevrank(boardKey, userId);
    myRank = rank != null ? rank + 1 : null;
  }

  return res.status(200).json({ leaderboard, myStats, myRank });
}
