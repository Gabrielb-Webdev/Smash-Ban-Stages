// API: Manage manually saved tournament slugs per community panel
// GET  ?community=X        → returns array of saved slugs (strings)
// POST { community, slug } → adds slug to list (max 30)
// DELETE { community, slug } → removes slug from list

import redis from '../../../lib/redis';

const MAX_SLUGS = 30;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

function redisKey(community) {
  return `admin:saved-slugs:${community}`;
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { community } = req.query;
    if (!community) return res.status(400).json({ error: 'community required' });
    const key = redisKey(community);
    const raw = await redis.get(key);
    const slugs = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
    return res.json({ slugs });
  }

  if (req.method === 'POST') {
    const { community, slug } = req.body || {};
    if (!community || !slug) return res.status(400).json({ error: 'community and slug required' });
    const key = redisKey(community);
    const raw = await redis.get(key);
    const current = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
    if (!current.includes(slug)) {
      current.unshift(slug);
      if (current.length > MAX_SLUGS) current.length = MAX_SLUGS;
      await redis.set(key, JSON.stringify(current));
    }
    return res.json({ slugs: current });
  }

  if (req.method === 'DELETE') {
    const { community, slug } = req.body || {};
    if (!community || !slug) return res.status(400).json({ error: 'community and slug required' });
    const key = redisKey(community);
    const raw = await redis.get(key);
    const current = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
    const updated = current.filter(s => s !== slug);
    await redis.set(key, JSON.stringify(updated));
    return res.json({ slugs: updated });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
