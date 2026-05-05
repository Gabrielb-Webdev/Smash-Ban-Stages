import redis, { offlineMatchesKey } from '../../../lib/redis';
import { declinePendingMatch, tryAutoAssign } from '../../../lib/offlineAutoAssign';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, matchId, accept } = req.body || {};
  if (!userId || !matchId) return res.status(400).json({ error: 'userId y matchId son requeridos' });

  const cleanUserId  = sanitize(userId);
  const cleanMatchId = sanitize(matchId);

  const allMatches = (await redis.get(offlineMatchesKey())) || [];
  const idx = allMatches.findIndex(m => m.matchId === cleanMatchId && m.status === 'pending_accept');
  if (idx === -1) return res.status(404).json({ error: 'Match no encontrado o ya procesado' });

  const match  = allMatches[idx];
  const isP1   = match.player1.userId === cleanUserId;
  const isP2   = match.player2.userId === cleanUserId;
  if (!isP1 && !isP2) return res.status(403).json({ error: 'No sos parte de este match' });

  // Timeout check — treat as decline
  if (match.expiresAt < Date.now()) {
    await declinePendingMatch(cleanMatchId);
    return res.status(200).json({ ok: true, timedOut: true });
  }

  // DECLINE
  if (!accept) {
    await declinePendingMatch(cleanMatchId);
    return res.status(200).json({ ok: true, declined: true });
  }

  // ACCEPT — add to acceptedBy
  if (!match.acceptedBy.includes(cleanUserId)) {
    match.acceptedBy = [...match.acceptedBy, cleanUserId];
  }

  const bothAccepted =
    match.acceptedBy.includes(match.player1.userId) &&
    match.acceptedBy.includes(match.player2.userId);

  if (bothAccepted) {
    allMatches[idx] = { ...match, status: 'active' };
  } else {
    allMatches[idx] = match;
  }

  await redis.set(offlineMatchesKey(), allMatches, { ex: 24 * 60 * 60 });

  // If both accepted, try to auto-assign remaining queue players
  if (bothAccepted) await tryAutoAssign();

  return res.status(200).json({ ok: true, accepted: true, active: bothAccepted });
}
