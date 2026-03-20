// GET  /api/admin/community-admins           → todos los admins por comunidad
// GET  /api/admin/community-admins?community=afk → admins de una comunidad
// POST /api/admin/community-admins { community, slug, name } → agregar admin
// DELETE /api/admin/community-admins { community, slug }    → quitar admin
// Todos los endpoints requieren ser admin global (ADMIN_SLUGS env var).

import redis from '../../../lib/redis';

const ADMIN_SLUGS = (process.env.ADMIN_SLUGS || '').split(',').map(s => s.trim()).filter(Boolean);
export const VALID_COMMUNITIES = ['afk', 'cordoba', 'mendoza'];

export const communityAdminsKey = c => `admins:community:${c}`;
export const userCommunitiesKey  = s => `admins:user:${s}`;

async function requireGlobalAdmin(req) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // Intento con caché primero
  try {
    const cached = await redis.get(`auth:me:${token.slice(-20)}`);
    if (cached) {
      const d = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return d.isAdmin ? d.user : null;
    }
  } catch { /* ignorar */ }

  // Verificación en vivo contra start.gg
  try {
    const sgRes = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: `query { currentUser { id name slug } }` }),
    });
    if (!sgRes.ok) return null;
    const body = await sgRes.json();
    const user = body.data?.currentUser;
    if (!user) return null;
    const slug = user.slug?.replace(/^user\//, '');
    if (!ADMIN_SLUGS.includes(slug) && !ADMIN_SLUGS.includes(user.slug)) return null;
    return { id: user.id, name: user.name, slug };
  } catch { return null; }
}

async function getList(key) {
  const raw = await redis.get(key);
  if (!raw) return [];
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export default async function handler(req, res) {
  const admin = await requireGlobalAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Acceso denegado. Solo admins globales.' });

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { community } = req.query;
    if (community) {
      if (!VALID_COMMUNITIES.includes(community)) return res.status(400).json({ error: 'Comunidad inválida' });
      return res.status(200).json({ community, admins: await getList(communityAdminsKey(community)) });
    }
    // Todos
    const result = {};
    for (const c of VALID_COMMUNITIES) {
      result[c] = await getList(communityAdminsKey(c));
    }
    return res.status(200).json({ communities: result });
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { community, slug, name } = req.body || {};
    if (!community || !slug) return res.status(400).json({ error: 'Faltan campos' });
    if (!VALID_COMMUNITIES.includes(community)) return res.status(400).json({ error: 'Comunidad inválida' });
    if (!/^[\w-]+$/.test(slug)) return res.status(400).json({ error: 'Slug inválido' });

    // Lista de la comunidad
    const ck = communityAdminsKey(community);
    const list = await getList(ck);
    if (!list.find(a => a.slug === slug)) {
      list.push({ slug, name: (name || slug).slice(0, 80), addedAt: new Date().toISOString() });
      await redis.set(ck, JSON.stringify(list));
    }

    // Índice inverso (user → comunidades)
    const uk = userCommunitiesKey(slug);
    const userComms = await getList(uk);
    if (!userComms.includes(community)) {
      userComms.push(community);
      await redis.set(uk, JSON.stringify(userComms));
    }

    return res.status(200).json({ ok: true, community, slug });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { community, slug } = req.body || {};
    if (!community || !slug) return res.status(400).json({ error: 'Faltan campos' });

    // Lista de la comunidad
    const ck = communityAdminsKey(community);
    const list = (await getList(ck)).filter(a => a.slug !== slug);
    await redis.set(ck, JSON.stringify(list));

    // Índice inverso
    const uk = userCommunitiesKey(slug);
    const userComms = (await getList(uk)).filter(c => c !== community);
    if (userComms.length === 0) {
      await redis.del(uk);
    } else {
      await redis.set(uk, JSON.stringify(userComms));
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
