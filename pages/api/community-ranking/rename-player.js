/**
 * POST /api/community-ranking/rename-player
 * Renombra manualmente un jugador en todos los standings de una comunidad/año.
 * Body: { community, year, oldName, newName }
 */
import redis, { crTournamentsKey } from '../../../lib/redis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (auth !== (process.env.ADMIN_SECRET || 'afk-admin-2025'))
    return res.status(401).json({ error: 'No autorizado' });

  const { community, year, oldName, newName } = req.body || {};
  if (!community || !year || !oldName || !newName)
    return res.status(400).json({ error: 'community, year, oldName y newName son requeridos' });

  const key = crTournamentsKey(community, year);
  const raw = await redis.get(key);
  const tournaments = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

  let updatedCount = 0;
  const changes = [];

  for (const t of tournaments) {
    for (const s of (t.standings || [])) {
      if (s.playerName === oldName) {
        s.playerName = newName;
        updatedCount++;
        changes.push({ tournament: t.name, placement: s.placement });
      }
    }
  }

  if (updatedCount > 0) {
    await redis.set(key, JSON.stringify(tournaments));
  }

  return res.status(200).json({ ok: true, updatedCount, changes });
}
