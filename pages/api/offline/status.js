import redis, {
  offlineSessionKey, offlineQueueKey, offlineMatchesKey, offlineResultKey,
} from '../../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId requerido' });
  const cleanUserId = String(userId).replace(/[<>"'`\\]/g, '').trim().slice(0, 100);

  const session = await redis.get(offlineSessionKey());
  if (!session || !session.active) {
    return res.status(200).json({ status: 'no_session' });
  }

  // Resultado pendiente de mostrar (TTL 10 min)
  const finished = await redis.get(offlineResultKey(cleanUserId));
  if (finished) {
    return res.status(200).json({ status: 'finished', result: finished });
  }

  // Match activo asignado
  const matches = (await redis.get(offlineMatchesKey())) || [];
  const myMatch = matches.find(m =>
    m.status === 'active' &&
    (m.player1.userId === cleanUserId || m.player2.userId === cleanUserId)
  );
  if (myMatch) {
    const isP1 = myMatch.player1.userId === cleanUserId;
    const opponent = isP1 ? myMatch.player2 : myMatch.player1;
    const screen = session.screens.find(s => s.id === myMatch.screenId);
    return res.status(200).json({
      status: 'assigned',
      matchId: myMatch.matchId,
      screenId: myMatch.screenId,
      screenLabel: screen?.label || `Tele ${myMatch.screenId}`,
      opponent: { userId: opponent.userId, userName: opponent.userName, charId: opponent.charId },
    });
  }

  // Posición en cola
  const queue = (await redis.get(offlineQueueKey())) || [];
  const pos = queue.findIndex(p => p.userId === cleanUserId);
  if (pos !== -1) {
    return res.status(200).json({ status: 'waiting', position: pos + 1, total: queue.length });
  }

  return res.status(200).json({ status: 'idle' });
}
