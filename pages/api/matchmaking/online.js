// Endpoint para contar jugadores buscando partida en este momento
// Incluye:
//   • Jugadores reales en cola (ranked/casual × switch/parsec)
//   • Ghost players (jugadores fantasma configurados por admin — solo cosmético, no matchean)
//   • Jugadores en partida activa (cuantificados vía sorted set mm:active-rooms)

import redis, { mmQueueKey, mmQueueDoublesKey, casualQueueKey } from '../../../lib/redis';

const QUEUE_TTL_MS   = 10 * 60 * 1000;
const ROOM_TTL_MS    = 30 * 60 * 1000; // mismo TTL que rooms en room.js
const GHOST_KEY      = 'mm:ghost:config';
const ACTIVE_ROOMS_KEY = 'mm:active-rooms';
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

  // Cargar colas + ghost config + rooms activas en paralelo
  const [results, ghostCfg, activeRoomsRaw] = await Promise.all([
    redis.mget(...keys),
    redis.get(GHOST_KEY),
    // Limpiar rooms expiradas (>30min) del sorted set y devolver el count restante
    redis.zremrangebyscore(ACTIVE_ROOMS_KEY, 0, now - ROOM_TTL_MS)
      .then(() => redis.zcard(ACTIVE_ROOMS_KEY))
      .catch(() => 0),
  ]);

  const [r1sw, r1pc, r2sw, r2pc, c1sw, c1pc, c2sw, c2pc] = results.map(q =>
    (q || []).filter(e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS).length
  );

  // Ghost players por categoría (default: 0)
  const g = ghostCfg || {};
  const gr1sw = (g.ranked1v1?.switch || 0);
  const gr1pc = (g.ranked1v1?.parsec || 0);
  const gr2sw = (g.ranked2v2?.switch || 0);
  const gr2pc = (g.ranked2v2?.parsec || 0);
  const gc1sw = (g.casual1v1?.switch || 0);
  const gc1pc = (g.casual1v1?.parsec || 0);
  const gc2sw = (g.casual2v2?.switch || 0);
  const gc2pc = (g.casual2v2?.parsec || 0);

  // Jugadores en partida activa: cada room tiene 2 jugadores (1v1)
  // Los distribuimos como bonus al ranked1v1 (la cola principal)
  const inMatchPlayers = typeof activeRoomsRaw === 'number' ? activeRoomsRaw * 2 : 0;
  // Dividir entre switch y parsec a partes iguales como fallback razonable
  const inMatchSw = Math.floor(inMatchPlayers / 2);
  const inMatchPc = inMatchPlayers - inMatchSw;

  const ranked1v1 = {
    switch: r1sw + gr1sw + inMatchSw,
    parsec: r1pc + gr1pc + inMatchPc,
    total:  r1sw + gr1sw + r1pc + gr1pc + inMatchPlayers,
  };
  const ranked2v2 = {
    switch: r2sw + gr2sw,
    parsec: r2pc + gr2pc,
    total:  r2sw + gr2sw + r2pc + gr2pc,
  };
  const casual1v1 = {
    switch: c1sw + gc1sw,
    parsec: c1pc + gc1pc,
    total:  c1sw + gc1sw + c1pc + gc1pc,
  };
  const casual2v2 = {
    switch: c2sw + gc2sw,
    parsec: c2pc + gc2pc,
    total:  c2sw + gc2sw + c2pc + gc2pc,
  };
  const total = ranked1v1.total + ranked2v2.total + casual1v1.total + casual2v2.total;

  // Mantener compatibilidad con campos anteriores
  return res.status(200).json({
    total,
    switch: ranked1v1.switch + ranked2v2.switch + casual1v1.switch + casual2v2.switch,
    parsec: ranked1v1.parsec + ranked2v2.parsec + casual1v1.parsec + casual2v2.parsec,
    ranked1v1, ranked2v2, casual1v1, casual2v2,
    inMatch: inMatchPlayers,
    // players array liviano (solo ranked 1v1 reales para no romper clientes anteriores)
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
