// API para reportar el resultado de un match de matchmaking — Upstash Redis

import redis, { mmMatchKey, rankedStatsKey, rankedBoardKey } from '../../../lib/redis';
import { applyWin, applyLoss, leaderboardScore, getRankIndex } from '../../../lib/ranks';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId, reportingUserId, claimedWinnerId } = req.body || {};

  if (!matchId || !reportingUserId || !claimedWinnerId) {
    return res.status(400).json({ error: 'matchId, reportingUserId y claimedWinnerId son requeridos' });
  }

  // Validar formato de matchId (solo patrón conocido)
  if (!/^mm-\d+-[a-z0-9]+$/.test(String(matchId))) {
    return res.status(400).json({ error: 'matchId inválido' });
  }

  const match = await redis.get(mmMatchKey(matchId));
  if (!match) return res.status(404).json({ error: 'Match no encontrado' });

  const cleanReporter = sanitize(reportingUserId);
  const cleanWinner   = sanitize(claimedWinnerId);

  // Verificar que el que reporta es jugador del match
  const isP1 = match.player1.userId === cleanReporter;
  const isP2 = match.player2.userId === cleanReporter;
  if (!isP1 && !isP2) {
    return res.status(403).json({ error: 'No sos parte de este match' });
  }

  // Verificar que el claimedWinner es uno de los dos jugadores
  const validWinners = [match.player1.userId, match.player2.userId];
  if (!validWinners.includes(cleanWinner)) {
    return res.status(400).json({ error: 'El ganador reportado no es jugador de este match' });
  }

  // Actualizar o agregar reporte
  const existingIdx = match.reports.findIndex(r => r.userId === cleanReporter);
  const report = { userId: cleanReporter, claimedWinnerId: cleanWinner, reportedAt: new Date().toISOString() };
  if (existingIdx !== -1) {
    match.reports[existingIdx] = report;
  } else {
    match.reports.push(report);
  }

  // Si ambos reportaron…
  if (match.reports.length === 2) {
    const [r1, r2] = match.reports;
    if (r1.claimedWinnerId === r2.claimedWinnerId) {
      match.status = 'finished';
      match.result = {
        winnerId: r1.claimedWinnerId,
        winnerName: match.player1.userId === r1.claimedWinnerId
          ? match.player1.userName
          : match.player2.userName,
        decidedAt: new Date().toISOString(),
      };
    } else {
      match.status = 'disputed';
    }
  } else {
    match.status = 'pending_result';
  }

  await redis.set(mmMatchKey(matchId), match);

  // Actualizar stats de ranked cuando el match termina
  if (match.status === 'finished') {
    const platform   = match.platform;
    const winnerId   = match.result.winnerId;
    const loserId    = match.player1.userId === winnerId ? match.player2.userId : match.player1.userId;
    const winnerName = match.result.winnerName;
    const loserName  = match.player1.userId === loserId ? match.player1.userName : match.player2.userName;

    // ── Ganador ──────────────────────────────────────
    const wKey   = rankedStatsKey(String(winnerId), platform);
    const wStats = (await redis.get(wKey)) || {
      userId: winnerId, userName: winnerName, platform,
      wins: 0, losses: 0, rank: 'Plástico 1', rankIndex: 0, rankPoints: 0,
    };
    wStats.userName = winnerName;
    applyWin(wStats);
    wStats.updatedAt = new Date().toISOString();
    await redis.set(wKey, wStats);
    await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: String(winnerId) });

    // ── Perdedor ─────────────────────────────────────
    const lKey   = rankedStatsKey(String(loserId), platform);
    const lStats = (await redis.get(lKey)) || {
      userId: loserId, userName: loserName, platform,
      wins: 0, losses: 0, rank: 'Plástico 1', rankIndex: 0, rankPoints: 0,
    };
    lStats.userName = loserName;
    applyLoss(lStats);
    lStats.updatedAt = new Date().toISOString();
    await redis.set(lKey, lStats);
    await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: String(loserId) });
  }

  return res.status(200).json({
    success: true,
    matchStatus: match.status,
    result: match.result,
    reportsCount: match.reports.length,
  });
}
