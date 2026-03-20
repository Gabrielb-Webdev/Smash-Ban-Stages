// GET /api/auth/me
// Verifica el access_token de start.gg y devuelve isAdmin según ADMIN_SLUGS del servidor.
// También devuelve adminCommunities[] desde Redis para acceso segmentado por comunidad.
// Usa Redis como caché (TTL 5 min) para no golpear la API de start.gg en cada request.

import redis from '../../../lib/redis';

const ADMIN_SLUGS = (process.env.ADMIN_SLUGS || '').split(',').map(s => s.trim()).filter(Boolean);
const CACHE_TTL = 300; // 5 minutos

async function getCommunities(slug) {
  try {
    const raw = await redis.get(`admins:user:${slug}`);
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch { return []; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();

  if (!token) return res.status(401).json({ error: 'No token provided' });

  // Caché en Redis: evita llamar a start.gg en cada page load
  const cacheKey = `auth:me:${token.slice(-20)}`; // últimos 20 chars como clave (no exponer el token completo)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.status(200).json({ ...data, source: 'cache' });
    }
  } catch { /* ignorar error de caché */ }

  // Verificar token contra start.gg
  try {
    const sgRes = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query { currentUser { id name slug player { gamerTag } images { type url } } }`,
      }),
    });

    if (!sgRes.ok) return res.status(401).json({ error: 'Token inválido o expirado' });

    const sgData = await sgRes.json();
    if (sgData.errors || !sgData.data?.currentUser) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const user = sgData.data.currentUser;
    const slugNormalized = user.slug?.replace(/^user\//, '');
    const isAdmin = ADMIN_SLUGS.length > 0 &&
      (ADMIN_SLUGS.includes(slugNormalized) || ADMIN_SLUGS.includes(user.slug));

    const adminCommunities = isAdmin ? [] : await getCommunities(slugNormalized);

    const result = {
      isAdmin,
      adminCommunities,
      user: {
        id: user.id,
        name: user.name || user.player?.gamerTag || slugNormalized,
        slug: slugNormalized,
        avatar: user.images?.find(i => i.type === 'profile')?.url || null,
      },
    };

    // Guardar en caché
    try { await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL }); } catch { /* ignorar */ }

    return res.status(200).json({ ...result, source: 'live' });
  } catch (err) {
    return res.status(500).json({ error: 'Error verificando sesión', detail: err.message });
  }
}
