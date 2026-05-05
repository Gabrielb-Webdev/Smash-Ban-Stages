import redis, {
  offlineSessionKey, offlineQueueKey, offlineMatchesKey, offlineResultKey,
} from '../../../lib/redis';
import { declinePendingMatch } from '../../../lib/offlineAutoAssign';

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

  const matches = (await redis.get(offlineMatchesKey())) || [];

  // Match pendiente de aceptar
  const pendingMatch = matches.find(m =>
    m.status === 'pending_accept' &&
    (m.player1.userId === cleanUserId || m.player2.userId === cleanUserId)
  );
  if (pendingMatch) {
    // Timeout expirado → auto-declinar
    if (pendingMatch.expiresAt < Date.now()) {
      await declinePendingMatch(pendingMatch.matchId);
      // Devolver waiting para que el cliente haga re-poll
      const queue = (await redis.get(offlineQueueKey())) || [];
      const pos   = queue.findIndex(p => p.userId === cleanUserId);
      return res.status(200).json(
        pos !== -1
          ? { status: 'waiting', position: pos + 1, total: queue.length }
          : { status: 'idle' }
      );
    }
    const isP1     = pendingMatch.player1.userId === cleanUserId;
    const opponent = isP1 ? pendingMatch.player2 : pendingMatch.player1;
    return res.status(200).json({
      status:    'pending_accept',
      matchId:   pendingMatch.matchId,
      stage:     pendingMatch.stage,
      expiresAt: pendingMatch.expiresAt,
      iAccepted: pendingMatch.acceptedBy.includes(cleanUserId),
      opponent:  { userId: opponent.userId, userName: opponent.userName, charId: opponent.charId },
    });
  }

  // Match activo asignado
  const myMatch = matches.find(m =>
    m.status === 'active' &&
    (m.player1.userId === cleanUserId || m.player2.userId === cleanUserId)
  );
  if (myMatch) {
    const isP1     = myMatch.player1.userId === cleanUserId;
    const opponent = isP1 ? myMatch.player2 : myMatch.player1;
    const screen   = session.screens.find(s => s.id === myMatch.screenId);
    return res.status(200).json({
      status:      'assigned',
      matchId:     myMatch.matchId,
      screenId:    myMatch.screenId,
      screenLabel: screen?.label || `Tele ${myMatch.screenId}`,
      stage:       myMatch.stage,
      opponent:    { userId: opponent.userId, userName: opponent.userName, charId: opponent.charId },
    });
  }

  // Posición en cola
  const queue = (await redis.get(offlineQueueKey())) || [];
  const pos   = queue.findIndex(p => p.userId === cleanUserId);
  if (pos !== -1) {
    return res.status(200).json({ status: 'waiting', position: pos + 1, total: queue.length });
  }

  return res.status(200).json({ status: 'idle' });
}
