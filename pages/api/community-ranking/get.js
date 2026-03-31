import redis, { crTournamentsKey, crCharOverrideKey, playerKey, playersIndexKey } from '../../../lib/redis';
import { buildRanking } from '../../../lib/communityRanking';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { community, year } = req.query;
  if (!community || !year) return res.status(400).json({ error: 'community y year son requeridos' });

  try {
    const [raw, idx, rawOverrides] = await Promise.all([
      redis.get(crTournamentsKey(community, year)),
      redis.get(playersIndexKey).catch(() => []),
      redis.get(crCharOverrideKey(community, year)).catch(() => null),
    ]);

    const overrides = rawOverrides
      ? (typeof rawOverrides === 'string' ? JSON.parse(rawOverrides) : rawOverrides)
      : {};

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
      if (!userId) {
        const override = overrides[normName];
        return override ? { ...p, topChar: override } : p;
      }
      try {
        const profile = await redis.get(playerKey(userId));
        if (!profile) return p;

        // El override manual del admin tiene prioridad cuando no hay mainChar en el perfil
        const manualOverride = overrides[normName] || null;

        let resolvedChar = profile.mainChar || null;

        // Si no tiene personaje seleccionado en el perfil, intentar usar el
        // personaje más usado en su historial de start.gg (ya cacheado en Redis)
        if (!resolvedChar && profile.slug) {
          try {
            const sgCache = await redis.get(`startgg:stats:v16:${profile.slug}`);
            if (sgCache) {
              const parsed = typeof sgCache === 'string' ? JSON.parse(sgCache) : sgCache;
              const topLocalChar = parsed?.charUsage?.[0]?.localCharId || null;
              if (topLocalChar) {
                resolvedChar = topLocalChar;
                // Guardar automáticamente en el perfil para usos futuros
                profile.mainChar = topLocalChar;
                await redis.set(playerKey(userId), profile).catch(() => {});
              }
            }
          } catch { /* silent */ }
        }

        // Fallback al override manual si todavía no hay personaje
        if (!resolvedChar && manualOverride) resolvedChar = manualOverride;

        return {
          ...p,
          userId,
          mainCharId: resolvedChar,
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
