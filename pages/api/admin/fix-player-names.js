// POST /api/admin/fix-player-names
// 1. Normaliza todos los ids en playersIndexKey a string.
// 2. Elimina entradas duplicadas (mismo id numérico y string).
// 3. Reemplaza el nombre con el gamerTag de start.gg:
//    - Primero intenta el cache startgg:stats:v16:{slug}
//    - Si no hay cache, usa playerKey(id).name (que se actualiza en cada login)

import redis, { playerKey, playersIndexKey } from '../../../lib/redis';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (auth !== (process.env.ADMIN_SECRET || 'afk-admin-2025'))
    return res.status(401).json({ error: 'No autorizado' });

  try {
    const idx = (await redis.get(playersIndexKey)) || [];
    const rawUsers = Array.isArray(idx) ? idx : [];

    // Paso 1: deduplicar — si hay { id: 12345 } y { id: "12345" }, quedarse con el más reciente (string)
    const deduped = new Map();
    for (const u of rawUsers) {
      if (!u.id) continue;
      const sid = String(u.id);
      const existing = deduped.get(sid);
      // Preferir el que tiene id como string (más reciente) sobre el numérico
      if (!existing || typeof u.id === 'string') {
        deduped.set(sid, { ...u, id: sid });
      }
    }
    const appUsers = Array.from(deduped.values());
    const dedupRemoved = rawUsers.length - appUsers.length;

    let updated = 0;
    const changes = [];

    for (const u of appUsers) {
      const profile = await redis.get(playerKey(u.id));
      if (!profile) continue;

      // Fuente 1: cache de stats de start.gg (contiene el gamerTag más fiable)
      let gamerTag = null;
      const slug = profile.slug;
      if (slug) {
        try {
          const cache = await redis.get(`startgg:stats:v16:${slug}`);
          if (cache) {
            const parsed = typeof cache === 'string' ? JSON.parse(cache) : cache;
            gamerTag = parsed?.gamerTag || null;
          }
        } catch { /* sin cache */ }
      }

      // Fuente 2: playerKey(id).name — se actualiza en cada login con el gamerTag correcto
      if (!gamerTag && profile.name) {
        gamerTag = profile.name;
      }

      if (!gamerTag) continue;
      if (u.name === gamerTag) continue; // ya está correcto

      const oldName = u.name;
      u.name = gamerTag;

      // También asegurar que playerKey esté consistente
      if (profile.name !== gamerTag) {
        profile.name = gamerTag;
        await redis.set(playerKey(u.id), profile);
      }

      changes.push({ id: u.id, oldName, newName: gamerTag });
      updated++;
    }

    // Guardar índice limpio (deduplicado + nombres actualizados)
    if (updated > 0 || dedupRemoved > 0) {
      await redis.set(playersIndexKey, appUsers);
    }

    return res.status(200).json({ ok: true, updated, dedupRemoved, totalPlayers: appUsers.length, changes });
  } catch (err) {
    console.error('[fix-player-names]', err);
    return res.status(500).json({ error: err.message });
  }
}
