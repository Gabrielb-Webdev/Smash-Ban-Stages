// API para perfiles de jugadores — Upstash Redis

import redis, { playerKey, playersIndexKey, rankedStatsKey, rankedDoubleStatsKey, matchHistoryKey } from '../../../lib/redis';

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

    // Registrar en índice de jugadores (para búsqueda de amigos)
    const idx = (await redis.get(playersIndexKey)) || [];
    if (!idx.find(p => p.id === cleanId)) {
      idx.push({ id: cleanId, name: name ? sanitize(name).slice(0, 80) : '' });
      await redis.set(playersIndexKey, idx.length > 5000 ? idx.slice(-5000) : idx);
    } else {
      // Actualizar nombre si cambió
      const entry = idx.find(p => p.id === cleanId);
      const newName = name ? sanitize(name).slice(0, 80) : entry.name;
      if (entry.name !== newName) {
        entry.name = newName;
        await redis.set(playersIndexKey, idx);
      }
    }

    return res.status(200).json({ success: true });
  }

  // ── GET: obtener perfil ───────────────────────────────
  if (req.method === 'GET') {
    const { id, full } = req.query;
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const cleanId = sanitize(String(id)).slice(0, 80);
    const profile = await redis.get(playerKey(cleanId));

    if (full === 'true') {
      const empty = { wins: 0, losses: 0, rankedPoints: 0, rank: 'Plástico 1' };
      const [sw1v1, pc1v1, sw2v2, pc2v2, history] = await Promise.all([
        redis.get(rankedStatsKey(cleanId, 'switch')),
        redis.get(rankedStatsKey(cleanId, 'parsec')),
        redis.get(rankedDoubleStatsKey(cleanId, 'switch')),
        redis.get(rankedDoubleStatsKey(cleanId, 'parsec')),
        redis.lrange(matchHistoryKey(cleanId), 0, 19),
      ]);
      return res.status(200).json({
        profile: profile || null,
        stats: { switch: sw1v1 || empty, parsec: pc1v1 || empty },
        doublesStats: { switch: sw2v2 || empty, parsec: pc2v2 || empty },
        history: Array.isArray(history) ? history : [],
      });
    }

    return res.status(200).json(profile || null);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
