/**
 * GET  /api/santa-fe/player-meta  → devuelve la metadata de jugadores del último match de stream
 * POST /api/santa-fe/player-meta  → almacena metadata desde el admin panel
 *
 * Almacena en Redis (Upstash) para que persista entre serverless invocations.
 * TTL de 24h — suficiente para cualquier torneo de un día.
 */

import redis from '../../../lib/redis';

const REDIS_KEY = 'santafe:stream-player-meta';
const TTL = 86400; // 24 horas

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const raw = await redis.get(REDIS_KEY);
      res.status(200).json(raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {});
    } catch {
      res.status(200).json({});
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      await redis.set(REDIS_KEY, JSON.stringify(body), { ex: TTL });
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(200).json({ ok: false, reason: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
