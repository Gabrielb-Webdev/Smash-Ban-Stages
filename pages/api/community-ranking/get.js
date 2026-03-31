import redis, { crTournamentsKey, playerKey, playersIndexKey } from '../../../lib/redis';
import { buildRanking } from '../../../lib/communityRanking';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { community, year } = req.query;
  if (!community || !year) return res.status(400).json({ error: 'community y year son requeridos' });

  try {
    const [raw, idx] = await Promise.all([
      redis.get(crTournamentsKey(community, year)),
      redis.get(playersIndexKey).catch(() => []),
    ]);

    const tournaments = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    const players = buildRanking(tournaments);

    // Enriquecer con datos de perfiles de la app
    const appUsers = Array.isArray(idx) ? idx : [];
    // Mapa nombre normalizado → userId
    const nameToId = {};
    for (const u of appUsers) {
      if (u.name) nameToId[u.name.toLowerCase().trim()] = u.id;
    }

    // Para cada jugador del ranking, intentar cruzar con la app
    const enriched = await Promise.all(players.map(async p => {
      const normName = p.name.toLowerCase().trim();
      const userId = nameToId[normName] || null;
      if (!userId) return p;
      try {
        const profile = await redis.get(playerKey(userId));
        if (!profile) return p;
        return {
          ...p,
          userId,
          mainCharId: profile.mainChar || null,
          mainCharAlt: profile.mainCharAlt || null,
          country: profile.country || null,
        };
      } catch { return p; }
    }));

    return res.status(200).json({ players: enriched, tournaments });
  } catch (err) {
    console.error('[community-ranking/get]', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
