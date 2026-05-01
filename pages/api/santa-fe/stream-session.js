/**
 * GET /api/santa-fe/stream-session
 *
 * Proxy hacia el servidor WebSocket para obtener el estado actual
 * de la sesión "santafe-stream", fusionado con la metadata de jugadores
 * (seed, país, bandera, prefix) guardada en Redis por el admin panel.
 *
 * Exclusivo para Santa Fe — no afecta ninguna otra comunidad.
 */

import redis from '../../../lib/redis';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
const META_KEY = 'santafe:stream-player-meta';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Fetch session y metadata en paralelo
  const [sessionResult, metaResult] = await Promise.allSettled([
    fetch(`${SOCKET_URL}/session/santafe-stream`, {
      headers: { 'Cache-Control': 'no-store' },
      signal: AbortSignal.timeout(4000),
    }).then(r => r.ok ? r.json() : null),
    redis.get(META_KEY).then(raw => raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}),
  ]);

  const sessionData = sessionResult.status === 'fulfilled' ? sessionResult.value : null;
  const metaData    = metaResult.status === 'fulfilled'    ? metaResult.value    : {};

  if (!sessionData) {
    res.status(200).json({ ok: false, reason: 'upstream_unavailable', ...metaData });
    return;
  }

  // La metadata de Redis complementa los datos del socket server sin pisarlos
  res.status(200).json({ ...metaData, ...sessionData });
}
