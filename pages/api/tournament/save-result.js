/**
 * POST /api/tournament/save-result
 *
 * Guarda el resultado de un set de torneo en el historial de ambos jugadores.
 * Llamado por server.js (Render) cuando una serie llega a FINISHED.
 * Almacena en Redis: tournament:history:{normalizedName}
 */

import redis from '../../../lib/redis';

const COMMUNITY_LABELS = {
  'santafe':   'Santa Fe',
  'cordoba':   'Córdoba',
  'mendoza':   'Mendoza',
  'afk-multi': 'AFK',
  'afk':       'AFK',
  'warui':     'Warui',
  'inc':       'INC',
  'test':      'Test',
};

function stripTeamTag(name) {
  const s = String(name || '');
  const idx = s.indexOf(' | ');
  return idx !== -1 ? s.slice(idx + 3) : s;
}

function tournamentHistoryKey(name) {
  return `tournament:history:${stripTeamTag(name).toLowerCase().trim().replace(/\s+/g, '_')}`;
}

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      winnerName, loserName,
      winnerScore, loserScore,
      winnerCharId, loserCharId,
      community, format,
      round, tournamentName,
      games, sessionId,
    } = req.body;

    if (!winnerName || !loserName) return res.status(400).json({ error: 'winnerName y loserName requeridos' });

    const communityClean = sanitize(community || '');
    const communityLabel = COMMUNITY_LABELS[communityClean] || communityClean;

    const entry = {
      matchId: `tournament-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'tournament',
      community: communityClean,
      communityLabel,
      format: sanitize(format || 'BO3'),
      round: sanitize(round || ''),
      tournamentName: sanitize(tournamentName || ''),
      winnerName: sanitize(winnerName),
      loserName: sanitize(loserName),
      winnerScore: Number(winnerScore) || 0,
      loserScore: Number(loserScore) || 0,
      winnerCharId: sanitize(winnerCharId || ''),
      loserCharId: sanitize(loserCharId || ''),
      games: Array.isArray(games) ? games.slice(0, 10) : [],
      playedAt: new Date().toISOString(),
    };

    const winnerKey = tournamentHistoryKey(winnerName);
    const loserKey  = tournamentHistoryKey(loserName);

    // Guardar para ganador con isWin=true, para perdedor con isWin=false
    await Promise.all([
      redis.lpush(winnerKey, { ...entry, isWin: true }),
      redis.lpush(loserKey,  { ...entry, isWin: false }),
    ]);
    // Trim a 100 partidas máximo
    await Promise.all([
      redis.ltrim(winnerKey, 0, 99),
      redis.ltrim(loserKey,  0, 99),
    ]);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[tournament/save-result]', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}
