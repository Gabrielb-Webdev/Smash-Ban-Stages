// GET  /api/inc/stream-state          → estado actual del match en stream (público, para OBS/controls)
// POST /api/inc/stream-state          → actualizar estado (requiere auth, desde panel)
// PATCH /api/inc/stream-state         → actualizar solo scores (requiere auth)

import redis from '../../../lib/redis';

const STATE_KEY = 'inc:stream:state';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 200);
}

function parsePlayerName(fullName) {
  const raw = sanitize(fullName);
  const sep = raw.indexOf(' | ');
  if (sep !== -1) {
    return { sponsor: raw.slice(0, sep), tag: raw.slice(sep + 3) };
  }
  return { sponsor: '', tag: raw };
}

function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  return auth === (process.env.ADMIN_SECRET || 'afk-admin-2025');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: estado actual (público para OBS / controls.html)
  if (req.method === 'GET') {
    const state = (await redis.get(STATE_KEY)) || null;
    return res.status(200).json(state || { empty: true });
  }

  // POST: nuevo match iniciado (desde callMatch en _panel.js)
  if (req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });
    const { player1, player2, format, round, sessionId } = req.body || {};
    const p1 = parsePlayerName(player1 || 'Jugador 1');
    const p2 = parsePlayerName(player2 || 'Jugador 2');
    const state = {
      player1: { name: sanitize(player1 || 'Jugador 1'), ...p1 },
      player2: { name: sanitize(player2 || 'Jugador 2'), ...p2 },
      format: sanitize(format || 'BO3'),
      round: sanitize(round || ''),
      score1: 0,
      score2: 0,
      sessionId: sanitize(sessionId || ''),
      updatedAt: new Date().toISOString(),
    };
    await redis.set(STATE_KEY, state, { ex: 60 * 60 * 4 }); // 4 horas
    return res.status(200).json({ success: true, state });
  }

  // PATCH: actualizar scores
  if (req.method === 'PATCH') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });
    const existing = (await redis.get(STATE_KEY)) || {};
    const { score1, score2 } = req.body || {};
    const updated = {
      ...existing,
      score1: score1 != null ? Number(score1) : (existing.score1 ?? 0),
      score2: score2 != null ? Number(score2) : (existing.score2 ?? 0),
      updatedAt: new Date().toISOString(),
    };
    await redis.set(STATE_KEY, updated, { ex: 60 * 60 * 4 });
    return res.status(200).json({ success: true, state: updated });
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).end();
}
