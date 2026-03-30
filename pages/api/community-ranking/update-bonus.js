import { redis, crTournamentsKey } from '../../../lib/redis';

function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  return auth === (process.env.ADMIN_SECRET || 'afk-admin-2025');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

  const { tournamentId, playerName, bonusPoints, community, year } = req.body || {};

  if (!tournamentId || playerName == null || bonusPoints == null || !community || !year)
    return res.status(400).json({ error: 'tournamentId, playerName, bonusPoints, community y year son requeridos' });

  const bonus = parseInt(bonusPoints, 10);
  if (isNaN(bonus) || bonus < 0)
    return res.status(400).json({ error: 'bonusPoints debe ser un número >= 0' });

  try {
    const key = crTournamentsKey(community, year);
    const raw = await redis.get(key);
    const tournaments = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    const t = tournaments.find(t => t.id === tournamentId);
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' });

    const standing = t.standings?.find(s => s.playerName === playerName);
    if (!standing) return res.status(404).json({ error: 'Jugador no encontrado en el torneo' });

    standing.bonusPoints = bonus;
    await redis.set(key, JSON.stringify(tournaments));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[community-ranking/update-bonus]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
