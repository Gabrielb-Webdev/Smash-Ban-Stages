// Endpoint para contar jugadores buscando partida en este momento

import redis, { mmQueueKey } from '../../../lib/redis';

const QUEUE_TTL_MS = 10 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const now = Date.now();
  let total = 0;
  const counts = {};
  const players = [];

  for (const plat of ['switch', 'parsec']) {
    const queue = (await redis.get(mmQueueKey(plat))) || [];
    const active = queue.filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS);
    counts[plat] = active.length;
    total += active.length;
    for (const e of active) {
      players.push({ userId: e.userId, userName: e.userName, platform: plat });
    }
  }

  return res.status(200).json({ total, ...counts, players });
}
