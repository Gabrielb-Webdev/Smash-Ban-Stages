// GET|POST /api/admin/fix-player-names?secret=...
// 1. Normaliza ids a string y elimina duplicados en playersIndexKey.
// 2. Obtiene el gamerTag de cada jugador desde Start.GG usando su slug:
//    - Primero intenta el cache local (startgg:stats:v16:{slug})
//    - Si no hay cache, llama a la API de Start.GG directamente (user query)
// Solo escribe en Redis de la app, nunca envía datos a Start.GG.

import redis, { playerKey, playersIndexKey } from '../../../lib/redis';

async function fetchGamerTagFromStartGG(slug, token) {
  if (!slug || !token) return null;
  try {
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query($slug: String!) { user(slug: $slug) { player { gamerTag } } }`,
        variables: { slug },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.user?.player?.gamerTag || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  const expected = process.env.ADMIN_SECRET || 'afk-admin-2025';
  const authHeader = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  const authQuery = (req.query.secret || '').trim();
  if (authHeader !== expected && authQuery !== expected)
    return res.status(401).json({ error: 'No autorizado' });

  const sggToken = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';

  try {
    const idx = (await redis.get(playersIndexKey)) || [];
    const rawUsers = Array.isArray(idx) ? idx : [];

    // Paso 1: deduplicar por tipo de id (number vs string)
    const deduped = new Map();
    for (const u of rawUsers) {
      if (!u.id) continue;
      const sid = String(u.id);
      const existing = deduped.get(sid);
      if (!existing || typeof u.id === 'string') {
        deduped.set(sid, { ...u, id: sid });
      }
    }
    const appUsers = Array.from(deduped.values());
    const dedupRemoved = rawUsers.length - appUsers.length;

    let updated = 0;
    const changes = [];
    let apiCalls = 0;

    for (const u of appUsers) {
      const profile = await redis.get(playerKey(u.id));
      if (!profile) continue;

      const slug = profile.slug;
      let gamerTag = null;

      // Fuente 1: cache de stats de Start.GG (gratis, sin llamada API)
      if (slug) {
        try {
          const cache = await redis.get(`startgg:stats:v16:${slug}`);
          if (cache) {
            const parsed = typeof cache === 'string' ? JSON.parse(cache) : cache;
            gamerTag = parsed?.gamerTag || null;
          }
        } catch { /* ignorar */ }
      }

      // Fuente 2: llamar a la API de Start.GG con el slug del usuario
      if (!gamerTag && slug && sggToken) {
        gamerTag = await fetchGamerTagFromStartGG(slug, sggToken);
        if (gamerTag) apiCalls++;
      }

      if (!gamerTag) continue;
      if (u.name === gamerTag && profile.name === gamerTag) continue; // ya correcto

      const oldName = u.name;
      u.name = gamerTag;
      profile.name = gamerTag;
      await redis.set(playerKey(u.id), profile);

      changes.push({ id: u.id, slug, oldName, newName: gamerTag });
      updated++;
    }

    if (updated > 0 || dedupRemoved > 0) {
      await redis.set(playersIndexKey, appUsers);
    }

    return res.status(200).json({ ok: true, updated, dedupRemoved, apiCalls, totalPlayers: appUsers.length, changes });
  } catch (err) {
    console.error('[fix-player-names]', err);
    return res.status(500).json({ error: err.message });
  }
}
