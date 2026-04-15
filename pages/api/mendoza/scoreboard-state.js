// GET   /api/mendoza/scoreboard-state  → estado actual del scoreboard (público, para overlay OBS)
// POST  /api/mendoza/scoreboard-state  → actualizar estado completo (requiere auth, desde panel)
// PATCH /api/mendoza/scoreboard-state  → actualizar parcialmente (requiere auth, desde panel)

import redis from '../../../lib/redis';

const STATE_KEY = 'mendoza:scoreboard:state';
const TTL = 60 * 60 * 6; // 6 horas

const DEFAULT_STATE = {
  player1: { tag: '', name: 'Jugador 1', score: 0, character: 'mario', skin: 1 },
  player2: { tag: '', name: 'Jugador 2', score: 0, character: 'mario', skin: 1 },
  round: '',
  format: '',
};

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 200);
}

function parsePlayerName(fullName) {
  const raw = sanitize(fullName);
  const sep = raw.indexOf(' | ');
  if (sep !== -1) return { tag: raw.slice(0, sep), name: raw.slice(sep + 3) };
  return { tag: '', name: raw };
}

function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  return auth === (process.env.ADMIN_SECRET || 'afk-admin-2025');
}

function sanitizePlayer(p) {
  return {
    tag:       sanitize(p?.tag       ?? ''),
    name:      sanitize(p?.name      ?? ''),
    score:     Math.max(0, Math.min(99, parseInt(p?.score ?? 0) || 0)),
    character: sanitize(p?.character ?? 'mario'),
    skin:      Math.max(1, Math.min(8,  parseInt(p?.skin  ?? 1) || 1)),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: estado actual (público, para el overlay OBS) ────────────────────
  if (req.method === 'GET') {
    const state = await redis.get(STATE_KEY);
    return res.status(200).json(state || DEFAULT_STATE);
  }

  // ── POST: actualizar estado completo (desde panel o auto-populate) ────────
  if (req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

    const body = req.body || {};
    const isAutoPopulate = !!body.autoPopulate;

    // Recuperar estado previo para preservar chars/skins al auto-populate
    const existing = (await redis.get(STATE_KEY)) || DEFAULT_STATE;

    let p1, p2;
    if (isAutoPopulate) {
      // Viene de callMatch: body.player1 y player2 son strings "TAG | Nombre"
      const parsed1 = parsePlayerName(body.player1 || 'Jugador 1');
      const parsed2 = parsePlayerName(body.player2 || 'Jugador 2');
      p1 = { ...existing.player1, ...parsed1, score: 0 };
      p2 = { ...existing.player2, ...parsed2, score: 0 };
    } else {
      // Viene del panel de control: body.player1/2 son objetos completos
      p1 = sanitizePlayer(body.player1);
      p2 = sanitizePlayer(body.player2);
    }

    const state = {
      player1: p1,
      player2: p2,
      round:   sanitize(body.round  ?? existing.round  ?? ''),
      format:  sanitize(body.format ?? existing.format ?? ''),
      updatedAt: new Date().toISOString(),
    };

    await redis.set(STATE_KEY, state, { ex: TTL });
    return res.status(200).json({ success: true, state });
  }

  // ── PATCH: actualizar parcialmente ────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

    const updates = req.body || {};
    const existing = (await redis.get(STATE_KEY)) || { ...DEFAULT_STATE };

    if (updates.player1) existing.player1 = sanitizePlayer({ ...existing.player1, ...updates.player1 });
    if (updates.player2) existing.player2 = sanitizePlayer({ ...existing.player2, ...updates.player2 });
    if (updates.round   !== undefined) existing.round  = sanitize(updates.round);
    if (updates.format  !== undefined) existing.format = sanitize(updates.format);
    existing.updatedAt = new Date().toISOString();

    await redis.set(STATE_KEY, existing, { ex: TTL });
    return res.status(200).json({ success: true, state: existing });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
