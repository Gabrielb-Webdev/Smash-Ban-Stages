// API para obtener el historial de partidas ranked de un jugador

import redis, { matchHistoryKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, limit = '20' } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  const cleanId = sanitize(userId);
  const n = Math.min(50, Math.max(1, parseInt(limit) || 20));

  const history = await redis.lrange(matchHistoryKey(cleanId), 0, n - 1);
  return res.status(200).json(Array.isArray(history) ? history : []);
}
