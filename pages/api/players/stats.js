// GET /api/players/stats?userId=X
// Devuelve stats de ranked (W/L/puntos/rango) para Switch y Parsec por separado.
// Estos puntos son INDEPENDIENTES de los puntos de torneo (AFK / INC).

import redis, { rankedStatsKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  const cleanId = sanitize(userId);

  const [switchStats, parsecStats] = await Promise.all([
    redis.get(rankedStatsKey(cleanId, 'switch')),
    redis.get(rankedStatsKey(cleanId, 'parsec')),
  ]);

  const empty = { wins: 0, losses: 0, rankedPoints: 0, rank: 'Plástico 1' };

  return res.status(200).json({
    switch: switchStats || empty,
    parsec: parsecStats || empty,
  });
}
