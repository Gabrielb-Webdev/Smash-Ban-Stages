// POST /api/tournaments/mark-complete
// Marca un torneo como completado localmente en Redis (override al estado de start.gg)
// Body: { slug: 'tournament/...' }

import redis from '../../../lib/redis';

const AUTO_COMPLETE_PREFIX = 'startgg:auto_complete:';
const CACHE_KEY = 'startgg:tournaments:cache';
const CACHE_TTL = 600;
const FLAG_TTL = 60 * 60 * 24 * 30; // 30 días

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.body || {};
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug requerido' });
  }

  try {
    // Guardar flag persistente
    await redis.set(AUTO_COMPLETE_PREFIX + slug, '1', { ex: FLAG_TTL });

    // Actualizar directamente el cache existente en Redis
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        const tournaments = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (Array.isArray(tournaments)) {
          let changed = false;
          for (const t of tournaments) {
            // Comparar slug exacto o como sufijo (ej: 'choricup' vs 'tournament/choricup')
            const tSlug = (t.slug || '').toLowerCase();
            const inputSlug = slug.toLowerCase();
            const matches = tSlug === inputSlug || tSlug.endsWith('/' + inputSlug) || inputSlug.endsWith('/' + tSlug);
            if (matches && t.state !== 3 && t.state !== 4) {
              t.state = 3;
              changed = true;
            }
          }
          if (changed) {
            await redis.set(CACHE_KEY, JSON.stringify(tournaments), { ex: CACHE_TTL });
          }
        }
      }
    } catch {}

    return res.status(200).json({ success: true, slug });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
