// GET /api/admin/seed-owner
// Agrega al super admin (ADMIN_SLUGS) como community admin de TODAS las comunidades.
// Idempotente y seguro: solo puede agregar los slugs ya configurados en ADMIN_SLUGS (env var del servidor).

import redis from '../../../lib/redis';

const ADMIN_SLUGS = (process.env.ADMIN_SLUGS || '').split(',').map(s => s.trim()).filter(Boolean);
const COMMUNITIES = ['afk', 'cordoba', 'mendoza', 'inc', 'warui', 'santafe'];
const OWNER_NAME = 'Gabriel Sin H';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (ADMIN_SLUGS.length === 0) {
    return res.status(500).json({ error: 'ADMIN_SLUGS no está configurado en las variables de entorno del servidor.' });
  }

  const results = {};

  for (const slug of ADMIN_SLUGS) {
    for (const community of COMMUNITIES) {
      const ck = `admins:community:${community}`;
      const list = (await redis.get(ck)) || [];
      const parsed = typeof list === 'string' ? JSON.parse(list) : list;

      if (!parsed.find(a => a.slug === slug)) {
        parsed.push({ slug, name: OWNER_NAME, addedAt: new Date().toISOString() });
        await redis.set(ck, JSON.stringify(parsed));
        results[`${community}:${slug}`] = 'agregado';
      } else {
        results[`${community}:${slug}`] = 'ya existía';
      }
    }

    // Índice inverso user → communities
    const uk = `admins:user:${slug}`;
    const userComms = (await redis.get(uk)) || [];
    const parsedComms = typeof userComms === 'string' ? JSON.parse(userComms) : userComms;
    let changed = false;
    for (const c of COMMUNITIES) {
      if (!parsedComms.includes(c)) {
        parsedComms.push(c);
        changed = true;
      }
    }
    if (changed) {
      await redis.set(uk, JSON.stringify(parsedComms));
      results[`user:${slug}`] = `communities: ${parsedComms.join(', ')}`;
    } else {
      results[`user:${slug}`] = 'ya tenía todas las communities';
    }
  }

  return res.status(200).json({ ok: true, owners: ADMIN_SLUGS, results });
}
