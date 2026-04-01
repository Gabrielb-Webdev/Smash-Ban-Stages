// GET  /api/afk/score-state  → estado actual del scoreboard (público, para OBS / overlays)
// POST /api/afk/score-state  → actualizar estado (desde control.html)

import redis from '../../../lib/redis';

const STATE_KEY = 'afk:score:state';
const TTL = 7 * 24 * 60 * 60; // 7 días

const ALLOWED_FIELDS = [
  'p1tag','p2tag','p1score','p2score',
  'p1char','p2char','p1charIcon','p2charIcon',
  'round','stage','format','needed',
  'p1seed','p2seed',
];

function sanitize(v) {
  if (typeof v === 'number') return v;
  return String(v ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 300);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const raw = await redis.get(STATE_KEY);
      if (raw) {
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return res.status(200).json(data);
      }
    } catch {}
    return res.status(200).json({});
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (typeof body !== 'object' || body === null) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    const state = {};
    for (const f of ALLOWED_FIELDS) {
      if (body[f] !== undefined) state[f] = sanitize(body[f]);
    }
    try {
      await redis.setex(STATE_KEY, TTL, JSON.stringify(state));
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Error guardando estado' });
    }
  }

  if (req.method === 'PATCH') {
    const body = req.body;
    if (typeof body !== 'object' || body === null) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    try {
      const raw = await redis.get(STATE_KEY);
      const existing = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
      for (const f of ALLOWED_FIELDS) {
        if (body[f] !== undefined) existing[f] = sanitize(body[f]);
      }
      await redis.setex(STATE_KEY, TTL, JSON.stringify(existing));
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Error actualizando estado' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
