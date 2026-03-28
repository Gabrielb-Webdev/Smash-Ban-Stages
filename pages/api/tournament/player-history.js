/**
 * GET /api/tournament/player-history?name=X&limit=30
 *
 * Devuelve el historial de partidas de torneo de un jugador, buscando por nombre.
 * Almacenado en Redis: tournament:history:{normalizedName}
 */

import redis from '../../../lib/redis';

function tournamentHistoryKey(name) {
  return `tournament:history:${(name || '').toLowerCase().trim().replace(/\s+/g, '_')}`;
}

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { name, limit = '30' } = req.query;
  if (!name) return res.status(400).json({ error: 'name requerido' });

  const cleanName = sanitize(name);
  const n = Math.min(100, Math.max(1, parseInt(limit) || 30));

  try {
    const history = await redis.lrange(tournamentHistoryKey(cleanName), 0, n - 1);
    return res.status(200).json(Array.isArray(history) ? history : []);
  } catch (e) {
    console.error('[tournament/player-history]', e.message);
    return res.status(500).json({ error: 'Error interno' });
  }
}
