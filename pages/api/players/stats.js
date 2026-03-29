// GET /api/players/stats?userId=X
// Devuelve stats de ranked (W/L/puntos/rango) para Switch y Parsec por separado.
// Estos puntos son INDEPENDIENTES de los puntos de torneo (AFK / INC).

import redis, { rankedStatsKey, rankedDoubleStatsKey } from '../../../lib/redis';

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

  const { userId, mode } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  const cleanId = sanitize(userId);
  const empty = { wins: 0, losses: 0, rankPoints: 0, rank: 'Plástico I', rankIndex: 0, placementDone: false };

  try {
    if (mode === 'doubles') {
      const switchStats = await redis.get(rankedDoubleStatsKey(cleanId, 'switch'));
      const parsecStats = await redis.get(rankedDoubleStatsKey(cleanId, 'parsec'));
      return res.status(200).json({
        switch: switchStats || empty,
        parsec: parsecStats || empty,
      });
    }

    const switchStats = await redis.get(rankedStatsKey(cleanId, 'switch'));
    const parsecStats = await redis.get(rankedStatsKey(cleanId, 'parsec'));

    return res.status(200).json({
      switch: switchStats || empty,
      parsec: parsecStats || empty,
    });
  } catch (err) {
    console.error('[stats] Error:', err);
    return res.status(500).json({ error: err?.message || 'Error interno', type: err?.name });
  }
}
