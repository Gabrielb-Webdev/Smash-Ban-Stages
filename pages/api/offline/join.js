import redis, {
  offlineSessionKey, offlineQueueKey, offlineMatchesKey,
  rankedStatsKey,
} from '../../../lib/redis';
import { MMR_DEFAULT } from '../../../lib/ranks';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST: jugador se une con código
  if (req.method === 'POST') {
    const { userId, userName, charId, charAlt, code } = req.body || {};
    if (!userId || !userName || !charId || !code) {
      return res.status(400).json({ error: 'userId, userName, charId y code son requeridos' });
    }
    const cleanUserId   = sanitize(userId);
    const cleanUserName = sanitize(userName);
    const cleanCharId   = sanitize(charId);
    const cleanCode     = sanitize(code).toUpperCase();

    const session = await redis.get(offlineSessionKey());
    if (!session || !session.active) {
      return res.status(404).json({ error: 'No hay sesión activa' });
    }
    if (session.code !== cleanCode) {
      return res.status(403).json({ error: 'Código inválido' });
    }

    // Ya está en cola
    const queue = (await redis.get(offlineQueueKey())) || [];
    if (queue.some(p => p.userId === cleanUserId)) {
      return res.status(200).json({
        ok: true,
        alreadyJoined: true,
        position: queue.findIndex(p => p.userId === cleanUserId) + 1,
      });
    }

    // Ya está en un match activo
    const matches = (await redis.get(offlineMatchesKey())) || [];
    const inMatch = matches.find(m =>
      m.status === 'active' &&
      (m.player1.userId === cleanUserId || m.player2.userId === cleanUserId)
    );
    if (inMatch) {
      return res.status(200).json({ ok: true, alreadyPlaying: true, matchId: inMatch.matchId });
    }

    // Obtener MMR para emparejamiento
    const stats = (await redis.get(rankedStatsKey(cleanUserId, 'switch'))) || {};
    const mmr = stats.mmr || MMR_DEFAULT;

    queue.push({
      userId: cleanUserId,
      userName: cleanUserName,
      charId: cleanCharId,
      charAlt: parseInt(charAlt) || 0,
      mmr,
      joinedAt: Date.now(),
    });
    await redis.set(offlineQueueKey(), queue, { ex: 24 * 60 * 60 });
    return res.status(200).json({ ok: true, position: queue.length });
  }

  // DELETE: jugador abandona la cola
  if (req.method === 'DELETE') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const cleanUserId = sanitize(userId);
    const queue = (await redis.get(offlineQueueKey())) || [];
    const filtered = queue.filter(p => p.userId !== cleanUserId);
    await redis.set(offlineQueueKey(), filtered, { ex: 24 * 60 * 60 });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
