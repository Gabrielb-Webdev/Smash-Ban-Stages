// Admin API para gestionar "ghost players" (jugadores fantasma)
// Sirven para inflar visualmente el contador de jugadores buscando partida,
// pero NUNCA entran en la cola real de matchmaking → no pueden matchear con nadie.
//
// GET  /api/admin/ghost-players          → devuelve config actual
// POST /api/admin/ghost-players          → actualiza config
// DELETE /api/admin/ghost-players        → resetea todo a 0

import redis from '../../../lib/redis';

const AUTH_TOKEN = process.env.ADMIN_SECRET || 'afk-admin-2025';
const GHOST_KEY  = 'mm:ghost:config';

function auth(req) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : header;
  return token === AUTH_TOKEN;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!auth(req)) return res.status(401).json({ error: 'No autorizado' });

  // ── GET: devolver config actual ──────────────────────────────
  if (req.method === 'GET') {
    const cfg = (await redis.get(GHOST_KEY)) || defaultConfig();
    return res.status(200).json({ ok: true, config: cfg });
  }

  // ── POST: actualizar config ──────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};
    const current = (await redis.get(GHOST_KEY)) || defaultConfig();

    // Permite actualizar campos individualmente
    const updated = {
      ranked1v1: {
        switch: clamp(body?.ranked1v1?.switch  ?? current.ranked1v1?.switch  ?? 0),
        parsec: clamp(body?.ranked1v1?.parsec  ?? current.ranked1v1?.parsec  ?? 0),
      },
      ranked2v2: {
        switch: clamp(body?.ranked2v2?.switch  ?? current.ranked2v2?.switch  ?? 0),
        parsec: clamp(body?.ranked2v2?.parsec  ?? current.ranked2v2?.parsec  ?? 0),
      },
      casual1v1: {
        switch: clamp(body?.casual1v1?.switch  ?? current.casual1v1?.switch  ?? 0),
        parsec: clamp(body?.casual1v1?.parsec  ?? current.casual1v1?.parsec  ?? 0),
      },
      casual2v2: {
        switch: clamp(body?.casual2v2?.switch  ?? current.casual2v2?.switch  ?? 0),
        parsec: clamp(body?.casual2v2?.parsec  ?? current.casual2v2?.parsec  ?? 0),
      },
    };

    await redis.set(GHOST_KEY, updated);
    return res.status(200).json({ ok: true, config: updated });
  }

  // ── DELETE: resetear a 0 ─────────────────────────────────────
  if (req.method === 'DELETE') {
    await redis.set(GHOST_KEY, defaultConfig());
    return res.status(200).json({ ok: true, config: defaultConfig() });
  }

  return res.status(405).end();
}

function clamp(n) {
  const v = parseInt(n, 10);
  return isNaN(v) ? 0 : Math.max(0, Math.min(v, 999));
}

function defaultConfig() {
  return {
    ranked1v1: { switch: 0, parsec: 0 },
    ranked2v2: { switch: 0, parsec: 0 },
    casual1v1: { switch: 0, parsec: 0 },
    casual2v2: { switch: 0, parsec: 0 },
  };
}
