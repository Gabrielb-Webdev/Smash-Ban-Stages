import { redis, crTournamentsKey } from '../../../lib/redis';
import { buildRanking } from '../../../lib/communityRanking';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { community, year } = req.query;
  if (!community || !year) return res.status(400).json({ error: 'community y year son requeridos' });

  try {
    const raw = await redis.get(crTournamentsKey(community, year));
    const tournaments = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    const players = buildRanking(tournaments);
    return res.status(200).json({ players, tournaments });
  } catch (err) {
    console.error('[community-ranking/get]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
