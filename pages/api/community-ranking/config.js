// API para leer/guardar qué comunidades aparecen en el tab Rankings del home

import redis, { rankingConfigKey } from '../../../lib/redis';

const ADMIN_SECRET = 'afk-admin-2025';
const VALID_COMMUNITIES = ['afk', 'inc', 'cordoba', 'mendoza', 'santa-fe'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET: retorna las comunidades configuradas (default: solo afk)
  if (req.method === 'GET') {
    const stored = await redis.get(rankingConfigKey);
    const communities = Array.isArray(stored) && stored.length > 0 ? stored : ['afk'];
    return res.status(200).json({ communities });
  }

  // POST: guarda las comunidades (requiere admin)
  if (req.method === 'POST') {
    if (req.headers.authorization !== `Bearer ${ADMIN_SECRET}`) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const { communities } = req.body || {};
    if (!Array.isArray(communities)) {
      return res.status(400).json({ error: 'communities debe ser un array' });
    }
    const filtered = communities.filter(c => VALID_COMMUNITIES.includes(c));
    if (filtered.length === 0) {
      return res.status(400).json({ error: 'Debe haber al menos una comunidad activa' });
    }
    await redis.set(rankingConfigKey, filtered);
    return res.status(200).json({ success: true, communities: filtered });
  }

  return res.status(405).end();
}
