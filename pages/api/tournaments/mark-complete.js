// POST /api/tournaments/mark-complete
// Marca un torneo como completado localmente en Redis (override al estado de start.gg)
// Body: { slug: 'tournament/...' }

import redis from '../../../lib/redis';

const AUTO_COMPLETE_PREFIX = 'startgg:auto_complete:';
const TTL = 60 * 60 * 24 * 30; // 30 días

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
    await redis.set(AUTO_COMPLETE_PREFIX + slug, '1', { ex: TTL });

    // Invalidar cache de torneos para que el próximo GET refleje el cambio
    await redis.del('startgg:tournaments:cache');

    return res.status(200).json({ success: true, slug });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
