import redis, {
  offlineSessionKey, offlineQueueKey, offlineMatchesKey,
} from '../../../lib/redis';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (auth !== ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });

  const session = await redis.get(offlineSessionKey());
  if (!session || !session.active) return res.status(404).json({ error: 'No hay sesión activa' });

  const matches = (await redis.get(offlineMatchesKey())) || [];
  const queue   = (await redis.get(offlineQueueKey())) || [];

  // Pantallas libres: available=true y sin match activo asignado
  const busyScreenIds = new Set(matches.filter(m => m.status === 'active').map(m => m.screenId));
  const freeScreens   = session.screens.filter(s => s.available && !busyScreenIds.has(s.id));

  if (freeScreens.length === 0) {
    return res.status(200).json({ ok: true, assigned: [], message: 'No hay pantallas disponibles' });
  }
  if (queue.length < 2) {
    return res.status(200).json({ ok: true, assigned: [], message: 'Se necesitan al menos 2 jugadores en cola' });
  }

  // Ordenar cola por MMR → emparejar adyacentes (diferencia mínima)
  const sortedQueue = [...queue].sort((a, b) => a.mmr - b.mmr);

  const newMatches      = [];
  const assignedUserIds = new Set();
  let screenIndex = 0;

  for (let i = 0; i + 1 < sortedQueue.length && screenIndex < freeScreens.length; i += 2) {
    const p1     = sortedQueue[i];
    const p2     = sortedQueue[i + 1];
    const screen = freeScreens[screenIndex++];
    const rand6  = Math.random().toString(36).slice(2, 8);
    const matchId = `offline-${Date.now()}-${rand6}`;

    newMatches.push({
      matchId,
      screenId: screen.id,
      player1: p1,
      player2: p2,
      status: 'active',
      startedAt: Date.now(),
    });
    assignedUserIds.add(p1.userId);
    assignedUserIds.add(p2.userId);
  }

  // Marcar pantallas como ocupadas
  for (const m of newMatches) {
    const screen = session.screens.find(s => s.id === m.screenId);
    if (screen) screen.busy = true;
  }
  await redis.set(offlineSessionKey(), session, { ex: 24 * 60 * 60 });

  // Guardar partidas
  await redis.set(offlineMatchesKey(), [...matches, ...newMatches], { ex: 24 * 60 * 60 });

  // Quitar asignados de la cola
  const remainingQueue = queue.filter(p => !assignedUserIds.has(p.userId));
  await redis.set(offlineQueueKey(), remainingQueue, { ex: 24 * 60 * 60 });

  return res.status(200).json({
    ok: true,
    assigned: newMatches,
    remainingQueue: remainingQueue.length,
  });
}
