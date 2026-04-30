// GET  /api/santa-fe/overlay2-state  → estado actual del scoreboard (público, para overlay OBS)
// POST /api/santa-fe/overlay2-state  → actualizar estado completo (desde control.html)

import redis from '../../../lib/redis';

const STATE_KEY = 'santa-fe:overlay2:state';
const TTL = 60 * 60 * 6; // 6 horas

function s(v) {
  return String(v ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 300);
}

function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  return auth === (process.env.ADMIN_SECRET || 'afk-admin-2025');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const state = await redis.get(STATE_KEY);
    return res.status(200).json(state || {});
  }

  if (req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

    const b = req.body || {};
    const state = {
      'event-name':    s(b['event-name']),
      'event-round':   s(b['event-round']),
      'event-bracket': s(b['event-bracket']),
      'p1-sponsor':       s(b['p1-sponsor']),
      'p1-tag':           s(b['p1-tag']),
      'p1-sponsor-color': s(b['p1-sponsor-color']),
      'p1-name':          s(b['p1-name']),
      'p1-country':       s(b['p1-country']),
      'p1-flag':          s(b['p1-flag']),
      'p1-twitter':       s(b['p1-twitter']),
      'p1-seed':          s(b['p1-seed']),
      'p1-score':         Math.max(0, Math.min(99, parseInt(b['p1-score'] ?? 0) || 0)),
      'p1-char':          s(b['p1-char']),
      'p2-sponsor':       s(b['p2-sponsor']),
      'p2-tag':           s(b['p2-tag']),
      'p2-sponsor-color': s(b['p2-sponsor-color']),
      'p2-name':          s(b['p2-name']),
      'p2-country':       s(b['p2-country']),
      'p2-flag':          s(b['p2-flag']),
      'p2-twitter':       s(b['p2-twitter']),
      'p2-seed':          s(b['p2-seed']),
      'p2-score':         Math.max(0, Math.min(99, parseInt(b['p2-score'] ?? 0) || 0)),
      'p2-char':          s(b['p2-char']),
      updatedAt: new Date().toISOString(),
    };

    await redis.set(STATE_KEY, state, { ex: TTL });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
