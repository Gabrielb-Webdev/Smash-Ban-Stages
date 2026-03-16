// Endpoint para inicializar estructuras de datos en Upstash Redis

import redis, { tipsIndexKey, mmQueueKey } from '../../../lib/redis';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Proteger con secreto opcional si está definido
  if (ADMIN_SECRET) {
    const auth = req.headers['x-admin-secret'] || req.body?.secret;
    if (auth !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'No autorizado' });
    }
  }

  const results = {};

  // tips:index
  const tipsIndex = await redis.get(tipsIndexKey);
  if (tipsIndex === null) {
    await redis.set(tipsIndexKey, []);
    results.tipsIndex = 'inicializado';
  } else {
    results.tipsIndex = `ya existe (${tipsIndex.length} personajes)`;
  }

  // mm:queue:switch y mm:queue:parsec
  for (const plat of ['switch', 'parsec']) {
    const q = await redis.get(mmQueueKey(plat));
    if (q === null) {
      await redis.set(mmQueueKey(plat), []);
      results[`mmQueue_${plat}`] = 'inicializado';
    } else {
      results[`mmQueue_${plat}`] = `ya existe (${q.length} en cola)`;
    }
  }

  // mm:matches:index
  const matchIndex = await redis.get('mm:matches:index');
  if (matchIndex === null) {
    await redis.set('mm:matches:index', []);
    results.mmMatchIndex = 'inicializado';
  } else {
    results.mmMatchIndex = `ya existe (${matchIndex.length} matches)`;
  }

  return res.status(200).json({ success: true, results });
}
