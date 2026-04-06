// Helper compartido: verifica auth para endpoints de tickets.
// Devuelve { userId, slug, name, isAdmin, isSupport } o null si no autenticado.

import redis from './redis';
import { supportUsersKey } from './redis';

const ADMIN_SLUGS = (process.env.ADMIN_SLUGS || '').split(',').map(s => s.trim()).filter(Boolean);
const CACHE_TTL = 300;

export async function getTicketUser(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const cacheKey = `auth:me:${token.slice(-20)}`;
  let userData = null;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      userData = typeof cached === 'string' ? JSON.parse(cached) : cached;
    }
  } catch { /* ignorar */ }

  if (!userData) {
    try {
      const sgRes = await fetch('https://api.start.gg/gql/alpha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: `query { currentUser { id name slug player { gamerTag } } }` }),
      });
      if (!sgRes.ok) return null;
      const sgData = await sgRes.json();
      if (!sgData.data?.currentUser) return null;
      const u = sgData.data.currentUser;
      const slugNorm = u.slug?.replace(/^user\//, '');
      const isAdmin = ADMIN_SLUGS.length > 0 && (ADMIN_SLUGS.includes(slugNorm) || ADMIN_SLUGS.includes(u.slug));
      userData = {
        isAdmin,
        user: {
          id: u.id,
          name: u.player?.gamerTag || u.name || slugNorm,
          slug: slugNorm,
        },
      };
      try { await redis.set(cacheKey, JSON.stringify(userData), { ex: CACHE_TTL }); } catch { /* ignorar */ }
    } catch { return null; }
  }

  if (!userData?.user) return null;

  const { isAdmin, user } = userData;
  const userId = String(user.id);
  const slug = user.slug;

  // Verificar si es usuario de soporte (sin cachear ← puede cambiar dinámicamente)
  let isSupport = false;
  if (!isAdmin) {
    try {
      const inSet = await redis.sismember(supportUsersKey, userId);
      if (!inSet) {
        const inSetSlug = await redis.sismember(supportUsersKey, slug);
        isSupport = !!inSetSlug;
      } else {
        isSupport = true;
      }
    } catch { /* ignorar */ }
  }

  return { userId, slug, name: user.name, isAdmin: !!isAdmin, isSupport };
}

export function canManageTickets(ticketUser) {
  return ticketUser?.isAdmin || ticketUser?.isSupport;
}
