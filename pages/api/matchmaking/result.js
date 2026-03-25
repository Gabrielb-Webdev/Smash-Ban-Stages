// API para reportar el resultado de un match de matchmaking — Upstash Redis

import redis, { mmMatchKey, rankedStatsKey, rankedBoardKey, matchHistoryKey, charStatsKey, charBoardKey, rankHistoryKey, smasherBoardKey, smasherPoolKey } from '../../../lib/redis';
import {
  processMatchResult, leaderboardScore, getRankIndex, isInPlacement,
  PLACEMENT_MATCHES, MMR_DEFAULT, RANKS,
} from '../../../lib/ranks';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

async function cleanupUserRoom(userId) {
  const code = await redis.get(`mm:user:room:${String(userId)}`);
  if (code) {
    await redis.del(`mm:room:${code}`);
    await redis.del(`mm:user:room:${String(userId)}`);
  } else {
    await redis.del(`mm:user:room:${String(userId)}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId, reportingUserId, claimedWinnerId, stocksWon } = req.body || {};

  if (!matchId || !reportingUserId || !claimedWinnerId) {
    return res.status(400).json({ error: 'matchId, reportingUserId y claimedWinnerId son requeridos' });
  }

  if (!/^mm-\d+-[a-z0-9]+$/.test(String(matchId))) {
    return res.status(400).json({ error: 'matchId inválido' });
  }

  const reportStocks = Math.min(3, Math.max(1, parseInt(stocksWon) || 1));

  const match = await redis.get(mmMatchKey(matchId));
  if (!match) return res.status(404).json({ error: 'Match no encontrado' });

  const cleanReporter = sanitize(reportingUserId);
  const cleanWinner   = sanitize(claimedWinnerId);

  const isP1 = match.player1.userId === cleanReporter;
  const isP2 = match.player2.userId === cleanReporter;
  if (!isP1 && !isP2) {
    return res.status(403).json({ error: 'No sos parte de este match' });
  }

  const validWinners = [match.player1.userId, match.player2.userId];
  if (!validWinners.includes(cleanWinner)) {
    return res.status(400).json({ error: 'El ganador reportado no es jugador de este match' });
  }

  // ── Confirm / Deny flow ─────────────────────────────────
  const { action: resultAction } = req.body || {};

  if (resultAction === 'confirm' && match.status === 'pending_confirm') {
    // Opponent is confirming the pending report
    const pending = match.pendingResult;
    if (!pending) return res.status(400).json({ error: 'No hay resultado pendiente' });
    if (cleanReporter === pending.reporterId) return res.status(400).json({ error: 'No podés confirmar tu propio reporte' });

    // If the confirmer IS the winner, use the stocks they provided (they choose how many they had left)
    // If the confirmer is the loser, keep the original reported stocks
    const confirmerIsWinner = cleanReporter === pending.winnerId;
    const finalStocks = confirmerIsWinner ? reportStocks : pending.stocks;

    // Apply result
    match.reports = [
      { userId: pending.reporterId, claimedWinnerId: pending.winnerId, stocksWon: finalStocks },
      { userId: cleanReporter, claimedWinnerId: pending.winnerId, stocksWon: finalStocks },
    ];
    const agreedWinnerId = pending.winnerId;

    if (match.format === 'bo3') {
      const gameResult = { gameNum: match.currentGame, stage: match.stage, winnerId: agreedWinnerId, stocksWon: finalStocks };
      match.games = [...(match.games || [])];
      match.games[match.games.length - 1] = { ...(match.games[match.games.length - 1] || {}), result: gameResult };
      match.score = match.score || {};
      match.score[agreedWinnerId] = (match.score[agreedWinnerId] || 0) + 1;

      if (match.score[agreedWinnerId] >= 2) {
        match.status = 'finished';
        match.result = {
          winnerId: agreedWinnerId,
          winnerName: match.player1.userId === agreedWinnerId ? match.player1.userName : match.player2.userName,
          stocksWon: finalStocks,
          games: match.games,
          score: match.score,
          decidedAt: new Date().toISOString(),
        };
      } else {
        match.currentGame = (match.currentGame || 1) + 1;
        match.status = 'banning';
        match.reports = [];
        match.stage = null;
        match.bans = {};
        match.banPhase = 'winner_ban';
        match.pendingResult = null;
        const roomCode = await redis.get(`mm:user:room:${cleanReporter}`);
        if (roomCode) {
          const room = await redis.get(`mm:room:${roomCode}`);
          if (room) {
            room.status = 'banning';
            room.currentGame = match.currentGame;
            room.score = match.score;
            room.games = match.games;
            room.bans = {};
            room.banPhase = 'winner_ban';
            room.stage = null;
            await redis.set(`mm:room:${roomCode}`, room);
          }
        }
      }
    } else {
      match.status = 'finished';
      match.result = {
        winnerId: agreedWinnerId,
        winnerName: match.player1.userId === agreedWinnerId ? match.player1.userName : match.player2.userName,
        stocksWon: finalStocks,
        decidedAt: new Date().toISOString(),
      };
    }

    match.pendingResult = null;
    await redis.set(mmMatchKey(matchId), match);

    // Run stats if finished...
    let finishedRPDelta = 0;
    let finishedMMRDelta = 0;
    if (match.status === 'finished') {
      const statsResult = await applyFinishedStats(match, matchId, cleanReporter);
      finishedRPDelta = statsResult.rpDelta;
      finishedMMRDelta = statsResult.mmrDelta;
    }

    return res.status(200).json({
      success: true,
      matchStatus: match.status,
      result: match.result,
      rpDelta: finishedRPDelta || undefined,
      mmrDelta: finishedMMRDelta || undefined,
    });
  }

  if (resultAction === 'deny' && match.status === 'pending_confirm') {
    // Opponent denies — reset to active so both can re-report
    match.status = 'active';
    match.pendingResult = null;
    match.reports = [];
    // Update room
    const roomCode = await redis.get(`mm:user:room:${cleanReporter}`);
    if (roomCode) {
      const room = await redis.get(`mm:room:${roomCode}`);
      if (room) {
        room.status = 'active';
        await redis.set(`mm:room:${roomCode}`, room);
      }
    }
    await redis.set(mmMatchKey(matchId), match);
    return res.status(200).json({ success: true, matchStatus: 'active', denied: true });
  }

  // ── First report → pending_confirm ─────────────────────
  if (match.status === 'pending_confirm') {
    return res.status(400).json({ error: 'Ya hay un resultado pendiente de confirmación' });
  }

  match.pendingResult = {
    reporterId: cleanReporter,
    winnerId: cleanWinner,
    stocks: reportStocks,
    reportedAt: new Date().toISOString(),
  };
  match.status = 'pending_confirm';
  match.reports = [{ userId: cleanReporter, claimedWinnerId: cleanWinner, stocksWon: reportStocks, reportedAt: new Date().toISOString() }];

  // Update room status
  const roomCode = await redis.get(`mm:user:room:${cleanReporter}`);
  if (roomCode) {
    const room = await redis.get(`mm:room:${roomCode}`);
    if (room) {
      room.status = 'pending_confirm';
      room.pendingResult = match.pendingResult;
      await redis.set(`mm:room:${roomCode}`, room);
    }
  }

  await redis.set(mmMatchKey(matchId), match);

  return res.status(200).json({
    success: true,
    matchStatus: 'pending_confirm',
    pendingResult: match.pendingResult,
  });
}

// ── Helper: aplicar stats cuando un match termina ─────────
async function applyFinishedStats(match, matchId) {
  const platform   = match.platform;
  const winnerId   = match.result.winnerId;
  const loserId    = match.player1.userId === winnerId ? match.player2.userId : match.player1.userId;
  const winnerName = match.result.winnerName;
  const loserName  = match.player1.userId === loserId ? match.player1.userName : match.player2.userName;
  const finalStocks = match.result.stocksWon || 1;

  // ── Cargar stats de ambos ──
  const wKey = rankedStatsKey(String(winnerId), platform);
  const lKey = rankedStatsKey(String(loserId), platform);

  const wStats = (await redis.get(wKey)) || {
    userId: winnerId, userName: winnerName, platform,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0, promotionShield: 0,
  };
  wStats.userName = winnerName;
  if (!wStats.mmr) wStats.mmr = MMR_DEFAULT;
  wStats.rankIndex = wStats.rankIndex ?? getRankIndex(wStats.rank);

  const lStats = (await redis.get(lKey)) || {
    userId: loserId, userName: loserName, platform,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0, promotionShield: 0,
  };
  lStats.userName = loserName;
  if (!lStats.mmr) lStats.mmr = MMR_DEFAULT;
  lStats.rankIndex = lStats.rankIndex ?? getRankIndex(lStats.rank);

  // ── Procesar resultado con el nuevo sistema ──
  const result = processMatchResult(wStats, lStats);

  // ── Guardar stats actualizados ──
  await redis.set(wKey, wStats);
  await redis.set(lKey, lStats);

  // ── Leaderboard ──
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: String(winnerId) });
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: String(loserId) });

  // ── SMASHer leaderboard: agregar/quitar según rango ──
  const SMASHER_INDEX = RANKS.length - 1;
  if (wStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(platform), { score: wStats.mmr, member: String(winnerId) });
  } else {
    await redis.zrem(smasherBoardKey(platform), String(winnerId)).catch(() => {});
  }
  if (lStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(platform), { score: lStats.mmr, member: String(loserId) });
  } else {
    await redis.zrem(smasherBoardKey(platform), String(loserId)).catch(() => {});
  }

  // ── Pool de MMR activos (para calcular threshold SMASHer, TTL 30 días) ──
  await redis.zadd(smasherPoolKey(platform), { score: wStats.mmr, member: String(winnerId) });
  await redis.zadd(smasherPoolKey(platform), { score: lStats.mmr, member: String(loserId) });
  await redis.expire(smasherPoolKey(platform), 30 * 24 * 60 * 60);

  // ── Rank History: registrar cambios de rango ──
  if (result.winner.rankChange.promoted || result.winner.rankChange.demoted || result.winner.placementJustDone) {
    const entry = {
      rankBefore: result.winner.oldRank, subdivisionBefore: result.winner.oldSubdivision,
      rankAfter: wStats.rank, subdivisionAfter: RANKS[wStats.rankIndex]?.subdivision ?? null,
      reason: result.winner.placementJustDone ? 'PLACEMENT' : 'WIN',
      createdAt: new Date().toISOString(),
    };
    await redis.lpush(rankHistoryKey(String(winnerId)), entry);
    await redis.ltrim(rankHistoryKey(String(winnerId)), 0, 99);
  }
  if (result.loser.rankChange.promoted || result.loser.rankChange.demoted || result.loser.placementJustDone) {
    const entry = {
      rankBefore: result.loser.oldRank, subdivisionBefore: result.loser.oldSubdivision,
      rankAfter: lStats.rank, subdivisionAfter: RANKS[lStats.rankIndex]?.subdivision ?? null,
      reason: result.loser.placementJustDone ? 'PLACEMENT' : 'LOSS',
      createdAt: new Date().toISOString(),
    };
    await redis.lpush(rankHistoryKey(String(loserId)), entry);
    await redis.ltrim(rankHistoryKey(String(loserId)), 0, 99);
  }

  // ── Match History ──
  const matchEntry = {
    matchId, platform, winnerId, loserId, winnerName, loserName,
    winnerCharId: match.player1.userId === winnerId ? match.player1.charId : match.player2.charId,
    loserCharId:  match.player1.userId === loserId  ? match.player1.charId : match.player2.charId,
    stocksWon: finalStocks,
    rpDelta:   result.winner.rrDelta,
    mmrDelta:  result.winner.mmrDelta,
    mmrWinnerBefore: result.winner.mmrBefore,
    mmrWinnerAfter:  result.winner.mmrAfter,
    mmrLoserBefore:  result.loser.mmrBefore,
    mmrLoserAfter:   result.loser.mmrAfter,
    winnerRankAfter: wStats.rank,
    loserRankAfter:  lStats.rank,
    playedAt: new Date().toISOString(),
  };
  const wHistKey = matchHistoryKey(String(winnerId));
  const lHistKey = matchHistoryKey(String(loserId));
  await redis.lpush(wHistKey, matchEntry);
  await redis.ltrim(wHistKey, 0, 49);
  await redis.lpush(lHistKey, matchEntry);
  await redis.ltrim(lHistKey, 0, 49);

  // ── Stats por personaje ──
  const winnerCharId = matchEntry.winnerCharId;
  const loserCharId  = matchEntry.loserCharId;
  if (winnerCharId) {
    const wcKey   = charStatsKey(String(winnerId), platform, winnerCharId);
    const wcStats = (await redis.get(wcKey)) || { userId: winnerId, userName: winnerName, charId: winnerCharId, platform, wins: 0, losses: 0 };
    wcStats.userName = winnerName;
    wcStats.wins = (wcStats.wins || 0) + 1;
    await redis.set(wcKey, wcStats);
    await redis.zadd(charBoardKey(platform, winnerCharId), { score: wcStats.wins, member: String(winnerId) });
  }
  if (loserCharId) {
    const lcKey   = charStatsKey(String(loserId), platform, loserCharId);
    const lcStats = (await redis.get(lcKey)) || { userId: loserId, userName: loserName, charId: loserCharId, platform, wins: 0, losses: 0 };
    lcStats.userName = loserName;
    lcStats.losses = (lcStats.losses || 0) + 1;
    await redis.set(lcKey, lcStats);
    const existingScore = await redis.zscore(charBoardKey(platform, loserCharId), String(loserId));
    if (existingScore == null) {
      await redis.zadd(charBoardKey(platform, loserCharId), { score: 0, member: String(loserId) });
    }
  }

  // ── Limpiar sala de ambos jugadores ──
  await cleanupUserRoom(String(winnerId));
  await cleanupUserRoom(String(loserId));

  return {
    rpDelta: result.winner.rrDelta,
    mmrDelta: result.winner.mmrDelta,
    winnerRankChange: result.winner.rankChange,
    loserRankChange: result.loser.rankChange,
  };
}
