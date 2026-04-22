// Admin API para gestionar "ghost players" (jugadores fantasma)
// Sirven para inflar visualmente el contador de jugadores buscando partida,
// pero NUNCA entran en la cola real de matchmaking → no pueden matchear con nadie.
//
// GET  /api/admin/ghost-players          → devuelve config + autoConfig
// POST /api/admin/ghost-players          → { ghost?: {...}, auto?: {...} }
// DELETE /api/admin/ghost-players        → resetea ghost a 0 (conserva autoConfig)

import redis from '../../../lib/redis';

const AUTH_TOKEN = process.env.ADMIN_SECRET || 'afk-admin-2025';
const GHOST_KEY  = 'mm:ghost:config';
const AUTO_KEY   = 'mm:ghost:auto';

const CATS = ['ranked1v1', 'ranked2v2', 'casual1v1', 'casual2v2'];

function defaultAutoConfig() {
  return Object.fromEntries(CATS.map(c => [c, {
    enabled: false, min: 4, max: 18, intervalSec: 60, nextFireAt: 0,
  }]));
}

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
    const [cfg, autoCfg] = await Promise.all([
      redis.get(GHOST_KEY),
      redis.get(AUTO_KEY),
    ]);
    return res.status(200).json({
      ok: true,
      config: cfg || defaultConfig(),
      autoConfig: autoCfg || defaultAutoConfig(),
    });
  }

  // ── POST: actualizar ghost config y/o auto config ────────────
  if (req.method === 'POST') {
    const body = req.body || {};

    // Si viene { auto: {...} } → actualizar solo automatización
    if (body.auto !== undefined) {
      const current = (await redis.get(AUTO_KEY)) || defaultAutoConfig();
      const updated = { ...defaultAutoConfig(), ...current };
      for (const cat of CATS) {
        if (!body.auto[cat]) continue;
        const a = body.auto[cat];
        updated[cat] = {
          enabled:     Boolean(a.enabled),
          min:         Math.max(0, Math.min(999, parseInt(a.min,     10) || 4)),
          max:         Math.max(0, Math.min(999, parseInt(a.max,     10) || 18)),
          intervalSec: Math.max(10, Math.min(3600, parseInt(a.intervalSec, 10) || 60)),
          // Resetear nextFireAt cuando se activa para que dispare de inmediato
          nextFireAt: a.enabled && !current[cat]?.enabled ? 0 : (current[cat]?.nextFireAt || 0),
        };
      }
      await redis.set(AUTO_KEY, updated);
      return res.status(200).json({ ok: true, autoConfig: updated });
    }

    // Caso normal → actualizar ghost counts
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

  // ── DELETE: resetear ghost a 0 (conserva autoConfig) ────────
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
