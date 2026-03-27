// POST /api/tournaments/mark-complete
// Marca un torneo como completado localmente en Redis.
// Actualiza: featured list + sync cache + guarda flag permanente.
// Body: { slug: 'tournament/...' }  |  { slug: '...', checkOnly: true }

import redis from '../../../lib/redis';

const AUTO_COMPLETE_PREFIX = 'startgg:auto_complete:';
const SYNC_CACHE_KEY = 'startgg:tournaments:cache';
const FEATURED_KEY   = 'tournaments:featured';
const FLAG_TTL = 60 * 60 * 24 * 30; // 30 días

function slugMatches(a, b) {
  const A = (a || '').toLowerCase();
  const B = (b || '').toLowerCase();
  return A === B || A.endsWith('/' + B) || B.endsWith('/' + A);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { slug, checkOnly } = req.body || {};
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug requerido' });
  }

  try {
    const flagKey = AUTO_COMPLETE_PREFIX + slug;

    // Modo solo consulta: verificar si ya fue marcado
    if (checkOnly) {
      const exists = await redis.get(flagKey);
      return res.status(200).json({ alreadyDone: !!exists, slug });
    }

    // 1. Guardar flag persistente
    await redis.set(flagKey, '1', { ex: FLAG_TTL });

    // 2. Actualizar lista de torneos FEATURED (clave: tournaments:featured)
    try {
      const featured = await redis.get(FEATURED_KEY);
      const list = Array.isArray(featured) ? featured : [];
      let changed = false;
      for (const t of list) {
        if (slugMatches(t.slug, slug) && t.state !== 3 && t.state !== 4) {
          t.state = 3;
          t.stateLabel = 'COMPLETED';
          changed = true;
        }
      }
      if (changed) await redis.set(FEATURED_KEY, list);
    } catch {}

    // 3. Actualizar cache de sync-startgg (clave: startgg:tournaments:cache)
    try {
      const cached = await redis.get(SYNC_CACHE_KEY);
      if (cached) {
        const list = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (Array.isArray(list)) {
          let changed = false;
          for (const t of list) {
            if (slugMatches(t.slug, slug) && t.state !== 3 && t.state !== 4) {
              t.state = 3;
              changed = true;
            }
          }
          if (changed) await redis.set(SYNC_CACHE_KEY, JSON.stringify(list), { ex: 600 });
          else await redis.del(SYNC_CACHE_KEY); // forzar refresh si no encontró por slug
        }
      }
    } catch {}

    return res.status(200).json({ success: true, slug });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
