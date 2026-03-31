// POST /api/admin/fix-player-names
// Recorre todos los perfiles y reemplaza el nombre con el gamerTag de start.gg
// usando el cache existente en Redis, sin llamar a la API de start.gg.

import redis, { playerKey, playersIndexKey } from '../../../lib/redis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (auth !== (process.env.ADMIN_SECRET || 'afk-admin-2025'))
    return res.status(401).json({ error: 'No autorizado' });

  try {
    const idx = (await redis.get(playersIndexKey)) || [];
    const appUsers = Array.isArray(idx) ? idx : [];

    let updated = 0;
    const changes = [];

    for (const u of appUsers) {
      if (!u.id) continue;
      const profile = await redis.get(playerKey(u.id));
      if (!profile) continue;

      const slug = profile.slug;
      if (!slug) continue;

      // Intentar obtener gamerTag desde el cache de start.gg stats
      let gamerTag = null;
      try {
        const cache = await redis.get(`startgg:stats:v16:${slug}`);
        if (cache) {
          const parsed = typeof cache === 'string' ? JSON.parse(cache) : cache;
          gamerTag = parsed?.gamerTag || null;
        }
      } catch { /* sin cache, continuar */ }

      if (!gamerTag) continue;
      if (profile.name === gamerTag) continue; // ya está correcto

      const oldName = profile.name;

      // Actualizar perfil en Redis
      profile.name = gamerTag;
      await redis.set(playerKey(u.id), profile);

      // Actualizar entrada en el índice
      const entry = appUsers.find(x => x.id === u.id);
      if (entry) entry.name = gamerTag;

      changes.push({ id: u.id, oldName, newName: gamerTag });
      updated++;
    }

    // Guardar índice actualizado si hubo cambios
    if (updated > 0) {
      await redis.set(playersIndexKey, appUsers);
    }

    return res.status(200).json({ ok: true, updated, changes });
  } catch (err) {
    console.error('[fix-player-names]', err);
    return res.status(500).json({ error: err.message });
  }
}
