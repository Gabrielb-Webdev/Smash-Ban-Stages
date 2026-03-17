// API para perfiles de jugadores — Upstash Redis

import redis, { playerKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 200);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── POST: guardar/actualizar perfil ──────────────────
  if (req.method === 'POST') {
    const { id, name, slug, avatar } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const cleanId = sanitize(String(id)).slice(0, 80);
    const existing = (await redis.get(playerKey(cleanId))) || {};

    await redis.set(playerKey(cleanId), {
      ...existing,
      id:       cleanId,
      name:     name    ? sanitize(name).slice(0, 80)   : existing.name,
      slug:     slug    ? sanitize(slug).slice(0, 80)   : existing.slug,
      avatar:   avatar  ? String(avatar).slice(0, 500)  : existing.avatar,
      lastSeen: new Date().toISOString(),
      firstSeen: existing.firstSeen || new Date().toISOString(),
    });

    return res.status(200).json({ success: true });
  }

  // ── GET: obtener perfil ───────────────────────────────
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const profile = await redis.get(playerKey(sanitize(String(id)).slice(0, 80)));
    return res.status(200).json(profile || null);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
