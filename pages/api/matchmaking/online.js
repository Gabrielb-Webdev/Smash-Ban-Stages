// Endpoint para contar jugadores buscando partida en este momento

import redis, { mmQueueKey, mmQueueDoublesKey, casualQueueKey } from '../../../lib/redis';

const QUEUE_TTL_MS = 10 * 60 * 1000;
const casualQueue2v2Key = (platform) => `mm:casual:queue:2v2:${platform}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache 10s
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=5');
  if (req.method !== 'GET') return res.status(405).end();

  const now = Date.now();

  const keys = [
    mmQueueKey('switch'),           // ranked 1v1 switch
    mmQueueKey('parsec'),           // ranked 1v1 parsec
    mmQueueDoublesKey('switch'),    // ranked 2v2 switch
    mmQueueDoublesKey('parsec'),    // ranked 2v2 parsec
    casualQueueKey('switch'),       // casual switch
    casualQueueKey('parsec'),       // casual parsec
    casualQueue2v2Key('switch'),    // casual 2v2 switch
    casualQueue2v2Key('parsec'),    // casual 2v2 parsec
  ];

  const results = await redis.mget(...keys);
  const [r1sw, r1pc, r2sw, r2pc, c1sw, c1pc, c2sw, c2pc] = results.map(q =>
    (q || []).filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS).length
  );

  const ranked1v1 = { switch: r1sw, parsec: r1pc, total: r1sw + r1pc };
  const ranked2v2 = { switch: r2sw, parsec: r2pc, total: r2sw + r2pc };
  const casual1v1 = { switch: c1sw, parsec: c1pc, total: c1sw + c1pc };
  const casual2v2 = { switch: c2sw, parsec: c2pc, total: c2sw + c2pc };
  const total = ranked1v1.total + ranked2v2.total + casual1v1.total + casual2v2.total;

  // Mantener compatibilidad con campos anteriores
  return res.status(200).json({
    total,
    switch: r1sw + r2sw + c1sw + c2sw,
    parsec: r1pc + r2pc + c1pc + c2pc,
    ranked1v1, ranked2v2, casual1v1, casual2v2,
    // players array liviano (solo ranked 1v1 para no romper clientes anteriores)
    players: (results[0] || [])
      .filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS)
      .map(e => ({ userId: e.userId, userName: e.userName, platform: 'switch' }))
      .concat(
        (results[1] || [])
          .filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS)
          .map(e => ({ userId: e.userId, userName: e.userName, platform: 'parsec' }))
      ),
  });
}
